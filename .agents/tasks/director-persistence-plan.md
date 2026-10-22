# CineGen Director Conversation Persistence — Implementation Plan

**Plan Date:** December 2024  
**Task:** Implement persistent, account-specific Director conversations with database storage, RLS policies, and cross-device restoration  
**Status:** Ready for implementation  
**Priority:** P0 - Critical user experience bug

---

## 1. Database Schema Design

### 1.1 New Tables

Create two new tables for Director conversations, separate from the existing `messages` table (which is for brand-creator human-to-human messaging).

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/database/migrations/007_director_conversations.sql`

```sql
-- ============================================================================
-- Migration 007: CineGen Director Conversations
-- Persistent conversation storage for CineGen Director AI assistant
-- ============================================================================

-- ============================================================================
-- director_conversations Table
-- Stores conversation metadata (one row per conversation thread)
-- ============================================================================
CREATE TABLE IF NOT EXISTS director_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_director_conversations_user_id ON director_conversations(user_id);
CREATE INDEX idx_director_conversations_user_active ON director_conversations(user_id, is_active);
CREATE INDEX idx_director_conversations_last_message ON director_conversations(user_id, last_message_at DESC);

COMMENT ON TABLE director_conversations IS 'Conversation threads between users and CineGen Director AI assistant';
COMMENT ON COLUMN director_conversations.title IS 'Conversation title derived from first user message (max 255 chars)';
COMMENT ON COLUMN director_conversations.is_active IS 'Active conversation shown by default; false for deleted/archived';
COMMENT ON COLUMN director_conversations.last_message_at IS 'Timestamp of most recent message, for sorting conversation list';

-- ============================================================================
-- director_messages Table
-- Stores individual messages within conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS director_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES director_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  input_source VARCHAR(20) CHECK (input_source IN ('voice', 'text')),
  status VARCHAR(20) DEFAULT 'delivered' CHECK (status IN ('sending', 'delivered', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_director_messages_conversation ON director_messages(conversation_id, created_at);
CREATE INDEX idx_director_messages_conversation_role ON director_messages(conversation_id, role);

COMMENT ON TABLE director_messages IS 'Individual messages in Director conversations (user and assistant messages)';
COMMENT ON COLUMN director_messages.role IS 'Message sender: "user" (human) or "assistant" (CineGen Director AI)';
COMMENT ON COLUMN director_messages.input_source IS 'How user message was input: "voice" or "text". NULL for assistant messages.';
COMMENT ON COLUMN director_messages.status IS 'Message delivery status: "sending", "delivered", "error"';

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- Enforce ownership: users can only access their own conversations
-- ============================================================================

ALTER TABLE director_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can read their own conversations
CREATE POLICY "Users can read own director conversations"
ON director_conversations FOR SELECT
USING (auth.uid() = user_id);

-- Conversations: Users can create their own conversations
CREATE POLICY "Users can create own director conversations"
ON director_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Conversations: Users can update their own conversations
CREATE POLICY "Users can update own director conversations"
ON director_conversations FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Conversations: Users can soft-delete their own conversations
CREATE POLICY "Users can delete own director conversations"
ON director_conversations FOR DELETE
USING (auth.uid() = user_id);

-- Messages: Users can read messages in their own conversations
CREATE POLICY "Users can read own director messages"
ON director_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
);

-- Messages: Users can insert messages in their own conversations
CREATE POLICY "Users can insert messages in own director conversations"
ON director_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
);

-- Messages: Users can update message status in their own conversations
CREATE POLICY "Users can update own director messages"
ON director_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
);

-- ============================================================================
-- Update Triggers
-- Automatically update updated_at and last_message_at timestamps
-- ============================================================================

CREATE TRIGGER update_director_conversations_updated_at 
BEFORE UPDATE ON director_conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update conversation's last_message_at when a message is inserted
CREATE OR REPLACE FUNCTION update_director_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE director_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_last_message
AFTER INSERT ON director_messages
FOR EACH ROW EXECUTE FUNCTION update_director_conversation_last_message();

