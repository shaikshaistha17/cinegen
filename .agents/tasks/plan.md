# Implementation Plan - Part 3: AI Intelligence Features

## Overview
Add AI-assisted brief drafting, deterministic brief validation, evidence-linked creator matching, and provider safety to the CineGen marketplace. All features must preserve existing functionality and integrate naturally into the user journey.

---

## Implementation Steps

- [ ] 1. **Create rate limiter utility**
      Implement in-memory sliding window rate limiter for API protection.
      Files: `lib/ai/rateLimit.ts` (new)
      Verify: `npm run build` passes with 0 TypeScript errors.

- [ ] 2. **Create brief drafter service with Gemini integration**
      Wrap existing Gemini call from `app/api/brief/route.ts` with timeout (10s), max 2 retries, output validation (check required fields: campaignTitle, objective, contentType, budgetMin, budgetMax, deadline), and graceful fallback. Never simulate AI success - always use actual fallback when provider fails. Preserve user input on failure. Signal when using deterministic fallback (no provider configured).
      Files: `lib/ai/briefDrafter.ts` (new)
      Existing patterns to follow: `lib/briefFallback.ts` for fallback logic, `app/api/brief/route.ts` for Gemini API integration
      Verify: `npm run build` passes with 0 TypeScript errors.

- [ ] 3. **Refactor brief generation API to use new drafter**
      Replace inline Gemini logic in `app/api/brief/route.ts` with calls to `briefDrafter.ts`. Add rate limiting (10 req/min per userId from session). Preserve existing response format: `{ brief: {...}, source: "gemini" | "fallback" }`.
      Files: `app/api/brief/route.ts` (modify)
      Preserve: existing POST endpoint structure, error handling, response format
      Verify: `npm run build` passes. Test manual: POST to `/api/brief` with `{idea: "test campaign"}` returns valid brief JSON.

- [ ] 4. **Enhance BriefIntelligence component with additional checks**
      Add these deterministic validations to existing `analyzeBrief` function in `components/briefs/BriefIntelligence.tsx`:
      - Check for multiple aspect ratios (16:9 + 9:16 is VALID - do NOT flag as contradictory)
      - Missing revision allowance in objective/style fields (warning)
      - Budget/timeline feasibility: if deadline < 7 days from now AND budget < 1000, warn with "Budget/timeline may be tight for quality work — labeled as estimate based on typical project timelines"
      - Conflicting spec: if durationSeconds > 60 AND contentType is "Short-form Video", flag error with "Short-form videos are typically under 60 seconds"
      - Missing usage decisions: if commercialUse.usageRegions.length === 0 AND exclusivity === true, flag warning with "Exclusive rights without defined usage regions may cause confusion"
      - Multi-format validity: when quantity > 1 AND aspectRatios.length > 1, treat as explicitly requested variants — NO contradiction warning (this is correct usage)
      Files: `components/briefs/BriefIntelligence.tsx` (modify)
      Preserve: existing score calculation logic, UI structure, expandable sections, animation
      Verify: `npm run build` passes. Test manual: open `/briefs/new`, fill form with conflicting specs, confirm new warnings appear.

- [ ] 5. **Create deterministic creator matcher with optional AI enhancement**
      Build scoring algorithm in `lib/ai/creatorMatcher.ts`:
      - Skills overlap: 0-40 pts = (matched skills count / total brief skills count) * 40
      - Tools match: 0-30 pts = (matched tools count / brief tools count) * 30
      - Budget fit: 0-20 pts = if (creator hourlyRateUsd * 40 hours) fits between budgetMin and budgetMax, award 20 pts; if within 20% of range, award 10 pts; else 0 pts
      - Availability: Available=10 pts, Limited=5 pts, Booked=0 pts, unknown=0 pts with note "Availability unknown"
      - Return: { score: number, reasons: string[] (human-readable per factor), matchedPortfolioItems: PortfolioItem[] (items whose contentType OR toolsUsed intersect with brief), mismatches: string[] (skills/tools in brief but not in profile), missingEvidence: string[] (capabilities claimed but no portfolio proof) }
      - Optional AI: if GEMINI_API_KEY present, send creator summary (name, specializations, top 3 skills, top 3 tools) + brief summary (contentType, toolsPreferred, style) to Gemini for qualitative note (max 100 words). Validate response is a string, validate referenced record IDs exist. Label AI contribution clearly. Fall back gracefully to deterministic-only if AI fails (timeout 5s, no retries for this optional feature).
      Files: `lib/ai/creatorMatcher.ts` (new)
      Existing types to use: `CreatorProfile`, `PortfolioItem`, `Brief` from `types/index.ts`
      Existing scoring pattern: `lib/matchScore.ts` (reuse compatible parts, expand with new factors)
      Verify: `npm run build` passes with 0 TypeScript errors.

