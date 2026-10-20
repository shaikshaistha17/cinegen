# Implementation Plan: Creator Services Marketplace

## Overview
Add two-way marketplace capability allowing creators to post services that brands can discover proactively. This complements the existing brief → proposal flow with a creator-initiated services catalog.

**Tech Stack**: Next.js 14 + TypeScript + Supabase PostgreSQL + Tailwind CSS + Framer Motion
**Aesthetic**: Glassmorphism (backdrop-blur, border-white/10), violet-cyan gradients, dark theme
**Port**: http://localhost:3002

---

## Implementation Plan

### - [ ] 1. Database Schema & Types

**What**: Create `creator_services` table in Supabase with RLS policies and TypeScript types.

**Files**:
- `database/creator_services.sql` (new)
- `database/rls-policies.sql` (append)
- `types/index.ts` (append)

**Details**:
- Table: `creator_services` with columns:
  - `id` (uuid pk, default uuid_generate_v4())
  - `creator_id` (uuid, references creator_profiles(id) on delete cascade)
  - `title` (text, not null)
  - `description` (text, not null)
  - `skills` (text[], not null)
  - `price_range` (text, not null, check constraint: '$500-$1k' | '$1k-$3k' | '$3k-$5k' | '$5k-$10k' | '$10k+')
  - `delivery_time` (text, not null)
  - `portfolio_items` (jsonb, default '[]' - array of {url, title})
  - `is_active` (boolean, default true, not null)
  - `created_at`, `updated_at` (timestamp with time zone)
- Indexes: creator_id, is_active, created_at
- Trigger: `update_updated_at_column` on UPDATE (reuse existing function from schema.sql)
- RLS policies (append to rls-policies.sql):
  - `ENABLE ROW LEVEL SECURITY`
  - Public SELECT WHERE `is_active = true`
  - Creator SELECT own services WHERE `creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())`
  - Creator INSERT own services WITH CHECK (same)
  - Creator UPDATE own services USING (same)
  - Creator DELETE own services USING (same)
- TypeScript types (add to types/index.ts):
  ```typescript
  export type PriceRange = '$500-$1k' | '$1k-$3k' | '$3k-$5k' | '$5k-$10k' | '$10k+';
  
  export interface CreatorService {
    id: string;
    creatorId: string;
    creatorName?: string;
    creatorAvatar?: string;
    creatorHandle?: string;
    title: string;
    description: string;
    skills: string[];
    priceRange: PriceRange;
    deliveryTime: string;
    portfolioItems: { url: string; title: string }[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }
  ```

**Verification**: 
```bash
npm run dev
# In Supabase dashboard: check table exists, RLS policies enabled
# Test RLS: try accessing table with different auth contexts
```

---

### - [ ] 2. API Routes - Services Collection

**What**: Create POST and GET endpoints for `/api/services`.

**Files**:
- `app/api/services/route.ts` (new)

**Details**:
- Follow pattern from `app/api/creators/route.ts` and `app/api/briefs/route.ts`
- **POST** (create service):
  - Auth required: `const {data:{user}} = await supabase.auth.getUser()`
  - Return 401 if no user
  - Validate user is a creator: query `creator_profiles` WHERE `user_id = user.id`
  - Return 403 if not a creator
  - Body validation (Zod optional, or manual): title, description, skills (string[]), priceRange, deliveryTime required
  - Insert into `creator_services` table
  - Return 201 with `{service: data}`
- **GET** (list active services):
  - Public route (no auth check)
  - Query params: `creatorId`, `skills` (comma-separated), `priceRange`, `deliveryTime`, `search` (ilike on title/description), `isActive` (default true), `sort` (default created_at desc)
  - Use Supabase query builder:
    ```typescript
    let query = supabase.from('creator_services').select('*, creator:creator_profiles(user:users(name), handle, avatar_url)')
    ```
  - Apply filters conditionally (if param exists)
  - Skills filter: use `.contains('skills', skills.split(','))`
  - Search filter: `.or(`title.ilike.%${search}%,description.ilike.%${search}%`)`
  - Return `{services: data || []}`

