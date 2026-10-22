# CineGen INR Currency Conversion - Comprehensive Audit & Implementation Plan

**Date:** $(date +%Y-%m-%d)
**Workspace:** /Users/shaisthashaik/Desktop/Cinegen/cinegen
**Status:** Planning Phase - Detailed Audit Complete

---

## EXECUTIVE SUMMARY

This document provides a comprehensive audit of all currency-related code in the CineGen application and a phased implementation plan to standardize on Indian Rupees (INR/₹) as the sole currency for all CineGen-owned prices, budgets, and financial displays.

**Current State:**
- Mixed USD/INR currency handling across the application
- USD storage in `creator_profiles.hourly_rate_usd`
- Mixed price range types using dollar symbols
- AI Director converts INR to USD at 83:1 rate
- Inconsistent currency formatting (en-US/USD vs needed en-IN/INR)

**Target State:**
- All CineGen-owned monetary values displayed in INR (₹)
- Consistent INR storage in database
- Indian number formatting (₹1,00,000 style)
- No USD/INR toggle - INR only
- Local development only - no production changes

---

## PART 1: COMPLETE CURRENCY AUDIT

### 1.1 TYPE DEFINITIONS & INTERFACES

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/types/index.ts`

#### Current State Analysis:

**Line 58:** `PriceRange` type with USD symbols
```typescript
export type PriceRange = '$500-$1k' | '$1k-$3k' | '$3k-$5k' | '$5k-$10k' | '$10k+';
```
**Issue:** Hardcoded dollar symbols in type definition
**Action Required:** Replace with INR ranges: '₹50k-₹1L' | '₹1L-₹2.5L' | '₹2.5L-₹4L' | '₹4L-₹8L' | '₹8L+'

**Line 142:** `CreatorProfile.hourlyRateUsd` field
```typescript
hourlyRateUsd: number;
```
**Issue:** Field name implies USD currency
**Action Required:** Rename to `hourlyRateInr: number` throughout application

**Line 183-185:** `Brief.budgetMin` and `budgetMax` fields
```typescript
budgetMin: number;
budgetMax: number;
```
**Issue:** No currency indication, currently stores USD
**Action Required:** Update to store INR, add JSDoc comments indicating rupees

**Line 219:** `Proposal.price` field
```typescript
price: number;
```
**Issue:** No currency indication
**Action Required:** Store as INR, add documentation

**Line 264:** `FilterState.hourlyRateMin/Max`
```typescript
hourlyRateMin: number;
hourlyRateMax: number;
```
**Issue:** Used for filtering, needs INR
**Action Required:** Update filter logic to work with INR values

**Line 279:** `CreatorService.priceRange`
```typescript
priceRange: PriceRange;
```
**Issue:** Uses dollar-symbol type
**Action Required:** Update after PriceRange type fixed

**Line 347:** `Agreement.price` and `currency`
```typescript
price: number;
currency: string;
```
**Issue:** Currently stores USD, currency field present but not enforced
**Action Required:** Set default currency to "INR", validate new agreements use INR only

**Line 403:** `CampaignDraft.originalCurrency`
```typescript
originalCurrency?: string; // e.g., "INR 15000-20000" for display transparency
```
**Status:** ✓ Already supports INR preservation - keep as-is for backward compatibility

---


### 1.2 UTILITY FUNCTIONS

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/lib/utils.ts`

#### Current State:

**Lines 8-13:** `formatCurrency()` function
```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}
```

**Issues:**
- Locale: "en-US" (should be "en-IN" for Indian formatting)
- Currency: "USD" (should be "INR")
- Output: "$1,000" (should be "₹1,000" with lakh/crore support)

**Expected INR formatting examples:**
- ₹500
- ₹5,000
- ₹50,000
- ₹1,00,000 (1 lakh)
- ₹12,50,000 (12.5 lakh)
- ₹1,00,00,000 (1 crore)

**Action Required:**
1. Change locale to "en-IN"
2. Change currency to "INR"
3. Test Indian number grouping (2-digit after first 3)
4. Consider helper for lakh/crore display: `formatCurrencyWords()`

**Implementation Note:** 
`Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })` automatically handles Indian grouping.

---