- [ ] 6. **Create matches API endpoint**
      POST `/api/briefs/[id]/matches` endpoint:
      - Authenticate user via session cookie (check `useSession` pattern from existing components)
      - Fetch brief by id from Supabase `briefs` table, verify ownership: brief.brand_id matches session user's brand_id (query `brand_profiles` table for user_id match)
      - Fetch all creator profiles from `creator_profiles` table with portfolio JSONB field
      - Run `creatorMatcher` for each creator
      - Return top 10 sorted by score descending, include: { creatorId, creatorName, creatorHandle, score, reasons, matchedPortfolioItems, mismatches, missingEvidence, aiNote (if present, labeled) }
      - Rate limit: 10 req/min per userId using `rateLimit.ts`
      - Error responses: 401 if not authenticated, 403 if not brief owner, 404 if brief not found, 429 if rate limited, 500 on server error
      Files: `app/api/briefs/[id]/matches/route.ts` (new)
      Existing patterns to follow: `app/api/briefs/[id]/route.ts` for authentication, `lib/supabase.ts` for createServiceClient
      Database: `briefs` table (id, brand_id), `brand_profiles` table (id, user_id), `creator_profiles` table (all fields)
      Verify: `npm run build` passes. Test manual: POST to `/api/briefs/<valid-id>/matches` returns JSON array of 10 matches.

- [ ] 7. **Create CreatorMatches UI component**
      Build React component in `components/briefs/CreatorMatches.tsx`:
      - Fetch matches from `/api/briefs/[briefId]/matches` on mount
      - Show each creator: avatar, name, handle, score (numeric + visual progress bar), score breakdown (NOT just %, show "Skills: 35/40 pts, Tools: 20/30 pts, Budget: 15/20 pts, Availability: 10/10 pts"), reasons list, matched portfolio items with thumbnail + link, mismatches array, missing evidence array
      - Label AI contribution if present: "AI Note: [content]" in muted badge
      - Show "Deterministic Baseline" badge when aiNote is absent
      - Loading state: skeleton cards
      - Error state: retry button with error message
      - Empty state: "No matching creators found for this brief"
      - Each creator card has "View Profile" link to `/creators/[id]` and "Invite to Brief" button (link to existing proposal flow at `/briefs/new` or brief detail page)
      Files: `components/briefs/CreatorMatches.tsx` (new)
      Existing patterns to follow: `components/creators/CreatorCard.tsx` for card UI, `components/briefs/BriefIntelligence.tsx` for expandable sections and animations
      Verify: `npm run build` passes with 0 TypeScript errors.

- [ ] 8. **Integrate CreatorMatches into brief workflow**
      Add CreatorMatches component to brief detail page. If `app/briefs/[id]/page.tsx` does not exist, add to `app/dashboard/page.tsx` under the briefs section or `app/briefs/page.tsx` as a detail view.
      Check existing files first:
      - If `app/briefs/[id]/page.tsx` exists, integrate there
      - If not, add a new route `app/briefs/[id]/page.tsx` that fetches the brief and shows details + CreatorMatches
      - Or integrate into dashboard where brands see their briefs
      Files: `app/briefs/[id]/page.tsx` (new or modify) OR `app/dashboard/page.tsx` (modify) OR `app/briefs/page.tsx` (modify)
      Preserve: existing brief display logic, navigation
      Verify: `npm run build` passes. Test manual: navigate to a brief, confirm CreatorMatches component renders.