COMMENT ON FUNCTION update_director_conversation_last_message IS 'Updates conversation last_message_at when new message is inserted';
```

**Verify:** Run migration in Supabase dashboard SQL editor and check for errors.

---

## 2. API Route Architecture

### 2.1 Conversation Creation/Loading Route

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/conversations/route.ts`

**Purpose:** List user's conversations or create new conversation

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// GET /api/director/conversations
// Returns all conversations for authenticated user, sorted by last_message_at DESC
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Fetch user's conversations (active only by default)
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
    let query = supabase
      .from('director_conversations')
      .select('id, title, is_active, created_at, updated_at, last_message_at')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    const { data: conversations, error } = await query;
    
    if (error) {
      console.error('[Director Conversations] Fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
    }
    
    return NextResponse.json({ conversations: conversations || [] });
  } catch (err) {
    console.error('[Director Conversations] GET error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/director/conversations
// Creates a new conversation for authenticated user
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await req.json();
    const { title } = body;
    
    // Validate title
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    
    // Create conversation
    const { data: conversation, error } = await supabase
      .from('director_conversations')
      .insert({
        user_id: user.id,
        title: title.trim().substring(0, 255), // Enforce max length
        is_active: true
      })
      .select('id, title, is_active, created_at, updated_at, last_message_at')
      .single();
    
    if (error) {
      console.error('[Director Conversations] Create error:', error);
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }
    
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err) {
    console.error('[Director Conversations] POST error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Verify:** `npm run build` passes with no TypeScript errors, then test with authenticated request.

---

### 2.2 Single Conversation Retrieval Route

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/conversations/[id]/route.ts`

**Purpose:** Get conversation with all messages, or update/delete conversation

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// GET /api/director/conversations/[id]
// Returns conversation with all messages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const conversationId = params.id;
    
    // Fetch conversation (RLS ensures user owns it)
    const { data: conversation, error: convError } = await supabase
      .from('director_conversations')
      .select('id, title, is_active, created_at, updated_at, last_message_at')
      .eq('id', conversationId)
      .single();
    
    if (convError) {
      if (convError.code === 'PGRST116') {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      console.error('[Director Conversation] Fetch error:', convError);
      return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
    }
    
    // Fetch messages (RLS ensures user owns conversation)
    const { data: messages, error: msgError } = await supabase
      .from('director_messages')
      .select('id, role, content, input_source, status, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (msgError) {
      console.error('[Director Messages] Fetch error:', msgError);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
    
    return NextResponse.json({ 
      conversation,
      messages: messages || []
    });
  } catch (err) {
    console.error('[Director Conversation] GET error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/director/conversations/[id]
// Update conversation metadata (title, is_active)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const conversationId = params.id;
    const body = await req.json();
    const { title, is_active } = body;
    
    // Build update object with only provided fields
    const updates: any = {};
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ error: "title must be non-empty string" }, { status: 400 });
      }
      updates.title = title.trim().substring(0, 255);
    }
    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') {
        return NextResponse.json({ error: "is_active must be boolean" }, { status: 400 });
      }
      updates.is_active = is_active;
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }
    
    // Update conversation (RLS ensures user owns it)
    const { data: conversation, error } = await supabase
      .from('director_conversations')
      .update(updates)
      .eq('id', conversationId)
      .select('id, title, is_active, created_at, updated_at, last_message_at')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      console.error('[Director Conversation] Update error:', error);
      return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
    }
    
    return NextResponse.json({ conversation });
  } catch (err) {
    console.error('[Director Conversation] PATCH error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/director/conversations/[id]
// Soft-delete conversation (set is_active = false)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const conversationId = params.id;
    
    // Soft delete: set is_active = false (RLS ensures user owns it)
    const { error } = await supabase
      .from('director_conversations')
      .update({ is_active: false })
      .eq('id', conversationId);
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      console.error('[Director Conversation] Delete error:', error);
      return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[Director Conversation] DELETE error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Verify:** `npm run build` passes, then test GET/PATCH/DELETE with authenticated requests.

---

### 2.3 Message Submission Route

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/conversations/[id]/messages/route.ts`

**Purpose:** Add message to conversation with idempotency

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// POST /api/director/conversations/[id]/messages
// Adds a message to the conversation (idempotent using client-provided message ID)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const conversationId = params.id;
    const body = await req.json();
    const { role, content, input_source, idempotency_key } = body;
    
    // Validate inputs
    if (!role || !['user', 'assistant'].includes(role)) {
      return NextResponse.json({ error: "role must be 'user' or 'assistant'" }, { status: 400 });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    if (input_source && !['voice', 'text'].includes(input_source)) {
      return NextResponse.json({ error: "input_source must be 'voice' or 'text'" }, { status: 400 });
    }
    
    // Verify conversation exists and user owns it (RLS check)
    const { data: conversation, error: convError } = await supabase
      .from('director_conversations')
      .select('id')
      .eq('id', conversationId)
      .single();
    
    if (convError) {
      if (convError.code === 'PGRST116') {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
      console.error('[Director Messages] Conversation check error:', convError);
      return NextResponse.json({ error: "Failed to verify conversation" }, { status: 500 });
    }
    
    // Idempotency check: if idempotency_key provided, check for existing message
    if (idempotency_key) {
      // Use a custom metadata column or external cache for production-grade idempotency
      // For now, check if identical message exists within last 5 seconds
      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      const { data: existing } = await supabase
        .from('director_messages')
        .select('id, role, content, input_source, status, created_at')
        .eq('conversation_id', conversationId)
        .eq('role', role)
        .eq('content', content.trim())
        .gte('created_at', fiveSecondsAgo)
        .limit(1)
        .single();
      
      if (existing) {
        // Idempotent: return existing message
        return NextResponse.json({ message: existing, idempotent: true }, { status: 200 });
      }
    }
    
    // Insert message (RLS ensures user owns conversation)
    const { data: message, error: msgError } = await supabase
      .from('director_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content: content.trim(),
        input_source: input_source || null,
        status: 'delivered'
      })
      .select('id, role, content, input_source, status, created_at')
      .single();
    
    if (msgError) {
      console.error('[Director Messages] Insert error:', msgError);
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
    }
    
    return NextResponse.json({ message, idempotent: false }, { status: 201 });
  } catch (err) {
    console.error('[Director Messages] POST error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Verify:** `npm run build` passes, then test POST with authenticated request and duplicate detection.

---

### 2.4 Chat Route Modifications

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/chat/route.ts`

**Changes:**
1. Replace cookie-based user extraction with Supabase Auth
2. Accept `conversationId` from client; create conversation if null
3. Load conversation history from database instead of receiving from client
4. Save user message and assistant response to database
5. Return `conversationId` in response

**Modified sections:**

```typescript
// Line 5: Add new imports
import { createServerClient } from "@/lib/supabase-server";

// Lines 24-37: REPLACE cookie parsing with Supabase Auth
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user's name for personalization
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();
    
    const displayName = userData?.name || '';
    
    const body = await req.json();
    const { message, conversationId, replyLanguage, inputSource }: {
      message: string;
      conversationId?: string | null;
      replyLanguage?: string;
      inputSource?: 'voice' | 'text';
    } = body;

    // Validate inputs
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    
    // Rate limit: 20 requests per minute per user
    const rateCheck = checkRateLimit(user.id, 'director-chat', 20, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: "Too many requests. Please slow down a bit.", 
          retryAfterMs: rateCheck.retryAfterMs 
        },
        { status: 429 }
      );
    }
    
    // Get or create conversation
    let activeConversationId = conversationId;
    let conversationTitle = '';
    
    if (!activeConversationId) {
      // Create new conversation with title derived from first message
      conversationTitle = message.length > 50 
        ? message.substring(0, 47) + '...' 
        : message;
      
      const { data: newConv, error: convError } = await supabase
        .from('director_conversations')
        .insert({
          user_id: user.id,
          title: conversationTitle,
          is_active: true
        })
        .select('id')
        .single();
      
      if (convError) {
        console.error('[Director Chat] Failed to create conversation:', convError);
        return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
      }
      
      activeConversationId = newConv.id;
    } else {
      // Verify conversation exists and user owns it (RLS check)
      const { data: existingConv, error: convError } = await supabase
        .from('director_conversations')
        .select('id')
        .eq('id', activeConversationId)
        .single();
      
      if (convError) {
        console.error('[Director Chat] Conversation not found:', convError);
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    }
    
    // Save user message to database
    const { error: userMsgError } = await supabase
      .from('director_messages')
      .insert({
        conversation_id: activeConversationId,
        role: 'user',
        content: message.trim(),
        input_source: inputSource || null,
        status: 'delivered'
      });
    
    if (userMsgError) {
      console.error('[Director Chat] Failed to save user message:', userMsgError);
      // Continue processing despite save failure
    }
    
    // Load conversation history from database (last 20 messages)
    const { data: historyMessages } = await supabase
      .from('director_messages')
      .select('role, content, created_at')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    const conversationHistory: ConversationMessage[] = (historyMessages || [])
      .reverse()
      .map(m => ({ 
        role: m.role as 'user' | 'assistant', 
        text: m.content, 
        timestamp: Date.parse(m.created_at) 
      }));

    // Generate response using Gemini (existing function)
    const response = await generateConversationalResponse(
      message,
      conversationHistory,
      displayName,
      replyLanguage || 'en-US',
      req.headers.get('x-mock-failure') as '503' | 'success' | '503-503-success' | '503-persistent' | undefined
    );
    
    // Save assistant response to database
    if (!response.error) {
      const { error: assistantMsgError } = await supabase
        .from('director_messages')
        .insert({
          conversation_id: activeConversationId,
          role: 'assistant',
          content: response.reply,
          status: 'delivered'
        });
      
      if (assistantMsgError) {
        console.error('[Director Chat] Failed to save assistant message:', assistantMsgError);
        // Continue and return response despite save failure
      }
    }

    return NextResponse.json({
      ...response,
      conversationId: activeConversationId
    });
  } catch (err) {
    console.error('Director chat API error:', err);
    
    // Return honest error fallback
    return NextResponse.json({
      reply: "I'm having trouble connecting to my AI service right now. You can try typing mode, browse our creator discovery, or come back in a moment.",
      action: "none",
      error: true
    });
  }
}
```

**Verify:** `npm run build` passes, then test authenticated conversation flow.

---

## 3. Component Integration

### 3.1 CineGenDirector Component Modifications

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx`

**Changes:**

**1. Add conversationId state (line ~42):**

```typescript
const [conversationId, setConversationId] = useState<string | null>(null);
const [loadingConversation, setLoadingConversation] = useState(true);
```

**2. Remove conversationHistory state (line ~40) — server loads from DB**

**3. Add conversation loading effect (after line ~100):**

```typescript
// Load latest active conversation on mount
useEffect(() => {
  if (!user) {
    setLoadingConversation(false);
    return;
  }
  
  async function loadLatestConversation() {
    setLoadingConversation(true);
    try {
      const res = await fetch('/api/director/conversations');
      if (!res.ok) {
        console.error('Failed to load conversations:', await res.text());
        setLoadingConversation(false);
        return;
      }
      
      const data = await res.json();
      const conversations = data.conversations || [];
      
      if (conversations.length > 0) {
        // Load most recent active conversation
        const latest = conversations[0];
        setConversationId(latest.id);
        
        // Load messages
        const msgRes = await fetch(`/api/director/conversations/${latest.id}`);
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          const loadedMessages = (msgData.messages || []).map((m: any) => ({
            role: m.role,
            text: m.content,
            timestamp: Date.parse(m.created_at)
          }));
          setMessages(loadedMessages);
        }
      } else {
        // No conversations yet — will be created on first message
        setConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoadingConversation(false);
    }
  }
  
  loadLatestConversation();
}, [user]);
```

**4. Update handleUserMessage to pass conversationId (line ~300):**

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
  
  setState("processing");
  setErrorMessage("");
  
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
      signal: abortControllerRef.current?.signal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // If new conversation, save the ID
    if (data.conversationId && !conversationId) {
      setConversationId(data.conversationId);
    }
    
    // Add assistant response to UI
    const assistantMessage: ConversationMessage = {
      role: "assistant",
      text: data.reply,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, assistantMessage]);
    
    // ... rest of existing logic (TTS, action execution) ...
  } catch (error) {
    // ... existing error handling ...
  }
}, [conversationId, replyLanguage, isMuted, selectedVoice, router]);
```

**5. Add "New Chat" button (in JSX near line ~800):**

```typescript
const startNewConversation = useCallback(() => {
  setConversationId(null);
  setMessages([]);
  setState("off");
  setTranscript("");
  setErrorMessage("");
}, []);