### 1.3 CREATOR PROFILES & SEED DATA

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/lib/seed/creators.ts`

#### Complete Inventory of All 18 Creators:

| ID | Name | Email | Current Rate (USD) | Badge | Featured |
|----|------|-------|-------------------|-------|----------|
| creator-001 | Shaistha Shaik | shaistha@cinegen.demo | $95/hr | Studio | Yes |
| creator-002 | Sraddha Tadivaka | priya@cinegen.demo | $75/hr | Verified | Yes |
| creator-003 | Charitha Javangula | rahul@cinegen.demo | $110/hr | Studio | Yes |
| creator-004 | Tanuja Gandla | zara@cinegen.demo | $120/hr | Verified | Yes |
| creator-005 | Deekshitha Sanivarapu | marcus@cinegen.demo | $150/hr | Studio | Yes |
| creator-006 | Veda Gelli | anjali@cinegen.demo | $55/hr | Verified | Yes |
| creator-007 | Keerthi Gampala | vikram@cinegen.demo | $65/hr | Verified | Yes |
| creator-008 | Leela Jammula | lena@cinegen.demo | $130/hr | Studio | Yes |
| creator-009 | Shazia Shaik | dev@cinegen.demo | $45/hr | Rising | Yes |
| creator-010 | Rahul Vincy | yuna@cinegen.demo | $90/hr | Studio | Yes |
| creator-011 | Dehtaj Shaik | rohan@cinegen.demo | $60/hr | Verified | Yes |
| creator-012 | Teja Angirekula | aisha@cinegen.demo | $85/hr | Studio | Yes |
| creator-013 | Devendar Raju | sameer@cinegen.demo | $50/hr | Rising | Yes |
| creator-014 | Vamsi Krishna | carlos@cinegen.demo | $70/hr | Verified | Yes |
| creator-015 | Gowtham Reddy | meera@cinegen.demo | $100/hr | Studio | Yes |
| creator-016 | Pavan Naidu | tanvir@cinegen.demo | $35/hr | Rising | No |
| creator-017 | Charan Tej | natasha@cinegen.demo | $80/hr | Studio | Yes |
| creator-018 | Pawan Kalyan | ishaan@cinegen.demo | $30/hr | Unverified | No |

**Current Field:** `hourlyRateUsd: 95` (line 37 for creator-001)

**Proposed INR Conversion Strategy:**
These are fictional demo creators with fictional pricing. We will replace with explicit INR sample prices.

**Conversion approach:**
- Use illustrative market-rate INR pricing for Indian creators
- Keep pricing internally consistent with portfolio complexity
- Range: ₹2,500/hr (rising) to ₹12,000/hr (studio, high-demand)

**Proposed INR Rates:**

| Creator | Current USD | Proposed INR | Rationale |
|---------|-------------|--------------|-----------|
| creator-001 (Studio) | $95 | ₹8,000/hr | Senior studio-level filmmaker |
| creator-002 (Verified) | $75 | ₹6,500/hr | Mid-level verified animator |
| creator-003 (Studio) | $110 | ₹9,500/hr | Premium 3D visualization |
| creator-004 (Verified) | $120 | ₹10,000/hr | Fashion filmmaker specialist |
| creator-005 (Studio) | $150 | ₹12,000/hr | Top-tier VFX director |
| creator-006 (Verified) | $55 | ₹4,500/hr | Audio specialist |
| creator-007 (Verified) | $65 | ₹5,500/hr | Product commercial |
| creator-008 (Studio) | $130 | ₹11,000/hr | Music video director |
| creator-009 (Rising) | $45 | ₹3,500/hr | Entry-level motion designer |
| creator-010 (Studio) | $90 | ₹7,500/hr | Concept art specialist |
| creator-011 (Verified) | $60 | ₹5,000/hr | Motion graphics |
| creator-012 (Studio) | $85 | ₹7,000/hr | Brand storyteller |
| creator-013 (Rising) | $50 | ₹4,000/hr | Social media content |
| creator-014 (Verified) | $70 | ₹6,000/hr | Sports content |
| creator-015 (Studio) | $100 | ₹8,500/hr | Art-house filmmaker |
| creator-016 (Rising) | $35 | ₹2,500/hr | Architecture visualization |
| creator-017 (Studio) | $80 | ₹6,500/hr | Fashion editorial |
| creator-018 (Unverified) | $30 | ₹2,500/hr | Gaming content creator |

**Action Required:**
1. Update `hourlyRateUsd` field name to `hourlyRateInr` in all 18 creator objects
2. Replace USD values with proposed INR rates
3. Update TypeScript interface in types/index.ts
4. Label as "Sample pricing for demo creators"

**Portfolio Pricing:**
Each creator has 1-2 portfolio items with example pricing in `commercialUse` metadata. These are already structured and don't show currency symbols in the data - display layer only.

---


### 1.4 DATABASE SCHEMA & MIGRATIONS

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/database/schema.sql`

#### Current Schema Analysis:

**Line 38:** `creator_profiles.hourly_rate_usd`
```sql
hourly_rate_usd INTEGER NOT NULL,
```
**Issue:** Column name and type indicate USD
**Storage Unit:** Dollars (integer, no cents)
**Action Required:** 
- Rename column to `hourly_rate_inr`
- Migration required for column rename
- Update all indexes referencing this column

**Lines 95-96:** `briefs.budget_min` and `budget_max`
```sql
budget_min INTEGER NOT NULL,
budget_max INTEGER NOT NULL,
```
**Issue:** No currency indication, currently stores USD
**Storage Unit:** Dollars (integer)
**Action Required:**
- Document as INR storage in comments
- No column rename needed (currency-neutral names)
- Data migration: Convert existing USD values to INR

**Line 123:** `proposals.price`
```sql
price INTEGER NOT NULL,
```
**Issue:** No currency indication
**Storage Unit:** Dollars (integer)
**Action Required:**
- Document as INR in comments
- Data migration for existing proposals

**Creator Services Schema:**

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/database/creator_services.sql`

**Line 10:** `price_range` column
```sql
price_range TEXT NOT NULL CHECK (price_range IN ('$500-$1k', '$1k-$3k', '$3k-$5k', '$5k-$10k', '$10k+')),
```
**Issue:** USD price ranges in database constraint
**Action Required:**
- Update CHECK constraint to INR ranges: '₹50k-₹1L', '₹1L-₹2.5L', '₹2.5L-₹4L', '₹4L-₹8L', '₹8L+'
- Migrate existing service records
- Update TypeScript PriceRange type to match

**Storage Unit Decision:**

All monetary fields are stored as INTEGER (not NUMERIC/DECIMAL):
- **Unit:** Full rupees (not paise)
- **Example:** ₹1,250 stored as `1250`
- **Rationale:** 
  - Current USD storage already uses integers (no cents)
  - INR amounts at creator hourly rate level rarely need paise precision
  - Simpler arithmetic, no floating-point issues
  - Display layer can add formatting

**No paise storage needed** - all CineGen pricing is at rupee-level granularity.

---

### 1.5 MIGRATION FILES

**Directory:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/database/migrations/`

**Existing Migrations:** 7 migration files found
- None currently address currency conversion
- Migration 007 is most recent (director_conversations)

**New Migration Required:** `008_convert_currency_to_inr.sql`