**Verification**:
```bash
# Start dev server
npm run dev

# Test POST (need auth token from browser - login as creator@cinegen.demo)
# In browser DevTools: Application > Cookies > copy sb-access-token
curl -X POST http://localhost:3002/api/services \
  -H "Cookie: sb-access-token=<TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Video Editing Service","description":"Professional video editing","skills":["Video Editing"],"priceRange":"$1k-$3k","deliveryTime":"1 week","portfolioItems":[]}'

# Test GET
curl http://localhost:3002/api/services
curl "http://localhost:3002/api/services?skills=Video+Editing&priceRange=\$1k-\$3k"
```

---

### - [ ] 3. API Routes - Single Service

**What**: Create GET, PATCH, DELETE for `/api/services/[id]`.

**Files**:
- `app/api/services/[id]/route.ts` (new)

**Details**:
- **GET** (service detail):
  - Public route
  - Fetch single service by id with creator join:
    ```typescript
    const {data, error} = await supabase
      .from('creator_services')
      .select('*, creator:creator_profiles(*, user:users(name, email))')
      .eq('id', params.id)
      .single()
    ```
  - Return 404 if not found
  - Return `{service: data}`
- **PATCH** (update service):
  - Auth required
  - Get creator_id from `creator_profiles` WHERE `user_id = auth.uid()`
  - Owner check: verify service.creator_id matches
  - Return 403 if not owner
  - Allow updates to: title, description, skills, priceRange, deliveryTime, portfolioItems, isActive
  - Return 200 with `{service: data}`
- **DELETE** (remove service):
  - Auth required
  - Same owner check
  - Hard delete: `.delete().eq('id', id)`
  - Return 204

**Verification**:
```bash
# Test GET
curl http://localhost:3002/api/services/<SERVICE_ID>

# Test PATCH (with auth token)
curl -X PATCH http://localhost:3002/api/services/<SERVICE_ID> \
  -H "Cookie: sb-access-token=<TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"isActive":false}'

# Test DELETE
curl -X DELETE http://localhost:3002/api/services/<SERVICE_ID> \
  -H "Cookie: sb-access-token=<TOKEN>"
```

---

### - [ ] 4. Custom Hook - useServices

**What**: Create React hook for service data management.

**Files**:
- `hooks/useServices.ts` (new)

**Details**:
- Follow pattern from `hooks/useCreators.ts` and `hooks/useBriefs.ts`
- Import `createClient` from `lib/supabase.ts`
- State: `services: CreatorService[]`, `loading: boolean`, `error: string | null`
- Functions:
  - `fetchServices(filters?)` - GET /api/services with query params
  - `createService(data)` - POST /api/services
  - `updateService(id, data)` - PATCH /api/services/[id]
  - `deleteService(id)` - DELETE /api/services/[id]
  - `toggleActive(id)` - PATCH with `{isActive: !current}`
- Use `useEffect` to fetch on mount
- Export `{services, loading, error, createService, updateService, deleteService, toggleActive, refreshServices}`

**Verification**:
```typescript
// In a test component
const {services, loading, createService} = useServices();
// Verify services populate, loading state works, createService calls API
```

---

### - [ ] 5. Creator Dashboard - Services Management Page

**What**: Creator-only page to manage their posted services.

**Files**:
- `app/dashboard/creator/services/page.tsx` (new)

**Details**:
- "use client" directive (for hooks and interactivity)
- Import: `useSession`, `useServices`, Framer Motion, Lucide icons (Plus, Edit, Trash, Clock, DollarSign)
- Auth check: redirect to `/login` if no session or `session.role !== 'creator'`
- Layout:
  - Header: "My Services" title + "Post New Service" button (gradient button, opens form modal or inline form)
  - Services grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
  - Service card (glass-card):
    - Title (font-semibold text-lg, truncate)
    - Description (text-sm text-muted-foreground, line-clamp-2)
    - Skills (flex flex-wrap gap-1, pill tags max 4 shown)
    - Price range badge (bg-green-500/20 text-green-300)
    - Delivery time with clock icon
    - Active/inactive toggle (Radix UI Switch or simple button)
    - Actions: Edit button, Delete button
