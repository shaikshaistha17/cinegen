# CineGen Director Conversation Persistence - Root Cause Analysis

**Investigation Date:** December 2024  
**Investigator:** Planning Agent  
**Status:** Complete  
**Priority:** P0 - Critical User Experience Bug

---

## Executive Summary

**Root Cause:** CineGen Director conversations are stored exclusively in React component state (`messages` and `conversationHistory` state arrays in `CineGenDirector.tsx`). No database persistence exists. All conversations are lost on navigation, refresh, or logout.

**Impact:** Every user loses their entire conversation history when:
- Navigating between pages (component unmounts, state destroyed)
- Refreshing the browser (component remounts with empty state)
- Logging out and back in (new session, new empty state)
- Opening the same account on another device (no shared state)

**Recommendation:** Build new conversation persistence system using existing Supabase database infrastructure. The existing `messages` table is purpose-built for direct brand-creator messaging and cannot be reused for CineGen Director AI conversations without breaking the messaging feature.

---

## 1. Current Implementation Analysis

### 1.1 Component State Storage

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx`

**Evidence:**
```typescript
// Lines 39-41
const [messages, setMessages] = useState<ConversationMessage[]>([]);
const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
const [sessionId] = useState(() => crypto.randomUUID());
```

**Analysis:**
- `messages`: Full conversation display (user + assistant messages)
- `conversationHistory`: Bounded to last 20 messages for AI context
- `sessionId`: Generated UUID per component mount, not persisted
- All three variables are React state — destroyed on unmount

**Component Lifecycle:**
1. User navigates to landing page → component mounts → empty state initialized
2. User chats with Director → messages added to state arrays
3. User clicks "Discover" → component unmounts → **state lost**
4. User returns to landing page → component remounts → empty state again
5. Previous conversation is **irrecoverable**

### 1.2 API Route Implementation

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/chat/route.ts`

**Evidence:**
```typescript
// Lines 8-14
const { message, sessionId, conversationHistory, replyLanguage }: {
  message: string;
  sessionId: string;
  conversationHistory: ConversationMessage[];
  replyLanguage?: string;
} = body;

// Line 51
const boundedHistory = (conversationHistory || []).slice(-20);
```

**Analysis:**
- API route receives conversation history from client on every request
- Server does NOT store or retrieve conversation history
- Server only uses received history to build Gemini AI prompt context
- `sessionId` is received but never used for database lookup or storage
- No database writes occur in this route

**Data Flow:**
```
Client Component State → POST /api/director/chat → Gemini AI → Response → Client Component State
                         (history passed in body)                         (history updated locally)
                         
                         ❌ No database write
                         ❌ No persistent storage
```

### 1.3 Authentication Integration

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/lib/auth-context.tsx`

**Evidence:**
```typescript
// Lines 10-12
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
});

// Lines 24-31
useEffect(() => {
  getCurrentProfile().then((profile) => {
    setUser(profile);
    setLoading(false);
  });
```

**Component Usage:**
```typescript
// CineGenDirector.tsx line 23
const { user } = useAuth();
const displayName = user?.name || "";
```

**Analysis:**
- Authentication context provides `user` object with `id`, `name`, `email`, `role`
- CineGen Director component imports `useAuth()` and accesses authenticated user
- User ID is available (`user.id`) but NOT used for conversation storage
- Authentication works correctly — the integration point exists but persistence is not implemented

**API Route Cookie Parsing (Incorrect Pattern):**
```typescript
// route.ts lines 24-35
let userId = 'anonymous';
let displayName = '';
try {
  const sessionCookie = req.cookies.get('cinegen_session')?.value;
  if (sessionCookie) {
    const session = JSON.parse(sessionCookie);
    userId = session.userId || 'anonymous';
    displayName = session.name || '';
  }
} catch (e) {
  // Use anonymous if parsing fails
}
```

**Problem:** API route manually parses cookies instead of using Supabase Auth. User ID is extracted but only used for rate limiting, not conversation persistence.

---

## 2. Database Infrastructure Analysis

### 2.1 Existing Schema

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/database/schema.sql`

**Users Table (Lines 11-20):**
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('brand', 'creator', 'guest')),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
✅ Stable user IDs exist (`users.id` UUID)

**Messages Table (Lines 133-145):**
```sql
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
```

**Purpose:** Direct messaging between brands and creators (human-to-human)
- `conversation_id`: Groups messages between two users
- `sender_id` and `recipient_id`: Two-party conversation model
- Used by `/app/messages/page.tsx` for real-time chat feature

**Why This Table Cannot Be Reused:**

| Requirement | Director Conversations | Existing Messages Table | Compatible? |
|-------------|----------------------|------------------------|-------------|
| Participants | User ↔ AI Assistant | User ↔ User | ❌ No recipient_id for AI |
| Conversation Model | Single-user thread | Two-party exchange | ❌ Schema mismatch |
| Message Roles | 'user' or 'assistant' | Sender/recipient IDs | ❌ No role field |
| Input Source | Voice or text | Text only | ❌ Missing metadata |
| Read Status | Not needed (AI always "reads") | `read_at` timestamp | ⚠️ Unnecessary field |
| Existing Usage | None | Brand-Creator messaging | ❌ Risk of breaking existing feature |

**Conclusion:** Creating a new `director_conversations` and `director_messages` table pair is safer and cleaner than retrofitting the existing `messages` table.

### 2.2 Database Client Configuration

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/lib/supabase.ts`

**Evidence:**
```typescript
// Client-side browser client
export const supabase = typeof window !== 'undefined' 
  ? createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: getCookieHandler() }
    )
  : null as any;

