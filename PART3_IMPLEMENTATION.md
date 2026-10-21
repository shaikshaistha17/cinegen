# Part 3 Implementation: AI Intelligence Features

## Overview
Part 3 adds AI-assisted brief drafting, deterministic brief validation, evidence-linked creator matching, and provider safety to the CineGen marketplace. All features preserve existing functionality and integrate naturally into the user journey.

---

## Configuration Requirements

### Required Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

### Optional Environment Variables
```env
GEMINI_API_KEY=xxxxx  # If not set, uses deterministic fallback for brief drafting
```

### Behavior Without GEMINI_API_KEY
- Brief drafting falls back to rule-based generation using `lib/briefFallback.ts`
- Response includes `source: "deterministic"` and `aiLabeled: false`
- Creator matching still returns deterministic baseline scores
- No AI qualitative notes in creator matches

---

## Features Implemented

### 1. AI-Assisted Brief Drafting

**Location**: `lib/ai/briefDrafter.ts`, `app/api/brief/route.ts`

**Flow**:
1. User submits plain-language idea to `/api/brief` endpoint
2. If `GEMINI_API_KEY` set:
   - Call Gemini API with 10s timeout
   - Retry once on network/timeout error (max 2 attempts)
   - Validate output has required fields: `campaignTitle`, `objective`, `contentType`
   - On validation failure or error: fall through to deterministic fallback
3. If no API key or all attempts fail:
   - Use `generateFallbackBrief(idea)` from `lib/briefFallback.ts`
   - Return with `source: "deterministic"` or `source: "fallback"`
4. Always preserve user's original idea in `preservedIdea` field
5. Never simulate a successful AI response

**Response Format**:
```json
{
  "brief": { /* Brief object */ },
  "source": "gemini" | "fallback" | "deterministic",
  "aiLabeled": true | false
}
```

**Rate Limiting**: 10 requests per 60 seconds per user

**Safety**:
- Timeout prevents hanging requests
- Validation prevents malformed output from being used
- Fallback ensures users always get a usable result
- User input preserved even on failure

---

### 2. Brief Stress Testing

**Location**: `components/briefs/BriefIntelligence.tsx`

**New Deterministic Checks Added**:

#### a. Conflicting Spec Detection
- **Trigger**: `contentType === "Short-form Video" && durationSeconds > 60`
- **Type**: Error
- **Message**: "Short-form video with duration over 60 seconds is contradictory"
- **Fix**: "Either change content type to Brand Film or reduce duration to ≤60 seconds"

#### b. Missing Revision Allowance
- **Trigger**: `!objective.includes('revision') && !style.includes('revision')`
- **Type**: Suggestion
- **Message**: "No revision allowance mentioned in objective or style"
- **Fix**: "State how many revision rounds are included (e.g. '2 rounds of revisions')"

#### c. Budget/Timeline Feasibility (Labeled as Estimate)
- **Trigger**: `daysUntilDeadline < 7 && budgetMax < 1000`
- **Type**: Warning
- **Message**: "⚠️ Estimate only (assumptions: 1 creator, standard delivery): tight deadline and low budget may limit creator availability"
- **Fix**: "Consider extending deadline to at least 2 weeks or increasing budget"
- **Note**: Clearly labeled as estimate with stated assumptions

#### d. Missing Exclusivity Regions
- **Trigger**: `commercialUse.exclusivity === true && commercialUse.usageRegions.length === 0`
- **Type**: Warning
- **Message**: "Exclusivity requested but no usage regions specified"
- **Fix**: "Specify the regions where exclusivity applies"

#### e. Multi-Format Validity (FIX)
- **Behavior**: When `quantity > 1 && aspectRatios.length > 1`, this is treated as explicitly requested variants
- **Result**: NO contradiction warning is generated (previous warning removed)
- **Rationale**: Multiple formats for multiple deliverables is valid and intentional