// In JSX, add button next to settings:
<button
  onClick={startNewConversation}
  className="px-3 py-1.5 text-sm bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-colors"
  title="Start new conversation"
>
  New Chat
</button>
```

**6. Add conversation history UI (optional enhancement, not required for MVP):**

Create a sidebar showing past conversations with titles and timestamps. Click to load a conversation. Include delete button with confirmation.

**Verify:** Component compiles with no TypeScript errors, renders correctly in browser.

---

### 3.2 TypeScript Type Updates

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/types/index.ts`

**Add after line ~300:**

```typescript
// ─── Director Conversation Types ──────────────────────────────────────────

export interface DirectorConversation {
  id: string;
  user_id: string;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface DirectorMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  input_source?: 'voice' | 'text' | null;
  status: 'sending' | 'delivered' | 'error';
  created_at: string;
}
```

**Verify:** `npm run build` passes with no type errors.

---

## 4. Unrequested Navigation Fix

### 4.1 Issue Analysis

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/chat/route.ts`

**Problem:** User asks "What's the top campaign today?" and is redirected to Discover page.

**Root Cause:** Gemini AI system prompt (line ~100) instructs it to suggest `action: "open_discovery"` when user mentions marketplace keywords like "campaigns", "creators", etc. This triggers automatic navigation even for informational questions.

**Solution:** Update system prompt to distinguish between:
- **Informational questions** → Answer with data or explanation, no navigation
- **Explicit navigation requests** → Return action to navigate

**Modified prompt section (line ~140):**

```typescript
const systemPrompt = `You are the CineGen Director, a friendly creative assistant helping users with CineGen, an AI content marketplace connecting brands with creators.

// ... existing language instructions ...

YOUR ROLE & PERSONALITY:
- Conversational creative partner, not a salesperson or form-filler
- Warm, helpful, concise (1-3 sentences unless explaining something complex)
- Answer the user's ACTUAL question directly
- Handle casual chat, general questions, creative brainstorming, and campaign planning
- Use conversation history for context and follow-ups
- Ask ONE short clarification when truly ambiguous
- Stay friendly without forcing every reply toward campaign creation

WHAT YOU CAN DO:
1. **Casual conversation**: Answer greetings, small talk, general questions naturally
2. **Explain CineGen**: Describe the marketplace, how it works, creator discovery
3. **Creative brainstorming**: Help develop video ideas, suggest approaches, inspire
4. **Campaign planning**: When user wants to create a brief, extract campaign details
5. **Follow-ups & refinements**: Modify previous suggestions based on new requests
6. **Navigation help**: Suggest opening discovery, brief builder ONLY when explicitly requested

CRITICAL NAVIGATION RULES:
- **Informational questions** (e.g., "What's the top campaign?", "Tell me about creators", "How does discovery work?") → ANSWER the question, do NOT navigate
- **Explicit requests** (e.g., "Show me creators", "Open discovery", "Take me to briefs") → Return appropriate action
- If ranking/top data doesn't exist, say "I don't have access to live campaign rankings" and offer to show the discovery page if they want to browse
- NEVER navigate based on keywords alone — user intent must be a navigation request

ACTIONS YOU CAN RETURN:
- "open_discovery": User explicitly requested to view creator discovery page
- "prepare_brief": User ready to turn conversation into a formal brief
- "none": (default) Just conversational response

// ... rest of existing prompt ...
`;
```

**Test Case:**
- User: "What's the top campaign today?"
- Expected: "I don't have access to live campaign rankings, but I can show you the discovery page to browse all creators. Would you like that?"
- Action: "none" (no automatic navigation)

**Verify:** Send test message, confirm no unwanted navigation occurs.

---

## 5. Logout and Authentication Behavior

### 5.1 Component Cleanup on Logout

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx`