- Service form (modal or expandable section):
  - Fields:
    - Title (input, max 100 chars, required)
    - Description (textarea, max 500 chars, required)
    - Skills (multi-select or tag input - reuse skill list from types: Video Editing, Motion Graphics, Color Grading, Sound Design, Scriptwriting, Storyboarding, 3D Animation, VFX, AI Prompting)
    - Price Range (select dropdown with 5 options)
    - Delivery Time (select: 1-2 days, 3-5 days, 1 week, 2 weeks, Custom)
    - Portfolio Items (optional, up to 3, each {url, title})
  - Validation: title/description/skills/priceRange/deliveryTime required
  - Submit: call `createService(data)`, show success toast, close form, refresh list
- Edit: open same form pre-filled, call `updateService(id, data)`
- Delete: confirmation dialog, call `deleteService(id)`
- Toggle: call `toggleActive(id)`, update UI optimistically
- Style: match `app/dashboard/page.tsx` glassmorphism - glass cards, gradient buttons (from-violet-600 to-violet-500), border-white/10, hover effects (hover:border-violet-500/20, hover:-translate-y-1), Framer Motion stagger animations

**Verification**:
```bash
npm run dev
# Login as creator@cinegen.demo / Demo@123
# Navigate to /dashboard/creator/services
# Click "Post New Service", fill form, submit
# Verify service appears in grid
# Edit a service - verify updates persist
# Toggle active/inactive - verify badge changes
# Delete a service - verify it disappears
# Check Supabase dashboard to confirm database changes
```

---

### - [ ] 6. Brand Discovery Page - Browse Services

**What**: Public page for brands to browse and filter creator services.

**Files**:
- `app/services/page.tsx` (new)

**Details**:
- "use client" directive
- Import: `useServices` hook (or fetch directly from API), Filter components, search bar
- Layout:
  - Header: "Discover Creator Services" (gradient text)
  - Search bar (full-width, glass input with magnifying glass icon)
  - Filters sidebar (or horizontal on mobile):
    - Skills (checkbox list)
    - Price Range (checkbox list of 5 ranges)
    - Delivery Time (checkbox list: 1-2 days, 3-5 days, 1 week, 2 weeks, Custom)
    - Sort (select dropdown: Newest, Price Low→High, Price High→Low)
  - Services grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
  - Service card (similar to `CreatorCard.tsx`):
    - Creator info header: avatar (w-10 h-10 rounded-full), name, verification badge
    - Service title (font-semibold text-lg)
    - Description (text-sm, line-clamp-2)
    - Skills pills (max 4 visible, "+N more" if overflow)
    - Price range badge (gradient)
    - Delivery time with icon
    - "View Details" button (gradient hover effect)
- Filtering: update state, call API with query params or filter client-side
- Empty state: if no services, show "No services found" with illustration
- Style: follow `app/creators/page.tsx` pattern - glass cards, gradients, Framer Motion animations (cards fade in with stagger by index)

**Verification**:
```bash
npm run dev
# Visit /services (no login required)
# Verify services grid loads
# Test search - type "video" - verify filtering
# Test filters - select "Video Editing" skill - verify results update
# Test sort - select "Price Low→High" - verify order changes
# Click service card - verify navigation to detail page
```

---

### - [ ] 7. Service Detail Page

**What**: Full service details with creator profile.

**Files**:
- `app/services/[id]/page.tsx` (new)

**Details**:
- "use client" directive (or Server Component with async fetch)
- Fetch service by id from `/api/services/[id]`
- Layout:
  - Breadcrumb: Services > {service.title}
  - Main content (grid grid-cols-1 lg:grid-cols-3 gap-8):
    - **Left (lg:col-span-2)** - Service details:
      - Service title (text-3xl font-bold)
      - Description (text-muted-foreground, full text)
      - Skills section (grid of pills)
      - Info cards (grid-cols-2 gap-4):
        - Price range card (glass, icon + value)
        - Delivery time card (glass, icon + value)
      - Portfolio samples (if portfolioItems exists):
        - Expandable list or gallery
        - Each item: thumbnail/link + title
    - **Right (lg:col-span-1)** - Creator profile card (glass, sticky top-4):
      - Avatar (large, rounded-full)
      - Name + verification badge
      - Headline (text-sm)
      - Bio (truncated, max 3 lines)
      - Hourly rate (if available from creator profile)
      - "View Full Profile" link → `/creators/{creatorId}`
      - "Contact Creator" button:
        - If logged in: navigate to `/messages` with pre-filled context (or open message modal)
        - If not logged in: show "Login to Contact" → `/login`
      - "Book Service" CTA button (gradient, primary action)
