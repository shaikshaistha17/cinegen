# Baseline Investigation Report: Kampus Integration

**Investigation Date:** December 21, 2024  
**Repository:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen`  
**Reference:** `/tmp/cinegen-reference`  
**Branch:** `master`  
**Status:** Build passes (0 TypeScript errors), 13 ESLint warnings (exhaustive-deps only)

---

## Executive Summary

**Target State:** Production-ready CineGen marketplace with full backend infrastructure, authentication, and workflow features
- ✅ Supabase PostgreSQL database with 14+ tables
- ✅ Row-Level Security (RLS) policies enforced
- ✅ Authentication via Supabase Auth (email/password, OAuth)
- ✅ Real-time messaging, verification system, reviews
- ✅ CineGen Director (conversational AI) with persistent conversations
- ✅ Decision Room workflow (idea → directions → evidence → delivery)
- ✅ Agreements, deliveries, project messages, scope changes

**Reference State:** Earlier prototype with client-side localStorage patterns
- ⚠️ localStorage-based notifications (not database-backed)
- ⚠️ Client-side Stripe card form (not using Stripe Elements)
- ⚠️ Mock copyright scan results (no backend integration)
- ❌ No payment/notification tables in database

**Gap:** The target repository has evolved significantly beyond the reference. The reference contains anti-patterns that must NOT be copied.

---

## 1. Database Schema Analysis

### Core Tables (schema.sql)

**Authentication & Users**
```sql
users (id, email, password_hash, role, name, is_demo, created_at, updated_at)
  - Roles: 'brand', 'creator', 'guest', 'admin'
  - RLS: Users can update own data except role/is_demo
  - Indexes: email, role, is_demo (where true)
```

**Profile Tables**
```sql
creator_profiles (id, user_id, handle, avatar_url, cover_url, headline, bio, 
                 location, hourly_rate_inr, availability, specializations, 
                 skills, verified_tools JSONB, languages, stats JSONB, 
                 verification JSONB, portfolio JSONB, joined_at, created_at, updated_at)
  - Foreign Key: user_id → users(id) ON DELETE CASCADE
  - Unique: handle
  - RLS: Demo isolation policies prevent cross-contamination
  - Indexes: user_id, handle, availability, hourly_rate_inr

brand_profiles (id, user_id, company_name, website, industry, created_at, updated_at)
  - Foreign Key: user_id → users(id) ON DELETE CASCADE
  - RLS: Demo isolation policies
  - Indexes: user_id
```

**Marketplace Tables**
```sql
briefs (id, brand_id, campaign_title, objective, content_type, style, 
       aspect_ratios, duration_seconds, resolution, quantity, tools_preferred, 
       reference_links, budget_min, budget_max, deadline, commercial_use JSONB, 
       negative_keywords, status, generated_by_ai, raw_idea, created_at, updated_at)
  - Foreign Key: brand_id → brand_profiles(id) ON DELETE CASCADE
  - Status: 'Draft', 'Open', 'In Review', 'Hired', 'In Production', 'Delivered'
  - Currency: INR (budget_min/budget_max are integers)
  - RLS: Public can read Open briefs; brands see their own drafts
  - Indexes: brand_id, status, content_type, deadline

proposals (id, brief_id, creator_id, message, price, timeline_days, status, 
          created_at, updated_at)
  - Foreign Keys: brief_id → briefs(id), creator_id → creator_profiles(id) ON DELETE CASCADE
  - Status: 'Pending', 'Shortlisted', 'Accepted', 'Rejected'
  - Currency: INR (price is integer)
  - Unique: One proposal per (brief_id, creator_id) pair
  - Indexes: brief_id, creator_id, status

messages (id, conversation_id, sender_id, recipient_id, content, read_at, created_at)
  - Foreign Keys: sender_id → users(id), recipient_id → users(id) ON DELETE CASCADE
  - RLS: Users can read their own messages; demo isolation enforced
  - Indexes: conversation_id, sender_id, recipient_id, read_at

