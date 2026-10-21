# Conversational AI Review

**Review Date**: January 21, 2026  
**Reviewer**: Code Review Agent  
**Commit**: Conversational AI upgrade  

## Build Evidence

**Build Command**: `npm run build`  
**Result**: ✓ Compiled successfully, 0 TypeScript errors  
**Source**: Commit message and verification report (.agents/tasks/conversational-ai-verification.md)

## Requirements Review

### 1. ✅ Endpoint Creation (Requirement 1)
**Required**: New /api/director/chat endpoint using Gemini, proper error handling, rate limiting, bounded context

**Evidence**:
- Created: `app/api/director/chat/route.ts` (line 1-169)
- Gemini 2.0 Flash integration: Line 78-169
- Rate limiting: Line 37-46 (20 requests/min per user via checkRateLimit)
- Bounded context: Line 49 (slices to last 20 messages)
- Timeout: Line 113 (10 seconds)
- Retries: Line 102 (2 attempts)
- Error handling: Line 153-164 (honest fallback)
- Server-side only: API key from process.env (line 79)

**Verdict**: ✅ PASS

### 2. ✅ Greeting Behavior (Requirement 2)
**Required**: Friendly welcome, personalization with display name if available, greet once per session

**Evidence**:
- Personalized greeting: `app/api/director/chat/route.ts` lines 84-86
  ```typescript
  const greeting = displayName 
    ? `Hey ${displayName}! Welcome to CineGen. What would you like to do?`
    : "Hey! Welcome to CineGen. What would you like to do?";
  ```
- Display name extraction: Lines 27-35 (from cinegen_session cookie)
- First message detection: Line 128 (`isFirstMessage = history.length === 0`)
- Greeting triggered: Line 135 (conditional prompt instruction)
- Greet once: System prompt line 97 states "First message with empty history: respond with greeting"

**Verdict**: ✅ PASS

### 3. ✅ Natural Conversation Support (Requirement 3)
**Required**: Casual greetings work, brainstorming works, questions work, campaign briefing works, don't force every message into campaign form

**Evidence**:
- System prompt (lines 88-96) explicitly states:
  - "Don't force every conversation into a campaign brief"
  - Defines conversation modes: casual, creative brainstorming, campaign briefing, follow-up corrections
  - "If user says 'How are you?' or similar, respond naturally. Don't push campaign creation."
- One clarification at a time: Line 93 "Ask ONE clarification at a time"
- Concise replies: Line 90 "1-3 sentences per response"
- Natural personality: Line 89 "Warm, concise, and conversational"

**Verdict**: ✅ PASS

### 4. ⚠️ PARTIAL - Idea Capture (Requirement 4)
**Required**: "Turn this into a brief" UI visible, editable card shows all fields correctly, preserves INR/amounts, separates user-stated from suggestions, transfers to /briefs/new, never auto-saves

**Evidence**:
- "Turn this into a brief" button: `components/voice/CineGenDirector.tsx` lines 927-938
  - ✅ Visible when: `messages.filter(m => m.role === "user").length >= 2 && !campaignDraft`
  - ✅ Sends message to trigger extraction
  
- Editable card: Lines 941-1040
  - ✅ Shows campaignTitle (editable input, lines 947-956)
  - ✅ Shows objective (editable textarea, lines 958-968)
  - ✅ Shows contentType (select dropdown, lines 970-985)
  - ✅ Shows durationSeconds (number input, lines 987-997)
  - ✅ Shows budgetMin/budgetMax (number inputs, lines 999-1018)
  - ✅ Shows unansweredQuestions (read-only list, lines 1020-1028)
  - ❌ Does NOT show separation of user-stated vs assistant suggestions
  - ❌ Does NOT show or preserve currency field (INR vs USD)
  - ❌ Does NOT show audience field (not in Brief schema)
  - ❌ Does NOT show platform field (aspectRatios exists, but no "platform" per se)

- Transfer to /briefs/new: Lines 1032-1038
  - ✅ "Review in brief builder" button
  - ✅ Calls `executeAction("prepare_brief")`
  - ✅ Action handler (lines 210-212) stores draft in sessionStorage → navigates to `/briefs/new?from=voice`
  - ✅ Brief builder loads draft (app/briefs/new/page.tsx lines 94-116)

- Never auto-saves: ✅ Confirmed - no automatic save/publish code found

