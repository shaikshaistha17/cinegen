# Changelog

All notable changes to CineGen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2024-01-XX

### 🎉 Major Release: Production-Ready with Supabase Backend

Complete transformation from localStorage prototype to production-ready marketplace with real-time features, authentication, and legendary UI.

---

### ⚠️ Breaking Changes

- **Data Storage Migration**: All data moved from `localStorage` to Supabase PostgreSQL database
  - Existing localStorage sessions, briefs, and proposals will not carry over
  - Users must re-register or use demo credentials
  - Migration path: Export localStorage data manually if needed before upgrading

- **Authentication System Overhaul**: New JWT-based auth with Supabase
  - Cookie-based role storage replaced with secure JWT tokens
  - Session structure changed: now includes `access_token`, `refresh_token`, `expires_at`
  - Old sessions are invalid and require re-login

- **API Changes**: All data fetching now goes through Supabase client instead of localStorage
  - `useCreators`, `useBriefs`, `useProposals` hooks rewritten with new signatures
  - Real-time subscriptions replace manual state updates

---

### ✨ New Features

#### Backend & Infrastructure
- **Supabase Integration**: Full PostgreSQL backend with Row Level Security (RLS)
  - 9 database tables: users, creator_profiles, brand_profiles, briefs, proposals, messages, reviews, verifications, otp_codes
  - Comprehensive RLS policies for data security
  - Automatic database seeding with 18 creator profiles
  
- **Authentication System**
  - Email/password registration with bcrypt hashing (10 salt rounds)
  - Email OTP verification (6-digit code, 15-minute expiry)
  - Google OAuth integration
  - JWT access/refresh tokens
  - Demo login support for all 18 creators + brand account
  
- **Real-time Messaging**
  - Live 1-on-1 conversations between brands and creators
  - Supabase Realtime subscriptions for instant message delivery
  - Unread message count tracking
  - Conversation list with last message preview
  - 10-second polling fallback if Realtime quota exceeded
  
- **Creator Verification System**
  - Verification request submission with evidence URLs
  - Admin review dashboard for approvals/rejections
  - Verified badge with animated glow effect
  - Evidence panel showing audited proof bullets
  
- **Review & Rating System**
  - 1-5 star ratings for completed projects
  - Brand-only review submission (once per engagement)
  - Average rating calculation displayed on profiles
  - Review feed with timestamps and comments