// Service role client with admin privileges
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
```

**Analysis:**
✅ Supabase client properly configured  
✅ Browser client available for client components  
✅ Service role client available for server routes  
✅ Environment variables present (per CINEGEN_FULL_HANDOFF.md)  
✅ SSR-compatible cookie handling implemented  

**Usage in Project:**
- 18 creator profiles seeded via Supabase (`lib/seed/creators.ts`)
- Authentication working (login, logout, session management)
- Messaging feature uses Supabase real-time subscriptions
- Brief, proposal, and project data all persisted to Supabase

**Conclusion:** Database infrastructure is production-ready and actively used throughout the application. No configuration changes needed.

### 2.3 Migration System

**Directory:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/database/migrations/`

**Existing Migrations:**
```
001_add_missing_fields.sql           (Schema patches)
002_delivery_workflow.sql            (Agreements, deliveries, scope changes)
004_agreements_and_deliveries.sql    (Updated delivery schema)
005_add_agreement_to_reviews.sql     (Agreement FK to reviews)
005_deliveries_storage_bucket.sql    (Storage bucket setup)
006_admin_and_demo_security_safe.sql (RLS policies)
```

**Pattern:** Numbered SQL files applied manually to Supabase database

**Recommendation:** Create `007_director_conversations.sql` migration following existing pattern

---

## 3. Conversation Flow Trace

### 3.1 Voice Input Flow

**Sequence:**
1. User clicks "Enable CineGen Director" button → `handleEnableVoice()` called
2. Component initializes Web Speech Recognition API → state = "awaiting_wake"
3. User says "Hey CineGen, create a campaign for fitness" → wake phrase detected
4. Recognition extracts command: "create a campaign for fitness"
5. Component calls `handleUserMessage(cleanIdea, true)` → state = "processing"
6. Component adds user message to `messages` state array
7. Component adds user message to `conversationHistory` state array (bounded to 20)
8. Component POSTs to `/api/director/chat` with:
   ```json
   {
     "message": "create a campaign for fitness",
     "sessionId": "f8e7d6c5-...",
     "conversationHistory": [...previous messages...],
     "replyLanguage": "en-US"
   }
   ```
9. API route receives history, passes to Gemini AI, returns response
10. Component receives response, adds assistant message to state arrays
11. Component speaks response via TTS → state = "speaking"
12. TTS ends → state = "listening" (ready for next input)

**Persistence Points:**
- ❌ Step 6: User message stored in component state only
- ❌ Step 7: History stored in component state only
- ❌ Step 10: Assistant response stored in component state only
- ❌ No database writes occur anywhere in flow

### 3.2 Text Input Flow

**Sequence:**
1. User clicks keyboard icon → `setTypingMode(true)` → voice input disabled
2. User types "What can you help me with?" in text input
3. User clicks send button → `handleSubmit()` called
4. Component calls `handleUserMessage(typedInput, false)` → same flow as voice
5. Component POSTs to `/api/director/chat` with identical payload structure
6. Response returned, stored in component state, displayed on screen
7. **No TTS** (typing mode = text only, muted by default)

**Persistence Points:**
- ❌ Identical to voice flow — no database writes

### 3.3 Navigation Flow

**Sequence:**
1. User has 10-message conversation with Director
2. Director suggests "Let me show you our creators" → action = "open_discovery"
3. Component calls `executeAction("open_discovery")` → `router.push('/creators')`
4. Next.js navigation occurs → route changes to `/creators`
5. CineGenDirector component **unmounts** (no longer rendered)
6. React garbage collects component state → `messages` array destroyed
7. User clicks browser back button → returns to landing page
8. CineGenDirector component **remounts** with fresh empty state
9. `useState([])` initializes empty `messages` and `conversationHistory` arrays
10. Default greeting displays: "Hey! Welcome to CineGen. What would you like to do?"

