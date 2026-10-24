<div align="center">

# 🎬 CineGen
### AI-Native Creative Marketplace

**Discover talent. Define campaigns. Create with confidence.**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-cinegen.onrender.com-6d28d9?style=for-the-badge)](https://cinegen.onrender.com)
[![Next.js](https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini AI](https://img.shields.io/badge/Gemini_2.0_Flash-4285F4?style=for-the-badge&logo=google)](https://aistudio.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Render](https://img.shields.io/badge/Deployed_on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)

> Built for the **Kampus.VC AI Content Creator Marketplace Hackathon**

</div>

---

## 1. What is CineGen?

CineGen is an AI-native creative marketplace that connects **brands and agencies** with **verified AI content creators** — filmmakers, animators, generative artists, and motion designers.

### The Problem It Solves
Brands struggle to find, evaluate, and brief AI creators because:
- No standard portfolios exist for AI-generated work
- No way to verify which tools a creator actually uses
- Traditional freelance platforms don't understand AI-specific workflows
- Licensing and commercial-use requirements are unclear
- Briefing AI creators requires a different structure than traditional briefs

### How CineGen Solves It
- **Transparent portfolios** — creators show tools, prompts, and step-by-step workflow, not just final output
- **Explainable matching** — % compatibility scores with reasons, not a black box
- **AI Brief Builder** — Gemini AI turns a rough idea into a complete structured brief
- **Commercial Risk Scanner** — flags IP and licensing issues before engagement
- **Verification Evidence** — audited proof of tools and workflows

---

## 2. Judge Access — Zero Friction

> No signup. No OTP. No email verification. **Instant access.**

### 🔗 Live URL
```
https://cinegen.onrender.com
```

A **judge welcome banner** appears at the top with instant access. Click it or go to `/login`.

> **Note:** First visit may take ~30 seconds to wake up (free tier Render service). Subsequent visits are instant.

### 1-Click Login

| Button | What you get |
|--------|-------------|
| **"Continue as Brand"** | Full brand dashboard, post briefs, AI builder, proposals |
| **"Continue as Creator"** | Creator dashboard, browse briefs, submit proposals |
| **"Explore as Guest"** | Browse all 18 creators without logging in |

### Manual Credentials

| Role | Email | Password |
|------|-------|----------|
| 🏢 Brand (Arjun Mehta) | `brand@cinegen.demo` | `Demo@123` |
| 🎬 Creator (Aryan Kapoor) | `creator@cinegen.demo` | `Demo@123` |

### All 18 Creator Accounts — Password: `Demo@123`

| Creator | Email | Specialty |
|---------|-------|-----------|
| Aryan Kapoor | aryan@cinegen.demo | AI Filmmaker |
| Priya Nair | priya@cinegen.demo | Animator |
| Rahul Sharma | rahul@cinegen.demo | 3D Visualizer |
| Zara Ahmed | zara@cinegen.demo | Fashion Filmmaker |
| Marcus Chen | marcus@cinegen.demo | VFX Director |
| Anjali Desai | anjali@cinegen.demo | Audio Director |
| Vikram Rajan | vikram@cinegen.demo | Product Commercial |
| Lena Volkov | lena@cinegen.demo | Music Video |
| Dev Patel | dev@cinegen.demo | Motion Designer |
| Yuna Kim | yuna@cinegen.demo | K-Style Content |
| Rohan Mathur | rohan@cinegen.demo | Documentary |
| Aisha Okafor | aisha@cinegen.demo | Brand Storyteller |
| Sameer Joshi | sameer@cinegen.demo | Social Media |
| Carlos Rivera | carlos@cinegen.demo | Sports Content |
| Meera Iyer | meera@cinegen.demo | Art-House |
| Tanvir Sheikh | tanvir@cinegen.demo | Architecture Viz |
| Natasha Pinto | natasha@cinegen.demo | Fashion Editorial |
| Ishaan Verma | ishaan@cinegen.demo | Gaming Content |

> 💡 **Tip:** The **Demo** switcher in the navbar lets you flip between Brand ↔ Creator instantly — no re-login needed.

---

## 3. New in v2.0 🎉

### Major Enhancements

**🗄️ Supabase Backend**
- PostgreSQL database with Row Level Security (RLS)
- 9 database tables for users, profiles, briefs, proposals, messages, reviews, verifications
- Real-time subscriptions for live updates
- Supabase Storage for avatars and portfolios

**🔐 Production-Ready Authentication**
- Email/password with bcrypt hashing (10 salt rounds)
- Email OTP verification (6-digit code, 15-min expiry)
- Google OAuth integration
- JWT access/refresh tokens with automatic rotation
- Demo accounts for instant testing

**💬 Real-time Messaging**
- Live 1-on-1 conversations between brands and creators
- Supabase Realtime for instant message delivery (~200ms latency)
- Unread message tracking with notification badges
- Conversation sidebar with last message preview

**✅ Verification System**
- Creators request verification with evidence URLs
- Admin review dashboard for approvals/rejections
- Verified badges with animated pulse glow
- Evidence panel showing audited proof

**⭐ Review & Rating System**
- 1-5 star ratings for completed projects
- Post-engagement review submission (brands only)
- Average rating calculation and display
- Review feed on creator profiles

**🎨 Legendary UI Transformation**
- New color palette: Purple-indigo-teal-pink gradients
- Advanced animations: Confetti, particles, 3D card tilt, score rings
- Enhanced glassmorphism with backdrop-blur
- Typing animations during AI brief generation
- Scroll-triggered fade-in effects
- Mobile-responsive hamburger menu

**📊 Enhanced Features**
- Brief Intelligence with real-time audit and score ring
- Style DNA radar chart with animated path drawing
- Budget Estimator and Risk Scanner tools
- Creator comparison with AI recommendations
- Leaderboard with podium display

---

## 4. Full Demo Guide

### 🏢 Brand Workflow

**Step 1 — Login**
- Go to `/login` → click **"Continue as Brand"** → lands on dashboard instantly

**Step 2 — Dashboard**
- Stats: Active Briefs, Proposals Received, Creators Hired, Total Budget
- Engagement stepper: Discovery → Brief → Proposals → Hired → **Delivered**
- Click **"✓ Mark Delivered"** on an Accepted engagement to complete the full lifecycle
- Primary action card: Post Brief / Estimate Budget

**Step 3 — Discover Creators**
- Click **Discover** in navbar
- Search: try "cinematic" or "Runway"
- Filter by: AI tools, specialization, availability, rate range, verified only
- Sort by: Top Rated, Rate Low→High, Most Projects
- Click **"⚖️ Compare Creators"** for side-by-side analysis

**Step 4 — Creator Profile**
- Click any creator card
- **Style DNA** — hexagonal radar chart: Cinematic / Bold / Minimal / Experimental / Commercial / Artistic
- **Portfolio** — click any item → full modal with step-by-step production workflow
- **Verification Evidence** — audited proof bullets per verified badge
- **AI Tools & Proficiency** — Expert / Advanced / Intermediate per tool
- Click **"Invite to Brief"** to express interest

**Step 5 — AI Brief Builder**
- Go to **Briefs → Create Brief**
- Select **"AI Brief Builder"** tab
- Type a rough idea: *"A cinematic 30-second ad for a luxury skincare brand"*
- Click **"Generate Brief with Gemini AI"**
- Watch fields fill progressively with animation
- **Brief Intelligence panel** (right sidebar) gives live audit:
  - Score out of 100
  - 🔴 Errors: missing required fields
  - 🟡 Warnings: recommended additions
  - 🔵 Tips: improvement suggestions
- Click **"Publish Brief"**

**Step 6 — Match Results**
- See Top 5 Creator Matches with:
  - SVG circular score rings (color-coded)
  - Explainable reason tags: "Tool overlap ✓", "Specialization match ✓", "Budget fit ✓"

**Step 7 — Tools Menu (navbar → Tools ▾)**

| Tool | Path | What it does |
|------|------|-------------|
| Budget Estimator | `/estimator` | Content type + platform + quality = instant cost estimate + savings vs agency |
| Risk Scanner | `/risk-scanner` | Flags IP risks, license gaps, model indemnity, synthetic voice disclosure |
| Compare Creators | `/compare` | Side-by-side table for up to 3 creators + AI recommendation |
| Leaderboard | `/leaderboard` | Creator rankings with podium, multiple metrics, time filters |

---

### 🎬 Creator Workflow

**Step 1 — Login**
- Go to `/login` → click **"Continue as Creator"**

**Step 2 — Dashboard**
- Stats: Proposals Sent, Accepted, Open Briefs, Response Rate
- **"🔔 New Briefs Matching Your Profile"** — live pulsing badge
- Proposal tracker: Pending → Shortlisted → Accepted → Rejected
- Open briefs feed with budget ranges

**Step 3 — Browse & Apply**
- Click **Briefs** → see open brand campaigns
- Click **"Apply"** → fill message, price, timeline → submit

---

### 🆕 New User Registration

- Go to `/register` → choose Brand or Creator → fill details → account created
- **Creator path** → redirects to `/onboarding`:
  - Step 1: Headline + Bio + Location
  - Step 2: AI Tools + Specializations + Skills
  - Step 3: Availability + Hourly Rate
  - Click **"Launch My Profile"** → dashboard

---

## 4. Features

### Core Features
| Feature | Description |
|---------|-------------|
| 18 Creator Profiles | Full profiles with bio, tools, specializations, stats, portfolios |
| AI Portfolios | Each item shows tools, prompts, step-by-step workflow |
| Creator Search | Full-text search by name, skill, tool, specialization, bio |
| 5 Filter Dimensions | Tools, specialization, availability, rate range, verified-only |
| 4 Sort Options | Relevance, top rated, rate asc/desc, most projects |
| Brand Dashboard | Stats, engagement stepper, recent briefs, primary action |
| Creator Dashboard | Proposals tracker, matching briefs alert, stats |
| Proposal System | Submit, track status, accept/reject, mark delivered |
| Auth & Onboarding | Demo login, register, 3-step creator onboarding |

### Unique Features
| Feature | Description |
|---------|-------------|
| 🧠 Brief Intelligence | Real-time audit: score/100, errors, warnings, fix tips |
| 🧬 Style DNA | SVG radar chart: 6 style axes per creator |
| 🎯 Match Score Rings | SVG circular rings with explainable reason tags |
| ✅ Verification Evidence | Audited proof bullets per verified badge |
| ⚖️ Creator Comparison | Side-by-side table + AI recommendation |
| 💰 Budget Estimator | AI cost vs traditional agency + savings % |
| 🛡️ Risk Scanner | IP/licensing/compliance audit with fix recommendations |
| 🏆 Leaderboard | Rankings with podium, multiple metrics, time filters |
| 🔔 Brief Matching Alert | Live pulsing badge for new matching briefs |
| ✓ Mark as Delivered | Complete full engagement lifecycle |

---

## 5. Tech Stack

### Framework & Language
| Tech | Version | Purpose |
|------|---------|---------|
| Next.js | 14.2.35 | App Router, SSR, API routes |
| React | 18.x | UI components, hooks |
| TypeScript | 5.x | Full type safety |

### Backend & Database
| Tech | Version | Purpose |
|------|---------|---------|
| Supabase | 2.118.0 | Backend-as-a-Service (PostgreSQL, Auth, Storage, Realtime) |
| PostgreSQL | 15.x | Primary database with Row Level Security |
| @supabase/ssr | 0.12.7 | Server-side Supabase client with cookie management |
| bcryptjs | 3.0.3 | Password hashing (10 salt rounds) |

### Styling & Animation
| Tech | Purpose |
|------|---------|
| Tailwind CSS | Utility-first styling with custom purple-indigo-teal palette |
| Framer Motion | 3D effects, score rings, transitions, confetti |
| Lucide React | Icon library (350+ icons) |
| react-confetti-explosion | Confetti animations on milestones |
| react-type-animation | Typing effect during AI generation |
| react-intersection-observer | Scroll-triggered animations |

### AI & Intelligence
| Tech | Purpose |
|------|---------|
| Google Gemini 2.0 Flash | Brief generation (server-side only, optional) |
| `lib/briefFallback.ts` | Rule-based brief generator (fallback) |
| `lib/matchScore.ts` | Creator-to-brief compatibility scoring |
| `BriefIntelligence.tsx` | Real-time brief audit with score/100 |
| `StyleDNA.tsx` | SVG radar chart with 6 style axes |

### Data & State
| Tech | Purpose |
|------|---------|
| Supabase Realtime | WebSocket subscriptions for live messaging |
| Custom hooks | useSession, useCreators, useBriefs, useProposals, useMessages, useReviews, useVerifications |
| Sonner | Toast notifications with auto-dismiss |
| Zod | Schema validation for API inputs |

### Auth & Deployment
| Tech | Purpose |
|------|---------|
| Supabase Auth | JWT tokens, email/password, Google OAuth, OTP verification |
| Next.js middleware | Route protection with JWT validation |
| Render | Web service hosting (Node 20, auto-deploy) |
| Supabase Cloud | Managed PostgreSQL, Auth, Storage, Realtime |
| GitHub | Source control with CI/CD to Render |

---

## 6. Architecture

```
┌─────────────────────────────────────────────────┐
│                Browser (Client)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Pages   │  │  Hooks   │  │  Components  │  │
│  │/creators │  │useSession│  │BriefIntel    │  │
│  │/briefs   │  │useCreators│ │StyleDNA      │  │
│  │/dashboard│  │useBriefs │  │Navbar        │  │
│  │/messages │  │useMessages│  │CreatorCard  │  │
│  │/reviews  │  │useReviews│  │ErrorBoundary │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│         ↓ Supabase JS Client (RLS applied)      │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│         Next.js Server (Render/Node 20)          │
│  /api/auth/* → Registration, login, OAuth        │
│  /api/creators → Search/filter with RLS          │
│  /api/messages → Real-time messaging             │
│  /api/reviews → Submit/fetch reviews             │
│  /api/verifications → Admin approval             │
│  /api/brief → Gemini AI integration              │
│  middleware.ts → JWT validation                  │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│               Supabase Backend                   │
│  ┌──────────────────────────────────────────┐  │
│  │ PostgreSQL (15.x) with RLS               │  │
│  │ Tables: users, creator_profiles, briefs, │  │
│  │ proposals, messages, reviews, ...        │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │ Auth (GoTrue): JWT, email/pw, OAuth      │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │ Storage: avatars/, portfolios/ buckets   │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │ Realtime: WebSocket for live messaging   │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│           Google Gemini 2.0 Flash API            │
│        (server-side only, optional)              │
└─────────────────────────────────────────────────┘
```

For detailed architecture documentation, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## 7. Project Structure

```
cinegen/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── login/page.tsx              # Login + demo credentials
│   ├── register/page.tsx           # New user signup
│   ├── onboarding/page.tsx         # Creator profile setup
│   ├── creators/
│   │   ├── page.tsx                # Discovery + filters
│   │   └── [id]/page.tsx           # Full creator profile
│   ├── briefs/
│   │   ├── page.tsx                # Brief listing
│   │   └── new/page.tsx            # AI Brief Builder
│   ├── dashboard/page.tsx          # Brand + Creator dashboards
│   ├── compare/page.tsx            # Side-by-side comparison
│   ├── leaderboard/page.tsx        # Creator rankings
│   ├── estimator/page.tsx          # Budget calculator
│   ├── risk-scanner/page.tsx       # Commercial risk audit
│   └── api/brief/route.ts          # Gemini API server route
│
├── components/
│   ├── layout/Navbar.tsx           # Nav with Tools dropdown
│   ├── layout/Footer.tsx           # Footer with all links
│   ├── briefs/BriefIntelligence.tsx
│   └── creators/
│       ├── CreatorCard.tsx
│       ├── CreatorCardSkeleton.tsx
│       └── StyleDNA.tsx
│
├── hooks/
│   ├── useSession.ts               # Auth — login, logout, role switch
│   ├── useCreators.ts
│   ├── useBriefs.ts
│   └── useProposals.ts
│
├── lib/
│   ├── seed/creators.ts            # 18 detailed creator profiles
│   ├── matchScore.ts               # Scoring algorithm
│   ├── briefFallback.ts            # AI fallback generator
│   └── storage.ts                  # localStorage wrapper
│
├── types/index.ts                  # All TypeScript types
└── middleware.ts                   # Route protection
```

---

## 8. Run Locally

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier)

### Setup Steps

**1. Clone Repository**
```bash
git clone https://github.com/deekshitha875/cinegen.git
cd cinegen
npm install
```

**2. Set Up Supabase**

Follow the complete setup guide in [SETUP.md](./SETUP.md):
- Create Supabase project
- Run database schema (database/schema.sql)
- Create storage buckets
- Seed database with creator profiles

**3. Environment Variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key (optional)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Stripe Payment Configuration (required for payment features)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

> **Note:** Get your Stripe test keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys). For webhook testing, use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward events to `localhost:3000/api/stripe/webhook`.

**4. Seed Database**
```bash
npm run db:seed
```

This creates:
- 18 creator profiles
- 1 brand account (`brand@cinegen.demo` / `Demo@123`)
- Sample briefs and proposals

> **Important:** For payment features, apply migration `database/migrations/011_payment_system.sql` via [Supabase Dashboard SQL Editor](https://supabase.com/dashboard) to create the `payment_intents` table.

**5. Run Development Server**
```bash
npm run dev
```

Open **http://localhost:3000**

**6. Demo Login**
- Brand: `brand@cinegen.demo` / `Demo@123`
- Creator: `aryan@cinegen.demo` / `Demo@123`

> App works without Gemini API key — Brief Builder uses smart rule-based fallback.

### Additional Documentation
- [SETUP.md](./SETUP.md) — Complete Supabase setup guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Deploy to Render
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System architecture
- [docs/API.md](./docs/API.md) — API reference
- [TESTING.md](./TESTING.md) — Test scenarios

---

## 9. Rubric Coverage

| Criterion | Weight | What We Built |
|-----------|--------|---------------|
| Creator Profiles & AI Portfolios | 30% | 18 profiles, full workflow portfolios, 3-tier verification with evidence, Style DNA, tool proficiency badges |
| Brief Definition | 20% | AI Brief Builder (Gemini) + 6-section manual form + Brief Intelligence audit panel + full commercial use fields |
| Discovery & Filtering | 25% | Full-text search + 5 filters + 4 sorts + Compare + Leaderboard |
| User Experience | 15% | Dark cinematic UI, Framer Motion animations, Tools dropdown, dashboard action cards, responsive |
| Presentation & Demo | 10% | Live demo + this README + full walkthrough |

### Bonus Features Built
| Bonus | Implementation |
|-------|---------------|
| Creator Verification Signals | Evidence panel with audited proof bullets per badge |
| AI-Assisted Brief Builder | Gemini 2.0 Flash + progressive field animation |
| Brief Compiler / Intelligence | Real-time score + errors + warnings + fix tips |
| Commercial Use Compatibility | Risk Scanner + commercial fields in every brief |
| Explainable Matching | SVG score rings + reason tags after publish |
| Style DNA | Radar chart per creator |
| Budget Estimator | AI cost vs agency + savings % |
| Creator Comparison | Side-by-side + AI recommendation |
| Leaderboard | Rankings with podium |

---

---

## 10. Screenshots

### Homepage Hero
Animated gradient background with floating particles, 3D card tilt effects, and gradient text.

### Creator Discovery
18 verified creators with glass-morphic cards, animated gradient borders, and verified badges with pulse glow.

### AI Brief Builder
Type a rough idea → Gemini AI generates complete brief → Brief Intelligence scores in real-time → Confetti on publish.

### Brief Intelligence Panel
Real-time audit with animated score ring (0-100), color-coded errors/warnings/tips, expandable accordion sections.

### Style DNA Radar Chart
6-axis SVG radar chart with animated path drawing, gradient fill, and hover tooltips.

### Real-time Messaging
Live 1-on-1 conversations with conversation sidebar, unread badges, typing animations, and instant message delivery.

### Dashboard (Brand)
Gradient stat cards with count-up animations, engagement stepper, confetti on "Mark Delivered", recent proposals.

### Dashboard (Creator)
Proposal tracker (Pending → Accepted → Rejected), matching briefs alert with pulsing badge, open briefs feed.

> **Note:** Add actual screenshots to `/public/screenshots/` directory and embed here with `![Alt text](./public/screenshots/image.png)`

---

## 11. Documentation

- [README.md](./README.md) — This file
- [SETUP.md](./SETUP.md) — Supabase setup guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Production deployment to Render
- [CHANGELOG.md](./CHANGELOG.md) — Version history and migration guide
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System architecture deep dive
- [docs/API.md](./docs/API.md) — Complete API reference with examples
- [TESTING.md](./TESTING.md) — Test scenarios and QA checklist
- [.env.example](./.env.example) — Environment variables template

---

<div align="center">

**Built with ❤️ for the Kampus.VC Hackathon**

[🚀 Live Demo](https://cinegen.onrender.com) · [💻 GitHub](https://github.com/deekshitha875/cinegen) · [📖 Docs](./docs/)

**Version 2.0.0** | Powered by Next.js, Supabase, and Gemini AI

</div>