**Add effect to clear state on user change (line ~130):**

```typescript
// Clear state when user logs out or switches accounts
useEffect(() => {
  if (!user) {
    // User logged out: clear all conversation state
    setConversationId(null);
    setMessages([]);
    setState("off");
    setTranscript("");
    setErrorMessage("");
    
    // Abort pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Stop any active speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }
    
    // Cancel TTS
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}, [user?.id]); // Trigger on user ID change (logout or account switch)
```

**Verify:** Log out, confirm conversation state clears; log back in, confirm saved conversation restores.

---

## 6. Testing Strategy

### 6.1 Database and RLS Tests

**Test Scenarios:**

1. **Conversation Creation**
   - Brand account creates conversation → verify `user_id` matches brand user ID
   - Creator account creates conversation → verify `user_id` matches creator user ID
   - Guest tries to create conversation → verify 401 Unauthorized

2. **Message Persistence**
   - Send 10 messages (5 user, 5 assistant) → verify all saved with correct timestamps
   - Navigate away and back → verify messages restore in correct order
   - Refresh page → verify messages persist

3. **Cross-Account Isolation**
   - Brand creates conversation → get conversation ID
   - Creator account tries `GET /api/director/conversations/{brand-conversation-id}` → verify 404 or empty result (RLS blocks)
   - Creator account tries `POST /api/director/conversations/{brand-conversation-id}/messages` → verify 404 or permission denied