**Data Loss:**
- ❌ All 10 previous messages lost
- ❌ No database read on mount to restore history
- ❌ No localStorage/sessionStorage fallback (checked — not implemented)
- ❌ sessionId regenerated as new UUID (not persisted or looked up)

### 3.4 Refresh Flow

**Sequence:**
1. User has conversation with Director
2. User presses F5 or Cmd+R to refresh browser
3. Browser discards all JavaScript state
4. Next.js re-renders page from server
5. CineGenDirector component mounts with empty initial state
6. **Authentication state restored** via Supabase Auth cookies
7. **Conversation state NOT restored** (no persistence implemented)

**Evidence from `CineGenDirector.tsx` (lines 39-43):**
```typescript
const [messages, setMessages] = useState<ConversationMessage[]>([]);
const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
const [sessionId] = useState(() => crypto.randomUUID());
```

No `useEffect` hook loads persisted data on mount. Component always starts empty.

### 3.5 Logout/Login Flow

**Sequence:**
1. User (brand@cinegen.demo) has conversation with Director
2. User clicks logout → `signOut()` called → Supabase session cleared
3. User logs out, then logs back in as same account
4. AuthContext restores user profile from Supabase (`users` table)
5. CineGenDirector component displays with authenticated name: "Hey Brand User! Welcome to CineGen."
6. **But conversation history is NOT restored** (never saved to begin with)

**Observation:** Authentication persists correctly across sessions. User identity is stable. Only conversation data is missing.

---

## 4. Root Cause Summary

### 4.1 Primary Cause

**Conversations are stored exclusively in ephemeral React component state.**

**Code Evidence:**
```typescript
// CineGenDirector.tsx lines 39-41
const [messages, setMessages] = useState<ConversationMessage[]>([]);
const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
```

**Lifecycle:**
```
Component Mount → Empty State → User Chats → State Populated → Component Unmount → State Destroyed
                                                                 ↑
                                                                 Navigation, Refresh, Browser Close
```

### 4.2 Contributing Factors

1. **No Database Schema:** No `director_conversations` or `director_messages` tables exist
2. **No API Persistence Logic:** `/api/director/chat/route.ts` does not write to database
3. **No Restore Logic:** Component does not fetch conversation history on mount
4. **sessionId Not Persisted:** Generated UUID per mount, not linked to user account
5. **No Client-Side Caching:** No localStorage/sessionStorage fallback (intentionally avoided per requirements)

### 4.3 What Works Correctly

✅ **Authentication:** User login, logout, session management via Supabase Auth  
✅ **User Identity:** Stable `users.id` UUID, name, email, role persisted  
✅ **Database Infrastructure:** Supabase configured, migrations working, RLS policies active  
✅ **AI Conversation Logic:** Gemini API integration, context window management (20 messages), multi-language support  
✅ **Voice/Text Input:** Web Speech Recognition, TTS, text mode all functional  
✅ **Component State Management:** Messages render correctly during active session  

### 4.4 What Does Not Work

❌ **Conversation Persistence:** Messages lost on navigation, refresh, logout  
❌ **Cross-Device Access:** User cannot access conversation from another browser/device  
❌ **Conversation History:** No way to view past conversations  
❌ **Account-Specific Storage:** No association between conversations and user accounts  
❌ **Session Continuity:** Each component mount starts with blank slate  

---

## 5. Existing Infrastructure Assessment

### 5.1 Can Existing Messages Table Be Reused?

**Answer: No, create new tables instead.**

**Reasoning:**

**Schema Incompatibility:**
```sql
-- Existing messages table (brand ↔ creator chat)
messages (
  sender_id UUID,      -- Human user
  recipient_id UUID,   -- Another human user
  content TEXT,        -- Message text
  read_at TIMESTAMP    -- When recipient read it
)

-- Needed for Director conversations
director_messages (
  user_id UUID,        -- Conversation owner
  role TEXT,           -- 'user' or 'assistant'
  content TEXT,        -- Message text
  input_source TEXT    -- 'voice' or 'text'
)
```

**Risk of Breaking Existing Feature:**
- `/app/messages/page.tsx` depends on current schema
- Real-time subscriptions listen to `messages` table
- Brand-creator conversations actively used in production (per handoff doc)
- Retrofitting would require:
  - Nullable `recipient_id` (breaks foreign key semantics)
  - New `message_type` column to distinguish Director vs human messages
  - Migration of existing data
  - Updates to messaging UI to filter out Director messages
  - Risk of breaking real-time subscriptions