**All Existing Checks Preserved**:
- Missing title, objective, style, budget
- Invalid budget range (min > max)
- Missing aspect ratios, license tier, usage regions, tools, deadline
- Low budget warnings
- Model indemnity suggestions
- Negative keywords suggestions

---

### 3. Evidence-Linked Creator Matching

**Location**: `lib/ai/creatorMatcher.ts`, `app/api/briefs/[id]/matches/route.ts`

#### Scoring Algorithm (Deterministic Baseline)

**Total Score**: 0-100 points

##### Skills Overlap (0-40 points)
- **Formula**: `(matched_skills / total_brief_skills) * 40`
- **Comparison**: `brief.toolsPreferred` against `creator.skills`
- **Example**: Brief requires [Midjourney, Runway, ElevenLabs]. Creator has [Midjourney, Runway]. Score: (2/3) * 40 = 26.67 → 27 points
- **Explanation**: "Matched 2 of 3 required tools: Midjourney, Runway"

##### Verified Tools (0-30 points)
- **Formula**: `(verified_matched / total_brief_tools) * 30`
- **Comparison**: `brief.toolsPreferred` against `creator.verifiedTools[].name`
- **Example**: Same brief, creator has verified [Midjourney]. Score: (1/3) * 30 = 10 points
- **Explanation**: "1 verified tools matching brief: Midjourney"

##### Budget Fit (0-20 points)
- **Assumptions**: Estimated project cost = `hourlyRateUsd * 40 hours`
- **Scoring**:
  - If `budgetMin <= estimate <= budgetMax`: **20 points**
  - If `estimate <= budgetMax * 1.2`: **10 points**
  - If `estimate > budgetMax * 1.5`: **0 points** + mismatch flag
- **Example**: Creator charges $50/h. Estimate = $2,000. Brief budget = $1,500-$2,500. Score: 20 points
- **Explanation**: "Estimated cost $2,000 (assuming 40h at $50/h) vs budget $1,500–$2,500"
- **Mismatch Example**: If estimate = $4,000 and budgetMax = $2,500, adds "Estimated cost ~$4,000 exceeds budget max $2,500"

##### Availability (0-10 points)
- **Scoring**:
  - `Available`: **10 points**
  - `Limited`: **5 points**
  - `Booked`: **0 points**
  - `unknown/undefined`: **0 points** + missing evidence flag
- **Example**: Creator status = "Available". Score: 10 points
- **Explanation**: "Status: Available"
- **Missing Evidence Example**: If availability not set, adds "Availability unknown"

#### Worked Example
**Brief**: Midjourney + Runway required, budget $2,000-$5,000  
**Creator A**: Skills [Midjourney, Runway], Verified [Midjourney], $60/h, Available  
- Skills: (2/2) * 40 = **40 pts**
- Verified: (1/2) * 30 = **15 pts**
- Budget: $2,400 estimate fits in range = **20 pts**
- Availability: Available = **10 pts**
- **Total: 85/100**

**Creator B**: Skills [Midjourney], Verified [], $150/h, Unknown availability  
- Skills: (1/2) * 40 = **20 pts**
- Verified: (0/2) * 30 = **0 pts**
- Budget: $6,000 estimate > $5,000 * 1.2 = **0 pts** + mismatch
- Availability: Unknown = **0 pts** + missing evidence
- **Total: 20/100**

#### Portfolio Matching
- **Match Criteria**:
  - Portfolio item `contentType === brief.contentType`, OR
  - Portfolio item `toolsUsed` intersects with `brief.toolsPreferred`
- **Output**: Array of matched items with:
  - `id`, `title`, `thumbnailUrl`, `mediaUrl`
  - `relevance`: Human-readable explanation (e.g., "Same content type: Short-form Video" or "Uses required tools: Runway, Pika")
- **No Matches**: Empty array, not hidden or invented