reviews (id, brief_id, creator_id, brand_id, rating, comment, created_at)
  - Foreign Keys: brief_id → briefs(id), creator_id → creator_profiles(id), 
                 brand_id → brand_profiles(id) ON DELETE CASCADE
  - Rating: CHECK (rating >= 1 AND rating <= 5)
  - Indexes: creator_id, brand_id, brief_id

verifications (id, creator_id, verification_type, status, evidence_url, 
              admin_notes, reviewed_by, reviewed_at, created_at)
  - Foreign Keys: creator_id → creator_profiles(id), 
                 reviewed_by → users(id) ON DELETE CASCADE
  - Type: 'tools', 'workflow', 'past_work'
  - Status: 'pending', 'approved', 'rejected'
  - RLS: Admins can read/update all; creators read own
  - Indexes: creator_id, status, verification_type
```

### Delivery Workflow Tables (002_delivery_workflow.sql, 004_agreements_and_deliveries.sql)

**Agreements (Immutable Contracts)**
```sql
agreements (id, brief_id, proposal_id, creator_id, brand_id, version, 
           deliverables JSONB, price, currency, milestones JSONB, 
           included_revisions, usage_requirements JSONB, 
           creator_accepted_at, brand_accepted_at, both_accepted BOOLEAN GENERATED, 
           created_at, updated_at)
  - Foreign Keys: brief_id → briefs(id), proposal_id → proposals(id), 
                 creator_id → creator_profiles(id), brand_id → brand_profiles(id) 
                 ON DELETE CASCADE
  - Unique: (proposal_id, version) - versioned agreements
  - Currency: 'INR' (price is integer)
  - RLS: Participants (creator/brand) can read own agreements
        Creators/brands can update their respective acceptance timestamps
  - Indexes: brief_id, proposal_id, creator_id, brand_id, both_accepted

deliveries (id, agreement_id, creator_id, version, file_path, file_name, 
           file_size_bytes, mime_type, inspection_status, inspection_results JSONB, 
           inspected_at, brand_approved_at, approval_notes, created_at)
  - Foreign Keys: agreement_id → agreements(id), creator_id → creator_profiles(id) 
                 ON DELETE CASCADE
  - Unique: (agreement_id, version) - one delivery per version
  - Status: 'pending', 'pass', 'fail', 'unsupported', 'error'
  - RLS: Creators can upload; participants can read; brands can approve
  - Storage: Private 'deliveries' bucket with RLS policies
  - Indexes: agreement_id, creator_id, inspection_status

project_messages (id, agreement_id, sender_id, message_type, content, 
                 delivery_version, video_timestamp_seconds, proposed_changes JSONB, 
                 change_accepted_by_creator, change_accepted_by_brand, created_at)
  - Foreign Keys: agreement_id → agreements(id), sender_id → users(id) ON DELETE CASCADE
  - Type: 'comment', 'revision_request', 'scope_change_request'
  - RLS: Participants can insert/read messages for their agreements
  - Immutable: No UPDATE or DELETE policies
  - Indexes: agreement_id, sender_id, message_type

scope_changes (id, agreement_id, message_id, previous_version, new_version, 
              changes_summary, price_delta, deadline_delta_days, 
              creator_accepted_at, brand_accepted_at, both_accepted BOOLEAN GENERATED, 
              applied_at, created_at)
  - Foreign Keys: agreement_id → agreements(id), message_id → project_messages(id) 
                 ON DELETE CASCADE
  - RLS: Service role inserts; participants can read/accept
  - Indexes: agreement_id, message_id, both_accepted
```

### CineGen Director Tables (007_director_conversations.sql)

**Conversational AI Storage**
```sql
director_conversations (id, user_id, title, is_active, created_at, updated_at, 
                       last_message_at)
  - Foreign Key: user_id → auth.users(id) ON DELETE CASCADE
  - RLS: Users can CRUD their own conversations
  - Indexes: user_id, (user_id, is_active), (user_id, last_message_at DESC)
  - Triggers: update_updated_at_column on UPDATE

director_messages (id, conversation_id, role, content, input_source, status, created_at)
  - Foreign Key: conversation_id → director_conversations(id) ON DELETE CASCADE
  - Role: 'user', 'assistant'
  - Input Source: 'voice', 'text' (NULL for assistant)
  - Status: 'sending', 'delivered', 'error'
  - RLS: Users can read/insert/update messages in their own conversations
  - Indexes: (conversation_id, created_at), (conversation_id, role)
  - Triggers: update_conversation_last_message on INSERT