**Migration Tasks:**
1. Rename `creator_profiles.hourly_rate_usd` → `hourly_rate_inr`
2. Update `creator_services.price_range` CHECK constraint
3. Add comments documenting INR storage for briefs, proposals, agreements
4. Data conversion (if any non-demo data exists)

**Data Conversion Strategy:**

For **demo/fictional data** (18 seeded creators, sample briefs):
- Replace with explicit INR values (not mathematical conversion)
- Use proposed INR rates from section 1.3
- Maintain internal consistency (brief budgets should align with creator rates)

For **real user data** (if any exists in local dev database):
- DO NOT auto-convert
- Flag for manual review
- Preserve original currency metadata

**Migration Safety:**
- Local development only
- No production database modification
- Idempotent migration script
- Rollback procedure included

---


### 1.6 UI COMPONENTS - CURRENCY DISPLAY LOCATIONS

#### Components Using formatCurrency():

1. **`/app/briefs/page.tsx`**
   - Line 66: Proposal price display
   - Line 224: Brief budget range (brand view)
   - Line 347: Brief budget range (creator view)
   - Status: ✓ Uses formatCurrency utility

2. **`/app/dashboard/page.tsx`**
   - Line 97: Total budget stat card
   - Line 182: Proposal price in engagement list
   - Line 240: Brief max budget
   - Line 365: Brief budget range in matching briefs
   - Status: ✓ Uses formatCurrency utility

3. **`/app/briefs/[id]/page.tsx`**
   - Line 157: Budget display with toLocaleString()
   - Issue: Uses $ symbol directly, not formatCurrency
   - Action: Replace with formatCurrency()

#### Components with Direct $ Symbols:

1. **`/components/creators/CreatorCard.tsx`**
   - Line 184: `${creator.hourlyRateUsd}/hr`
   - Action: Change to `₹{creator.hourlyRateInr}/hr` or use formatCurrency

2. **`/app/leaderboard/page.tsx`**
   - Line 130: `${creator.hourlyRateUsd}/hr`
   - Action: Change to INR display

3. **`/app/compare/page.tsx`**
   - Line 23: getValue function returns `$${creator.hourlyRateUsd}/hr`
   - Line 96: Creator dropdown shows `${c.hourlyRateUsd}/hr`
   - Action: Update both locations to INR

4. **`/app/creators/page.tsx`**
   - Line 125: Filter chip shows `≤ $${filters.hourlyRateMax}/hr`
   - Line 272: Slider label shows `up to $${filters.hourlyRateMax}/hr`
   - Action: Change to INR formatting

5. **`/app/page.tsx`** (Homepage)
   - Line 466: `${creator.rate}/hr`
   - Action: Update to INR

6. **`/app/creators/[id]/page.tsx`**
   - Line 257: `${creator.hourlyRateUsd}/hr`
   - Action: Update to INR

7. **`/app/services/[id]/page.tsx`**
   - Line 265: `${creator.hourlyRateUsd}/hr`
   - Action: Update to INR

8. **`/app/onboarding/page.tsx`**
   - Line 325: Input suffix shows `/hr`
   - Line 327: Help text says "Average on CineGen: $85/hr"
   - Action: Update to "Average: ₹7,000/hr"

#### Label Updates Required:

1. **`/app/briefs/new/page.tsx`**
   - Line 498: "Min Budget (USD) *"
   - Line 504: "Max Budget (USD) *"
   - Action: Change to "Min Budget (₹) *" and "Max Budget (₹) *"

2. **`/app/briefs/page.tsx`**
   - Line 374: "Your Price (USD)"
   - Action: Change to "Your Price (₹)"

3. **`/components/voice/CineGenDirector.tsx`**
   - Line 1701: "Budget (USD)"
   - Line 1704: Shows originalCurrency conversion note
   - Action: Change label to "Budget (₹)", keep conversion transparency

---

### 1.7 AI DIRECTOR / CONVERSATIONAL AI INTEGRATION

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/chat/route.ts`

#### Current Currency Conversion Logic:

**Line 280-281:** System prompt instructs currency conversion
```typescript
Currency conversion: INR to USD at ~83:1 rate, store original in "originalCurrency"
```

**Problem Analysis:**
- AI Director converts user-provided INR budgets to USD
- Stores converted USD values in brief.budgetMin/budgetMax
- Preserves original INR in brief.originalCurrency field
- Conversion rate is hardcoded (~83:1)
- This creates USD storage with INR display overlay

**Target Behavior:**
- User provides INR budget → Store directly in INR
- No conversion needed
- Remove 83:1 conversion logic from system prompt
- Keep originalCurrency field for transparency but store native INR

**Action Required:**
1. Remove INR→USD conversion instruction from system prompt
2. Update prompt to say: "Extract budgets in the currency user provides. If INR/rupees mentioned, store as-is in budgetMin/budgetMax. If USD mentioned, convert to INR at ~83:1."
3. Update voice reply generation to say "rupees" instead of "dollars" when discussing budgets
4. Test with Telugu/Hindi voice input saying "పదిహేను వేల రూపాయలు" (15,000 rupees)

**Voice Behavior Update:**
When Director speaks about budgets, it should say:
- English: "fifteen thousand rupees" not "about 180 dollars"
- Telugu: "పదిహేను వేల రూపాయలు"
- Hindi: "पंद्रह हजार रुपये"

**Draft Card Display:**
`/components/voice/CineGenDirector.tsx` Line 1698-1726 shows campaign draft with budget fields. Already has originalCurrency display (Line 1702-1707). Update label from "Budget (USD)" to "Budget (₹)".

---

### 1.8 BACKEND API ROUTES

#### Brief Creation/Update APIs:

1. **`/app/api/briefs/route.ts`**
   - POST endpoint creates briefs with budget_min, budget_max
   - Currently expects USD values
   - Action: Update validation to expect INR, add JSDoc comments

2. **`/app/api/briefs/[id]/route.ts`**
   - PATCH endpoint updates briefs
   - Action: Ensure INR values are stored

#### Proposal APIs:

1. **`/app/api/proposals/route.ts`**
   - POST endpoint creates proposals with price field
   - Action: Store as INR

#### Matching Algorithm:

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/lib/matchScore.ts`