- Style: glass sections, gradient headers, responsive (stack vertically on mobile)

**Verification**:
```bash
npm run dev
# Visit /services/[ID]
# Verify all sections render: title, description, skills, price, delivery time, creator card
# Click "View Full Profile" - verify navigation to /creators/[creatorId]
# Click "Contact Creator" (not logged in) - verify login prompt or redirect
# Login and click "Contact Creator" - verify navigation to messages
# Check responsive layout on mobile
```

---

### - [ ] 8. Navigation Updates

**What**: Add "Services" links to main navigation and creator dashboard.

**Files**:
- `components/layout/Navbar.tsx` (modify)
- `app/dashboard/page.tsx` (modify)

**Details**:
- **Navbar.tsx**:
  - Import `Briefcase` icon from lucide-react
  - In `navLinks` array (line ~36), add:
    ```typescript
    { href: "/services", label: "Services", icon: Briefcase }
    ```
  - Position: after "Discover" (/creators), before "Briefs" (/briefs)
  - This makes services browsing accessible to all users in main nav
- **dashboard/page.tsx** (CreatorDashboard section):
  - Add a link card after stats grid, before "My Proposals" section
  - Card content:
    - Icon: Briefcase
    - Heading: "Manage My Services"
    - Description: "Post and manage your service offerings"
    - Button: "Go to Services" → `/dashboard/creator/services`
  - Style: match existing primary action card (glass, gradient border, hover effects)

**Verification**:
```bash
npm run dev
# Check main navbar - verify "Services" link appears and navigates to /services
# Login as creator, go to /dashboard
# Verify "Manage My Services" card present
# Click card - verify navigation to /dashboard/creator/services
```

---

### - [ ] 9. Homepage Integration

**What**: Add "Creator Services Marketplace" section to homepage.

**Files**:
- `app/page.tsx` (modify)

**Details**:
- Insert new section after hero or features section
- Section structure:
  - Container: `max-w-7xl mx-auto px-4 py-16`
  - Header:
    - Title: "Creator Services Marketplace" (gradient text, font-display text-4xl)
    - Subtitle: "Discover creators offering ready-to-book services"
  - Featured services: `grid grid-cols-1 md:grid-cols-2 gap-6`
    - Fetch 2 services: `GET /api/services?isActive=true&sort=created_at&limit=2`
    - Display in mini service cards (simplified version of full service card):
      - Creator avatar + name
      - Service title
      - Key skills (max 3 pills)
      - Price range badge
      - "View Service" link → `/services/[id]`
  - CTA button: "Browse All Services" → `/services` (center, gradient button)
- Style: glass section background, gradient heading, cards match site aesthetic

**Verification**:
```bash
npm run dev
# Visit homepage (/)
# Scroll to "Creator Services Marketplace" section
# Verify 2 featured services display
# Click "View Service" - verify navigation to detail page
# Click "Browse All Services" - verify navigation to /services
```

---

## Summary of Files

**New Files (9)**:
- `database/creator_services.sql`
- `app/api/services/route.ts`
- `app/api/services/[id]/route.ts`
- `hooks/useServices.ts`
- `app/dashboard/creator/services/page.tsx`
- `app/services/page.tsx`
- `app/services/[id]/page.tsx`

**Modified Files (4)**:
- `database/rls-policies.sql` (append RLS policies)
- `types/index.ts` (append PriceRange type and CreatorService interface)
- `components/layout/Navbar.tsx` (add Services nav link)
- `app/dashboard/page.tsx` (add Manage Services card for creators)
- `app/page.tsx` (add services section)