#### UI Enhancements
- **New Color Palette**: Purple-indigo-teal-pink gradient system
  - Primary: Purple (#8B5CF6, #7c3aed)
  - Secondary: Indigo (#6366F1, #4f46e5)
  - Accent: Teal (#14B8A6, #0d9488) + Pink (#EC4899, #db2777)
  - Background: Deep slate (#0F172A, #1E293B, #020617)
  
- **Advanced Animations**
  - Confetti explosions on milestone actions (brief published, mark delivered)
  - Particle background with floating orbs (30+ elements, CSS-only)
  - 3D card tilt effects on hover (Framer Motion rotateX/rotateY)
  - Animated gradient borders on creator cards
  - Score ring animations with stroke-dashoffset
  - Count-up animations for dashboard stats
  - Typing animations during AI brief generation
  - Scroll-triggered fade-in-up for sections
  - Pulsing glow effects on badges and notifications
  
- **Glassmorphism Design**
  - `.glass-strong`: Enhanced glass effect for navbar (blur 20px, opacity 0.1)
  - `.glass-card`: Subtle glass for cards (blur 16px, opacity 0.05)
  - Backdrop-blur utilities throughout UI
  - Gradient overlays on interactive elements
  
- **Enhanced Components**
  - Navbar with glass effect, gradient logo, animated underline for active links
  - Dashboard with gradient stat cards and engagement stepper
  - Creator cards with gradient borders, pulsing badges, zoom on hover
  - Brief Intelligence panel with animated score ring and expanding accordions
  - Style DNA radar chart with animated path drawing
  - Button component with variants (primary glow, secondary glass, outline)
  - Skeleton loaders with shimmer animation
  
- **Mobile Responsiveness**
  - Hamburger menu with slide-out drawer
  - Responsive grid layouts (1 col mobile → 2-3 cols tablet → 4 cols desktop)
  - Touch-optimized buttons (min 44x44px)
  - Tested on 5 viewports: 320px, 375px, 768px, 1024px, 1920px

#### Features & Tools
- **Enhanced Messaging Interface** (`/messages`)
  - Conversation sidebar with avatars, last message, unread badges
  - Real-time message thread
  - Send button with loading state
  - Typing indicators (placeholder for future)
  
- **Review Section on Profiles**
  - Star rating display (1-5 stars)
  - Average rating prominently shown
  - Review submission form for brands
  - Review feed with user avatars and timestamps
  
- **Admin Verifications Dashboard** (`/admin/verifications`)
  - Pending verification requests list
  - Evidence preview (links to portfolios, tools screenshots)
  - Approve/reject buttons with admin notes field
  - Real-time updates when status changes

---

### 🔧 Technical Improvements

#### Database
- **Schema Design**
  - Foreign keys with CASCADE deletes where appropriate
  - Indexes on frequently queried columns (user_id, brief_id, status, created_at)
  - CHECK constraints for data validation (rating 1-5, valid email format)
  - JSONB columns for flexible data (verified_tools, stats, commercial_use)
  
- **Row Level Security**
  - Users can only read their own data and public profiles
  - Brands can read proposals for their briefs
  - Creators can read their own proposals
  - Messages restricted to conversation participants
  - Admin-only access for verification approvals
  
- **Storage Buckets**
  - `avatars`: 2MB limit, image/* only, public read
  - `portfolios`: 10MB limit, image/* and video/*, public read

#### Authentication & Security
- **Password Security**
  - bcryptjs hashing with 10 salt rounds
  - Passwords never stored in plain text
  - Service role key never exposed to client
  
- **JWT Tokens**
  - Access token with 1-hour expiry
  - Refresh token for seamless re-auth
  - Stored securely in HTTP-only cookies (via Supabase SSR)
  
- **API Routes**
  - Server-side only Gemini API calls (key never exposed)
  - Supabase client with RLS for data queries
  - Middleware route protection for authenticated pages

#### Performance
- **Lazy Loading**
  - ParticleBackground loaded with `next/dynamic`
  - Confetti explosions loaded on demand
  - react-type-animation lazy imported
  
- **Optimized Images**
  - `next/image` for all avatars and portfolio images
  - Supabase CDN for fast image delivery
  - Image domains configured in `next.config.mjs`
  
- **Reduced Motion Support**
  - `prefers-reduced-motion` media query disables complex animations
  - Fallback to simple transitions for accessibility
  
- **Real-time Optimization**
  - Supabase Realtime with 10-second polling fallback
  - Unsubscribe from channels on unmount to prevent memory leaks

#### Developer Experience
- **TypeScript**
  - Full type coverage for Supabase tables
  - Type-safe API route handlers
  - Strict mode enabled
  
- **Scripts**
  - `npm run db:seed` — Seeds database with 18 creators + demo brand
  - `npm run db:reset` — Drops and recreates all tables
  
- **Documentation**
  - [SETUP.md](./SETUP.md) — Complete Supabase setup guide
  - [DEPLOYMENT.md](./DEPLOYMENT.md) — Step-by-step Render deployment
  - [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System architecture deep dive
  - [docs/API.md](./docs/API.md) — API route documentation
  - [TESTING.md](./TESTING.md) — Test scenarios and checklist

---

### 🐛 Bug Fixes

- Fixed React key warnings in creator cards list
- Fixed console errors from missing Framer Motion layout props
- Added error boundaries to prevent full-app crashes
- Fixed responsive layout breaking at 768px breakpoint
- Fixed proposal status not updating in real-time
- Added loading states to all data-fetching operations
- Fixed empty state handling for lists (creators, briefs, messages, proposals)
- Added form validation error messages for all inputs
- Fixed toast notifications not showing on slow connections
- Fixed avatar images not loading from Supabase Storage

---

### 📚 Documentation

- **New Files**
  - `DEPLOYMENT.md` — Production deployment guide for Render
  - `CHANGELOG.md` — This file
  - `docs/ARCHITECTURE.md` — System architecture and data flow
  - `docs/API.md` — Complete API reference
  - `TESTING.md` — Test scenarios for QA
  
- **Updated Files**
  - `README.md` — Updated with v2.0 features, new tech stack, deployment badge
  - `SETUP.md` — Expanded with Supabase setup instructions
  - `.env.example` — Added all new environment variables with warnings

---

### 🎨 UI/UX Improvements

- Navbar with glass effect and animated active link underline
- Dashboard stat cards with gradient backgrounds and count-up animations
- Creator cards with 3D tilt, gradient borders, and zoom hover
- AI Brief Builder with typing animation during generation
- Brief Intelligence score ring with animated stroke drawing
- Confetti on milestone actions (publish brief, mark delivered)
- Particle background on homepage hero
- Scroll-triggered fade-in animations on all sections
- Pulsing notification bell when unread messages > 0
- Enhanced skeleton loaders with shimmer animation
- Gradient text for headings throughout app
- Smooth page transitions with Framer Motion

---

### 🔄 Migration Guide

#### From v1.0 (localStorage) to v2.0 (Supabase)

1. **Backup existing data** (if needed):
   ```js
   // In browser console
   console.log(localStorage.getItem('cinegen_briefs'))
   console.log(localStorage.getItem('cinegen_proposals'))
   ```

2. **Set up Supabase**:
   - Follow [SETUP.md](./SETUP.md)
   - Run database schema and seed scripts

3. **Update environment variables**:
   ```bash
   cp .env.example .env.local
   # Add Supabase credentials
   ```

4. **Re-register or use demo accounts**:
   - Old sessions are invalid
   - Demo credentials: `brand@cinegen.demo` / `Demo@123`

5. **Data migration** (optional):
   - Write custom script to import old localStorage data to Supabase
   - Contact support if bulk migration needed

---

## [1.0.0] - 2024-01-XX

### Initial Release

- 18 creator profiles with AI tools and specializations
- localStorage-based data storage
- AI Brief Builder with Gemini API
- Brief Intelligence audit panel
- Style DNA radar chart
- Budget Estimator tool
- Risk Scanner
- Creator comparison
- Leaderboard
- Demo login system
- Dark theme with glass effects
- Framer Motion animations
- Deployed on Vercel

---

## Roadmap

### [2.1.0] — Enhanced Collaboration
- [ ] Team accounts for brands (multi-user organizations)
- [ ] Creator teams and collaborations
- [ ] Shared brief templates
- [ ] Approval workflows for brand teams
- [ ] Comment threads on briefs
- [ ] @mentions in messages

### [2.2.0] — Payments & Escrow
- [ ] Stripe integration
- [ ] Milestone-based payments
- [ ] Escrow system for projects
- [ ] Invoice generation
- [ ] Payment disputes resolution
- [ ] Creator payout dashboard

### [2.3.0] — Advanced Features
- [ ] Video portfolio uploads
- [ ] Direct call scheduling (Calendly integration)
- [ ] Contract templates
- [ ] NDA signing (DocuSign integration)
- [ ] Project management board (Kanban)
- [ ] Time tracking for hourly projects

### [3.0.0] — AI Evolution
- [ ] AI-powered creator matching (ML model)
- [ ] Automated style analysis from portfolio
- [ ] Brief quality score using Gemini
- [ ] Smart negotiation suggestions
- [ ] Automated follow-ups and reminders
- [ ] Sentiment analysis for reviews

---

**Legend**:
- ✨ New Features
- 🔧 Technical Improvements
- 🐛 Bug Fixes
- ⚠️ Breaking Changes
- 📚 Documentation
- 🎨 UI/UX Improvements