#### Mismatches & Missing Evidence
- **Mismatches**: Collected from scoring (e.g., budget too high)
- **Missing Evidence**: Unknown fields (e.g., availability not specified)
- **Display**: Shown separately in UI to help brands make informed decisions

#### Optional AI Enhancement
- **Trigger**: Only if `GEMINI_API_KEY` is set
- **Input**: Compact JSON of brief (contentType, style, toolsPreferred) + creator (handle, specializations, top 3 skills/tools)
- **Timeout**: 10 seconds (no retries for optional feature)
- **Validation**: Response must be string < 500 chars
- **Labeling**: Prefixed with "[AI assessment]"
- **Fallback**: If AI fails, `aiNote = undefined`, `aiLabeled = false`
- **Never**: Invents portfolio items, verification, or experience

---

### 4. Provider Safety & Reliability

#### Rate Limiting
**Implementation**: `lib/ai/rateLimit.ts`
- **Method**: In-memory sliding window
- **Storage**: `Map<string, number[]>` storing timestamps per `userId:endpoint`
- **Defaults**: 10 requests per 60,000ms
- **Cleanup**: Automatically evicts timestamps outside window
- **Endpoints Protected**:
  - `/api/brief`: 10 req/min for AI-assisted brief drafting
  - `/api/briefs/[id]/matches`: 10 req/min for AI-assisted creator matching

**Note on Limited Scope**:
Rate limiting is applied specifically to AI-powered endpoints that:
1. Consume external API quota (Gemini API calls)
2. Involve computationally intensive operations (matching algorithms)
3. Process user-generated content through AI systems

Standard CRUD endpoints (/api/briefs, /api/proposals, etc.) rely on:
- Database-level RLS policies for authorization
- Supabase's built-in connection pooling and rate limiting
- CloudFlare or similar edge protection in production deployment

For production deployment with user-facing traffic, implement:
- CloudFlare rate limiting at edge (recommended)
- Database-backed rate limiter shared across server instances
- Per-endpoint rate limits based on operation cost

#### Timeouts & Retries
**Brief Drafting**:
- Gemini call: 10s timeout via `AbortController`
- Max 2 total attempts (initial call + 1 retry on failure)
- Each attempt has its own independent 10s timeout

**Creator Matching AI Note**:
- Gemini call: 10s timeout
- 0 retries (optional enhancement, not critical)

#### Keys & Server-Side Execution
- **All AI calls**: Server-side only (API routes)
- **Environment variables**: Never exposed to client
- **Service role key**: Used only in API routes with Supabase service client

#### User Content as Untrusted Data
- **Brief idea**: Validated for type and length, no script injection
- **Session cookie**: Parsed with try-catch, defaults to 'anonymous' on error
- **Gemini output**: Validated before use, falls back on invalid format
- **Rate limit keys**: Sanitized string concatenation only

#### Never Simulate AI Success
- **On timeout**: Fall back to deterministic, never fake AI response
- **On validation failure**: Fall back to deterministic
- **Response always indicates actual source**: `gemini` | `fallback` | `deterministic`

---

### 5. Integration into User Journey

#### Brief Drafting
**Location**: Brief creation page (likely `/briefs/new`)
- Users enter plain-language idea
- AI suggests structured brief (or deterministic fallback)
- Users edit suggestions before publishing
- Never auto-publishes

#### Brief Validation
**Location**: `components/briefs/BriefIntelligence.tsx` in brief creation/editing forms
- Real-time validation as user fills form
- Expandable sections for errors, warnings, suggestions
- Visual score ring with color-coded feedback

#### Creator Recommendations
**Location**: `app/briefs/[id]/page.tsx` (brief detail page)
- Shown only to brand owners of the brief
- Accessible after brief is created
- Fetched on demand (not auto-generated)
- Top 10 matches sorted by score

#### No Unrelated Chatbot
- No general AI assistant added
- No decorative mascot
- All AI features tied to specific workflows

---

## Test Cases