- [ ] 9. **Create implementation documentation**
      Write `PART3_IMPLEMENTATION.md` covering:
      - Configuration requirements: GEMINI_API_KEY optional, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required
      - Scoring weights: Skills 40%, Tools 30%, Budget 20%, Availability 10%
      - Test cases:
        - Incomplete brief (missing title, objective, style, budget) → BriefIntelligence shows errors
        - Contradictory brief (durationSeconds > 60 + contentType "Short-form Video") → error flagged
        - Valid multi-format brief (quantity=5, aspectRatios=["16:9","9:16"]) → NO contradiction warning
        - Match score explanations and evidence links visible
        - Provider timeout recovery: brief generation falls back to deterministic
        - Provider malformed output recovery: validation catches bad JSON, falls back
        - No loss of user input on provider failure
        - Mocked provider tests vs real provider verification (distinguish clearly)
      - Limitations:
        - AI brief generation requires GEMINI_API_KEY (falls back to rule-based)
        - Rate limits: 10 req/min per user for brief generation and match endpoints
        - Creator matching AI note is optional enhancement, deterministic baseline always present
        - Multi-format detection: explicitly requested variants (quantity > 1 + multiple aspect ratios) are valid, not contradictory
        - Budget feasibility warning is an estimate based on typical project timelines, not a hard constraint
      Files: `PART3_IMPLEMENTATION.md` (new)
      Verify: File exists and contains all sections.

- [ ] 10. **Update KIRO_PROGRESS.md**
       Append Part 3 completion summary to existing `KIRO_PROGRESS.md`:
       - Brief drafting: Gemini integration with 10s timeout, 2 retries, validation, fallback, no simulated success
       - Brief validation: 6 new deterministic checks added to BriefIntelligence
       - Creator matching: deterministic scoring (skills 40%, tools 30%, budget 20%, availability 10%) with optional AI qualitative note
       - Provider safety: rate limiting (10 req/min), timeouts, retries, validation, server-side keys, user content treated as untrusted
       - Integration: brief drafting in `/briefs/new`, matches beside briefs, no unrelated chatbot
       - Tests: build passes, manual verification of checks, missing-data behavior, timeout recovery
       - Next: Part 4 - Agreements, delivery checks, approval workflows
       Files: `KIRO_PROGRESS.md` (modify - append at end)
       Preserve: all existing content from Parts 1 and 2
       Verify: `npm run build` passes. File exists with new section.

---

## Build & Test Commands

### Build Verification
```bash
npm run build
# Expected: ✓ Compiled successfully, 0 TypeScript errors, 40+ pages generated
```

### Development Server
```bash
npm run dev
# Visit: http://localhost:3000
```

### Manual Test Scenarios

1. **Incomplete Brief Validation**
   - Navigate to `/briefs/new`
   - Leave title, objective, style blank
   - Set budgetMin=0, budgetMax=0
   - Confirm BriefIntelligence shows red error badges for missing fields

2. **Contradictory Brief Validation**
   - Fill brief form with: contentType="Short-form Video", durationSeconds=90
   - Confirm error: "Short-form videos are typically under 60 seconds"

3. **Valid Multi-Format Brief**
   - Set quantity=5, aspectRatios=["16:9", "9:16"]
   - Confirm NO contradiction warning (this is valid)

4. **Brief Generation with Timeout**
   - If GEMINI_API_KEY not set: confirm "Using deterministic fallback" message
   - If GEMINI_API_KEY set but times out: confirm fallback activates, user input preserved

5. **Creator Match Explanations**
   - Publish a brief
   - View matches (in brief detail or dashboard)
   - Confirm each creator shows: score breakdown (not just %), reasons list, matched portfolio items, mismatches, missing evidence
   - Confirm "Deterministic Baseline" badge when no AI note present

6. **Missing Data Behavior**
   - Brief with empty toolsPreferred → matches still work (no crash)
   - Creator with no portfolio items → shows "No portfolio evidence" in missingEvidence
   - Creator with availability=null → shows "Availability unknown" note

7. **Rate Limiting**
   - Send 11 requests to `/api/brief` within 1 minute
   - Confirm 11th request returns 429 Too Many Requests

---

## Key Patterns & Conventions

### Project Structure
- **API Routes**: `app/api/<resource>/route.ts` - Next.js 14 App Router, export async POST/GET functions
- **Components**: `components/<domain>/<Component>.tsx` - Client components with "use client" directive
- **Libraries**: `lib/<utility>.ts` - Pure functions, no React hooks
- **Types**: Centralized in `types/index.ts`, imported as `import { Type } from "@/types"`
- **Database**: Supabase PostgreSQL with RLS policies, access via `createServiceClient()` from `lib/supabase.ts`

### Existing Patterns to Follow
- **Authentication**: Check session cookie, extract userId, query `users` and `brand_profiles` tables
- **Supabase Client**: Use `createServiceClient()` in API routes (server-side), not `createClient()` (client-side)
- **Error Handling**: Return NextResponse.json() with error message and appropriate status code
- **Animations**: Framer Motion with `initial`, `animate`, `exit` props for smooth transitions
- **UI Components**: Glass morphism with `glass-card` class, gradient accents, Lucide React icons
- **Rate Limiting**: In-memory Map with sliding window, cleanup old entries, return 429 on exceed

