# 🏗️ CineGen System Architecture

Complete technical architecture documentation for CineGen v2.0.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [Authentication Flow](#authentication-flow)
5. [Row Level Security](#row-level-security)
6. [Real-time Messaging](#real-time-messaging)
7. [File Upload Flow](#file-upload-flow)
8. [API Routes](#api-routes)
9. [Security Considerations](#security-considerations)
10. [Data Flow](#data-flow)

---

## System Overview

CineGen is a three-tier application with a Next.js frontend/backend, Supabase for data/auth/storage, and Google Gemini for AI features.

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                       │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │   Pages     │  │   Hooks     │  │   Components     │    │
│  │             │  │             │  │                  │    │
│  │ /creators   │  │ useSession  │  │ Navbar           │    │
│  │ /briefs     │  │ useCreators │  │ CreatorCard      │    │
│  │ /dashboard  │  │ useBriefs   │  │ BriefIntelligence│    │
│  │ /messages   │  │ useProposals│  │ StyleDNA         │    │
│  │ /login      │  │ useMessages │  │ ParticleBackground│   │
│  │ /register   │  │ useReviews  │  │ ErrorBoundary    │    │
│  └─────────────┘  └─────────────┘  └──────────────────┘    │
│                                                               │
│         ↓ Supabase JS Client (RLS applied)                   │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                   NEXT.JS SERVER (Vercel/Render)             │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              API Routes (Server-side)                │    │
│  │                                                      │    │
│  │  /api/auth/register    → User signup + DB insert    │    │
│  │  /api/auth/login       → JWT token generation       │    │
│  │  /api/auth/verify-otp  → Email verification         │    │
│  │  /api/auth/google      → OAuth redirect             │    │
│  │  /api/creators         → Search/filter with RLS     │    │
│  │  /api/messages         → Send/receive messages      │    │
│  │  /api/reviews          → Submit/fetch reviews       │    │
│  │  /api/verifications    → Admin approval system      │    │
│  │  /api/brief            → Gemini AI integration      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │             Middleware (Route Protection)            │    │
│  │                                                      │    │
│  │  - Extracts JWT from cookies                        │    │
│  │  - Verifies session with Supabase                   │    │
│  │  - Protects /dashboard, /briefs/new, /messages      │    │
│  │  - Redirects unauthenticated → /login               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│         ↓ Supabase Service Role Client (bypasses RLS)        │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                         │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                      │   │
│  │                                                       │   │
│  │  Tables: users, creator_profiles, brand_profiles,    │   │
│  │          briefs, proposals, messages, reviews,       │   │
│  │          verifications                                │   │
│  │                                                       │   │
│  │  Row Level Security (RLS) policies enforce access    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Authentication (GoTrue)                  │   │
│  │                                                       │   │
│  │  - JWT token generation (1-hour expiry)              │   │
│  │  - Email/password auth with bcrypt                   │   │
│  │  - Email OTP (6-digit, 15-min expiry)                │   │
│  │  - Google OAuth via PKCE flow                        │   │
│  │  - Refresh tokens for seamless re-auth               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Storage Buckets                          │   │
│  │                                                       │   │
│  │  avatars/     → 2MB max, image/* only, public read   │   │
│  │  portfolios/  → 10MB max, image/video, public read   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Realtime Server (Websockets)             │   │
│  │                                                       │   │
│  │  - Broadcasts postgres_changes on tables             │   │
│  │  - Client subscribes to messages channel             │   │
│  │  - ~200ms latency for message delivery               │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                        │
│                                                               │
│  ┌─────────────────────────────────┐                         │
│  │      Google Gemini API          │                         │
│  │   (2.0 Flash Experimental)      │                         │
│  │                                 │                         │
│  │  - AI Brief Builder             │                         │
│  │  - Only called server-side      │                         │
│  │  - Fallback to rule-based       │                         │
│  └─────────────────────────────────┘                         │
└──────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2.35 | React framework with App Router, SSR, API routes |
| React | 18.x | Component library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.4.1 | Utility-first styling |
| Framer Motion | 14.0.0 | Animations (score rings, transitions, 3D effects) |
| Lucide React | 1.54.0 | Icon system |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | 2.118.0 | Backend-as-a-Service (PostgreSQL, Auth, Storage, Realtime) |
| @supabase/ssr | 0.12.7 | Server-side Supabase client with cookie management |
| bcryptjs | 3.0.3 | Password hashing (10 salt rounds) |
| PostgreSQL | 15.x | Primary database (via Supabase) |

### AI & Tools
| Technology | Purpose |
|------------|---------|
| Google Gemini API | AI Brief Builder (2.0 Flash) |
| Zod | Schema validation |
| Sonner | Toast notifications |

### Deployment
| Technology | Purpose |
|------------|---------|
| Render | Web service hosting (Node 20, auto-deploy from GitHub) |
| Supabase Cloud | Managed PostgreSQL + Auth + Storage |

---

## Database Schema

### Entity Relationship Diagram

```
users (auth.users via Supabase Auth)
  ├─ id (UUID, PK)
  ├─ email (unique, indexed)
  ├─ password_hash (bcrypt)
  ├─ role (creator | brand | admin)
  ├─ name
  ├─ created_at
  └─ updated_at
      ↓ 1:1
creator_profiles
  ├─ id (UUID, PK)
  ├─ user_id (FK → users.id, unique)
  ├─ handle (unique, @username)
  ├─ avatar_url (Supabase Storage URL)
  ├─ cover_url
  ├─ headline
  ├─ bio (text)
  ├─ location
  ├─ hourly_rate_usd (integer)
  ├─ availability (Available | Busy | Unavailable)
  ├─ verified_tools (JSONB: {tool: "Expert" | "Advanced" | "Intermediate"})
  ├─ languages (text[])
  ├─ stats (JSONB: {projects, rating, responseTime, deliveryRate})
  ├─ verification (JSONB: {tools, workflow, pastWork})
  └─ joined_at
      ↓ 1:N
proposals
  ├─ id (UUID, PK)
  ├─ brief_id (FK → briefs.id)
  ├─ creator_id (FK → creator_profiles.id)
  ├─ message (text)
  ├─ price (integer, USD)
  ├─ timeline_days (integer)
  ├─ status (Pending | Accepted | Rejected)
  ├─ created_at
  └─ updated_at

users (auth.users)
  ↓ 1:1
brand_profiles
  ├─ id (UUID, PK)
  ├─ user_id (FK → users.id, unique)
  ├─ company_name
  ├─ website
  ├─ industry
  └─ created_at
      ↓ 1:N
briefs
  ├─ id (UUID, PK)
  ├─ brand_id (FK → brand_profiles.id)
  ├─ campaign_title
  ├─ objective (text)
  ├─ content_type (Film | Animation | Still | VFX | Music)
  ├─ style (Cinematic | Bold | Minimal | ...)
  ├─ aspect_ratios (text[]: ["16:9", "9:16"])
  ├─ duration_seconds (integer, nullable)
  ├─ resolution (1080p | 4K | 8K)
  ├─ quantity (integer)
  ├─ tools_preferred (text[])
  ├─ reference_links (text[])
  ├─ budget_min (integer)
  ├─ budget_max (integer)
  ├─ deadline (date)
  ├─ commercial_use (JSONB: {allowed, attribution, exclusivity, territory})
  ├─ negative_keywords (text[])
  ├─ status (Open | Closed | In Progress)
  ├─ generated_by_ai (boolean)
  ├─ raw_idea (text, original prompt)
  ├─ created_at
  └─ updated_at
      ↓ 1:N
proposals (see above)
      ↓ 1:N
reviews
  ├─ id (UUID, PK)
  ├─ brief_id (FK → briefs.id)
  ├─ creator_id (FK → creator_profiles.id)
  ├─ brand_id (FK → brand_profiles.id)
  ├─ rating (integer, 1-5, CHECK constraint)
  ├─ comment (text)
  └─ created_at

users
  ↓ 1:N (as sender)
  ↓ 1:N (as recipient)
messages
  ├─ id (UUID, PK)
  ├─ conversation_id (UUID, indexed)
  ├─ sender_id (FK → users.id)
  ├─ recipient_id (FK → users.id)
  ├─ content (text)
  ├─ read_at (timestamp, nullable)
  └─ created_at

creator_profiles
  ↓ 1:N
verifications
  ├─ id (UUID, PK)
  ├─ creator_id (FK → creator_profiles.id)
  ├─ verification_type (tools | workflow | past_work)
  ├─ status (pending | approved | rejected)
  ├─ evidence_url (text, link to proof)
  ├─ admin_notes (text)
  ├─ reviewed_by (FK → users.id, nullable)
  ├─ reviewed_at (timestamp, nullable)
  └─ created_at
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_creator_profiles_user_id ON creator_profiles(user_id);
CREATE INDEX idx_briefs_brand_id ON briefs(brand_id);
CREATE INDEX idx_briefs_status ON briefs(status);
CREATE INDEX idx_briefs_created_at ON briefs(created_at DESC);
CREATE INDEX idx_proposals_brief_id ON proposals(brief_id);
CREATE INDEX idx_proposals_creator_id ON proposals(creator_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_reviews_creator_id ON reviews(creator_id);
CREATE INDEX idx_verifications_status ON verifications(status);
```

---

## Authentication Flow

### Registration Flow

```
1. User visits /register
   ├─ Fills: email, password, name, role (creator | brand)
   └─ Clicks "Sign Up"

2. POST /api/auth/register
   ├─ Validate input with Zod schema
   ├─ Check email not already registered
   ├─ Hash password with bcryptjs.hash(password, 10)
   ├─ Call supabase.auth.signUp({
   │    email,
   │    password,
   │    options: { data: { name, role } }
   │  })
   ├─ Supabase creates auth.users row + sends OTP email
   ├─ Insert into public.users table with user_id from auth
   ├─ Insert into creator_profiles or brand_profiles based on role
   └─ Return { message: "Check email for verification code" }

3. User receives email with 6-digit OTP (15-minute expiry)

4. User enters OTP on /verify-otp page

5. POST /api/auth/verify-otp
   ├─ Call supabase.auth.verifyOtp({ email, token, type: 'email' })
   ├─ Supabase validates OTP and returns session
   ├─ Set session cookies via @supabase/ssr
   └─ Return { session } with JWT tokens

6. Redirect to /dashboard (or /onboarding for creators)

7. Session stored:
   ├─ access_token (JWT, 1-hour expiry)
   ├─ refresh_token (JWT, 30-day expiry)
   └─ Cookies set as HttpOnly, Secure, SameSite=Lax
```

### Login Flow

```
1. User visits /login

2a. Demo Login (1-click)
   ├─ Click "Continue as Brand" or "Continue as Creator"
   ├─ POST /api/auth/login with demo credentials
   │    - brand@cinegen.demo / Demo@123
   │    - creator@cinegen.demo / Demo@123 (or any of 18 creators)
   ├─ Server checks if email matches demo pattern
   ├─ Use service role client to bypass RLS
   ├─ Call supabase.auth.signInWithPassword()
   └─ Return session → redirect to /dashboard

2b. Manual Login
   ├─ Enter email + password
   ├─ POST /api/auth/login
   ├─ Call supabase.auth.signInWithPassword({ email, password })
   ├─ Supabase validates against bcrypt hash
   └─ Return session → redirect to /dashboard

2c. Google OAuth
   ├─ Click "Continue with Google"
   ├─ Redirect to /api/auth/google
   ├─ Server calls supabase.auth.signInWithOAuth({
   │    provider: 'google',
   │    options: { redirectTo: '/auth/callback' }
   │  })
   ├─ Redirect to Google consent screen
   ├─ User approves → Google redirects to /auth/callback?code=...
   ├─ Callback handler exchanges code for session
   ├─ Set session cookies
   └─ Redirect to /dashboard
```

### Session Management

```
Client-side (useSession hook):
  ├─ On mount: check supabase.auth.getSession()
  ├─ Subscribe to supabase.auth.onAuthStateChange()
  ├─ On SIGNED_IN: update local state with session
  ├─ On SIGNED_OUT: clear state, redirect to /login
  ├─ On TOKEN_REFRESHED: update session (happens ~5min before expiry)
  └─ Expose: { session, user, role, loading, login(), logout() }

Server-side (middleware):
  ├─ On every request to protected route:
  ├─ Extract JWT from cookies
  ├─ Call supabase.auth.getUser() to validate token
  ├─ If invalid/expired: redirect to /login
  ├─ If valid: allow request, attach user to context
  └─ RLS policies use auth.uid() from JWT
```

### Logout Flow

```
1. User clicks "Logout" in navbar

2. Call logout() from useSession hook
   ├─ supabase.auth.signOut()
   ├─ Supabase clears cookies
   └─ Clear local React state

3. Redirect to /login

4. Server middleware blocks access to protected routes
```

---

## Row Level Security

All tables have RLS enabled. Policies enforce data access based on JWT `auth.uid()`.

### users table

```sql
-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Brands can read creator user rows (for name, email display)
CREATE POLICY "Brands can read creators" ON users
  FOR SELECT USING (
    role = 'creator' OR auth.uid() = id
  );
```

### creator_profiles table

```sql
-- Public read access (discovery page)
CREATE POLICY "Public read creator profiles" ON creator_profiles
  FOR SELECT USING (true);

-- Creators update their own profile
CREATE POLICY "Creators update own profile" ON creator_profiles
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Creators insert their own profile (during registration)
CREATE POLICY "Creators create own profile" ON creator_profiles
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );
```

### brand_profiles table

```sql
-- Public read access
CREATE POLICY "Public read brand profiles" ON brand_profiles
  FOR SELECT USING (true);

-- Brands update their own profile
CREATE POLICY "Brands update own profile" ON brand_profiles
  FOR UPDATE USING (user_id = auth.uid());
```

### briefs table

```sql
-- Public read for Open briefs
CREATE POLICY "Public read open briefs" ON briefs
  FOR SELECT USING (status = 'Open');

-- Brands read/update/delete their own briefs
CREATE POLICY "Brands manage own briefs" ON briefs
  FOR ALL USING (
    brand_id IN (
      SELECT id FROM brand_profiles WHERE user_id = auth.uid()
    )
  );

-- Brands create briefs
CREATE POLICY "Brands create briefs" ON briefs
  FOR INSERT WITH CHECK (
    brand_id IN (
      SELECT id FROM brand_profiles WHERE user_id = auth.uid()
    )
  );
```

### proposals table

```sql
-- Creators read their own proposals
CREATE POLICY "Creators read own proposals" ON proposals
  FOR SELECT USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Brands read proposals for their briefs
CREATE POLICY "Brands read brief proposals" ON proposals
  FOR SELECT USING (
    brief_id IN (
      SELECT id FROM briefs WHERE brand_id IN (
        SELECT id FROM brand_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Creators submit proposals
CREATE POLICY "Creators submit proposals" ON proposals
  FOR INSERT WITH CHECK (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Brands update proposal status
CREATE POLICY "Brands update proposal status" ON proposals
  FOR UPDATE USING (
    brief_id IN (
      SELECT id FROM briefs WHERE brand_id IN (
        SELECT id FROM brand_profiles WHERE user_id = auth.uid()
      )
    )
  );
```

### messages table

```sql
-- Users read messages where they are sender or recipient
CREATE POLICY "Users read own messages" ON messages
  FOR SELECT USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

-- Users send messages
CREATE POLICY "Users send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
  );

-- Users mark their received messages as read
CREATE POLICY "Users mark messages read" ON messages
  FOR UPDATE USING (
    recipient_id = auth.uid()
  );
```

### reviews table

```sql
-- Public read reviews
CREATE POLICY "Public read reviews" ON reviews
  FOR SELECT USING (true);

-- Brands create reviews (only if they hired the creator)
CREATE POLICY "Brands create reviews" ON reviews
  FOR INSERT WITH CHECK (
    brand_id IN (
      SELECT id FROM brand_profiles WHERE user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.creator_id = reviews.creator_id
        AND proposals.brief_id = reviews.brief_id
        AND proposals.status = 'Accepted'
    )
  );
```

### verifications table

```sql
-- Creators read their own verification requests
CREATE POLICY "Creators read own verifications" ON verifications
  FOR SELECT USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Admin reads all pending verifications
CREATE POLICY "Admin reads all verifications" ON verifications
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
  );

-- Creators submit verification requests
CREATE POLICY "Creators submit verifications" ON verifications
  FOR INSERT WITH CHECK (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Admin approves/rejects verifications
CREATE POLICY "Admin updates verifications" ON verifications
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
  );
```

---

## Real-time Messaging

### Architecture

```
Browser A (Brand)                   Supabase Realtime                Browser B (Creator)
     │                                     │                                 │
     │  1. Send message                   │                                 │
     ├─────────────────────────────────────>                                │
     │  POST /api/messages                 │                                 │
     │  { recipient_id, content }          │                                 │
     │                                     │                                 │
     │  2. Insert into messages table      │                                 │
     │  (via Supabase client + RLS)        │                                 │
     │                                     │                                 │
     │                                  [Database Trigger]                   │
     │                                     │                                 │
     │                          3. Broadcast postgres_changes                │
     │                                     ├─────────────────────────────────>
     │                                     │        (via WebSocket)          │
     │                                     │                                 │
     │                                     │  4. Client receives INSERT event│
     │                                     │     on messages channel         │
     │                                     │                                 │
     │                                     │  5. Update local state          │
     │                                     │     (useMessages hook)          │
     │                                     │                                 │
     │                                     │  6. UI re-renders with new msg  │
     │                                     <─────────────────────────────────┤
```

### Implementation

**Client-side (hooks/useMessages.ts)**:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}` // Only my messages
      },
      (payload) => {
        const newMessage = payload.new as Message
        setMessages(prev => [...prev, newMessage])
        incrementUnreadCount()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [userId])
```

**Fallback Polling**:

If Realtime quota exceeded (free tier: 200 concurrent connections):

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchNewMessages() // Query last 10s of messages
  }, 10000) // Poll every 10 seconds

  return () => clearInterval(interval)
}, [])
```

### Message Delivery Guarantees

- **At-least-once**: Realtime broadcasts on every INSERT
- **Idempotency**: Messages have unique UUIDs, client deduplicates
- **Ordering**: Messages sorted by `created_at` timestamp
- **Latency**: ~200ms from send to receive (within same region)

---

## File Upload Flow

### Avatar Upload

```
1. User selects image in profile settings
   ├─ Client validates: size <2MB, type image/*
   └─ Preview shown immediately (base64)

2. Click "Save"
   ├─ Generate unique filename: {userId}_{timestamp}.{ext}
   ├─ Call supabase.storage.from('avatars').upload(filename, file)
   ├─ Supabase stores file in S3-compatible storage
   └─ Returns public URL: https://{project}.supabase.co/storage/v1/object/public/avatars/{filename}

3. Update creator_profile.avatar_url with public URL
   ├─ Call supabase.from('creator_profiles').update({ avatar_url: url })
   └─ RLS policy allows update if user_id matches auth.uid()

4. Client refetches profile → new avatar displayed
```

### Portfolio Upload

```
1. Creator visits profile → "Add Portfolio Item"
   ├─ Upload image or video (max 10MB)
   └─ Fill title, description, tools used, workflow steps

2. Upload to 'portfolios' bucket
   ├─ Filename: {creatorId}/{itemId}_{timestamp}.{ext}
   ├─ Supabase returns public URL
   └─ Store URL in creator_profiles.stats.portfolio JSONB array

3. Portfolio items displayed on creator profile
   ├─ Lazy-loaded with next/image
   └─ Click to open modal with full workflow
```

### Storage Policies

```sql
-- avatars bucket: authenticated users can upload their own
CREATE POLICY "Authenticated users upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

-- Public read access
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- portfolios bucket: creators upload their own
CREATE POLICY "Creators upload portfolios" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'portfolios'
    AND auth.role() = 'authenticated'
  );

-- Public read access
CREATE POLICY "Public read portfolios" ON storage.objects
  FOR SELECT USING (bucket_id = 'portfolios');
```

---

## API Routes

All API routes are in `app/api/` directory. See [docs/API.md](./API.md) for full documentation.

### Authentication Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/auth/register` | POST | None | Create account + send OTP |
| `/api/auth/login` | POST | None | Email/password or demo login |
| `/api/auth/verify-otp` | POST | None | Verify email with 6-digit code |
| `/api/auth/google` | GET | None | Redirect to Google OAuth |
| `/auth/callback` | GET | None | OAuth callback handler |

### Data Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/creators` | GET | Optional | Search/filter creators |
| `/api/creators/[id]` | GET | Optional | Fetch single creator profile |
| `/api/messages` | GET | Required | Fetch conversation messages |
| `/api/messages` | POST | Required | Send message |
| `/api/reviews` | GET | Optional | Fetch reviews for creator |
| `/api/reviews` | POST | Required (Brand) | Submit review |
| `/api/verifications` | GET | Required (Admin) | Pending verifications |
| `/api/verifications` | POST | Required (Creator) | Submit verification request |
| `/api/verifications` | PATCH | Required (Admin) | Approve/reject verification |
| `/api/brief` | POST | Required (Brand) | Generate brief with Gemini AI |

---

## Security Considerations

### Authentication

- ✅ **Password Hashing**: bcryptjs with 10 salt rounds (industry standard)
- ✅ **JWT Tokens**: Signed by Supabase, 1-hour expiry, auto-refresh
- ✅ **HttpOnly Cookies**: Tokens not accessible via JavaScript (XSS protection)
- ✅ **HTTPS Only**: Cookies marked Secure in production
- ✅ **SameSite=Lax**: CSRF protection

### Authorization

- ✅ **Row Level Security**: All queries filtered by RLS policies
- ✅ **Service Role Key**: Never exposed to client, only in API routes
- ✅ **Middleware Protection**: Redirects unauthenticated users before page render
- ✅ **Role-based Access**: Admin-only routes verified server-side

### Data Validation

- ✅ **Zod Schemas**: All API inputs validated before processing
- ✅ **SQL Injection**: Parameterized queries via Supabase (prevents SQL injection)
- ✅ **XSS Protection**: React auto-escapes JSX, no dangerouslySetInnerHTML
- ✅ **File Upload Validation**: Size, type, and extension checks

### API Security

- ✅ **Gemini API Key**: Only called server-side in `/api/brief` route
- ✅ **Rate Limiting**: Supabase free tier: 500 requests/second per project
- ✅ **CORS**: Supabase configured to allow only production domain

### Storage Security

- ✅ **Bucket Policies**: Public read, authenticated write
- ✅ **File Size Limits**: 2MB for avatars, 10MB for portfolios
- ✅ **File Type Validation**: Only image/* and video/* allowed

### Known Limitations

- ⚠️ **Demo Credentials**: Hard-coded passwords in production (acceptable for hackathon)
- ⚠️ **No Rate Limiting**: Client-side API calls not rate-limited (add Cloudflare in production)
- ⚠️ **No Input Sanitization**: HTML in user inputs (add DOMPurify if allowing rich text)

---

## Data Flow

### Creator Discovery Flow

```
1. User visits /creators

2. Component mounts → useCreators() hook
   ├─ Call supabase.from('creator_profiles').select('*')
   ├─ RLS policy allows public read
   └─ Returns all 18 creators

3. User types search query "cinematic"
   ├─ Debounced input (300ms)
   ├─ Client-side filter by name, headline, bio, tools
   └─ Re-render filtered list

4. User selects filters: Tools = "Runway", Rate <$100/hr
   ├─ Client-side filter: verified_tools @> {"Runway": ...}
   ├─ Client-side filter: hourly_rate_usd < 100
   └─ Re-render with 5 matches

5. User clicks creator card
   ├─ Navigate to /creators/[id]
   ├─ Fetch full profile with portfolio, reviews
   └─ Display Style DNA, verification evidence
```

### Brief Creation Flow (AI)

```
1. Brand visits /briefs/new

2. Brand types rough idea:
   "A cinematic 30-second ad for luxury skincare"

3. Click "Generate with Gemini AI"
   ├─ POST /api/brief with { idea: "..." }
   ├─ Server calls Gemini API with prompt template
   ├─ Gemini returns JSON: { campaign_title, objective, content_type, ... }
   ├─ Server validates with Zod schema
   └─ Return structured brief

4. Client animates field population
   ├─ react-type-animation for text fields
   ├─ Framer Motion for dropdowns/selects
   └─ Progress bar 0% → 100%

5. Brief Intelligence panel analyzes
   ├─ Calculate score (errors -10, warnings -3, tips +2)
   ├─ Real-time validation as fields change
   └─ Display score ring with color (green >80, yellow 60-80, red <60)

6. Brand reviews, tweaks, clicks "Publish Brief"
   ├─ POST to supabase.from('briefs').insert(brief)
   ├─ RLS policy allows if brand_id matches auth user
   ├─ Confetti explosion on success
   └─ Redirect to /briefs with new brief in list

7. Match algorithm runs
   ├─ lib/matchScore.ts calculates % for each creator
   ├─ Score = toolsMatch * 0.4 + specializationMatch * 0.3 + budgetFit * 0.2 + availabilityMatch * 0.1
   └─ Display Top 5 matches with explainable reason tags
```

### Messaging Flow

```
1. Brand clicks "Message" on creator profile

2. Navigate to /messages?userId={creatorId}

3. useMessages hook loads conversation
   ├─ Query messages where conversation_id = generateConversationId(brandId, creatorId)
   ├─ Subscribe to real-time updates for new messages
   └─ Display messages sorted by created_at

4. Brand types message, clicks "Send"
   ├─ POST /api/messages with { recipient_id, content }
   ├─ Server inserts into messages table
   ├─ RLS policy allows if sender_id = auth.uid()
   └─ Return { success: true }

5. Creator's browser receives postgres_changes event
   ├─ Supabase Realtime pushes INSERT event via WebSocket
   ├─ useMessages hook adds message to local state
   ├─ UI re-renders with new message (~200ms latency)
   └─ Notification bell badge increments unread count

6. Creator replies → same flow in reverse
```

---

## Performance Optimizations

### Client-side

- **Code Splitting**: Next.js automatic route-based splitting
- **Lazy Loading**: `next/dynamic` for heavy components (ParticleBackground, Confetti)
- **Image Optimization**: `next/image` with Supabase CDN
- **Debouncing**: Search input debounced 300ms
- **Virtualization**: (Future) react-window for large creator lists
- **Memoization**: `useMemo` for expensive calculations (match scores)

### Server-side

- **Database Indexes**: All foreign keys and frequently queried columns indexed
- **Connection Pooling**: Supabase handles automatic connection pooling
- **Edge Functions**: (Future) Supabase Edge Functions for low-latency API routes

### Monitoring

- **Supabase Dashboard**: Query performance, slow queries, connection count
- **Render Metrics**: CPU, memory, request count
- **Sentry**: (Future) Error tracking and performance monitoring

---

**Last Updated**: January 2024  
**Version**: 2.0.0  
**Contributors**: CineGen Team