**Better Approach:**
- Dedicated `director_conversations` table (conversation metadata)
- Dedicated `director_messages` table (individual messages)
- Clean separation of concerns
- No risk to existing features
- Optimized indexes for Director-specific queries

### 5.2 Authentication Integration Readiness

**Status: ✅ Ready to use**

**Available Data:**
```typescript
// CineGenDirector.tsx line 23
const { user } = useAuth();
// user.id        → Stable UUID
// user.name      → Display name
// user.email     → Email address
// user.role      → 'brand' | 'creator'
```

**Server-Side Access:**
```typescript
// In API routes
import { createServerSupabaseClient } from '@/lib/supabase-server';

const supabase = createServerSupabaseClient(req);
const { data: { user } } = await supabase.auth.getUser();
// user.id is stable across sessions
```

**Recommendation:** Use `user.id` as foreign key for `director_conversations.user_id`

### 5.3 Database Client Readiness

**Status: ✅ Production-ready**

**Client-Side (React Components):**
```typescript
import { supabase } from '@/lib/supabase';

// Insert message
await supabase.from('director_messages').insert({
  conversation_id: conversationId,
  role: 'user',
  content: message,
  input_source: 'voice'
});

// Fetch conversation history
const { data } = await supabase
  .from('director_messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true });
```

**Server-Side (API Routes):**
```typescript
import { createServerSupabaseClient } from '@/lib/supabase-server';

const supabase = createServerSupabaseClient(req);
await supabase.from('director_messages').insert({ ... });
```

**Evidence:** Existing codebase uses identical patterns for briefs, proposals, messages, etc. No new patterns need to be invented.

---

## 6. Technical Approach Recommendation

### 6.1 Database Schema Design

**Create Two New Tables:**

**1. `director_conversations` (Conversation Metadata)**
```sql
CREATE TABLE director_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,  -- Derived from first user message
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_director_conversations_user_id ON director_conversations(user_id);
CREATE INDEX idx_director_conversations_updated ON director_conversations(user_id, last_message_at DESC);
```

**2. `director_messages` (Individual Messages)**
```sql
CREATE TABLE director_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES director_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  input_source VARCHAR(20) CHECK (input_source IN ('voice', 'text', null)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_director_messages_conversation ON director_messages(conversation_id, created_at);
```