### Build System
- **Framework**: Next.js 14.2.35 with App Router
- **Language**: TypeScript 5.x with strict mode
- **Build Command**: `npm run build` - generates static pages, runs type checking
- **Test Framework**: None configured (manual testing)
- **Verification**: Build success = 0 TypeScript errors + 40 pages generated

### Database Schema (Relevant Tables)
```sql
-- briefs (id, brand_id, campaign_title, objective, content_type, tools_preferred, budget_min, budget_max, deadline, commercial_use JSONB, status)
-- creator_profiles (id, user_id, handle, specializations[], skills[], verified_tools JSONB, portfolio JSONB, stats JSONB, availability)
-- brand_profiles (id, user_id, company_name)
-- users (id, email, role)
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx (server-side only)
GEMINI_API_KEY=xxxxx (optional - falls back to deterministic)
```

---

## Critical Requirements from Task Description

### 1. AI-Assisted Brief Drafting
- ✅ Plain language input → structured brief suggestions
- ✅ Validate output before applying (check required fields)
- ✅ Never publish automatically
- ✅ Preserve user input on failure
- ✅ Clearly signal deterministic fallback when no provider

### 2. Brief Stress Testing
- ✅ Deterministic checks: missing fields, invalid dates/budgets, conflicting specs
- ✅ Multiple formats NOT contradictory when explicitly requested (quantity > 1 + multiple aspect ratios)
- ✅ Optional AI for ambiguity interpretation
- ✅ Budget/timeline feasibility labeled as estimate

### 3. Evidence-Linked Creator Matching
- ✅ Deterministic baseline from actual records
- ✅ Document scoring factors and weights
- ✅ Show portfolio links, matches, mismatches, missing evidence
- ✅ Explain scores (not just %)
- ✅ Treat unknown as unknown (no invented data)
- ✅ Optional AI labeled, validated, restricted to supplied records

### 4. Provider Safety
- ✅ Server-side keys only
- ✅ Timeouts, retries, rate limits
- ✅ Treat user content as untrusted
- ✅ Send only necessary records
- ✅ Never simulate AI success
- ✅ Label deterministic when no provider

### 5. Integration into User Journey
- ✅ Brief drafting inside brief creation page
- ✅ Recommendations beside relevant brief
- ✅ Invite/apply through existing flows
- ✅ No unrelated chatbot or mascot

### 6. Verification
- ✅ All scenarios listed above in Manual Test Scenarios
- ✅ Build verification: `npm run build` must pass
- ✅ Distinguish mocked vs real provider tests

---

## Files to Create

1. `lib/ai/rateLimit.ts` - In-memory rate limiter
2. `lib/ai/briefDrafter.ts` - Gemini wrapper with timeout/retry/validation
3. `lib/ai/creatorMatcher.ts` - Deterministic scoring + optional AI
4. `app/api/briefs/[id]/matches/route.ts` - Matches endpoint
5. `components/briefs/CreatorMatches.tsx` - Matches UI component
6. `app/briefs/[id]/page.tsx` - Brief detail page (if doesn't exist)
7. `PART3_IMPLEMENTATION.md` - Documentation

## Files to Modify

1. `app/api/brief/route.ts` - Use briefDrafter, add rate limiting
2. `components/briefs/BriefIntelligence.tsx` - Add new deterministic checks
3. `app/dashboard/page.tsx` OR `app/briefs/page.tsx` - Integrate CreatorMatches (if no dedicated brief detail page)
4. `KIRO_PROGRESS.md` - Append Part 3 summary

---

## Dependencies Already Installed

- `@google/generative-ai` ^0.24.1 - Gemini API client
- `@supabase/supabase-js` ^2.118.0 - Database client
- `framer-motion` ^14.0.0 - Animations
- `zod` ^4.6.5 - Schema validation
- `lucide-react` ^1.54.0 - Icons

No new dependencies required.

---

## Completion Criteria

- [ ] All 10 steps completed
- [ ] `npm run build` passes with 0 errors
- [ ] All manual test scenarios verified
- [ ] PART3_IMPLEMENTATION.md exists with all sections
- [ ] KIRO_PROGRESS.md updated with Part 3 summary
- [ ] No loss of existing functionality (Parts 1 & 2 features still work)