```

### Decision Room Tables (009_decision_rooms.sql)

**Idea-to-Brief Workflow**
```sql
decision_rooms (id, user_id, idea_text, requirements JSONB, selected_direction JSONB, 
               selected_creator_id, linked_brief_id, stage_progress JSONB, 
               created_at, updated_at)
  - Foreign Keys: user_id → auth.users(id), 
                 selected_creator_id → creator_profiles(id), 
                 linked_brief_id → briefs(id) ON DELETE CASCADE
  - Stage Progress: { idea, directions, evidence, review, passport }
  - RLS: Users can CRUD their own rooms
  - Indexes: user_id, linked_brief_id, created_at DESC
  - Triggers: update_updated_at_column on UPDATE
```

### Currency Migration (008_convert_currency_to_inr.sql)

**All prices converted to INR**
- Migration 008 converted USD to INR (multiply by 83)
- All price columns now store integers in Indian Rupees (no paise)
- Fields affected: creator_profiles.hourly_rate_inr, briefs.budget_min/max, 
                  proposals.price, agreements.price

### Missing Tables (Not Implemented)

**No payment/transaction tables** - No Stripe integration, no payment_intents, no escrow tracking
**No notification tables** - Reference uses localStorage; target has no replacement
**No creator_services table** - Migration 001 references it but schema.sql does not define it

### RLS Pattern Summary

**Ownership-based policies:**
- Users own their profile data (creator_profiles.user_id, brand_profiles.user_id)
- Proposals owned by creator (proposals.creator_id → creator_profiles.id → users.id)
- Briefs owned by brand (briefs.brand_id → brand_profiles.id → users.id)
- Messages accessible by sender/recipient
- Agreements accessible by creator or brand

**Admin policies:**
- Admins (role='admin') can read all users and verifications
- Admins can update verification status

**Demo isolation:**
- Demo accounts (is_demo=true) are sandboxed
- Demo users can only see demo creators, demo brands, demo briefs
- Prevents demo activity from polluting real data

**Critical RLS gaps for payment/notification:**
- No transaction table → no policies needed yet
- No notification table → no policies needed yet

---

## 2. Authentication Architecture

### Supabase Auth Setup

**Provider:** Supabase Auth (JWT-based)
- Email/password with bcrypt hashing (10 salt rounds, via bcryptjs)
- OAuth providers: Google (configured)
- OTP verification: 6-digit code, 15-minute expiry (in-memory Map, not persistent)

**Session Management:**
- JWT access tokens with automatic refresh
- Server-side: `@/lib/supabase-server.ts` via cookies
- Client-side: `@/lib/supabase.ts` with auto-refresh

**Authentication Files:**

`lib/auth.ts` - Core auth operations
```typescript
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole; // 'brand' | 'creator' | 'guest' | 'admin'
}

signUp(email, password, name, role) // Supabase Auth signup with metadata
signIn(email, password)              // Email/password login
signOut()                            // Clear session
getSession()                         // Retrieve current session
getCurrentProfile()                  // Fetch user profile from 'profiles' table
onAuthChange(callback)               // Subscribe to auth state changes
```

`lib/auth-context.tsx` - React context for client-side auth state
```typescript
export function AuthProvider({ children }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Loads profile on mount
  // Subscribes to auth changes via supabase.auth.onAuthStateChange
}

export function useAuth() {
  return useContext(AuthContext); // { user, loading, refresh }
}
```

`lib/auth-helpers.ts` - Password hashing and OTP utilities
```typescript
hashPassword(password)        // bcrypt.hash with 10 salt rounds
verifyPassword(password, hash) // bcrypt.compare
generateOTP()                  // 6-digit code
storeOTP(email, code, expiresAt) // In-memory Map (not persistent!)
verifyOTP(email, code)         // Check code + expiry
```

### API Route Authentication Pattern

**Session verification in API routes:**
```typescript
// Example from app/api/messages/route.ts
const supabase = createClient(); // Uses cookies automatically
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Get user's profile to resolve role
const { data: profile } = await supabase
  .from('creator_profiles')
  .select('id')
  .eq('user_id', user.id)
  .single();

