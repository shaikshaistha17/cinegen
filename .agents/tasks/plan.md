# CineGen Legendary Transformation Plan

## Overview
Transform CineGen from a localStorage-based demo into a production-ready, legendary hackathon winner with Supabase backend, real-time features, and stunning UI that surpasses competitors. This plan preserves all 18 existing creator profiles and features while adding database persistence, authentication, messaging, reviews, and enhanced animations.

## Current State Analysis
- **Framework**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Data Layer**: localStorage for all data (sessions, briefs, proposals, creators)
- **Auth**: Cookie-based role storage + localStorage sessions (insecure demo mode)
- **UI**: Dark theme with basic glass effects, Framer Motion animations
- **Features**: 18 creator profiles, AI Brief Builder (Gemini), Brief Intelligence, Style DNA, Budget Estimator, Risk Scanner, Leaderboard
- **Deployment**: Currently on Vercel, needs Render deployment

## Transformation Goals
1. **Supabase Backend**: PostgreSQL with RLS, Storage buckets, Auth (JWT + email OTP + Google OAuth)
2. **Real-time Features**: Messaging with Supabase Realtime, live brief updates, notification system
3. **Verification System**: Creator verification requests, admin review dashboard, verified badges
4. **Review & Rating**: Post-project reviews, 1-5 star ratings on creator profiles
5. **Legendary UI**: New color palette (purple-indigo-teal-pink), advanced animations, 3D effects, glassmorphism, confetti, particles, mobile responsive
6. **Production Ready**: Deploy to Render, comprehensive docs, demo video, security audit

---

## Implementation Plan

### PHASE 1: SUPABASE BACKEND FOUNDATION

- [ ] 1. **Environment Configuration**
      Update .env.example with Supabase variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
      Add instructions for obtaining keys from Supabase dashboard.
      Files: .env.example
      Verify: File contains all required placeholders with helpful comments

- [ ] 2. **Database Schema Design**
      Create database/schema.sql with complete PostgreSQL schema:
      - users table (id, email, password_hash, role, name, created_at, updated_at)
      - creator_profiles table (id, user_id FK, handle, avatar_url, cover_url, headline, bio, location, hourly_rate_usd, availability, verified_tools JSONB, languages, stats JSONB, verification JSONB, joined_at)
      - brand_profiles table (id, user_id FK, company_name, website, industry, created_at)
      - briefs table (id, brand_id FK, campaign_title, objective, content_type, style, aspect_ratios, duration_seconds, resolution, quantity, tools_preferred, reference_links, budget_min, budget_max, deadline, commercial_use JSONB, negative_keywords, status, generated_by_ai, raw_idea, created_at, updated_at)
      - proposals table (id, brief_id FK, creator_id FK, message, price, timeline_days, status, created_at, updated_at)
      - messages table (id, conversation_id, sender_id, recipient_id, content, read_at, created_at)
      - reviews table (id, brief_id FK, creator_id FK, brand_id FK, rating, comment, created_at)
      - verifications table (id, creator_id FK, verification_type, status, evidence_url, admin_notes, reviewed_by, reviewed_at, created_at)
      Include proper indexes on foreign keys, timestamps, status columns. Add CHECK constraints for rating 1-5.
      Files: database/schema.sql
      Verify: Run SQL in Supabase SQL Editor, verify all tables created with correct columns and types

- [ ] 3. **Row Level Security Policies**
      Create database/rls-policies.sql with security policies:
      - users: users read own row, brands read creator user rows
      - creator_profiles: public read, creators update own
      - brand_profiles: public read, brands update own
      - briefs: public read Open briefs, brand reads/updates own briefs
      - proposals: creator reads/updates own, brand reads proposals for their briefs
      - messages: participants read/write their conversations only
      - reviews: public read, brand creates once per engagement
      - verifications: creators create requests, admin-only approval/rejection
      Files: database/rls-policies.sql
      Verify: Test with unauthenticated Supabase client - should only access public data