**Blockers**:
1. **BLOCKER**: Missing user-stated vs assistant suggestions separation in UI
   - **Location**: `components/voice/CineGenDirector.tsx` lines 941-1040 (campaign draft card)
   - **Expected**: Card should have sections labeled "You said:" and "Suggested:" showing userStated and assistantSuggestions arrays
   - **Actual**: Card shows only merged draft fields with no attribution
   - **Consequence**: Users cannot distinguish their requirements from AI inferences, reducing trust and violating transparency requirement
   - **Fix**: Add sections rendering `campaignDraft.userStated` and `campaignDraft.assistantSuggestions` arrays

2. **BLOCKER**: Currency not preserved (INR/amounts requirement)
   - **Location**: `types/index.ts` Brief interface (line 150-175) lacks currency field; draft card lines 999-1018 has no currency dropdown
   - **Expected**: Draft card should show currency dropdown (INR/USD), preserve user's choice, pass to brief builder
   - **Actual**: No currency field in Brief type, no currency UI in draft card
   - **Consequence**: "15000 rupees" mentioned by user will lose currency context, may default incorrectly to USD
   - **Fix**: Either add currency to Brief type and UI, or document that system uses USD-only with INR→USD conversion

3. **Note**: "Audience" and "platform" mentioned in requirement but not in Brief schema
   - The Brief type has `objective` (which can include audience) and `aspectRatios` (which implies platforms)
   - This appears to be requirement language mismatch with actual schema
   - Not blocking if objective captures audience and aspectRatios captures platform intent

**Verdict**: ⚠️ CHANGES_REQUESTED (Blockers 1-2)

### 5. ✅ Context & Corrections (Requirement 5)
**Required**: Follow-ups modify only relevant fields, history passed to AI, draft updates real-time, confirms before clearing

**Evidence**:
- History passed: `components/voice/CineGenDirector.tsx` line 282 sends `conversationHistory` to API
- Bounded to 20 messages: Lines 261, 295 (slices to last 20)
- AI modifies only relevant fields: `app/api/director/chat/route.ts` system prompt lines 95-96
  ```typescript
  "When user says 'change X to Y' or 'make it Z instead', modify ONLY the mentioned field and preserve everything else"
  ```
- Real-time updates: Lines 300-304 merge draft with spread operator
  ```typescript
  setCampaignDraft(prev => ({
    ...prev,
    ...data.campaignDraft
  }));
  ```
- Confirmation before clearing: Lines 222-224 in executeAction
  ```typescript
  if (confirm("Are you sure? Your draft will be lost.")) {
    setCampaignDraft(null);
  }
  ```

**Verdict**: ✅ PASS

### 6. ✅ Real Actions Only (Requirement 6)
**Required**: Allowlist enforced, no arbitrary URL/code execution, no invented profiles, existing auth applied, consequential actions require confirmation

**Evidence**:
- Action allowlist defined: `types/index.ts` line 253
  ```typescript
  export type DirectorAction = "open_discovery" | "prepare_brief" | "clear_draft" | "none";
  ```
- Allowlist enforcement: `components/voice/CineGenDirector.tsx` lines 204-209
  ```typescript
  const allowedActions: DirectorAction[] = ["open_discovery", "prepare_brief", "clear_draft"];
  if (!allowedActions.includes(action)) {
    console.warn(`[Security] Action blocked: ${action} not in allowlist`);
    return;
  }
  ```
- No URL execution: ✅ Confirmed - no `window.location`, `router.push` with dynamic URLs, or `eval()` found
- No code execution: ✅ Confirmed - no `eval()`, `Function()`, or dynamic code found
- Auth applied: Existing Supabase RLS (not modified), session from cookie (line 28-35 of chat route)
- Confirmation required: Line 222 (clear_draft requires confirm())
- Actions logged: Line 207 console.warn for blocked actions

**Verdict**: ✅ PASS

### 7. ⚠️ PARTIAL - Interface Improvements (Requirement 7)
**Required**: All existing features preserved, new transcript UI readable, states clear, controls present, contrast improved, mobile/dark-light/reduced-motion preserved

**Evidence**:
- Existing features preserved:
  - ✅ Voice orb: Lines 793-843
  - ✅ Voice selection: Lines 162-179, 761-778
  - ✅ Typing mode: Lines 1042-1086
  - ✅ Timing metrics: Lines 38-46, 195-200, 271-276, 410-425

- New transcript UI: Lines 901-925
  - ✅ Scrollable (max-h-64)
  - ✅ Avaticons (User icon / Sparkles)
  - ✅ Role labels ("Director" / "You")
  - ✅ Expand/collapse (lines 916-922, shows last 5 vs all)