**Why This Design:**
- Conversation as first-class entity (enables history UI)
- Message ordering via `created_at` (deterministic, server timestamp)
- `input_source` metadata for voice/text distinction
- Role-based model matches `ConversationMessage` TypeScript type
- Cascade delete maintains referential integrity
- Indexes optimize common queries (user's conversations, conversation messages)

### 6.2 Row-Level Security (RLS) Policies

**Requirements:**
- Users can only read/write their own conversations
- No cross-account access (brand cannot see creator's Director chats)
- Service role bypasses RLS for admin operations

**Policies:**

```sql
-- Enable RLS
ALTER TABLE director_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own conversations
CREATE POLICY "Users can read own conversations"
ON director_conversations FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own conversations
CREATE POLICY "Users can create own conversations"
ON director_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
ON director_conversations FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
ON director_conversations FOR DELETE
USING (auth.uid() = user_id);

-- Users can read messages in their conversations
CREATE POLICY "Users can read own conversation messages"
ON director_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
);

-- Users can insert messages in their conversations
CREATE POLICY "Users can insert messages in own conversations"
ON director_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
);
```

**Testing RLS:**
```sql
-- Test with brand account
SET LOCAL auth.uid = '<brand-user-uuid>';
SELECT * FROM director_conversations;  -- Should return only brand's conversations

-- Test with creator account
SET LOCAL auth.uid = '<creator-user-uuid>';
SELECT * FROM director_conversations;  -- Should return only creator's conversations

-- Test unauthorized access
SET LOCAL auth.uid = '<brand-user-uuid>';
SELECT * FROM director_messages WHERE conversation_id = '<creator-conversation-uuid>';
-- Should return 0 rows (policy blocks access)
```

### 6.3 API Route Modifications

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/chat/route.ts`

**Changes Required:**

**1. Get Authenticated User (Replace Cookie Parsing)**
```typescript
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient(req);
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await req.json();
  const { message, conversationId, replyLanguage } = body;
  
  // ... rest of route
}
```

**2. Load or Create Conversation**
```typescript
// Get or create conversation
let conversation;
if (conversationId) {
  // Load existing conversation (RLS ensures user owns it)
  const { data } = await supabase
    .from('director_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();
  conversation = data;
} else {
  // Create new conversation (title derived from first message)
  const title = message.length > 50 ? message.substring(0, 47) + '...' : message;
  const { data } = await supabase
    .from('director_conversations')
    .insert({ user_id: user.id, title })
    .select()
    .single();
  conversation = data;
}
```

**3. Save User Message**
```typescript
// Insert user message
await supabase
  .from('director_messages')
  .insert({
    conversation_id: conversation.id,
    role: 'user',
    content: message,
    input_source: null  // Client will include 'voice' or 'text' in body
  });
```

**4. Load Conversation History**
```typescript
// Load last 20 messages for context
const { data: historyMessages } = await supabase
  .from('director_messages')
  .select('role, content, created_at')
  .eq('conversation_id', conversation.id)
  .order('created_at', { ascending: false })
  .limit(20);

const conversationHistory = (historyMessages || [])
  .reverse()
  .map(m => ({ role: m.role, text: m.content, timestamp: Date.parse(m.created_at) }));
```

**5. Save Assistant Response**
```typescript
// Generate AI response (existing Gemini logic)
const response = await generateConversationalResponse(...);

// Insert assistant message
await supabase
  .from('director_messages')
  .insert({
    conversation_id: conversation.id,
    role: 'assistant',
    content: response.reply
  });

// Update conversation timestamp
await supabase
  .from('director_conversations')
  .update({ last_message_at: new Date().toISOString() })
  .eq('id', conversation.id);

return NextResponse.json({ ...response, conversationId: conversation.id });
```

### 6.4 Component Modifications

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx`

**Changes Required:**

**1. Replace Local State with Database State**
```typescript
// Keep messages state for UI rendering, but load from database
const [messages, setMessages] = useState<ConversationMessage[]>([]);
const [conversationId, setConversationId] = useState<string | null>(null);
const [loading, setLoading] = useState(true);

// Remove conversationHistory state (server loads from DB)
// Remove sessionId state (replaced by conversationId)
```

**2. Load Conversation on Mount**
```typescript
useEffect(() => {
  if (!user) return;  // Wait for auth
  
  async function loadLatestConversation() {
    setLoading(true);
    try {
      // Fetch user's most recent conversation
      const { data: conversations } = await supabase
        .from('director_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false })
        .limit(1);
      
      if (conversations && conversations.length > 0) {
        const convId = conversations[0].id;
        setConversationId(convId);
        
        // Load messages
        const { data: msgs } = await supabase
          .from('director_messages')
          .select('role, content, created_at')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true });
        
        setMessages(msgs.map(m => ({
          role: m.role,
          text: m.content,
          timestamp: Date.parse(m.created_at)
        })));
      } else {
        // No conversation yet — will be created on first message
        setConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  }
  
  loadLatestConversation();
}, [user]);
```

**3. Update handleUserMessage to Pass conversationId**
```typescript
const handleUserMessage = useCallback(async (userText: string, isVoiceInput: boolean = false) => {
  // ... existing validation ...
  
  // Optimistically add to UI
  const userMessage: ConversationMessage = {
    role: "user",
    text: trimmedText,
    timestamp: Date.now()
  };
  setMessages(prev => [...prev, userMessage]);
  
  try {
    const response = await fetch("/api/director/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: trimmedText,
        conversationId,  // Pass existing ID or null for new conversation
        replyLanguage: replyLanguage,
        inputSource: isVoiceInput ? 'voice' : 'text'
      }),
    });
    
    const data = await response.json();
    
    // If new conversation, save the ID
    if (data.conversationId && !conversationId) {
      setConversationId(data.conversationId);
    }
    
    // Add assistant response to UI
    setMessages(prev => [...prev, {
      role: "assistant",
      text: data.reply,
      timestamp: Date.now()
    }]);
    
    // ... rest of existing logic ...
  } catch (error) {
    // ... error handling ...
  }
}, [conversationId, replyLanguage]);
```

**4. Add New Conversation Button**
```typescript
const startNewConversation = useCallback(async () => {
  setConversationId(null);
  setMessages([]);
  // Next message will create new conversation in database
}, []);

// In JSX, add button:
<button onClick={startNewConversation}>New Chat</button>
```

**5. Add Conversation History UI**
```typescript
// Fetch all conversations for sidebar
const [conversations, setConversations] = useState([]);

useEffect(() => {
  if (!user) return;
  
  async function loadConversations() {
    const { data } = await supabase
      .from('director_conversations')
      .select('id, title, last_message_at')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });
    
    setConversations(data || []);
  }
  
  loadConversations();
}, [user]);

// Render in sidebar
{conversations.map(conv => (
  <button key={conv.id} onClick={() => loadConversation(conv.id)}>
    {conv.title}
  </button>
))}
```

### 6.5 Logout/Login Behavior

**On Logout:**
```typescript
const handleLogout = async () => {
  // Clear in-memory state
  setMessages([]);
  setConversationId(null);
  
  // Abort any pending requests
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  // Sign out (clears Supabase session)
  await signOut();
  
  // DO NOT delete database conversations (persist for next login)
};
```

**On Login:**
- AuthContext restores user identity
- CineGenDirector `useEffect` runs with `user` object
- Component loads latest conversation from database
- User sees their previous conversation history

**Account Switching:**
```typescript
// If user logs out and different user logs in:
useEffect(() => {
  if (!user) {
    // Logged out — clear state
    setMessages([]);
    setConversationId(null);
    return;
  }
  
  // Logged in — load THIS user's conversations
  loadLatestConversation();
}, [user?.id]);  // Re-run when user ID changes
```

---

## 7. Security Considerations

### 7.1 Ownership Enforcement

**Server-Side (API Route):**
- ✅ Use `auth.uid()` from Supabase Auth (verified by JWT signature)
- ❌ Never trust client-provided `userId` in request body
- ✅ RLS policies automatically enforce ownership on all queries
- ✅ Service role bypassed only for admin operations (not for chat API)

**Example Attack Scenario:**
```typescript
// ❌ VULNERABLE (don't do this)
const { userId, conversationId } = req.body;  // Attacker controls both
await supabase.from('director_messages').select('*').eq('conversation_id', conversationId);
// Attacker can read any conversation by guessing UUID

// ✅ SECURE (correct approach)
const { data: { user } } = await supabase.auth.getUser();  // Server verifies JWT
await supabase.from('director_messages').select('*').eq('conversation_id', conversationId);
// RLS policy checks: conversation.user_id = auth.uid()
// Attacker blocked even if they know conversation UUID
```

### 7.2 Access Control Testing

**Test Cases:**

**1. Brand Cannot Access Creator's Conversations**
```typescript
// Setup
const brandUser = await signIn('brand@cinegen.demo', 'Demo@123');
const creatorUser = await signIn('creator@cinegen.demo', 'Demo@123');

// Creator creates conversation
const { data: creatorConv } = await supabase
  .from('director_conversations')
  .insert({ user_id: creatorUser.id, title: 'Test' })
  .select()
  .single();

// Brand attempts to read creator's conversation
await signIn('brand@cinegen.demo', 'Demo@123');  // Switch accounts
const { data, error } = await supabase
  .from('director_conversations')
  .select('*')
  .eq('id', creatorConv.id)
  .single();

// Assert: error or data = null (RLS blocks access)
```

**2. Unauthenticated User Cannot Access Any Conversations**
```typescript
await signOut();
const { data, error } = await supabase
  .from('director_conversations')
  .select('*');

// Assert: error or data = [] (RLS requires auth.uid())
```

**3. User Can Delete Own Conversation**
```typescript
const { data: { user } } = await supabase.auth.getUser();
const { data: conv } = await supabase
  .from('director_conversations')
  .insert({ user_id: user.id, title: 'Test' })
  .select()
  .single();

// Delete should succeed
const { error } = await supabase
  .from('director_conversations')
  .delete()
  .eq('id', conv.id);

// Assert: error = null, conversation deleted
// Messages cascade deleted (ON DELETE CASCADE)
```

### 7.3 Gemini API Key Protection

**Current Implementation (Secure):**
```typescript
// route.ts line 60
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
  return { reply: "AI service not configured.", action: "none", error: true };
}
```

✅ API key never sent to client  
✅ Key read from server-side environment variable only  
✅ API calls made from server route, not client component  

**Maintain This Pattern:** Database persistence does not change API key handling. Continue using server-side route for all Gemini calls.

---

## 8. Migration Strategy

### 8.1 Database Migration

**File:** `database/migrations/007_director_conversations.sql`

**Content:**
```sql
-- ============================================================================
-- Migration 007: CineGen Director Conversation Persistence
-- Adds tables for user-specific AI conversation storage
-- ============================================================================

-- Enable UUID extension (already enabled, but safe to repeat)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Director Conversations Table
-- Stores metadata for each user's conversation with CineGen Director
-- ============================================================================
CREATE TABLE IF NOT EXISTS director_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_director_conversations_user_id ON director_conversations(user_id);
CREATE INDEX idx_director_conversations_user_updated ON director_conversations(user_id, last_message_at DESC);

-- ============================================================================
-- Director Messages Table
-- Stores individual messages within conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS director_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES director_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  input_source VARCHAR(20) CHECK (input_source IN ('voice', 'text', null)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_director_messages_conversation ON director_messages(conversation_id, created_at);

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- Enforce account privacy — users can only access their own conversations
-- ============================================================================

-- Enable RLS
ALTER TABLE director_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can read their own
CREATE POLICY "Users can read own director conversations"
ON director_conversations FOR SELECT
USING (auth.uid() = user_id);

-- Conversations: Users can create their own
CREATE POLICY "Users can create own director conversations"
ON director_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Conversations: Users can update their own
CREATE POLICY "Users can update own director conversations"
ON director_conversations FOR UPDATE
USING (auth.uid() = user_id);

-- Conversations: Users can delete their own
CREATE POLICY "Users can delete own director conversations"
ON director_conversations FOR DELETE
USING (auth.uid() = user_id);

-- Messages: Users can read messages in their conversations
CREATE POLICY "Users can read own director messages"
ON director_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
);

-- Messages: Users can insert messages in their conversations
CREATE POLICY "Users can insert director messages in own conversations"
ON director_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
);

-- ============================================================================
-- Update Trigger
-- Automatically update updated_at timestamp on conversation changes
-- ============================================================================
CREATE TRIGGER update_director_conversations_updated_at
BEFORE UPDATE ON director_conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- End of Migration 007
-- ============================================================================
```

**Application:**
```bash
# Connect to Supabase SQL Editor
# Copy-paste migration content
# Execute
# Verify: SELECT * FROM director_conversations; (should return 0 rows, no errors)
```

### 8.2 Code Migration

**Order of Implementation:**
1. Apply database migration (007_director_conversations.sql)
2. Test RLS policies with demo accounts
3. Modify `/api/director/chat/route.ts` (save/load from database)
4. Test API route with Postman/curl (verify messages persist)
5. Modify `CineGenDirector.tsx` component (load on mount, pass conversationId)
6. Test in browser (refresh, navigate, logout/login)
7. Add conversation history UI (sidebar, "New Chat" button)
8. Test with multiple accounts (verify isolation)
9. Add delete conversation feature with confirmation

**Rollback Plan:**
```sql
-- If migration causes issues, rollback:
DROP TABLE IF EXISTS director_messages CASCADE;
DROP TABLE IF EXISTS director_conversations CASCADE;

-- Code rollback: revert to commit before changes
git checkout HEAD~1 -- app/api/director/chat/route.ts
git checkout HEAD~1 -- components/voice/CineGenDirector.tsx
```

### 8.3 Backward Compatibility

**Current Behavior:**
- New users: Start with empty conversation (no change)
- Existing demo accounts: No Director conversations exist yet (not in production)

**Post-Migration Behavior:**
- New users: First message creates conversation in database
- Existing users: Load latest conversation on mount, or start new if none exist

**No Breaking Changes:**
- TypeScript types remain unchanged (`ConversationMessage` interface)
- Component props unchanged (no parent component dependencies)
- API route path unchanged (`POST /api/director/chat`)
- Voice/text input flows unchanged (same UX)

---

## 9. Verification Checklist

### 9.1 Database Verification

- [ ] Migration 007 applied without errors
- [ ] `director_conversations` table created with 6 columns
- [ ] `director_messages` table created with 6 columns
- [ ] Indexes created (2 on conversations, 1 on messages)
- [ ] RLS enabled on both tables
- [ ] 6 RLS policies active (SELECT, INSERT, UPDATE, DELETE on conversations; SELECT, INSERT on messages)
- [ ] Update trigger created on conversations

### 9.2 RLS Policy Testing

- [ ] Brand account can create conversation
- [ ] Brand account can read own conversation
- [ ] Brand account CANNOT read creator's conversation (attempt returns 0 rows)
- [ ] Creator account can create conversation
- [ ] Creator account can read own conversation
- [ ] Creator account CANNOT read brand's conversation (attempt returns 0 rows)
- [ ] Unauthenticated request returns 401 or empty result

### 9.3 API Route Testing

- [ ] POST /api/director/chat with message + no conversationId creates new conversation
- [ ] Response includes new `conversationId`
- [ ] User message inserted with role='user'
- [ ] Assistant response inserted with role='assistant'
- [ ] POST /api/director/chat with existing conversationId loads history
- [ ] Last 20 messages loaded for AI context
- [ ] Conversation `last_message_at` timestamp updated
- [ ] Unauthorized request (no auth cookie) returns 401

### 9.4 Component Testing

- [ ] On mount with no conversations: component displays empty state
- [ ] On first message: conversation created, messages displayed
- [ ] On refresh: conversation restored, messages displayed
- [ ] On navigation away and back: conversation restored, messages displayed
- [ ] On logout: state cleared (messages array emptied)
- [ ] On login as same account: conversation restored
- [ ] On login as different account: different conversation loaded
- [ ] "New Chat" button: starts fresh conversation, old conversation saved
- [ ] Voice input saves with `input_source='voice'`
- [ ] Text input saves with `input_source='text'`

### 9.5 Cross-Device Testing

- [ ] User logs in on Browser A, sends message
- [ ] User logs in on Browser B (same account), sees same conversation
- [ ] User sends message on Browser B
- [ ] Conversation updated on both browsers (reload to see new messages)

### 9.6 Security Testing

- [ ] Brand account ID `brand-123` attempts to access creator conversation `conv-456`
- [ ] Query returns empty result or error (RLS blocks access)
- [ ] Attempt to insert message into another user's conversation fails
- [ ] Attempt to delete another user's conversation fails
- [ ] Direct SQL query with service role (bypassing RLS) succeeds (admin access confirmed)

### 9.7 Edge Case Testing

- [ ] User with 0 conversations: no errors, ready to create first
- [ ] User with 100 conversations: latest conversation loaded on mount
- [ ] Conversation with 1000 messages: only last 20 loaded for AI context, UI displays all
- [ ] Network failure during save: error displayed, message can be retried
- [ ] Duplicate message submission (retry): idempotent save (no duplicates created)
- [ ] Long user message (5000 characters): saved and displayed correctly
- [ ] Unicode/emoji in messages: saved and displayed correctly
- [ ] XSS attempt in message: escaped/sanitized in display

---

## 10. Unresolved Questions

1. **Conversation Limits:** Should users be limited to N conversations? (Recommend: No limit for MVP, add pagination later if needed)

2. **Message Retention Policy:** Should old messages be deleted after X days? (Recommend: Retain indefinitely for MVP, add retention policy later)

3. **Conversation Titles:** Generate via AI or simple truncation? (Recommend: Truncation for MVP — AI title generation adds latency and quota cost)

4. **Real-Time Updates:** Should conversation history update in real-time if user has multiple tabs open? (Recommend: No for MVP — Supabase real-time adds complexity, refresh loads latest)

5. **Export Feature:** Should users be able to export conversation as PDF/JSON? (Recommend: No for MVP, nice-to-have for future)

6. **Search Feature:** Should users be able to search across conversations? (Recommend: No for MVP, add full-text search later if usage warrants)

---

## 11. Recommended Next Steps

**Immediate (P0):**
1. Apply database migration 007
2. Modify `/api/director/chat/route.ts` with database persistence
3. Modify `CineGenDirector.tsx` component with mount loading
4. Test locally with demo accounts
5. Verify navigation, refresh, logout/login scenarios

**Short-Term (P1):**
6. Add "New Chat" button to component
7. Add conversation history sidebar
8. Add delete conversation with confirmation
9. Test RLS policies with isolated accounts
10. Write automated tests for API persistence

**Future Enhancements (P2):**
11. Conversation title generation via AI (optional)
12. Export conversation as PDF
13. Search across conversations
14. Real-time sync across tabs/devices
15. Message delivery status indicators
16. Conversation archiving (vs deletion)

---

## 12. Files to Modify

**New Files:**
- `database/migrations/007_director_conversations.sql` (CREATE)

**Modified Files:**
- `app/api/director/chat/route.ts` (MAJOR — add database persistence)
- `components/voice/CineGenDirector.tsx` (MAJOR — add mount loading, remove local history state)
- `types/index.ts` (MINOR — no changes needed, existing types compatible)

**Unchanged Files:**
- `lib/supabase.ts` (already configured)
- `lib/auth-context.tsx` (already provides user object)
- `database/schema.sql` (base schema, not modified — use migration instead)

**Total:** 1 new file, 2 major modifications

---

## 13. Conclusion

**Root Cause Confirmed:** CineGen Director conversations are stored in ephemeral React component state with no database persistence. All conversations are lost on navigation, refresh, or logout.

**Solution:** Implement database persistence using existing Supabase infrastructure. Create dedicated `director_conversations` and `director_messages` tables with RLS policies for account privacy. Modify API route to save/load messages. Modify component to restore conversation on mount.

**Feasibility:** High — existing authentication, database client, and patterns already proven in codebase (messaging, briefs, proposals all use identical Supabase patterns).

**Risk:** Low — new tables do not affect existing features. RLS policies prevent cross-account access. Rollback plan available.

**Effort Estimate:**
- Database migration: 1 hour (write SQL, test RLS policies)
- API route modifications: 2 hours (save/load logic, error handling)
- Component modifications: 3 hours (mount loading, history UI)
- Testing: 2 hours (manual testing with demo accounts)
- **Total: 8 hours**

**Next Agent:** Implementation agent should proceed with database migration first, then API route, then component modifications, testing after each step.

---

**Investigation Complete.**