### 1. Incomplete Brief
**Setup**: Leave title, objective, and budget empty  
**Expected**: BriefIntelligence shows 3 errors (Title, Objective, Budget)  
**Verification**: Check errors section is expanded and shows red error badges

### 2. Valid Multi-Format Brief
**Setup**: Set `quantity=5`, select both `16:9` and `9:16` aspect ratios  
**Expected**: NO contradiction warning in BriefIntelligence  
**Rationale**: Requesting multiple formats for multiple deliverables is valid

### 3. Conflicting Spec (Short-form Video Duration)
**Setup**: Set `contentType="Short-form Video"`, `durationSeconds=90`  
**Expected**: Error in BriefIntelligence: "Short-form video with duration over 60 seconds is contradictory"  
**Fix Shown**: "Either change content type to Brand Film or reduce duration to ≤60 seconds"

### 4. Tight Deadline + Low Budget (Feasibility Warning)
**Setup**: Set `deadline` to 5 days from now, `budgetMax=800`  
**Expected**: Warning in BriefIntelligence: "⚠️ Estimate only (assumptions: 1 creator, standard delivery): tight deadline and low budget may limit creator availability"  
**Verification**: Warning is labeled as estimate with assumptions stated

### 5. Creator Matching with No Portfolio
**Setup**: Creator has `portfolio: []`, but has skills matching brief  
**Expected**:  
- Match returned with deterministic score based on skills/tools/budget/availability
- `matchedPortfolioItems: []` (empty array)
- `missingEvidence` may include "No portfolio evidence"  
**Verification**: UI shows empty portfolio section, not crashed

### 6. Creator with All Tools Matching
**Setup**: Brief requires [Midjourney, Runway], creator has both as verified tools, Available, budget fits  
**Expected**: Score ≥ 70 (likely 70-85 depending on budget fit)  
**Verification**: Factor breakdown shows:
- Skills: 40/40 pts
- Tools: 30/30 pts
- Budget: 15-20/20 pts (depending on exact fit)
- Availability: 10/10 pts

### 7. AI Provider Timeout Recovery
**Setup**: Remove or use invalid `GEMINI_API_KEY`  
**Expected**:  
- Brief drafting returns `source: "deterministic"` or `source: "fallback"`
- `aiLabeled: false`
- User's original idea preserved in `preservedIdea`
- No simulated AI response  
**Verification**: Check response JSON, verify fallback brief structure matches `lib/briefFallback.ts` output

### 8. Rate Limiting
**Setup**: Send 11 requests to `/api/brief` within 1 minute from same session  
**Expected**: 11th request returns HTTP 429 with `{ error: "Too many requests...", retryAfterMs: <number> }`  
**Verification**: 
1. Open browser console
2. Run test script:
   ```js
   (async () => {
     for (let i = 0; i < 11; i++) {
       const res = await fetch('/api/brief', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ idea: `test idea ${i}` })
       });
       const data = await res.json();
       console.log(`Request ${i + 1}: ${res.status}`, data);
       if (res.status === 429) {
         console.log(`Rate limited! Retry after ${data.retryAfterMs}ms`);
         break;
       }
     }
   })();
   ```
3. Confirm 11th request (or earlier if within 60s window of previous tests) returns 429
4. Confirm `retryAfterMs` is present and reasonable (< 60000ms)
5. UI should display countdown timer: "Retry in Xs"

---

## Limitations & Known Gaps

### 1. AI Brief Generation
- Requires `GEMINI_API_KEY` for AI-powered suggestions
- Falls back to rule-based generation (still functional)
- Rule-based generation infers from keywords, may not capture all nuances

### 2. Rate Limits
- In-memory rate limiter resets on server restart
- Not shared across multiple server instances (single-node only)
- For production: use Redis or database-backed rate limiting

### 3. Creator Matching AI Note
- Optional enhancement, not critical path
- Limited to 100 words per assessment
- No retries (fails silently, deterministic baseline always present)
- Requires `GEMINI_API_KEY`