if (!profile) {
  return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
}

// RLS policies enforce row-level access
const { data, error } = await supabase
  .from('messages')
  .insert({ sender_id: user.id, ... })
  .select();
```

**Brand/Creator Resolution:**
- Brand role: Query `brand_profiles` WHERE `user_id = auth.uid()` → get `brand_id`
- Creator role: Query `creator_profiles` WHERE `user_id = auth.uid()` → get `creator_id`
- All API routes follow this pattern (see `app/api/briefs/route.ts`, `app/api/proposals/route.ts`)

### Middleware (middleware.ts)

**Route protection:**
- Public routes: `/`, `/login`, `/register`, `/creators`, `/creators/[id]`
- Protected routes: `/dashboard`, `/briefs/new`, `/messages`, `/projects/*`
- Redirects unauthenticated users to `/login`
- Uses `@supabase/ssr` for cookie-based session management

---

## 3. Reference Repository Analysis

**Location:** `/tmp/cinegen-reference`

### Problematic Patterns (DO NOT COPY)

#### 1. localStorage-based Notifications (`lib/notifications.ts`)

**What it does:**
```typescript
// Stores notifications in localStorage keyed by user ID
function keyFor(userId: string) {
  return `cinegen_notifications_${userId}`;
}

export function pushNotification(targetUserId: string, notif: ...) {
  const existing = storage.read<AppNotification[]>(keyFor(targetUserId)) ?? [];
  const newNotif: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    read: false,
    ...notif
  };
  storage.write(keyFor(targetUserId), [newNotif, ...existing]);
  window.dispatchEvent(new CustomEvent('cinegen:notification', { detail: { targetUserId } }));
}
```

**Why it's wrong:**
- ❌ Not persistent across devices
- ❌ Not synchronized across browser tabs
- ❌ No server-side record
- ❌ No push notification capability
- ❌ Easy to lose data (localStorage clear)
- ❌ Cannot notify users who aren't currently browsing

**Correct approach:**
- ✅ Create `notifications` table in Supabase
- ✅ Use RLS policies for read/write access
- ✅ Use Supabase Realtime for live updates
- ✅ Optional: Integrate Firebase Cloud Messaging (FCM) for push

#### 2. Client-Side Stripe Card Form (`app/payment/page.tsx`)

**What it does:**
```typescript
const [cardNumber, setCardNumber] = useState("");
const [expiry, setExpiry] = useState("");
const [cvv, setCvv] = useState("");

// Directly passes raw card details to Stripe
const { error } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: {
      number: cardNumber.replace(/\s/g, ""),
      exp_month: expiry.split("/")[0],
      exp_year: "20" + expiry.split("/")[1],
      cvc: cvv,
    },
  },
});
```

**Why it's wrong:**
- ❌ Violates PCI DSS compliance (raw card data touches your server)
- ❌ Exposes card details in browser memory
- ❌ No tokenization
- ❌ No 3D Secure (SCA) support
- ❌ Cannot pass PCI audit

**Correct approach:**
- ✅ Use Stripe Elements or Razorpay SDK (iframe-based card input)
- ✅ Tokenize card on client, send token to server
- ✅ Server creates PaymentIntent with token
- ✅ Implement 3D Secure flow for SCA compliance

#### 3. Mock Copyright Scan (`app/copyright-scan/page.tsx`)

**What it does:**
```typescript
const MOCK_RESULT: ScanResult = {
  status: "safe",
  confidence: 98.5,
  matches: [
    { source: "Getty Images Database", similarity: 15, type: "visual", timestamp: "0:12-0:18" },
    { source: "AudioJungle Library", similarity: 8, type: "audio", timestamp: "Background Track" },
  ],
  recommendations: [
    "All AI-generated content verified as original",
    "No third-party copyrighted material detected above 30% threshold",
  ],
};

// Simulates scan with setTimeout
await new Promise(r => setTimeout(r, 3000));
setResult(MOCK_RESULT);
```

**Why it's wrong:**
- ❌ No backend processing
- ❌ Always returns hardcoded "safe" result
- ❌ Misleading users with fake scan results
- ❌ Legal liability if user relies on mock data

**Correct approach:**
- ✅ Backend API route that processes video files
- ✅ Integration with real copyright detection services:
  - Content ID (YouTube)
  - Audible Magic
  - ACRCloud
  - Custom ML model for AI fingerprinting
- ✅ Store scan results in database for audit trail
- ✅ Clear disclaimers if using mock/demo mode

### Patterns to Adapt (NOT Copy)

**UI Components:**
- Glassmorphism styling, gradient buttons, animation patterns
- Framer Motion animations for state transitions
- Form validation patterns
- Loading states and skeleton screens

**Adapt, don't copy:** Rebuild with Supabase backend, not localStorage/mock APIs

---

## 4. Existing Features to Preserve

### ✅ Core Features (Must Not Break)

**CineGen Director (Conversational AI)**
- Location: `components/voice/CineGenDirector.tsx`
- Persistent conversations in database (director_conversations, director_messages)
- Voice + text input with Gemini 2.0 Flash
- Actions: open_discovery, prepare_brief, clear_draft
- Conversation history management
- API: `app/api/director/chat/route.ts`, `app/api/director/conversations/`

**Decision Room Workflow**
- Location: `app/decision-room/DecisionRoomClient.tsx`, `components/decision-room/*`
- Stages: Idea → Directions → Evidence → Review → Passport
- Gemini-generated creative directions (practical/ambitious/experimental)
- Creator matching based on requirements
- Links to brief creation
- API: `app/api/decision-room/`

**Creator Marketplace**
- Location: `app/creators/page.tsx`, `app/creators/[id]/page.tsx`
- 18 seeded creator profiles with portfolios
- Advanced filtering (tools, skills, specializations, hourly rate)
- Portfolio viewer with workflow details
- Verification badges (Studio, Verified, Rising, Unverified)
- Stats: projects completed, avg rating, response time

**Brief/Proposal/Agreement Workflow**
- AI Brief Builder with Gemini (generates structured briefs from raw ideas)
- Proposal submission with price/timeline
- Proposal acceptance creates agreement
- Versioned agreements with both-party acceptance
- Delivery upload with automated inspection (ffprobe-based)
- Project messages with revision requests
- Scope change requests with approval workflow
- Production Passport (audit trail of entire project)

**Real-time Messaging**
- Location: `app/messages/page.tsx`
- 1-on-1 conversations with Supabase Realtime
- Unread message tracking
- Conversation list with last message preview
- API: `app/api/messages/route.ts`

**Verification System**
- Location: `app/api/verifications/route.ts`
- Creators request verification with evidence URLs
- Admin review dashboard (not implemented in UI yet)
- Badge display on profiles

**Review & Rating System**
- Location: `app/api/reviews/route.ts`
- 1-5 star ratings
- Post-engagement review submission (brands only)
- Average rating calculation

### 🎨 UI/UX Features

**Visual Design**
- Purple-indigo-teal-pink gradients
- Glassmorphism with backdrop-blur
- Animated confetti on success actions
- 3D card tilt effects
- Score rings with animated paths
- Typing animations during AI generation
- Scroll-triggered fade-ins

**Components**
- Location: `components/ui/*`
- Button, Dialog, Select, Slider, Switch, Tabs, Tooltip (Radix UI)
- Toast notifications (sonner)
- Error boundary with graceful fallbacks

---

## 5. Baseline Verification Results

### Build Status

**Command:** `npm run build`
**Exit Code:** 0 ✅
**Output:** Successfully compiled 50+ routes
**TypeScript Errors:** 0 ✅

### Lint Status

**Command:** `npm run lint`
**Exit Code:** 0 ✅
**Warnings:** 13 warnings (all `react-hooks/exhaustive-deps`)

**Affected Files:**
- `app/briefs/[id]/page.tsx` (1 warning)
- `app/decision-room/DecisionRoomClient.tsx` (1 warning)
- `app/projects/[agreementId]/components/DeliveriesTab.tsx` (1 warning)
- `app/projects/[agreementId]/components/HistoryTab.tsx` (1 warning)
- `app/projects/[agreementId]/components/MessagesTab.tsx` (1 warning)
- `app/projects/[agreementId]/page.tsx` (1 warning)
- `components/decision-room/StageDirections.tsx` (1 warning)
- `components/decision-room/StageEvidence.tsx` (1 warning)
- `components/decision-room/StagePassport.tsx` (1 warning)
- `components/decision-room/StageReview.tsx` (1 warning)
- `components/voice/CineGenDirector.tsx` (3 warnings)

**Impact:** Low priority - exhaustive-deps warnings are non-breaking

### Database Migration Status

**Applied Migrations:**
1. `001_add_missing_fields.sql` - Adds fields to creator_services (table doesn't exist in schema.sql)
2. `002_delivery_workflow.sql` - Agreements, deliveries, project_messages, scope_changes
3. `004_agreements_and_deliveries.sql` - Duplicate of 002 (idempotent)
4. `005_add_agreement_to_reviews.sql` - Adds agreement_id to reviews
5. `005_deliveries_storage_bucket.sql` - Creates deliveries bucket
6. `006_admin_and_demo_security.sql` - Adds admin role, demo isolation
7. `006_admin_and_demo_security_safe.sql` - Idempotent version of 006
8. `007_director_conversations.sql` - CineGen Director tables
9. `008_convert_currency_to_inr.sql` - USD → INR conversion
10. `009_decision_rooms.sql` - Decision Room table
11. `APPLY_NOW_007_AND_009.sql` - Re-applies 007 and 009

**Migration Inconsistencies:**
- Duplicate migrations: 002 vs 004 (agreements/deliveries)
- Duplicate migrations: 005 (different files, different content)
- Duplicate migrations: 006 vs 006_safe
- Missing table: `creator_services` referenced in 001 but not defined in schema.sql
- Migration order: Some migrations have same prefix (005, 006)

**Recommendation:** Audit and consolidate migrations during Kampus integration

---

## 6. Features Preservation Checklist

### Must Preserve (Critical Path)

- [x] **Authentication:** Supabase Auth with email/password, OAuth, OTP
- [x] **RLS Policies:** All ownership and demo isolation policies
- [x] **Creator Profiles:** 18 seeded creators with portfolios, verification badges
- [x] **Brief Workflow:** Draft → Open → Proposals → Hired → In Production → Delivered
- [x] **Proposal System:** One proposal per (brief, creator), acceptance creates agreement
- [x] **Agreement Workflow:** Versioned contracts with both-party acceptance
- [x] **Delivery Workflow:** File upload, automated inspection, brand approval
- [x] **Project Messages:** Comments, revision requests, scope changes
- [x] **Production Passport:** Complete audit trail with history events
- [x] **Real-time Messaging:** 1-on-1 conversations with Supabase Realtime
- [x] **CineGen Director:** Conversational AI with persistent conversations
- [x] **Decision Room:** Idea → Directions → Evidence → Review → Passport workflow
- [x] **Verification System:** Creator verification requests with admin review
- [x] **Review System:** 1-5 star ratings for completed projects

### Must Extend (Kampus Integration)

- [ ] **Notifications:** Add database-backed notification system (replace reference's localStorage)
- [ ] **Payments:** Add Stripe/Razorpay integration with proper tokenization
- [ ] **Escrow:** Track payment holds, milestone releases
- [ ] **Webhooks:** Handle payment status updates, dispute resolution
- [ ] **Email Notifications:** Send emails on key events (proposal submitted, payment received)
- [ ] **Push Notifications:** Optional FCM integration for mobile/web push

### Must NOT Copy from Reference

- [x] ❌ localStorage-based notifications
- [x] ❌ Client-side card input without Stripe Elements
- [x] ❌ Mock copyright scan results
- [x] ❌ In-memory OTP storage (already a problem in target, but not fixed yet)

---

## 7. Architecture Constraints

### Database

**Provider:** Supabase (PostgreSQL 15.x)
**Access:** Row-Level Security (RLS) policies enforce all access control
**Real-time:** Supabase Realtime for live updates (messages, notifications)
**Storage:** Supabase Storage for file uploads (deliveries bucket is private)

**Schema Conventions:**
- Foreign keys always use `ON DELETE CASCADE` for cleanup
- Timestamps: `created_at`, `updated_at` (WITH TIME ZONE)
- Currency: INR (integers, no paise) in all price fields
- JSONB columns: `deliverables`, `milestones`, `usage_requirements`, `stats`, `verification`, `portfolio`
- Enums via CHECK constraints (role, status, message_type, etc.)
- Unique constraints: (proposal_id, version), (agreement_id, version), (brief_id, creator_id)

### Authentication

**Provider:** Supabase Auth
**Session:** JWT access/refresh tokens with automatic rotation
**Security:** bcrypt password hashing (10 salt rounds)
**Profile Resolution:** Always query profile table to get brand_id or creator_id from user_id

### API Routes

**Framework:** Next.js App Router (`app/api/*/route.ts`)
**Pattern:**
1. Create Supabase client (uses cookies automatically)
2. Verify user session: `const { data: { user } } = await supabase.auth.getUser()`
3. Resolve profile: Query `creator_profiles` or `brand_profiles` WHERE `user_id = user.id`
4. Perform database operation (RLS policies enforce access)
5. Return JSON response

**Error Handling:**
- 401 Unauthorized: No session
- 403 Forbidden: User not allowed to access resource (RLS denies)
- 400 Bad Request: Missing required fields or business logic violation
- 500 Internal Server Error: Database errors, unexpected exceptions

### Frontend

**Framework:** Next.js 14 (App Router), React 18, TypeScript 5
**Styling:** Tailwind CSS 3.4.1 with custom gradients
**UI Components:** Radix UI (Dialog, Select, Slider, Tabs, Tooltip)
**Animations:** Framer Motion 14.0.0
**State Management:** React Context (AuthContext), local component state
**Forms:** Controlled components with validation
**Real-time:** Supabase Realtime subscriptions for messages

---

## 8. Recommendations for Kampus Integration

### Phase 1: Notification System

**Goal:** Replace reference's localStorage pattern with database-backed notifications

**Implementation:**
1. **Database Schema**
   - Create `notifications` table:
     ```sql
     CREATE TABLE notifications (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       type VARCHAR(50) NOT NULL, -- 'proposal_submitted', 'payment_received', etc.
       title VARCHAR(255) NOT NULL,
       message TEXT NOT NULL,
       link TEXT,
       read_at TIMESTAMP WITH TIME ZONE,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
     );
     CREATE INDEX idx_notifications_user_id ON notifications(user_id);
     CREATE INDEX idx_notifications_read ON notifications(user_id, read_at);
     ```
   - RLS policies: Users can read/update their own notifications

2. **API Routes**
   - `GET /api/notifications` - List user's notifications
   - `PATCH /api/notifications/[id]` - Mark as read
   - `PATCH /api/notifications/mark-all-read` - Mark all as read
   - `DELETE /api/notifications/[id]` - Delete notification

3. **Event Triggers**
   - On proposal submitted → Create notification for brand
   - On proposal accepted → Create notification for creator
   - On payment received → Create notification for creator
   - On delivery uploaded → Create notification for brand
   - On review submitted → Create notification for creator

4. **Real-time Updates**
   - Subscribe to `notifications` table with Supabase Realtime
   - Show toast when new notification arrives
   - Update unread count in navbar

5. **UI Components**
   - Navbar notification bell with unread count
   - Notification dropdown with recent items
   - `/notifications` page with full list

### Phase 2: Payment Integration

**Goal:** Add Stripe or Razorpay with proper tokenization and escrow

**Implementation:**
1. **Database Schema**
   - Create `payment_intents` table:
     ```sql
     CREATE TABLE payment_intents (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
       brand_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
       creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
       stripe_payment_intent_id VARCHAR(255),
       amount INTEGER NOT NULL, -- INR, integer
       status VARCHAR(50) NOT NULL, -- 'pending', 'processing', 'succeeded', 'failed', 'refunded'
       milestone_number INTEGER,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
     );
     CREATE INDEX idx_payment_intents_agreement_id ON payment_intents(agreement_id);
     CREATE INDEX idx_payment_intents_stripe_id ON payment_intents(stripe_payment_intent_id);
     ```
   - RLS policies: Participants can read their payment_intents

2. **API Routes**
   - `POST /api/stripe/create-payment-intent` - Server-side PaymentIntent creation
   - `POST /api/stripe/webhook` - Handle Stripe webhooks (payment.succeeded, payment.failed)
   - `GET /api/payments` - List payments for agreement
   - `POST /api/payments/release` - Release milestone payment to creator

3. **Client-Side**
   - Use `@stripe/stripe-js` and `@stripe/react-stripe-js`
   - Render CardElement (Stripe Elements iframe)
   - Confirm payment with tokenized card
   - Handle 3D Secure flow

4. **Escrow Logic**
   - Payment succeeds → Funds held in Stripe
   - Delivery approved → Release funds to creator (Stripe Transfer or Payout)
   - Dispute → Refund to brand (Stripe Refund)

5. **Webhook Security**
   - Verify Stripe webhook signature
   - Idempotent processing (check if event already handled)
   - Update payment_intents status atomically

### Phase 3: Email Notifications

**Goal:** Send transactional emails on key events

**Implementation:**
1. **Email Service**
   - Use Resend, SendGrid, or Supabase Email
   - Templates already exist in `lib/email-templates.ts`:
     - `generateWelcomeEmail`
     - `generateOTPEmail`
     - `generateProposalNotification`
     - `generateBriefMatchEmail`

2. **Event Triggers**
   - On user signup → Send welcome email
   - On OTP request → Send OTP email
   - On proposal submitted → Email brand
   - On brief posted → Email matched creators (async job)
   - On payment received → Email creator

3. **API Routes**
   - `POST /api/email/send` - Internal API for sending emails
   - Called by other API routes (proposals, payments, etc.)

### Phase 4: Audit & Security Review

**Critical Items:**
1. **OTP Storage**
   - Current: In-memory Map (not persistent, lost on restart)
   - Fix: Store in database with expiry index
   - Create `otp_verifications` table

2. **Migration Consolidation**
   - Audit duplicate migrations (002 vs 004, 005 vs 005, 006 vs 006_safe)
   - Create single source of truth migration file
   - Add migration versioning (001, 002, 003, etc. without duplicates)

3. **RLS Policy Audit**
   - Verify all tables have RLS enabled
   - Test demo isolation (demo users cannot access real data)
   - Test admin policies (admins can access verifications)

4. **API Route Security**
   - Verify all routes check `auth.uid()`
   - Verify profile resolution (brand_id, creator_id)
   - Add rate limiting for sensitive endpoints (OTP, payment)

5. **File Upload Security**
   - Verify deliveries bucket is private (done ✅)
   - Add file size limits (currently 500MB max)
   - Add MIME type validation
   - Scan uploads for malware (optional, third-party service)

---

## Conclusion

**Target Repository State:** Production-ready with solid foundation
- ✅ Database schema well-designed with RLS
- ✅ Authentication working via Supabase Auth
- ✅ Core workflows implemented (briefs, proposals, agreements, deliveries)
- ✅ Real-time messaging functional
- ✅ CineGen Director and Decision Room features complete
- ✅ Build passes with 0 TypeScript errors

**Reference Repository State:** Prototype with anti-patterns
- ⚠️ localStorage-based notifications (not production-ready)
- ⚠️ Client-side card input without tokenization (PCI violation)
- ⚠️ Mock copyright scan (misleading users)
- ❌ Do NOT copy these patterns

**Kampus Integration Readiness:**
- ✅ Target is ready for notification system addition
- ✅ Target is ready for payment integration
- ⚠️ Some security gaps to fix (OTP storage, migration consolidation)
- ✅ UI/UX patterns can be adapted from reference (style, not logic)

**Next Steps:**
1. Create FEAT files for notification system (database + API + UI)
2. Create FEAT files for payment integration (Stripe/Razorpay + escrow)
3. Create FEAT file for security audit (OTP, migrations, RLS)
4. Create FEAT file for email notifications (Resend/SendGrid)
5. Sequence FEATs: Notifications → Payments → Email → Security Audit

---

**End of Baseline Investigation Report**