4. **Logout/Login Persistence**
   - Brand logs in → creates conversation with 5 messages
   - Brand logs out
   - Brand logs back in → verify conversation and messages restore
   - Different brand account logs in → verify they do NOT see first brand's conversations

5. **Idempotency**
   - Send message twice with same `idempotency_key` → verify only 1 message saved
   - Send message, network fails, retry → verify no duplicate messages

**Test Commands:**

```bash
# Manual API testing with curl
# (Replace {TOKEN} with actual Supabase auth token from browser)

# Create conversation
curl -X POST http://localhost:3000/api/director/conversations \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test conversation"}'

# List conversations
curl http://localhost:3000/api/director/conversations \
  -H "Authorization: Bearer {TOKEN}"

# Get conversation with messages
curl http://localhost:3000/api/director/conversations/{CONVERSATION_ID} \
  -H "Authorization: Bearer {TOKEN}"

# Add message
curl -X POST http://localhost:3000/api/director/conversations/{CONVERSATION_ID}/messages \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"role": "user", "content": "Test message", "input_source": "text"}'

# Soft delete
curl -X DELETE http://localhost:3000/api/director/conversations/{CONVERSATION_ID} \
  -H "Authorization: Bearer {TOKEN}"
```

**Verify:** All tests pass with expected responses and correct RLS enforcement.