**Lines 76-81:** Budget fit calculation
```typescript
const crDailyRate = creator.hourlyRateUsd * 8;
const estimatedProjectCost = crDailyRate * 5;
if (estimatedProjectCost >= brief.budgetMin && estimatedProjectCost <= brief.budgetMax) {
  score += 5;
  reasons.push(`Rate fits within budget`);
}
```

**Issue:** 
- Uses `creator.hourlyRateUsd` (needs to be hourlyRateInr)
- Compares against brief.budgetMin/budgetMax (which will be INR)
- After conversion, both will be INR so math remains valid

**Action:** Update to use `creator.hourlyRateInr`

---

### 1.9 BRIEF INTELLIGENCE COMPONENT

**File:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/briefs/BriefIntelligence.tsx`

**Lines 85, 96, 97:** Budget validation with USD assumptions
```typescript
if (daysUntilDeadline < 7 && form.budgetMax < 1000) {
  // Warning about tight deadline and low budget
}
if (form.budgetMax > 0 && form.budgetMax < 500) {
  issues.push({ ... message: "Budget seems low for AI production", 
                fix: "Typical AI brand films start at $500–$1,000. Consider increasing." });
}
```

**Issue:** Hardcoded USD thresholds

**Action Required:**
1. Update thresholds to INR equivalents:
   - `budgetMax < 1000` → `budgetMax < 85000` (tight deadline threshold)
   - `budgetMax < 500` → `budgetMax < 42000` (low budget warning)
2. Update suggestion message: "Typical AI brand films start at ₹40,000–₹85,000"

---


## PART 2: CURRENT STATE SUMMARY

### 2.1 What Uses USD (Needs Conversion)

| Component | Current State | Evidence |
|-----------|---------------|----------|
| **Type Definitions** | `PriceRange` type with $ symbols | types/index.ts:58 |
| **Type Definitions** | `hourlyRateUsd` field name | types/index.ts:142 |
| **Utility Function** | formatCurrency() uses en-US/USD | lib/utils.ts:8-13 |
| **Database Schema** | `hourly_rate_usd` column | schema.sql:38 |
| **Database Schema** | Price range CHECK constraint with $ | creator_services.sql:10 |
| **Seed Data** | All 18 creators have hourlyRateUsd in USD | lib/seed/creators.ts |
| **Creator Card** | Displays $X/hr | components/creators/CreatorCard.tsx:184 |
| **Leaderboard** | Displays $X/hr | app/leaderboard/page.tsx:130 |
| **Compare Page** | Displays $X/hr | app/compare/page.tsx:23,96 |
| **Creators Page** | Filter labels show $ | app/creators/page.tsx:125,272 |
| **Homepage** | Featured creators show $ | app/page.tsx:466 |
| **Creator Profile** | Hourly rate shows $ | app/creators/[id]/page.tsx:257 |
| **Service Page** | Hourly rate shows $ | app/services/[id]/page.tsx:265 |
| **Onboarding** | Help text says "$85/hr" | app/onboarding/page.tsx:327 |
| **Brief Builder** | Labels say "(USD)" | app/briefs/new/page.tsx:498,504 |
| **Brief Page** | Proposal form says "USD" | app/briefs/page.tsx:374 |
| **Director Component** | Budget label "(USD)" | components/voice/CineGenDirector.tsx:1701 |
| **Director API** | Converts INR→USD at 83:1 | app/api/director/chat/route.ts:280 |
| **Match Algorithm** | Uses hourlyRateUsd | lib/matchScore.ts:76 |
| **Brief Intelligence** | USD thresholds ($500, $1000) | components/briefs/BriefIntelligence.tsx:85,96 |

**Total:** 23 locations require USD→INR conversion

---

### 2.2 What's Already INR (Keep As-Is)

| Component | Status | Evidence |
|-----------|--------|----------|
| **originalCurrency field** | Already supports INR preservation | types/index.ts:392 |
| **Agreement.currency field** | String field, can store "INR" | types/index.ts:347 |

---

### 2.3 What's Ambiguous (Needs Investigation)

| Component | Issue | Action |
|-----------|-------|--------|
| **Existing database records** | Unknown if demo-only or real data exists | Check local database for non-demo records |
| **Historic proposals** | May have been created with USD | Flag for manual review |
| **Email templates** | May mention currency | Audit emails/ directory |
| **Payment integration** | Unknown if Stripe/Razorpay configured | Check for payment API routes |

---


### PHASE 4: AI Director & Conversational AI

**Goal:** Remove INR→USD conversion, make AI speak in rupees

**File:** `/app/api/director/chat/route.ts`

**Step 4.1:** Update system prompt (Line 280)

```typescript
// OLD:
Currency conversion: INR to USD at ~83:1 rate, store original in "originalCurrency"

// NEW:
Currency handling: Extract budgets in the currency user provides. Store in INR (budgetMin/budgetMax fields). If user mentions USD or dollars, convert to INR at ~83:1 rate and note in originalCurrency field. If user mentions INR/rupees/₹, store as-is.
```

**Step 4.2:** Update voice reply instructions

Add to system prompt:
```typescript
When discussing budgets in voice replies:
- English: Say "rupees" not "dollars" (e.g., "fifteen thousand rupees")
- Telugu: Say "రూపాయలు" (e.g., "పదిహేను వేల రూపాయలు")  
- Hindi: Say "रुपये" (e.g., "पंद्रह हजार रुपये")
- Display amounts with ₹ symbol and Indian formatting
```

**Step 4.3:** Update campaign draft display

File: `/components/voice/CineGenDirector.tsx` (Line 1701)

```typescript
// OLD:
<label className="text-xs text-gray-400 block mb-1">
  Budget (USD)
  {campaignDraft.originalCurrency && (
    <span className="ml-1 text-violet-400 font-normal">
      (converted from {campaignDraft.originalCurrency})
    </span>
  )}