- Clear states: Lines 847-855
  - ✅ "Listening..." (line 855)
  - ✅ "Thinking..." (line 854)
  - ✅ "Speaking..." (line 856)
  - ✅ Visual indicators (pulsing dot, lines 858-861)

- Controls present:
  - ✅ Stop speaking: Lines 1105-1117
  - ✅ Interrupt and speak: Lines 1120-1133
  - ✅ Mute/unmute toggle: Lines 1137-1148
  - ✅ Type instead: Lines 1150-1157
  - ✅ Review brief: Lines 1159-1168
  - ✅ Stop button: Lines 1170-1179

- Contrast improved:
  - ⚠️ NEEDS VERIFICATION: Claim is gray-300 minimum (was gray-500)
  - Muted text appears at: lines 748, 863, 918, 1182, 1187
  - ❌ Line 748: `text-muted-foreground/90` (not explicitly gray-300)
  - ❌ Line 863: `text-gray-400` (label text)
  - ✅ Line 918: `text-cyan-400` (not muted)
  - ❌ Line 1182: `text-muted-foreground` (not explicitly gray-300)
  - ❌ Line 1187: `text-muted-foreground/70` (even lower opacity)
  - **Issue**: Contrast improvement claim not verified - still using `text-muted-foreground` which may be gray-500

- Mobile/dark/light/reduced-motion:
  - ✅ Preserved: `useReducedMotion` hook (line 32), `prefersReducedMotion` in orbVariants (line 798)
  - ✅ Glass morphic preserved: Lines 781-782
  - ✅ Responsive: No fixed widths, uses flex/grid

**Blockers**:
4. **BLOCKER**: Contrast improvement not applied correctly
   - **Location**: `components/voice/CineGenDirector.tsx` throughout (lines 748, 863, 1182, 1187)
   - **Expected**: Muted text should use gray-300 minimum for WCAG AA compliance (claimed in verification report)
   - **Actual**: Still using `text-muted-foreground` and `text-gray-400` which may be gray-500 or lighter
   - **Consequence**: Low contrast text may fail WCAG AA (4.5:1 ratio), reducing readability for users with vision impairments
   - **Fix**: Replace `text-muted-foreground` with `text-gray-300` or verify that muted-foreground resolves to gray-300 in theme

**Verdict**: ⚠️ CHANGES_REQUESTED (Blocker 4)

### 8. ✅ Component Architecture (Requirement 8)
**Required**: States added correctly, session ID generated, /api/director/chat integrated, extraction UI added, action execution safe, TTS interruption works

**Evidence**:
- States added: Lines 95-96 (conversationHistory, campaignDraft)
- Session ID generated: Line 99 (`useState(() => crypto.randomUUID())`)
- Endpoint integrated: Lines 267-327 (processCampaignIdea calls /api/director/chat)
- Extraction UI: Lines 941-1040 (campaign draft card)
- Action execution: Lines 202-231 (executeAction with allowlist)
- TTS interruption: Lines 1105-1133 (stop speaking and interrupt buttons)

**Verdict**: ✅ PASS

### 9. ✅ Build Passes (Requirement 9)
**Required**: npm run build succeeded with 0 TypeScript errors

**Evidence**:
- Verification report states: "✓ Compiled successfully, 0 TypeScript errors"
- Commit message states: "npm run build: ✓ Compiled successfully, 0 TypeScript errors"
- No type errors in new files (checked via successful build)

**Verdict**: ✅ PASS

### 10. ✅ No New Features Beyond Requirements (Requirement 10)
**Required**: All existing functionality preserved

**Evidence**:
- Voice orb preserved
- Voice selection with preview preserved
- Typing mode preserved
- Timing instrumentation preserved
- Wake word detection preserved
- Error handling preserved
- TTS controls preserved
- No unrelated features added

**Verdict**: ✅ PASS

## Summary of Blockers

### BLOCKER 1: Missing User-Stated vs Suggestions Separation
**Location**: `components/voice/CineGenDirector.tsx` lines 941-1040  
**File**: Campaign draft card UI  
**Requirement**: "Separate user-stated from assistant suggestions" (Requirement 4)  
**Issue**: Draft card shows only merged fields, no "You said:" vs "Suggested:" sections  
**Evidence**: Types define `userStated` and `assistantSuggestions` arrays (types/index.ts:255-256) but component doesn't render them  
**Consequence**: Users cannot distinguish their explicit requirements from AI inferences, violating transparency and trust requirement  
**Fix**: Add UI sections showing:
```tsx
{campaignDraft.userStated && campaignDraft.userStated.length > 0 && (
  <div>
    <label className="text-xs font-semibold text-green-400">You said:</label>
    <ul className="text-xs text-gray-300 list-disc list-inside">
      {campaignDraft.userStated.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  </div>
)}
{campaignDraft.assistantSuggestions && campaignDraft.assistantSuggestions.length > 0 && (
  <div>
    <label className="text-xs font-semibold text-violet-400">Suggested:</label>
    <ul className="text-xs text-gray-300 list-disc list-inside">
      {campaignDraft.assistantSuggestions.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  </div>
)}
```