---

### 6.2 Component Integration Tests

**Test Scenarios:**

1. **Initial Load**
   - Open landing page as brand → verify loading state shown → verify latest conversation loads
   - Open landing page as creator → verify loading state shown → verify latest conversation loads
   - Open landing page as guest (not logged in) → verify default greeting, no conversation loaded

2. **Voice Input Persistence**
   - Enable voice mode → say "Hey CineGen, create a campaign for fitness"
   - Verify message appears in UI
   - Navigate to /creators → navigate back
   - Verify voice message persisted

3. **Text Input Persistence**
   - Switch to typing mode → type "What can you help me with?"
   - Verify message appears in UI
   - Refresh page (Cmd+R)
   - Verify text message persisted

4. **New Chat Flow**
   - Have 5-message conversation
   - Click "New Chat" button
   - Verify UI clears
   - Send new message → verify new conversation created in database
   - Verify old conversation still exists in database (not deleted)

5. **Navigation Interruption**
   - Send message that triggers navigation (e.g., Director suggests "Let me show you our creators")
   - Verify message saved BEFORE navigation occurs
   - Navigate to target page
   - Navigate back → verify message persisted

6. **Error Recovery**
   - Disable network → send message → verify error shown
   - Re-enable network → retry → verify message saves without duplicates