**Total Changes**: 9 new + 5 modified = 14 files

---

## Design System Reference

**Colors**:
- Primary gradient: `from-violet-600 to-cyan-500`
- Button gradient: `from-violet-600 to-violet-500`
- Glass border: `border-white/10`
- Hover border: `border-violet-500/20` or `border-violet-500/40`
- Badge backgrounds: `bg-{color}-500/20 text-{color}-300`

**Components**:
- Glass card: `glass-card rounded-xl border border-white/5`
- Gradient button: `bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/25`
- Pill tag: `text-xs px-2 py-1 bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/30`
- Input: `glass border border-white/10 rounded-lg px-4 py-2 text-sm`

**Animations**:
- Card entry: `initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:index*0.05}}`
- Card hover: `whileHover={{y:-4,scale:1.02}}`
- Button hover: `hover:scale-105 transition-all`

**Icons**: Lucide React - Briefcase, Plus, Edit, Trash, Clock, DollarSign, Search, Filter, etc.

**Responsive Grid**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

---

## Testing Checklist

- [ ] Database table created in Supabase with correct schema
- [ ] RLS policies prevent unauthorized access (test with different users)
- [ ] POST /api/services creates service (auth required)
- [ ] GET /api/services returns filtered list (public)
- [ ] PATCH/DELETE /api/services/[id] require ownership
- [ ] useServices hook fetches and manipulates data correctly
- [ ] Creator dashboard loads and displays services
- [ ] Service form validates required fields
- [ ] Edit/Delete/Toggle actions work
- [ ] Browse page (/services) loads grid and filters work
- [ ] Service detail page (/services/[id]) displays all sections
- [ ] Navigation links added and functional
- [ ] Homepage services section displays featured services
- [ ] Mobile responsive on all pages
- [ ] Glassmorphism aesthetic consistent across all new pages
- [ ] Animations match existing patterns (fade in, hover effects)

---

## Gotchas & Notes

1. **Auth Context**: CineGen uses BOTH Supabase client-side auth AND a legacy localStorage session system. Always check `useSession()` hook first, then fall back to Supabase `auth.getUser()`.

2. **Database Field Naming**: Database uses snake_case (`creator_id`, `is_active`), TypeScript uses camelCase (`creatorId`, `isActive`). API routes must map between them.

3. **RLS Policies**: All queries from client-side Supabase client are subject to RLS. Use `createClient()` for user-scoped queries, `createServiceClient()` only in server-side API routes for admin operations.

4. **Port**: Dev server runs on 3002, not 3000. Never change this.

5. **Creator ID Resolution**: To get creator_id from auth.uid(), query: `SELECT id FROM creator_profiles WHERE user_id = auth.uid()`.

6. **Skills List**: Reuse existing skills from types or CreatorCard patterns: Video Editing, Motion Graphics, Color Grading, Sound Design, Scriptwriting, Storyboarding, 3D Animation, VFX, AI Prompting, Photography, Compositing, etc.

7. **Price Range Options**: Exactly 5 options: `$500-$1k`, `$1k-$3k`, `$3k-$5k`, `$5k-$10k`, `$10k+`. Use TypeScript literal type for type safety.

8. **Delivery Time**: Free-form text, but suggest: "1-2 days", "3-5 days", "1 week", "2 weeks", "Custom".

9. **Contact Creator Flow**: For MVP, link to `/messages` with query param `?recipient={creatorId}&context=service-{serviceId}`. Full messaging integration can be enhanced later.

10. **Book Service Button**: For MVP, this can be a mailto link, contact form modal, or navigate to messages. No payment integration needed yet.

---

## Build & Run Commands

```bash
# Install dependencies (if needed)
npm install

# Start dev server (port 3002)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Seed database (if needed)
npm run db:seed
```

---

## Supabase Dashboard Access

- Project URL: https://hoiqipfguwpdihgfrqyy.supabase.co
- Check: Table Editor → creator_services
- Check: Authentication → Policies → creator_services table

---

**End of Implementation Plan**