### BLOCKER 2: Currency Not Preserved (INR/Amounts)
**Location**: `types/index.ts` line 150-175 (Brief interface); `components/voice/CineGenDirector.tsx` lines 999-1018 (budget inputs)  
**Requirement**: "Preserve INR/amounts" (Requirement 4)  
**Issue**: No currency field in Brief type, no currency dropdown in draft card  
**Evidence**: User can say "15000 rupees" but draft only stores numbers without currency context  
**Consequence**: Currency information lost between voice capture and brief creation, may default incorrectly to USD  
**Fix Options**:
1. **Add currency to Brief type and UI** (breaking change, requires DB migration):
   ```typescript
   // types/index.ts
   export interface Brief {
     // ... existing fields
     currency?: 'USD' | 'INR' | 'EUR' | 'GBP';
   }
   ```
   ```tsx
   // Draft card - add currency dropdown
   <select value={campaignDraft.currency || 'USD'} onChange={...}>
     <option value="USD">USD ($)</option>
     <option value="INR">INR (₹)</option>
   </select>
   ```
2. **Document USD-only with conversion** (simpler, non-breaking):
   - System prompt instructs AI to convert INR to USD (e.g., "15000 rupees" → budgetMin: 180 USD)
   - Document in UI that budgets are in USD
   - Less transparent but avoids schema change

Recommend Option 1 if currency support is important for Indian market, Option 2 if quick fix acceptable.

### BLOCKER 3: Contrast Improvement Not Applied
**Location**: `components/voice/CineGenDirector.tsx` lines 748, 863, 1182, 1187  
**Requirement**: "Improve the current panel's muted text contrast" (Requirement 6, original message)  
**Issue**: Still using `text-muted-foreground` and `text-gray-400`, not explicitly gray-300  
**Evidence**: 
- Line 748: `text-muted-foreground/90`
- Line 863: `text-gray-400`
- Line 1182: `text-muted-foreground`
- Line 1187: `text-muted-foreground/70`
- Verification report claims "Gray-300 minimum (was gray-500)" but code doesn't reflect this
**Consequence**: If muted-foreground resolves to gray-500 or lighter, contrast ratio may fail WCAG AA (4.5:1), harming accessibility  
**Fix**: Replace with explicit gray-300:
```tsx
// Line 748
- className="text-center text-sm text-muted-foreground/90 mb-6"
+ className="text-center text-sm text-gray-300 mb-6"

// Line 863 (labels can stay gray-400, are not body text)
// Line 1182
- className="text-xs text-center text-muted-foreground mt-4"
+ className="text-xs text-center text-gray-300 mt-4"

// Line 1187
- className="text-xs text-center text-muted-foreground/70 mt-4"
+ className="text-xs text-center text-gray-300 mt-4"
```
Or verify that theme defines muted-foreground as gray-300 and update verification report to reflect actual value.

## Non-Blocking Observations

1. **Currency Handling in System Prompt**: The API system prompt (app/api/director/chat/route.ts:121) says "Preserve currency (INR if mentioned, USD default)" and "15000 rupees = budgetMin: 15000, not converted" but without a currency field, this preservation is incomplete.

2. **Audience/Platform Language Mismatch**: Original requirement mentions "audience" and "platform" but Brief schema has neither. The `objective` field can capture audience, and `aspectRatios` array implies platforms. This appears to be requirement wording vs schema mismatch, not an implementation bug.

3. **Manual Testing Required**: Verification report correctly notes that voice/microphone functionality requires manual browser testing, which is appropriate.

4. **No Streaming**: Requirement states "Stream responses only if backend supports it cleanly" - implementation correctly uses non-streaming approach (fetch with await).

## Verdict

**CHANGES_REQUESTED**

Three blockers must be resolved:
1. Add user-stated vs assistant suggestions separation in draft card UI
2. Add currency field and UI OR document USD-only approach
3. Fix contrast by using gray-300 explicitly for muted text

Build passes, security is sound, conversation logic is correct, and most UI features work as specified. The blockers relate to transparency (user-stated vs suggestions), data preservation (currency), and accessibility (contrast).