</label>

// NEW:
<label className="text-xs text-gray-400 block mb-1">
  Budget (₹)
  {campaignDraft.originalCurrency && campaignDraft.originalCurrency.includes('USD') && (
    <span className="ml-1 text-violet-400 font-normal">
      (converted from {campaignDraft.originalCurrency})
    </span>
  )}
</label>
```

**Verification:**
1. Voice input: "I need a video for fifteen thousand rupees"
   - Expected: budgetMin/budgetMax set to 15000, no conversion
2. Voice input: "Budget is two hundred dollars"
   - Expected: Converted to ~16,600 INR, originalCurrency: "USD $200"
3. Check voice reply says "rupees" not "dollars"

**Estimated Time:** 30 minutes

---

### PHASE 5: Backend APIs & Business Logic

**Goal:** Ensure all APIs accept and return INR values

**Step 5.1:** Update match scoring algorithm

File: `/lib/matchScore.ts` (Lines 76-81)

```typescript
// OLD:
const crDailyRate = creator.hourlyRateUsd * 8;

// NEW:
const crDailyRate = creator.hourlyRateInr * 8;
```

**Step 5.2:** Update Brief Intelligence thresholds

File: `/components/briefs/BriefIntelligence.tsx`

```typescript
// OLD (Line 85):
if (daysUntilDeadline < 7 && form.budgetMax < 1000) {

// NEW:
if (daysUntilDeadline < 7 && form.budgetMax < 85000) {

// OLD (Line 96-97):
if (form.budgetMax > 0 && form.budgetMax < 500)
  issues.push({ ... fix: "Typical AI brand films start at $500–$1,000. Consider increasing." });

// NEW:
if (form.budgetMax > 0 && form.budgetMax < 42000)
  issues.push({ ... fix: "Typical AI brand films start at ₹40,000–₹85,000. Consider increasing." });
```

**Step 5.3:** Add validation to API routes

Files: `/app/api/briefs/route.ts`, `/app/api/proposals/route.ts`

Add JSDoc and validation:
```typescript
// In brief creation endpoint:
// Validate budget is in reasonable INR range (₹1,000 - ₹50,00,000)
if (budget_min < 1000 || budget_max > 5000000) {
  return NextResponse.json(
    { error: "Budget must be between ₹1,000 and ₹50,00,000" },
    { status: 400 }
  );
}
```

**Step 5.4:** Update hooks to use new field name

File: `/hooks/useCreators.ts` (Lines 49, 133, 164)

```typescript
// OLD:
hourlyRateUsd: profile.hourly_rate_usd,
// ...
hourly_rate_usd: data.hourlyRateUsd,

// NEW:
hourlyRateInr: profile.hourly_rate_inr,
// ...
hourly_rate_inr: data.hourlyRateInr,
```

**Verification:**
```bash
npm run build
# Run type checker
npx tsc --noEmit

# Test API endpoints:
# - Create brief with INR budget
# - Submit proposal with INR price
# - Check matching algorithm returns correct scores
```

**Estimated Time:** 45 minutes

---

### PHASE 6: Testing & Verification

**Goal:** Comprehensive testing of INR conversion across all flows

**Test Scenarios:**

**6.1 Creator Profile Display**
- [ ] Visit /creators - all cards show ₹X,XXX/hr
- [ ] Visit individual creator profiles - rate shows ₹ symbol
- [ ] Check leaderboard - rates in INR
- [ ] Check comparison page - rates in INR
- [ ] Check homepage featured creators - rates in INR

**6.2 Brief Creation**
- [ ] Create brief via manual form - labels say "Budget (₹)"
- [ ] Enter budget 50000-100000 - saves correctly
- [ ] View created brief - displays ₹50,000 – ₹1,00,000
- [ ] Brief Intelligence shows INR thresholds (₹42,000, ₹85,000)

**6.3 AI Director**
- [ ] Voice input: "budget is fifty thousand rupees" → stores 50000
- [ ] Voice input: "budget is five hundred dollars" → converts to ~41,500
- [ ] Campaign draft shows "Budget (₹)"
- [ ] Voice reply says "rupees" not "dollars"

**6.4 Proposals**
- [ ] Submit proposal with price 45000
- [ ] View proposal - displays ₹45,000
- [ ] Accept proposal - price displays correctly

**6.5 Matching**
- [ ] Create brief with ₹60,000-₹1,00,000 budget
- [ ] Check matches include creators with ₹8,000/hr rate
- [ ] Verify "Rate fits within budget" reason appears

**6.6 Filters**
- [ ] Set hourly rate filter to ₹10,000
- [ ] Verify filter chip shows "≤ ₹10,000/hr"
- [ ] Verify correct creators filtered

**6.7 Dashboard**
- [ ] Brand dashboard "Total Budget" stat shows ₹ formatting
- [ ] Proposal prices show ₹ symbol
- [ ] Recent briefs show INR ranges

**Verification Checklist:**
```bash
# Build passes
npm run build

# No TypeScript errors
npx tsc --noEmit

# All formatCurrency calls return ₹ symbol
grep -r "formatCurrency" app/ components/ | wc -l

# No remaining $ symbols in display (allow JavaScript ${} interpolation)
grep -r '\$[0-9]' app/ components/ --include="*.tsx" | grep -v node_modules

# Database has hourly_rate_inr column
# Check via Supabase dashboard or psql
```

**Estimated Time:** 1 hour

---


## PART 4: DATA INTEGRITY & MIGRATION STRATEGY

### 4.1 Demo vs Real Data Classification

**Demo/Fictional Data:**
- 18 creator profiles seeded from lib/seed/creators.ts
- Sample briefs created during seeding
- Sample proposals linked to demo briefs
- All demo accounts use @cinegen.demo emails

**Action for Demo Data:**
- Safe to replace with INR values
- No conversion formula needed - use proposed INR rates from section 1.3
- Re-seed database after schema migration

**Real User Data Detection:**
```sql
-- Check for non-demo users
SELECT COUNT(*) FROM users WHERE email NOT LIKE '%@cinegen.demo';

-- Check for non-demo creator profiles
SELECT cp.* FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email NOT LIKE '%@cinegen.demo';

-- Check for briefs from real brands
SELECT b.* FROM briefs b
JOIN brand_profiles bp ON b.brand_id = bp.id
JOIN users u ON bp.user_id = u.id
WHERE u.email NOT LIKE '%@cinegen.demo';
```

**If real data exists:**
1. Export to CSV with current currency
2. Flag for manual review
3. Do NOT auto-convert
4. Contact affected users (if production)

---

### 4.2 Storage Units & Precision

**Decision: Store in full rupees, not paise**

Rationale:
- Current USD storage uses integers (no cent precision)
- Creator hourly rates: ₹2,500, ₹5,000, ₹8,000 (round thousands)
- Brief budgets: ₹50,000, ₹1,00,000 (round lakhs)
- Proposal prices: Negotiated in round thousands
- No business need for ₹XX.50 precision

**Storage format:**
- Database: INTEGER (no decimal)
- TypeScript: number (stored as 50000, not 50000.00)
- Display: formatCurrency() adds ₹ symbol and commas

**Example:**
```typescript
// Database stores: 50000
// Display shows: ₹50,000
// Spoken as: "Fifty thousand rupees"
```

---

### 4.3 Conversion Formula (For USD Input Only)

**When conversion IS needed:**
- User explicitly provides USD amount via Director
- Historical USD records (preserve original, note currency)

**Conversion rate:** 1 USD = 83 INR (approximate market rate)

**Formula:**
```typescript
function convertUsdToInr(usdAmount: number): number {
  const INR_PER_USD = 83;
  const inrAmount = Math.round(usdAmount * INR_PER_USD);
  // Round to nearest 100 for cleaner display
  return Math.round(inrAmount / 100) * 100;
}

// Examples:
convertUsdToInr(500)  // → 41,500 (500 × 83 = 41,500)
convertUsdToInr(1000) // → 83,000 (1000 × 83 = 83,000)
convertUsdToInr(95)   // → 7,900 (95 × 83 = 7,885, rounded to 7,900)
```

**Important:** This conversion should ONLY be used:
1. In AI Director when user says "X dollars"
2. For displaying legacy USD data with conversion note
3. NOT for the main currency flow (INR is primary)

---

### 4.4 Internal Consistency Checks

**Verify linked records remain consistent:**

1. **Creator Rate → Proposal Price**
   - If creator charges ₹8,000/hr
   - 40-hour project proposal should be ~₹3,20,000
   - Check: Proposal prices are reasonable multiples of creator rates

2. **Brief Budget → Proposals**
   - If brief budgets ₹50,000-₹1,00,000
   - Proposals should be within or near that range
   - Check: No proposals of ₹5,000 for ₹1,00,000 brief (likely USD leftover)

3. **Creator Stats → Rates**
   - Studio badge creators: ₹7,000-₹12,000/hr
   - Verified creators: ₹4,500-₹10,000/hr
   - Rising creators: ₹2,500-₹4,000/hr
   - Check: Badge tiers align with rate ranges

**Validation SQL:**
```sql
-- Check for suspiciously low rates (likely USD not converted)
SELECT * FROM creator_profiles WHERE hourly_rate_inr < 2000;

-- Check for budgets that don't match proposal prices
SELECT b.id, b.budget_min, b.budget_max, p.price
FROM briefs b
JOIN proposals p ON b.id = p.brief_id
WHERE p.price < b.budget_min * 0.5 OR p.price > b.budget_max * 1.5;
```

---

### 4.5 Rollback Procedure

**If INR conversion needs to be reverted:**

1. **Database rollback:**
```sql
-- Rename column back
ALTER TABLE creator_profiles RENAME COLUMN hourly_rate_inr TO hourly_rate_usd;

-- Restore old CHECK constraint
ALTER TABLE creator_services DROP CONSTRAINT creator_services_price_range_check;
ALTER TABLE creator_services ADD CONSTRAINT creator_services_price_range_check 
  CHECK (price_range IN ('$500-$1k', '$1k-$3k', '$3k-$5k', '$5k-$10k', '$10k+'));
```

2. **Code rollback:**
```bash
# Revert all file changes
git checkout HEAD~1 types/index.ts lib/utils.ts lib/seed/creators.ts
# ... (revert all modified files)

# Rebuild
npm run build
```

3. **Re-seed with old USD data:**
```bash
npm run db:reset
npm run db:seed
```

---


## PART 5: VALIDATION CHECKPOINTS

### Checkpoint 1: After Phase 1 (Types & Utils)
- [ ] TypeScript compiles with 0 errors: `npm run build`
- [ ] formatCurrency(50000) returns "₹50,000"
- [ ] formatCurrency(100000) returns "₹1,00,000" (lakh notation)
- [ ] PriceRange type updated with ₹ symbols
- [ ] All hourlyRateUsd references renamed to hourlyRateInr

### Checkpoint 2: After Phase 2 (Database)
- [ ] Migration 008 applied successfully
- [ ] creator_profiles table has hourly_rate_inr column
- [ ] Old hourly_rate_usd column does not exist
- [ ] creator_services price_range constraint uses ₹ values
- [ ] All 18 creators re-seeded with INR rates
- [ ] Sample query: `SELECT name, hourly_rate_inr FROM creator_profiles LIMIT 5;`
  - Expected: Returns rates like 8000, 6500, 9500, 10000, 12000

### Checkpoint 3: After Phase 3 (UI Components)
- [ ] Creator cards display ₹8,000/hr format
- [ ] Brief budgets display ₹50,000 – ₹1,00,000 format
- [ ] Form labels say "Budget (₹)" not "Budget (USD)"
- [ ] Filters show "≤ ₹10,000/hr"
- [ ] Onboarding help text says "₹7,000/hr"
- [ ] No $ symbols remain in visible UI (check with browser inspector)

### Checkpoint 4: After Phase 4 (AI Director)
- [ ] Voice input "fifty thousand rupees" → stores 50000 in budgetMax
- [ ] Voice input "five hundred dollars" → converts to ~41,500
- [ ] Campaign draft card shows "Budget (₹)"
- [ ] Voice reply transcript says "rupees" not "dollars"
- [ ] originalCurrency field preserves user's original input

### Checkpoint 5: After Phase 5 (Backend)
- [ ] Match algorithm uses hourlyRateInr field
- [ ] Brief Intelligence thresholds updated (₹42,000, ₹85,000)
- [ ] API validation accepts INR ranges (₹1,000 - ₹50,00,000)
- [ ] useCreators hook maps hourly_rate_inr correctly
- [ ] No TypeScript errors: `npx tsc --noEmit`

### Checkpoint 6: Final Verification
- [ ] All 31 test scenarios from Phase 6 pass
- [ ] Build succeeds: `npm run build` exits with code 0
- [ ] Dev server runs: `npm run dev` starts without errors
- [ ] No console errors when navigating between pages
- [ ] Currency displays consistently across all pages
- [ ] Demo login works: brand@cinegen.demo / Demo@123
- [ ] Create brief end-to-end works with INR values

---

## PART 6: FILES REQUIRING CHANGES - COMPLETE LIST

### TypeScript/JavaScript Files (31 files):

1. `/types/index.ts` - Type definitions (PriceRange, hourlyRateUsd→Inr)
2. `/lib/utils.ts` - formatCurrency() function
3. `/lib/seed/creators.ts` - All 18 creator hourlyRate values
4. `/lib/matchScore.ts` - Match algorithm using hourly rate
5. `/components/creators/CreatorCard.tsx` - Display $ symbol
6. `/components/briefs/BriefIntelligence.tsx` - Budget thresholds
7. `/components/voice/CineGenDirector.tsx` - Budget label
8. `/app/page.tsx` - Homepage featured creators
9. `/app/creators/page.tsx` - Filter labels and chips
10. `/app/creators/[id]/page.tsx` - Creator profile rate display
11. `/app/leaderboard/page.tsx` - Rate display
12. `/app/compare/page.tsx` - getValue function and dropdown
13. `/app/briefs/page.tsx` - Proposal form label
14. `/app/briefs/new/page.tsx` - Budget form labels
15. `/app/briefs/[id]/page.tsx` - Budget display
16. `/app/dashboard/page.tsx` - Already uses formatCurrency (verify only)
17. `/app/onboarding/page.tsx` - Help text and form
18. `/app/services/[id]/page.tsx` - Hourly rate display
19. `/app/api/director/chat/route.ts` - System prompt currency handling
20. `/app/api/briefs/route.ts` - Validation (add JSDoc)
21. `/app/api/proposals/route.ts` - Validation (add JSDoc)
22. `/hooks/useCreators.ts` - Field mapping hourly_rate_usd→inr
23. `/hooks/useServices.ts` - PriceRange handling (verify after type update)
24. `/hooks/useBriefs.ts` - Already maps budget_min/max (verify only)

### Database Files (3 files):

25. `/database/schema.sql` - Add comments (no column rename here)
26. `/database/creator_services.sql` - Add comments
27. `/database/migrations/008_convert_currency_to_inr.sql` - NEW FILE

### Documentation Files (3 files - optional):

28. `/README.md` - Update any currency examples
29. `/CINEGEN_FULL_HANDOFF.md` - Update currency handling section
30. `/.env.example` - Add note about INR-only pricing

**Total: 30 files (27 code files + 3 database files)**

---

## PART 7: AMBIGUOUS ITEMS REQUIRING MANUAL REVIEW

### 7.1 Payment Integration

**Status:** Unknown if configured

**Files to check:**
- Search for: `stripe`, `razorpay`, `payment`, `checkout`
- Check: `/app/api/payments/` directory (if exists)

**If payment integration exists:**
1. Verify currency parameter is set to "INR"
2. Check amount units (paise vs rupees)
3. Update webhook handlers to expect INR
4. Test in Stripe/Razorpay test mode

**Action:** Inspect codebase for payment integration before going live

---

### 7.2 Email Templates

**Directory:** `/emails/` (if exists)

**Templates to check:**
- Proposal notifications
- Payment confirmations
- Invoice templates
- Budget-related emails

**Action:** Search for $ symbols and USD references in email templates
```bash
find /Users/shaisthashaik/Desktop/Cinegen/cinegen/emails -type f -name "*.tsx" -o -name "*.html" 2>/dev/null | xargs grep -l "\$\|USD" 2>/dev/null
```

---

### 7.3 Production Passport Exports

**File:** Check if production passports include currency

**Action:** Test passport export with INR brief, verify PDF shows ₹ correctly

---

### 7.4 External Creator Quotes

**Scenario:** If real creators have set their own rates

**Check:**
```sql
-- Find creators who may have set custom rates (not demo users)
SELECT cp.*, u.email 
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.email NOT LIKE '%@cinegen.demo'
AND cp.hourly_rate_usd IS NOT NULL;
```

**If found:** Contact creators to confirm INR rate preference

---

### 7.5 Historical Agreements

**Check for accepted agreements with currency field:**
```sql
SELECT id, price, currency, created_at 
FROM agreements 
WHERE currency = 'USD' OR currency IS NULL
ORDER BY created_at DESC;
```

**Action:** If found, add migration note to preserve original currency

---


## PART 8: EXECUTION TIMELINE & EFFORT ESTIMATE

### Sequential Implementation (Recommended):

| Phase | Tasks | Estimated Time | Dependencies |
|-------|-------|----------------|--------------|
| **Phase 1** | Types & Utils | 30 min | None |
| **Phase 2** | Database & Seed Data | 45 min | Phase 1 complete |
| **Phase 3** | UI Components | 60 min | Phase 1, 2 complete |
| **Phase 4** | AI Director | 30 min | Phase 1 complete |
| **Phase 5** | Backend APIs | 45 min | Phase 1, 2 complete |
| **Phase 6** | Testing & Verification | 60 min | All phases complete |
| **Manual Review** | Ambiguous items | 30 min | After Phase 6 |

**Total Estimated Time:** 4.5 hours (single developer, focused work)

### Parallel Implementation (If team available):

- **Developer 1:** Phases 1 + 2 (Types, DB, Seed) - 75 min
- **Developer 2:** Phase 3 (UI Components) - starts after Phase 1 complete - 60 min
- **Developer 3:** Phases 4 + 5 (AI Director, APIs) - starts after Phase 1 complete - 75 min
- **All:** Phase 6 (Testing) - 60 min

**Total Elapsed Time:** ~2.5 hours (with 3 developers)

---

## PART 9: RISK MITIGATION

### Risk 1: Breaking Existing Data
**Mitigation:**
- Work on localhost only
- Create database backup before migration
- Test with fresh database reset first
- Do not push to production without approval

### Risk 2: Inconsistent Display Across Pages
**Mitigation:**
- Centralize formatting in formatCurrency() utility
- Use consistent pattern: `{formatCurrency(amount)}`
- Verify all pages in test checklist

### Risk 3: Type Errors After hourlyRateUsd Rename
**Mitigation:**
- Use IDE find-and-replace with whole-word match
- Run `npx tsc --noEmit` after each file change
- Fix all errors before moving to next phase

### Risk 4: AI Director Confusion Between INR/USD
**Mitigation:**
- Clear system prompt instructions
- Test with explicit currency mentions
- Preserve originalCurrency field for transparency
- Log currency conversions for debugging

### Risk 5: Historical Data Loss
**Mitigation:**
- Check for non-demo data before migration
- Export existing data to CSV
- Keep originalCurrency metadata
- Document any manual interventions needed

---

## PART 10: SUCCESS CRITERIA

### Functional Requirements:

✅ **All CineGen-owned prices display in INR with ₹ symbol**
- Creator hourly rates: ₹2,500 to ₹12,000 range
- Brief budgets: ₹40,000 to ₹10,00,000 range
- Proposal prices: Match brief budget ranges

✅ **Indian number formatting throughout**
- ₹50,000 (not ₹50,000.00)
- ₹1,00,000 (1 lakh)
- ₹10,00,000 (10 lakh)
- ₹1,00,00,000 (1 crore)

✅ **No USD references in active UI**
- No $ symbols in display text
- No "USD" labels on forms
- No dollar amounts in sample data
- No USD mentions in voice replies

✅ **Consistent storage in database**
- hourly_rate_inr column (INTEGER)
- budget_min/max store rupees
- price_range uses ₹ values
- All amounts in full rupees (not paise)

✅ **AI Director speaks rupees**
- Voice replies say "rupees" not "dollars"
- Budget extraction stores INR directly
- USD input converts with transparency

### Technical Requirements:

✅ **Zero TypeScript errors**
- `npm run build` succeeds
- `npx tsc --noEmit` passes
- All type references updated

✅ **All tests pass**
- 31 test scenarios from Phase 6
- No console errors in browser
- No runtime exceptions

✅ **Data integrity maintained**
- Demo creators re-seeded with consistent INR rates
- Brief budgets align with creator rates
- Proposal prices within brief ranges
- No orphaned USD values

---

## CONCLUSION

This comprehensive audit identified **23 locations** requiring USD→INR conversion across the CineGen application. The phased implementation strategy provides a clear roadmap to:

1. Update type definitions and utilities (30 min)
2. Migrate database schema and seed data (45 min)
3. Update all UI components to display INR (60 min)
4. Configure AI Director for INR (30 min)
5. Update backend APIs and business logic (45 min)
6. Verify with comprehensive testing (60 min)

**Total effort:** ~4.5 hours for complete conversion

**Key Decisions:**
- Storage unit: Full rupees (INTEGER), not paise
- Display format: Indian grouping (₹1,00,000)
- Conversion rate: 83 INR = 1 USD (for legacy data only)
- No USD/INR toggle: INR only

**Next Steps:**
1. Review this plan with team
2. Create database backup
3. Begin Phase 1 implementation
4. Follow checkpoint validation after each phase
5. Complete manual review of ambiguous items
6. Document any deviations from plan

**Local Development Only:**
- All work on localhost:3001
- No git push until verified
- No production database changes
- No payment processing in dev

---

**Document Version:** 1.0  
**Last Updated:** $(date +%Y-%m-%d)  
**Status:** Ready for Implementation ✅