**Verify:** Manual testing confirms all scenarios work as expected.

---

### 6.3 Security and Isolation Tests

**Test Scenarios:**

1. **RLS Policy Enforcement**
   - Log in as `brand@cinegen.demo` → create conversation → note conversation ID
   - Log out
   - Log in as `creator@cinegen.demo`
   - Manually craft API request to brand's conversation ID
   - Verify 404 or empty result (RLS blocks cross-account access)

2. **Service Role Bypass (verify it exists for admin operations)**
   - In Supabase SQL editor, run with service role:
     ```sql
     SELECT * FROM director_conversations;
     ```
   - Verify all conversations visible (service role bypasses RLS)
   - In browser with anon key:
     ```sql
     SELECT * FROM director_conversations;
     ```
   - Verify only authenticated user's conversations visible

3. **Token Expiry**
   - Log in → start conversation
   - Wait for session to expire (or manually delete auth cookie)
   - Send message → verify 401 Unauthorized
   - Re-login → verify conversation still exists

**Verify:** All security tests pass with proper isolation and auth enforcement.

---

## 7. Implementation Sequence

### Phase 1: Database Schema (Day 1)

1. Create migration file `007_director_conversations.sql`
2. Run migration in Supabase dashboard SQL editor
3. Verify tables created with correct indexes and RLS policies
4. Test RLS policies with manual SQL queries

**Verify:** Tables exist, RLS enforced, triggers work.

---

### Phase 2: API Routes (Day 2-3)

1. Create `/api/director/conversations/route.ts` (GET, POST)
2. Create `/api/director/conversations/[id]/route.ts` (GET, PATCH, DELETE)
3. Create `/api/director/conversations/[id]/messages/route.ts` (POST)
4. Modify `/api/director/chat/route.ts` to use database persistence
5. Run `npm run build` after each file to verify TypeScript correctness
6. Test each route with curl/Postman

**Verify:** All routes return expected responses, auth enforced, database writes succeed.

---

### Phase 3: Component Integration (Day 4-5)

1. Add TypeScript types to `types/index.ts`
2. Modify `CineGenDirector.tsx`:
   - Add conversationId state
   - Add conversation loading effect
   - Update handleUserMessage to pass conversationId
   - Add logout cleanup effect
   - Add "New Chat" button
3. Run `npm run dev` and test in browser
4. Test voice input → navigate away → return → verify persistence
5. Test text input → refresh → verify persistence
6. Test "New Chat" → verify new conversation created

**Verify:** UI updates correctly, persistence works, no console errors.

---

### Phase 4: Navigation Fix (Day 5)

1. Modify system prompt in `/api/director/chat/route.ts`
2. Add explicit navigation rules distinguishing informational vs action requests
3. Test with: "What's the top campaign today?" → verify no navigation
4. Test with: "Show me creators" → verify navigation occurs

**Verify:** Navigation only triggers on explicit requests, not informational questions.

---

### Phase 5: Testing and Verification (Day 6)

1. Run all database/RLS tests (section 6.1)
2. Run all component integration tests (section 6.2)
3. Run all security/isolation tests (section 6.3)
4. Test with both brand and creator accounts
5. Test cross-device: log in on different browser, verify conversation loads
6. Test logout/login cycle: verify conversation persists

**Verify:** All tests pass, no data leakage, conversations persist correctly.

---

## 8. Known Limitations and Future Enhancements

### Current Limitations

1. **Conversation History UI:** No sidebar showing past conversations (add in future iteration)
2. **Search:** No conversation search by content or date
3. **Export:** No way to export conversation transcript
4. **Hard Delete:** Soft delete only (is_active=false); no hard delete option
5. **Message Edit:** No way to edit or delete individual messages after sending
6. **Conversation Merge:** Cannot merge multiple conversations
7. **Conversation Rename:** Must use PATCH API; no inline rename in UI

### Future Enhancements