### 4. Budget Feasibility Warning
- Based on simple heuristics (deadline < 7 days, budget < $1000)
- Clearly labeled as estimate with stated assumptions
- Does not account for project complexity, creator workload, or market rates

### 5. Multi-Format Detection
- Assumes `quantity > 1 + aspectRatios.length > 1` means multiple format variants
- Edge case: If user wants 5 identical 16:9 videos, no contradiction warning (acceptable)

### 6. Portfolio Matching
- Based on content type and tools only
- Does not analyze visual style, quality, or aesthetic fit
- Thumbnails and links are user-provided, not verified

### 7. Missing Revision Allowance Check
- Simple keyword search ('revision' in objective or style)
- Does not parse revision count or terms (e.g., "unlimited revisions" vs "2 revisions")
- Only a suggestion, not enforced

### 5. No Email Notifications
- Brands must manually check brief detail page for matches
- No real-time alerts when new creators match

### 6. Rate Limit UI Feedback
- CreatorMatches component handles 429 responses with specific error messages
- Displays countdown timer for retry delay
- Retry button disabled until timer expires
- Brief drafting API returns preservedIdea field to prevent data loss
- UI should preserve user's original input text when showing rate limit errors

### 9. Mocked vs Real Provider Tests
- **Mocked**: Rate limiter logic, scoring algorithm, portfolio matching
- **Real**: Actual Gemini API calls require valid API key
- **Recommendation**: Use environment variable to toggle between mocked and real API in tests

---

## How to Verify Each Feature

### Brief Drafting
1. Navigate to `/briefs/new` (or wherever brief creation form is)
2. Enter plain-language idea (e.g., "Cinematic reel for luxury watch brand")
3. Submit and observe response
4. Verify `source` field in response
5. If `GEMINI_API_KEY` not set: expect `source: "deterministic"`

### Brief Validation
1. Navigate to brief creation form
2. Leave fields empty and observe real-time errors in `BriefIntelligence` component
3. Set `contentType="Short-form Video"`, `durationSeconds=90`, verify error appears
4. Set `deadline` to 5 days from now, `budgetMax=800`, verify feasibility warning
5. Select multiple aspect ratios with `quantity > 1`, verify NO contradiction warning

### Creator Matching
1. Create a brief as a brand user
2. Navigate to `/briefs/[brief-id]`
3. Verify `CreatorMatches` component renders (only for brand owners)
4. Check match cards show:
   - Score with breakdown (not just %)
   - Factor points (Skills, Tools, Budget, Availability)
   - Matched portfolio items (if any)
   - Mismatches and missing evidence (if any)
   - "Deterministic Baseline" badge (if no AI key)
5. Expand a match to see detailed reasons and portfolio

### Rate Limiting
1. Open browser console
2. Run script to send 11 requests rapidly:
   ```js
   for (let i = 0; i < 11; i++) {
     fetch('/api/brief', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ idea: `test ${i}` })
     }).then(r => r.json()).then(console.log);
   }
   ```
3. Verify 11th request returns 429

### Provider Timeout Recovery
1. Set invalid or remove `GEMINI_API_KEY`
2. Submit brief drafting request
3. Verify response has `source: "deterministic"` or `source: "fallback"`
4. Verify brief is still usable and idea is preserved

---

## Database Schema Requirements

### Tables Used
- `briefs`: Stores campaign requirements
- `creator_profiles`: Stores creator information and capabilities
- `brand_profiles`: Stores brand information
- `users`: Stores user authentication data

### New Fields (None Required)
All Part 3 features work with existing schema. Optional fields:
- `briefs.generated_by_ai`: Boolean (already exists)
- `briefs.raw_idea`: Text (already exists)

---

## Next: Part 4
- Agreements and contracts
- Delivery milestone tracking
- Approval workflows
- Payment integration
- Review and rating system