- [ ] 4. **Storage Buckets Configuration**
      Create database/storage-buckets.sql with bucket policies:
      - 'avatars' bucket: public read, authenticated upload, 2MB limit, image/* only
      - 'portfolios' bucket: public read, authenticated creator upload, 10MB limit, image/* and video/*
      Files: database/storage-buckets.sql
      Verify: Create buckets in Supabase dashboard, test upload via Supabase client

- [ ] 5. **Supabase Client Enhancements**
      Update lib/supabase.ts:
      - Add createServerClient() using @supabase/ssr for server components and API routes
      - Add getUser() helper wrapping supabase.auth.getUser()
      - Keep existing createClient() for client components
      - Add typed database client with TypeScript types (optional: generate with supabase gen types typescript)
      Files: lib/supabase.ts
      Verify: npm run build succeeds, no TypeScript errors

- [ ] 6. **Admin Helper Functions**
      Create lib/supabase-admin.ts with service role functions:
      - seedCreatorProfiles(creators[]) - inserts users + creator_profiles with proper relations
      - seedBriefs(briefs[]) - inserts initial brief data
      - Use createServiceClient() with service role key for admin operations
      Files: lib/supabase-admin.ts
      Verify: npm run build succeeds

- [ ] 7. **Database Seeding Script**
      Create scripts/seed-database.ts:
      - Import seedCreators from lib/seed/creators.ts (all 18 creators)
      - Import seedBriefs from lib/seed/briefs.ts if exists
      - Connect with service role key
      - Hash password 'Demo@123' with bcryptjs (10 salt rounds)
      - Create user accounts for all 18 creators + 1 brand (brand@cinegen.demo)
      - Call seedCreatorProfiles() and seedBriefs()
      - Wrap in try/catch with detailed error logging
      - Use transactions for atomicity
      Files: scripts/seed-database.ts
      Verify: npm run db:seed completes without errors, check Supabase Table Editor for 19 users + 18 creator_profiles

- [ ] 8. **Package Installation & Scripts**
      Install dependencies: npm install tsx bcryptjs @types/bcryptjs
      Add npm scripts to package.json:
      - "db:seed": "tsx scripts/seed-database.ts"
      - "db:reset": "tsx scripts/reset-database.ts" (optional: drops all tables and re-runs schema)
      Files: package.json
      Verify: npm run db:seed works after setting SUPABASE env vars

- [ ] 9. **Setup Documentation**
      Create SETUP.md with step-by-step Supabase setup guide:
      1. Create Supabase project at supabase.com
      2. Copy project URL and anon key from Settings → API to .env.local
      3. Copy service role key (never expose to client!)
      4. Run schema.sql in Supabase SQL Editor
      5. Run rls-policies.sql
      6. Create storage buckets (avatars, portfolios) via dashboard
      7. Run npm run db:seed
      8. Verify data in Table Editor
      Include troubleshooting section for common issues (RLS blocking queries, password hash errors, foreign key violations)
      Files: SETUP.md
      Verify: Follow guide end-to-end in fresh Supabase project, verify setup works

---

### PHASE 2: AUTHENTICATION SYSTEM

- [ ] 10. **Password & OTP Helpers**
      Create lib/auth-helpers.ts with:
      - hashPassword(password) using bcryptjs.hash(password, 10)
      - verifyPassword(password, hash) using bcryptjs.compare()
      - generateOTP() returns 6-digit string
      - storeOTP(email, code, expiresAt) inserts into otp_codes table (or users table otp_code column)
      - verifyOTP(email, code) checks code and 15-minute expiry
      Files: lib/auth-helpers.ts
      Verify: npm run build succeeds, unit test hash/verify functions

- [ ] 11. **Update Session Types**
      Update types/index.ts:
      - Session interface adds: access_token, refresh_token, expires_at (from Supabase auth)
      - Add OTPVerification type: { email, code, expiresAt }
      Files: types/index.ts
      Verify: npm run build succeeds

- [ ] 12. **Registration API Route**
      Create app/api/auth/register/route.ts POST endpoint:
      - Validate email/password/role/name from request body
      - Hash password with hashPassword()
      - Call supabase.auth.signUp({ email, password, options: { data: { name, role } } })
      - Insert row into users table with user_id from auth response
      - Insert into creator_profiles or brand_profiles based on role
      - Send email OTP via Supabase (if email confirmation enabled)
      - Return { user, session } or { message: 'Check email for verification' }
      Files: app/api/auth/register/route.ts
      Verify: POST to /api/auth/register with valid data, check Supabase auth users and database users table

- [ ] 13. **Login API Route with Demo Support**
      Create app/api/auth/login/route.ts POST endpoint:
      - First check if email matches demo credentials (brand@cinegen.demo, creator@cinegen.demo, aryan@cinegen.demo ... ishaan@cinegen.demo) with password Demo@123
      - If demo match: use service role client to get user by email, create session with supabase.auth.admin.generateLink() or direct signInWithPassword
      - If not demo: call supabase.auth.signInWithPassword({ email, password })
      - Return { session } with JWT tokens
      Files: app/api/auth/login/route.ts
      Verify: POST to /api/auth/login with brand@cinegen.demo / Demo@123, verify session returned

- [ ] 14. **OTP Verification Route**
      Create app/api/auth/verify-otp/route.ts POST endpoint:
      - Accept { email, otp } from body
      - Call verifyOTP(email, otp) or supabase.auth.verifyOtp({ email, token, type: 'email' })
      - Return session tokens on success
      Files: app/api/auth/verify-otp/route.ts
      Verify: Complete registration flow, verify OTP, check session created

- [ ] 15. **Google OAuth Route**
      Create app/api/auth/google/route.ts GET endpoint:
      - Redirect to supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback` } })
      Files: app/api/auth/google/route.ts
      Verify: Navigate to /api/auth/google, redirects to Google OAuth consent screen

- [ ] 16. **OAuth Callback Handler**
      Create app/auth/callback/route.ts GET handler:
      - Use @supabase/ssr createServerClient to exchange code for session
      - Set session cookies
      - Redirect to /dashboard
      Files: app/auth/callback/route.ts
      Verify: Complete Google OAuth flow, verify redirect to dashboard with session

- [ ] 17. **Rewrite useSession Hook**
      Completely rewrite hooks/useSession.ts:
      - Remove localStorage, use Supabase session state
      - useEffect subscribes to supabase.auth.onAuthStateChange()
      - login(email, password) calls /api/auth/login via fetch, then supabase.auth.setSession(session)
      - loginAsRole(role) calls login with demo credentials for that role
      - logout() calls supabase.auth.signOut()
      - Remove switchRole (users have fixed roles)
      - Add refreshSession() calling supabase.auth.refreshSession()
      - loading state during initial auth check
      Files: hooks/useSession.ts
      Verify: npm run build succeeds, demo login flow works in UI

- [ ] 18. **Update Middleware for JWT**
      Update middleware.ts:
      - Replace cookie role check with Supabase session verification
      - Use createServerClient from @supabase/ssr
      - Call supabase.auth.getUser() to verify JWT
      - Extract role from users table or JWT custom claims
      - Protect /dashboard, /briefs/new (brands only)
      Files: middleware.ts
      Verify: Access /dashboard without login → redirect to /login; login as brand → access granted

- [ ] 19. **Update Login Page**
      Update app/login/page.tsx:
      - Keep existing demo buttons (Continue as Brand, Continue as Creator) calling loginAsRole()
      - Add Google OAuth button redirecting to /api/auth/google
      - Add email/password form calling login() from useSession
      - Show loading spinner during login
      - Display error toast on failure
      Files: app/login/page.tsx
      Verify: All login methods work (demo, manual, Google OAuth)

- [ ] 20. **Update Registration Page**
      Update app/register/page.tsx:
      - Replace localStorage registration with fetch to /api/auth/register
      - Show 'Check your email' message after registration if email verification enabled
      - Add OTP input field, call /api/auth/verify-otp on submit
      - Redirect to /dashboard on successful verification
      Files: app/register/page.tsx
      Verify: Register new user, receive OTP email, verify OTP, redirect to dashboard

---

### PHASE 3: DATABASE-BACKED FEATURES

- [ ] 21. **Rewrite useCreators Hook**
      Rewrite hooks/useCreators.ts:
      - Replace seedCreators with Supabase query: supabase.from('creator_profiles').select('*, user:users(email, name)')
      - Subscribe to real-time updates: supabase.channel('creator_profiles').on('postgres_changes', { event: '*', schema: 'public', table: 'creator_profiles' }, handleChange)
      - Add createCreatorProfile(data), updateCreatorProfile(id, data)
      - Add uploadAvatar(file) and uploadCover(file) using supabase.storage.from('avatars').upload()
      - Return same CreatorProfile[] interface
      Files: hooks/useCreators.ts
      Verify: npm run build succeeds, /creators page displays creators from database

- [ ] 22. **Rewrite useBriefs Hook**
      Rewrite hooks/useBriefs.ts:
      - Query briefs table with RLS filtering (Open briefs for all, own briefs for authenticated brand)
      - Subscribe to real-time changes
      - saveBrief(brief) uses supabase.from('briefs').insert() or .update()
      - deleteBrief(id), updateBriefStatus(id, status)
      Files: hooks/useBriefs.ts
      Verify: npm run build succeeds, /briefs page shows briefs from database

- [ ] 23. **Rewrite useProposals Hook**
      Rewrite hooks/useProposals.ts:
      - Query proposals table (creator sees own, brand sees proposals for their briefs)
      - Real-time subscription
      - submitProposal(briefId, data), updateProposalStatus(id, status)
      - getProposalsForBrief(briefId), getProposalsForCreator(creatorId)
      Files: hooks/useProposals.ts
      Verify: npm run build succeeds, proposal submission and status updates work

- [ ] 24. **Create useMessages Hook**
      Create hooks/useMessages.ts for real-time messaging:
      - getConversations(userId) returns list with last message + unread count
      - getMessages(conversationId) with real-time subscription via supabase.channel()
      - sendMessage(recipientId, content) inserts into messages table
      - markAsRead(messageId)
      - getUnreadCount(userId)
      - Fallback to 10s polling if Realtime quota exceeded
      Files: hooks/useMessages.ts
      Verify: npm run build succeeds, two browser windows can message each other in real-time

- [ ] 25. **Create useReviews Hook**
      Create hooks/useReviews.ts:
      - getReviewsForCreator(creatorId)
      - submitReview(briefId, creatorId, rating, comment) with validation (brand can only review once per engagement)
      - calculateAverageRating(creatorId)
      Files: hooks/useReviews.ts
      Verify: npm run build succeeds

- [ ] 26. **Create useVerifications Hook**
      Create hooks/useVerifications.ts:
      - getVerificationStatus(creatorId)
      - requestVerification(creatorId, type, evidenceUrl)
      - Admin functions: getPendingVerifications(), approveVerification(id, adminNotes), rejectVerification(id, reason)
      Files: hooks/useVerifications.ts
      Verify: npm run build succeeds

- [ ] 27. **Creators API Route**
      Create app/api/creators/route.ts:
      - GET with search/filter query params (tools, specializations, rate range, availability, verified only)
      - Use Supabase query builder with .ilike() for search, .contains() for array filters, .gte()/.lte() for rate range
      - POST for creating profile
      Files: app/api/creators/route.ts
      Verify: GET /api/creators?tools=Runway returns filtered results

- [ ] 28. **Messages API Route**
      Create app/api/messages/route.ts:
      - GET /api/messages?conversationId=X returns messages
      - POST /api/messages sends message and triggers Supabase Realtime broadcast
      Files: app/api/messages/route.ts
      Verify: POST message, GET messages returns new message

- [ ] 29. **Reviews API Route**
      Create app/api/reviews/route.ts:
      - GET /api/reviews?creatorId=X
      - POST /api/reviews with validation (brand hired creator, hasn't reviewed yet)
      Files: app/api/reviews/route.ts
      Verify: POST review, GET reviews includes it

- [ ] 30. **Verifications API Route**
      Create app/api/verifications/route.ts:
      - GET for pending requests (admin only)
      - POST for creator to submit request
      - PATCH for admin approval/rejection
      Files: app/api/verifications/route.ts
      Verify: POST request, admin GET shows pending, admin PATCH approves

- [ ] 31. **Update Creators Discovery Page**
      Update app/creators/page.tsx:
      - Use new Supabase-backed useCreators hook
      - Ensure search and filters still work
      - Maintain existing UI and animations
      Files: app/creators/page.tsx
      Verify: Search, filter, sort all work with database data

- [ ] 32. **Update Dashboard Page**
      Update app/dashboard/page.tsx:
      - Use new hooks for briefs and proposals
      - Add unread message count badge in header using useMessages
      - Display real-time proposal notifications
      Files: app/dashboard/page.tsx
      Verify: Dashboard shows live data, updates when proposal submitted

- [ ] 33. **Update Briefs Pages**
      Update app/briefs/page.tsx and app/briefs/new/page.tsx:
      - Use new useBriefs hook
      - AI Brief Builder saves to Supabase instead of localStorage
      - Maintain Gemini integration
      Files: app/briefs/page.tsx, app/briefs/new/page.tsx
      Verify: Create brief via AI, appears in briefs list and database

- [ ] 34. **Create Messaging Interface**
      Create app/messages/page.tsx:
      - Sidebar: conversation list with avatars, names, last message, unread count
      - Main area: message thread with real-time updates
      - Input: message field + send button
      - Use useMessages hook
      - Add typing indicators (optional)
      Files: app/messages/page.tsx
      Verify: Send message from brand to creator, creator sees it in real-time

- [ ] 35. **Add Review Section Component**
      Create app/creators/[id]/components/ReviewSection.tsx:
      - Display reviews with star ratings
      - Show average rating prominently (large number + stars)
      - Allow brand to submit review if hired (check engagement history)
      - Use useReviews hook
      Files: app/creators/[id]/components/ReviewSection.tsx
      Verify: Brand submits review, appears on creator profile

- [ ] 36. **Enhanced Verification Badge Component**
      Create app/creators/[id]/components/VerificationBadge.tsx:
      - Badge with tooltip showing evidence (tools verified, workflow verified, past work verified)
      - 'Request Verification' button for creator on own profile
      - Use useVerifications hook
      Files: app/creators/[id]/components/VerificationBadge.tsx
      Verify: Creator requests verification, admin sees request

- [ ] 37. **Admin Verifications Dashboard**
      Create app/admin/verifications/page.tsx:
      - List pending verification requests
      - Show evidence URLs (open in modal or new tab)
      - Approve/reject buttons with admin notes field
      - Only accessible to admin role users
      Files: app/admin/verifications/page.tsx
      Verify: Admin approves request, creator's badge updates immediately

---

### PHASE 4: LEGENDARY UI TRANSFORMATION

- [ ] 38. **Update Tailwind Config**
      Update tailwind.config.ts:
      - Add new colors: purple (500: #8B5CF6, 600: #7c3aed), indigo (500: #6366F1, 600: #4f46e5), teal (500: #14B8A6, 600: #0d9488), pink (500: #EC4899, 600: #db2777), slate (900: #0F172A, 800: #1E293B, 950: #020617)
      - Add animations: glow, float-slow, shimmer-slow, gradient-shift, pulse-glow, fade-in-up, scale-in, slide-in-right
      - Add backdrop-blur utilities
      Files: tailwind.config.ts
      Verify: npm run build succeeds

- [ ] 39. **Update Global CSS**
      Update app/globals.css:
      - Add .glass-strong (rgba(255,255,255,0.1) + blur(20px)), .glass-card (rgba(255,255,255,0.05) + blur(16px))
      - Add gradient text utilities (.gradient-primary, .gradient-secondary, .gradient-accent)
      - Add @keyframes gradient-shift, glow, pulse-glow
      - Add .btn-glow with box-shadow transitions
      - Improve grain overlay (opacity 0.02)
      Files: app/globals.css
      Verify: Glass effects visible in UI

- [ ] 40. **Install Animation Packages**
      Install: npm install react-confetti-explosion react-type-animation react-intersection-observer
      (Skip tsparticles - use CSS-only particles)
      Files: package.json
      Verify: npm install succeeds

- [ ] 41. **Create Particle Background Component**
      Create components/ui/ParticleBackground.tsx:
      - ~30 small div elements with absolute positioning
      - Random left/top percentages
      - Slow float animation with random delays
      - Blur effect
      - Purple/cyan gradient colors
      - CSS-only (no library)
      Files: components/ui/ParticleBackground.tsx
      Verify: npm run build succeeds, particles render on page

- [ ] 42. **Rebuild Homepage Hero**
      Update app/page.tsx:
      - Animated gradient background (gradient-shift animation from purple → indigo → teal)
      - Add ParticleBackground component
      - Hero heading with gradient text + fade-in-up animation
      - Replace static creator cards with 3D tilt effect (Framer Motion rotateX/rotateY on hover)
      - Floating animation on feature icons
      - CTA buttons with glow + scale on hover
      - Scroll-triggered fade-in for 'How It Works' using react-intersection-observer
      Files: app/page.tsx
      Verify: Hero has animated gradient, particles, 3D tilt cards

- [ ] 43. **Rebuild Creator Card**
      Update components/creators/CreatorCard.tsx:
      - Enhanced glassmorphism (.glass-card)
      - Animated gradient border on hover (pseudo-element with gradient-shift)
      - Verified badge with pulsing glow (box-shadow pulse)
      - Tool badges with hover scale + glow
      - Avatar with gradient ring border
      - Image zoom on hover (scale-110, longer duration)
      - 'View Profile' button overlay on hover with backdrop-blur
      - Stats with count-up animation (use custom counter)
      Files: components/creators/CreatorCard.tsx
      Verify: Card hover shows gradient border, badge glows, smooth animations

- [ ] 44. **Rebuild Navbar**
      Update components/layout/Navbar.tsx:
      - Strong glass effect (.glass-strong + border-b)
      - Logo with gradient text
      - Active link with animated gradient underline (width 0 → 100%)
      - Tools dropdown with glass + scale-in animation
      - User avatar with online status (green pulsing dot)
      - Notification bell with pulse when unread > 0
      - Mobile hamburger with slide-in drawer
      Files: components/layout/Navbar.tsx
      Verify: Navbar glass effect, active underline animates, bell pulses with notifications

- [ ] 45. **Rebuild Dashboard**
      Update app/dashboard/page.tsx:
      - Stat cards with gradient backgrounds + count-up animations (custom useCountUp hook)
      - Engagement stepper with animated SVG progress lines (stroke-dashoffset)
      - Primary action card with stronger gradient + glow
      - Proposal cards with glass + hover lift
      - 'Mark Delivered' button with confetti on click (react-confetti-explosion)
      - Recent activity feed with slide-in-right per item (staggered)
      Files: app/dashboard/page.tsx
      Verify: Stats count up, confetti on delivered, smooth animations

- [ ] 46. **Rebuild AI Brief Builder**
      Update app/briefs/new/page.tsx:
      - Glass inputs with focus glow (border glow purple gradient)
      - AI generation with typing animation (react-type-animation)
      - Brief Intelligence panel with animated score ring (SVG stroke-dashoffset)
      - Score color: green >80, yellow 60-80, red <60
      - Error/warning/tip items slide in with icons
      - 'Generate with AI' button with shimmer on hover
      - 'Publish Brief' button with confetti on success
      - Match results with creator cards sliding up in sequence
      Files: app/briefs/new/page.tsx
      Verify: Typing animation during generation, score ring animates, confetti on publish

- [ ] 47. **Rebuild Brief Intelligence Component**
      Update components/briefs/BriefIntelligence.tsx:
      - Animated score ring (Framer Motion SVG circle)
      - Score number with count-up
      - Error/warning/tip sections with expandable accordions (height animation)
      - Items fade in with stagger
      - Error icons pulse
      - Glass card with gradient background
      Files: components/briefs/BriefIntelligence.tsx
      Verify: Score ring animates from 0 to score, items slide in

- [ ] 48. **Rebuild Style DNA Component**
      Update components/creators/StyleDNA.tsx:
      - SVG radar chart with animated path drawing (stroke-dashoffset)
      - Axis labels fade in with delay
      - Data points pulse on hover
      - Gradient fill (purple → cyan radial)
      - Tooltip on hover with exact scores
      - Animated legend
      Files: components/creators/StyleDNA.tsx
      Verify: Radar chart draws smoothly, hover shows tooltips

- [ ] 49. **Create Reusable Button Component**
      Create components/ui/Button.tsx:
      - Variants: primary (gradient + glow), secondary (glass), outline
      - Sizes: sm, md, lg
      - Disabled state
      - Loading spinner
      - Hover scale + glow
      - Icon support
      Files: components/ui/Button.tsx
      Verify: npm run build succeeds, buttons render with animations

- [ ] 50. **Enhanced Skeleton Components**
      Update components/creators/CreatorCardSkeleton.tsx, create BriefCardSkeleton, ProposalCardSkeleton, DashboardStatSkeleton:
      - New shimmer animation (shimmer-slow)
      - Glass background
      - Proper aspect ratios
      Files: components/creators/CreatorCardSkeleton.tsx, components/ui/BriefCardSkeleton.tsx, components/ui/ProposalCardSkeleton.tsx, components/ui/DashboardStatSkeleton.tsx
      Verify: Skeletons show during loading with smooth shimmer

- [ ] 51. **Custom Toast Component**
      Create components/ui/Toast.tsx:
      - Slide-in from top-right
      - Auto-dismiss after 5s
      - Variants: success (green gradient), error (red gradient), info (purple gradient), warning (yellow gradient)
      - Progress bar animation
      - Replace or enhance Sonner
      Files: components/ui/Toast.tsx
      Verify: Toasts appear with slide-in, auto-dismiss after 5s

- [ ] 52. **Mobile Responsiveness Audit**
      Full mobile audit and fixes:
      - Navbar: hamburger menu on mobile with slide-out drawer
      - Creator cards: 1 column <640px, 2 columns 640-1024px, 3-4 columns desktop
      - Dashboard stats: 2x2 grid mobile, 4 columns desktop
      - Brief builder: full-width mobile, side-by-side desktop
      - Text sizes: text-sm mobile, text-base desktop
      - Touch targets: min 44x44px
      - Test viewports: 320px, 375px, 768px, 1024px, 1920px, 2560px
      Files: All components and pages
      Verify: Test each viewport in Chrome DevTools, no horizontal scroll, readable text, proper layouts

- [ ] 53. **Add Scroll Animations**
      Add scroll-triggered animations throughout using react-intersection-observer:
      - Creator cards fade-in-up on scroll
      - How It Works steps
      - Stats sections
      - Footer sections
      Files: app/page.tsx, app/creators/page.tsx, components/layout/Footer.tsx
      Verify: Scroll down pages, elements animate into view

- [ ] 54. **Performance Optimization**
      Optimize for performance:
      - Lazy load ParticleBackground, confetti, react-type-animation with next/dynamic
      - Use next/image for creator avatars, portfolio thumbnails
      - Add prefers-reduced-motion: disable complex animations
      - Debounce hover animations
      Files: Various
      Verify: Lighthouse performance >85, animations smooth 60fps

---

### PHASE 5: PRODUCTION DEPLOYMENT

- [ ] 55. **Render Configuration**
      Create render.yaml:
      - Web service, Node 20
      - Build command: npm install && npm run build
      - Start command: npm start
      - Environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
      - Auto-deploy from main branch
      Files: render.yaml
      Verify: File is valid YAML

- [ ] 56. **Environment Variables Documentation**
      Update .env.example with all variables:
      - NEXT_PUBLIC_SUPABASE_URL
      - NEXT_PUBLIC_SUPABASE_ANON_KEY
      - SUPABASE_SERVICE_ROLE_KEY (warning: never expose)
      - GEMINI_API_KEY (optional)
      - NODE_ENV
      Files: .env.example
      Verify: All variables documented with instructions

- [ ] 57. **Deployment Guide**
      Create DEPLOYMENT.md:
      - Step-by-step Render deployment
      - Environment variable setup
      - Custom domain configuration
      - SSL certificate notes
      - Troubleshooting section
      Files: DEPLOYMENT.md
      Verify: Guide is comprehensive and accurate

- [ ] 58. **Update README**
      Update README.md:
      - Replace Vercel badge with Render badge + new URL
      - Add 'New in v2.0' section (Supabase backend, real-time features, verification, enhanced UI, Google OAuth)
      - Update Tech Stack (add Supabase, PostgreSQL, Realtime, bcryptjs)
      - Update Architecture diagram (add Supabase layer)
      - Keep judge access prominent
      - Add screenshots section (6-8 key screenshots)
      - Update Run Locally section (reference SETUP.md)
      - Add Environment Variables section
      Files: README.md
      Verify: README is accurate and comprehensive

- [ ] 59. **Create Changelog**
      Create CHANGELOG.md:
      - v2.0 changes in detail
      - Breaking changes (localStorage → Supabase)
      - New features (messaging, verification, reviews, OAuth)
      - UI improvements (color palette, animations, responsive)
      - Technical improvements (PostgreSQL RLS, JWT, storage)
      Files: CHANGELOG.md
      Verify: All changes documented

- [ ] 60. **Architecture Documentation**
      Create docs/ARCHITECTURE.md:
      - System architecture diagram
      - Database schema with relationships
      - Auth flow diagram
      - RLS policies explanation
      - Real-time messaging architecture
      - File upload flow
      - Security considerations
      Files: docs/ARCHITECTURE.md
      Verify: Technical details are accurate

- [ ] 61. **API Documentation**
      Create docs/API.md:
      - Document all API routes with request/response examples
      - Authentication requirements
      - Error codes
      Files: docs/API.md
      Verify: All endpoints documented

- [ ] 62. **Final Polish**
      Polish pass on all pages:
      - Fix console errors/warnings
      - Add loading states
      - Add error boundaries (create components/ErrorBoundary.tsx)
      - Add empty states (no results, no messages, etc.)
      - Verify all links work
      - Spell check
      - Form validation + error messages
      - Success/error toasts for all actions
      Files: All pages and components
      Verify: No console errors, all UX flows complete

- [ ] 63. **Demo Video Script**
      Create demo video script (for user to record):
      1. Homepage - hero animations, scroll features
      2. Demo login - Continue as Brand
      3. Dashboard - stats count-up, engagement stepper
      4. Discover - search, filter, creator cards
      5. Creator profile - Style DNA, portfolio, reviews
      6. AI Brief Builder - typing animation, score, matches
      7. Messages - real-time messaging
      8. Proposal flow - submit, accept, mark delivered with confetti
      9. Review - submit 5-star review
      Target 3-4 minutes
      Files: DEMO_SCRIPT.md
      Verify: Script covers all key features

- [ ] 64. **Performance Optimization Check**
      Run Lighthouse audits:
      - Homepage, /creators, /dashboard, /briefs/new
      - Target: Performance >85, Accessibility 100, Best Practices 100, SEO >90
      - Optimize images (compress, WebP)
      - Check bundle size (<1MB main)
      - Enable Next.js optimizations (swcMinify: true)
      - Add meta tags for SEO
      - Add favicon
      Files: Various
      Verify: Lighthouse scores meet targets

- [ ] 65. **Security Audit**
      Security audit:
      - All API routes validate auth token
      - RLS enabled on all tables (test with unauthenticated client)
      - No SUPABASE_SERVICE_ROLE_KEY in client code (grep check)
      - Password hashing with bcryptjs, 10+ salt rounds
      - Parameterized queries only (no SQL injection)
      - Rate limiting on auth endpoints (optional: Upstash Redis)
      - CORS headers (same origin only)
      Files: All API routes
      Verify: No security vulnerabilities found

- [ ] 66. **Final Testing Checklist**
      Create TESTING.md with comprehensive scenarios:
      - Demo login (all accounts)
      - New user registration + email verification
      - Google OAuth
      - Creator discovery (search, filters)
      - Brief creation (manual + AI)
      - Proposal submission + acceptance
      - Real-time messaging (two browsers)
      - Review submission + display
      - Verification request flow
      - All animations (desktop + mobile)
      - Responsive design (5 viewports)
      - Cross-browser (Chrome, Firefox, Safari)
      Files: TESTING.md
      Verify: All test scenarios pass

---

## Verification Commands

After each phase:
```bash
npm run build              # Must succeed with no errors
npm run dev               # Manual testing in browser
npm run db:seed           # Database seeding (Phase 1)
```

Final verification:
```bash
npm run build             # Production build succeeds
# Deploy to Render following DEPLOYMENT.md
# Test all features on production URL
# Run Lighthouse audits
# Complete TESTING.md checklist
```

---

## Success Criteria

✅ **Backend**: Supabase database with 18 seeded creators, RLS policies, storage buckets
✅ **Auth**: JWT auth with demo mode, email OTP, Google OAuth all working
✅ **Features**: Creator discovery, briefs, proposals, real-time messaging, reviews, verification system all functional
✅ **UI**: New color palette, advanced animations, glassmorphism, 3D effects, confetti, particles, mobile responsive
✅ **Production**: Deployed to Render, all env vars configured, comprehensive docs, demo video script ready
✅ **Performance**: Lighthouse >85 performance, 100 accessibility, no console errors
✅ **Security**: RLS enforced, no exposed secrets, auth validated, passwords hashed

---

## Notes

- This plan preserves all 18 existing creator profiles via database seeding
- Demo mode maintained for hackathon judges (brand@cinegen.demo, all creator emails work with Demo@123)
- All existing features (AI Brief Builder, Brief Intelligence, Style DNA, Budget Estimator, Risk Scanner, Leaderboard) remain functional
- UI transformation inspired by competitor analysis (Crevo's UI) but with unique CineGen identity
- Deployment target changed from Vercel to Render per requirements
- Real-time features use Supabase Realtime with 10s polling fallback for free tier quota limits