1. **Conversation Sidebar:** Show list of past conversations with preview of last message
2. **Conversation Search:** Full-text search across messages
3. **Conversation Sharing:** Generate shareable link (with user consent)
4. **Message Reactions:** Thumbs up/down on assistant responses for feedback
5. **Conversation Analytics:** Track response quality, user satisfaction
6. **Voice-Specific Features:** Save audio clips (currently saves transcripts only)
7. **Multi-Language Conversations:** Allow language switching mid-conversation
8. **Conversation Templates:** Pre-populate conversations for common workflows

---

## 9. Rollback Plan

If persistence causes issues in production:

1. **Immediate Rollback:**
   - Remove persistence from `/api/director/chat/route.ts` (revert to passing history from client)
   - Remove conversation loading effect from `CineGenDirector.tsx`
   - Component reverts to ephemeral state (no database writes)
   - Users lose persistence but feature remains functional

2. **Database Cleanup:**
   - Do NOT drop tables immediately (preserve user data)
   - Set `is_active = false` on all conversations to hide them
   - Archive tables after 30 days if rollback is permanent

3. **Gradual Re-Enable:**
   - Fix issue identified during rollback
   - Re-enable persistence for demo accounts only
   - Test thoroughly
   - Re-enable for all users once stable

---

## 10. Success Criteria

### Functional Requirements Met

- ✅ Conversations persist across navigation
- ✅ Conversations persist across page refresh
- ✅ Conversations persist across browser close/reopen
- ✅ Conversations persist across logout/login
- ✅ Conversations accessible from different devices (same account)
- ✅ Brand accounts cannot access creator conversations
- ✅ Creator accounts cannot access brand conversations
- ✅ Voice and text input both persist
- ✅ New conversation creation works
- ✅ Unrequested navigation fixed

### Technical Requirements Met

- ✅ Database schema includes proper indexes
- ✅ RLS policies enforce ownership on all operations
- ✅ API routes use Supabase Auth, not client-provided user IDs
- ✅ Message writes are idempotent
- ✅ Timestamps are server-generated
- ✅ Build passes with 0 TypeScript errors
- ✅ No console errors in browser
- ✅ No N+1 query problems (conversation + messages fetched in 2 queries)

### User Experience Requirements Met

- ✅ Loading state shown while restoring conversation
- ✅ Conversation loads automatically on mount (no manual "Load" button)
- ✅ "New Chat" button creates new conversation
- ✅ Logout clears in-memory state
- ✅ Login restores saved conversation
- ✅ No duplicate messages on retry
- ✅ No automatic speech playback on history restore

---

## 11. File Checklist

### New Files

- [ ] `/Users/shaisthashaik/Desktop/Cinegen/cinegen/database/migrations/007_director_conversations.sql`
- [ ] `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/conversations/route.ts`
- [ ] `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/conversations/[id]/route.ts`
- [ ] `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/conversations/[id]/messages/route.ts`

### Modified Files

- [ ] `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/chat/route.ts` (auth + persistence + navigation fix)
- [ ] `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx` (conversationId state + loading + cleanup)
- [ ] `/Users/shaisthashaik/Desktop/Cinegen/cinegen/types/index.ts` (DirectorConversation + DirectorMessage types)

### Verification Commands

```bash
# Build check
npm run build

# TypeScript check
npx tsc --noEmit

# Start dev server
npm run dev

# Run database migration (in Supabase SQL editor)
# Paste contents of 007_director_conversations.sql
```

---

## 12. Final Notes

This plan follows the existing CineGen architecture patterns:
- Uses Supabase Auth with JWT tokens (not cookie-based sessions)
- Follows existing API route structure (see `/app/api/messages/route.ts` pattern)
- Uses RLS policies for access control (see existing schema.sql)
- Maintains separation between Director conversations and brand-creator messaging
- Preserves existing Web Speech Recognition and Gemini AI integration
- No changes to voice settings, language selection, or TTS functionality

**Build Tool:** Next.js 14.2.35  
**Test Command:** `npm run dev`  
**Verification Command:** `npm run build` (must pass with 0 errors)  
**Database:** Supabase PostgreSQL 15.x (hosted, not local)

**All file paths are absolute as required.**

---

**Plan complete. Ready for implementation.**
