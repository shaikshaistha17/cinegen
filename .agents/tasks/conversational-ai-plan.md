# Implementation Plan: Conversational AI Voice Assistant

**Task**: Upgrade CineGen Director to friendly conversational companion with Siri-like interaction  
**Workspace**: `/Users/shaisthashaik/Desktop/Cinegen/cinegen`  
**Dev Server**: http://localhost:3001  
**Date**: January 21, 2026

---

## Project Context

**Technology Stack**:
- Next.js 14.2.35 (App Router)
- React 18 + TypeScript 5
- Gemini 2.0 Flash AI (via `/lib/ai/briefDrafter.ts`)
- Supabase (auth, database)
- Framer Motion for animations
- Existing voice: Web Speech API (SpeechRecognition + SpeechSynthesis)

**Build & Test**:
- Build: `npm run build` (must pass with 0 TypeScript errors)
- Dev: `npm run dev` (server already running on :3001)
- Test: Manual browser testing (Chrome/Edge for voice support)

**Current State**:
- CineGenDirector.tsx: Working voice/typing modes, wake word detection ("Hey CineGen"), direct `/api/brief` endpoint
- Auth: Available via `/lib/auth-context.tsx` with user display name
- AI: Gemini integration at `/lib/ai/briefDrafter.ts` with fallback
- No conversational AI yet - only single-shot brief generation

**Key Patterns**:
- API routes: `/app/api/[feature]/route.ts` format
- Rate limiting: `checkRateLimit()` from `/lib/ai/rateLimit.ts`
- Gemini calls: Direct fetch to Google API (see briefDrafter.ts)
- Session: Cookie-based (`cinegen_session`)
- Type safety: All types in `/types/index.ts`

---

## Implementation Plan

### Phase 1: Conversational AI Backend

- [ ] **1. Create conversational AI endpoint**
  
  **What**: Create `/app/api/director/chat/route.ts` with POST handler that accepts message + conversation history, calls Gemini for natural conversation, returns structured response with optional campaign draft extraction.
  
  **Files**:
  - CREATE: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/chat/route.ts`
  
  **Details**:
  - Accept: `{ message: string, sessionId: string, conversationHistory: Message[] }` (max 20 messages)
  - Use auth context to get user display name from session cookie (`cinegen_session`)
  - System prompt defines CineGen Director personality: friendly, warm, concise (1-3 sentences), creative brainstorming support, campaign briefing assistance, NOT forcing every message into campaign form
  - Greeting logic: First message with empty history → personalized greeting "Hey [Name]! Welcome to CineGen. What would you like to do?"
  - Natural responses: Support casual greetings ("How are you?"), questions about CineGen, creative brainstorming
  - Campaign extraction: When user indicates readiness ("turn this into a brief", "let's make a campaign"), structure response with `action: "prepare_brief"` and extract `campaignDraft` from conversation
  - Follow-up corrections: When user says "change X to Y", "make it Z instead", modify only relevant draft fields
  - Apply rate limiting: 20 requests per minute per user (via `checkRateLimit`)
  - Timeout: 10 seconds with 2 retry attempts (pattern from briefDrafter.ts)
  - Fallback: On Gemini failure, return honest error message "I'm having trouble connecting right now. Would you like to try typing mode or come back in a moment?"
  - Validation: Response must have `reply` (string), optional `action` (from allowlist), optional `campaignDraft` (Brief-shaped object)
  - Return: `{ reply: string, action?: Action, campaignDraft?: Partial<Brief> }`
  
  **Verify**: 
  ```bash
  npm run build
  # Should compile with 0 TypeScript errors
  
  # Manual API test:
  curl -X POST http://localhost:3001/api/director/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"Hey there","sessionId":"test-123","conversationHistory":[]}'
  # Expected: JSON with greeting reply
  
  curl -X POST http://localhost:3001/api/director/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"How are you?","sessionId":"test-123","conversationHistory":[]}'
  # Expected: Natural casual response, NOT campaign-related
  ```

- [ ] **2. Define conversation types and action allowlist**
  
  **What**: Add TypeScript types for conversation messages, actions, and campaign draft state to `/types/index.ts`. Define strict allowlist of supported actions.
  
  **Files**:
  - MODIFY: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/types/index.ts`
  
  **Details**:
  - Add interface `ConversationMessage { role: "user" | "assistant", text: string, timestamp: number }`
  - Add type `DirectorAction = "open_discovery" | "prepare_brief" | "clear_draft" | "none"`
  - Add interface `CampaignDraft` extending `Partial<Brief>` with additional fields: `userStated: string[]`, `assistantSuggestions: string[]`, `unansweredQuestions: string[]`
  - Add interface `DirectorResponse { reply: string, action?: DirectorAction, campaignDraft?: CampaignDraft }`
  - Document action allowlist in comment: NEVER execute arbitrary URLs, model-generated code, or actions outside this allowlist
  
  **Verify**:
  ```bash
  npm run build
  # Should compile with 0 TypeScript errors
  # Verify types imported correctly in chat route
  ```

---

### Phase 2: Component State Management

- [ ] **3. Add conversation state to CineGenDirector.tsx**
  
  **What**: Add conversation history state (bounded to last 20 messages), campaign draft state, session ID (generated on mount), and replace direct `/api/brief` call with `/api/director/chat`.
  
  **Files**:
  - MODIFY: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx`
  
  **Details**:
  - Add state: `conversationHistory: ConversationMessage[]` (max 20, slice old ones)
  - Add state: `campaignDraft: CampaignDraft | null`
  - Add state: `sessionId: string` (generate with `crypto.randomUUID()` on mount, persist in ref)
  - Update `processCampaignIdea()`: Replace `/api/brief` POST with `/api/director/chat` POST
  - Pass `conversationHistory` and `sessionId` to chat endpoint
  - Handle response: Update conversation history, handle `action` field, update `campaignDraft` if present
  - Greeting detection: If first message and history is empty, endpoint returns greeting
  - Keep existing timing metrics and error handling
  
  **Verify**:
  ```bash
  npm run build
  # Should compile with 0 TypeScript errors
  
  # Browser test:
  # 1. Open http://localhost:3001
  # 2. Enable voice
  # 3. Say "Hey CineGen"
  # Expected: Personalized greeting with display name if signed in
  # 4. Say "How are you?"
  # Expected: Natural response, NOT "I've created a draft brief..."
  ```

- [ ] **4. Implement campaign draft extraction UI**
  
  **What**: Add "Turn this into a brief" button and "Your campaign so far" card component that shows editable draft with user-stated vs assistant suggestions separated, with "Review in brief builder" action.
  
  **Files**:
  - MODIFY: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx`
  
  **Details**:
  - Add button after message history: "Turn this into a brief" (visible when conversation has 2+ user messages and no draft yet)
  - Button action: Sends message "Turn this into a brief" to trigger extraction
  - When `campaignDraft` present, render "Your campaign so far" card with:
    - Objective (editable textarea)
    - Audience (editable input)
    - Content type (select dropdown)
    - Platform (multi-select)
    - Duration (number input with unit)
    - Budget (number input) + Currency (dropdown, default INR, preserve value)
    - Unanswered questions list (read-only, with placeholder if none)
    - Section dividers: "You said:" vs "Suggested:"
    - Edit inline updates `campaignDraft` state
  - "Review in brief builder" button: Saves draft to `sessionStorage` as `cinegen_voice_draft`, navigates to `/briefs/new?from=voice`
  - "Clear draft" button (with confirmation if draft has content)
  - Card styling: Glass morphic, collapsible, with edit icons
  
  **Verify**:
  ```bash
  npm run build
  # Browser test:
  # 1. Voice session with idea: "I need a 15-second Instagram reel about coffee"
  # 2. Click "Turn this into a brief"
  # Expected: Draft card appears with objective, duration=15s, platform includes Instagram
  # 3. Edit duration to 30
  # Expected: State updates immediately
  # 4. Click "Review in brief builder"
  # Expected: Navigates to /briefs/new with draft pre-filled
  ```

- [ ] **5. Implement follow-up correction handling**
  
  **What**: Support conversational corrections like "Make it 15 seconds", "Change budget to 15000 rupees", "Keep everything else", "Start over". Backend modifies only mentioned fields, frontend updates draft card in real-time.
  
  **Files**:
  - MODIFY: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/chat/route.ts`
  - MODIFY: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx`
  
  **Details**:
  - Backend (chat route): When `conversationHistory` includes campaign draft context + new correction message, extract correction intent and return updated `campaignDraft` with ONLY modified fields
  - System prompt includes: "When user corrects a detail, modify ONLY that field and preserve all others. Confirm the change briefly."
  - Frontend: On receiving `campaignDraft` in response, merge with existing draft (spread operator), update UI
  - "Start over" message: Clears `campaignDraft`, confirms action
  - Confirmation on clear: "Are you sure? Your draft will be lost."
  
  **Verify**:
  ```bash
  # Browser test:
  # 1. Create draft: "30-second product video, budget 10000"
  # 2. Draft card shows: duration=30s, budget=10000
  # 3. Say/type: "Actually make it 15 seconds"
  # Expected: Draft updates to duration=15s, budget unchanged
  # 4. Say/type: "Change budget to fifteen thousand rupees"
  # Expected: Draft updates to budget=15000, currency=INR, duration unchanged
  # 5. Say/type: "Start over"
  # Expected: Confirmation prompt, then draft clears
  ```

---

### Phase 3: Enhanced UI & Controls

- [ ] **6. Improve conversation transcript UI**
  
  **What**: Replace basic message list with readable conversation transcript: scrollable, formatted with role badges, timestamps, auto-scroll to latest, expand/collapse for long conversations.
  
  **Files**:
  - MODIFY: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx`
  
  **Details**:
  - Message list: Scrollable div with max height 300px, custom scrollbar styling
  - Each message: Avatar/icon for role (user: microphone icon, assistant: Sparkles), message text, relative timestamp ("just now", "2m ago")
  - Auto-scroll: `useEffect` with `scrollIntoView` on new messages
  - Collapse control: "Show full conversation" / "Show last 5" toggle when > 5 messages
  - Improved contrast: Change muted text from gray-500 to gray-300 for readability
  - Preserve dark theme, mobile responsiveness
  
  **Verify**:
  ```bash
  npm run build
  # Browser test:
  # 1. Have 10-message conversation
  # Expected: Scrollable list, latest message visible, timestamps shown
  # 2. Test on mobile viewport (375px width)
  # Expected: Text wraps, no horizontal scroll, readable contrast
  # 3. Test with reduced motion preference
  # Expected: No animations, immediate scroll
  ```

- [ ] **7. Add visual state indicators and controls**
  
  **What**: Add clear visual states (Listening / Thinking / Speaking), stop speaking button, microphone off button, spoken replies toggle, interrupt button.
  
  **Files**:
  - MODIFY: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx`
  
  **Details**:
  - State labels: Update existing `stateLabels` mapping for clarity
    - "listening" → "Listening..." (with pulsing indicator)
    - "processing" → "Thinking..." (with spinner)
    - "speaking" → "Speaking..." (with sound wave animation)
  - Control panel (visible when session active):
    - "Stop Speaking" button (visible during "speaking" state): Calls `window.speechSynthesis.cancel()`, resumes recognition
    - "Microphone Off" button: Pauses recognition, shows "Microphone paused" state, "Resume" button to continue
    - "Spoken Replies" toggle: Checkbox to enable/disable TTS (updates `isMuted` state inverse)
    - "Interrupt and Speak" button: Cancels TTS, clears queue, immediately starts listening
  - Icon updates: Use Lucide icons (Volume2, VolumeX, Mic, MicOff, Square)
  - Keyboard accessibility: Focus management, Enter key support, aria-labels
  - Preserve existing reduced-motion support
  
  **Verify**:
  ```bash
  npm run build
  # Browser test:
  # 1. Enable voice, trigger speaking state
  # 2. Click "Stop Speaking"
  # Expected: Speech stops immediately, returns to listening
  # 3. Toggle "Spoken Replies" off
  # Expected: Assistant responds via text only, no TTS
  # 4. Click "Interrupt and Speak" during speech
  # Expected: Speech stops, microphone activates
  # 5. Keyboard navigation test: Tab through all controls, press Enter on buttons
  # Expected: All controls operable via keyboard
  ```

---

### Phase 4: Safety & Verification

- [ ] **8. Implement action execution with safety checks**
  
  **What**: Add action execution logic in frontend that validates actions against allowlist, blocks unauthorized actions, requires explicit confirmation for consequential actions.
  
  **Files**:
  - MODIFY: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx`
  
  **Details**:
  - Action handler function: `executeAction(action: DirectorAction, payload?: any)`
  - Allowlist check: `if (!["open_discovery", "prepare_brief", "clear_draft"].includes(action))` → log warning and ignore
  - Action implementations:
    - `open_discovery`: `router.push('/creators')`
    - `prepare_brief`: Store draft in sessionStorage, navigate to `/briefs/new?from=voice`
    - `clear_draft`: Confirmation modal, then clear `campaignDraft` state
  - Blocked actions: Log to console "Action blocked: [action] not in allowlist"
  - Never execute: Arbitrary URLs, code strings, creator profile URLs, publishing actions
  - Apply existing server authorization to all private data (already handled by Supabase RLS)
  
  **Verify**:
  ```bash
  npm run build
  # Browser test:
  # 1. Trigger "open_discovery" action
  # Expected: Navigates to /creators
  # 2. Trigger "prepare_brief" action
  # Expected: Navigates to /briefs/new with draft in sessionStorage
  # 3. Console test: Manually call executeAction('publish_brief')
  # Expected: Console warning logged, no action executed
  # 4. Test with unauthenticated session
  # Expected: Private routes redirect to login (handled by existing middleware)
  ```

- [ ] **9. Add honest error fallback handling**
  
  **What**: When Gemini API unavailable or fails, display honest error message and offer local actions (discovery, typing mode), without presenting canned responses as live AI.
  
  **Files**:
  - MODIFY: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/chat/route.ts`
  - MODIFY: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx`
  
  **Details**:
  - Backend: On Gemini timeout/failure after retries, return: `{ reply: "I'm having trouble connecting to my AI service right now. You can try typing mode, browse our creator discovery, or come back in a moment.", action: "none", error: true }`
  - Frontend: When `error: true` in response, render error state with options:
    - "Switch to Typing Mode" button
    - "Browse Creators" button → `/creators`
    - "Try Again" button
  - Never use canned fallback responses that pretend to be AI conversation
  - Log error to console for debugging (without exposing API keys)
  
  **Verify**:
  ```bash
  # Simulate API failure:
  # 1. Temporarily set GEMINI_API_KEY to invalid value in .env.local
  # 2. Restart dev server
  # 3. Enable voice, send message
  # Expected: Error message with options, "Switch to Typing Mode" button visible
  # 4. Click "Browse Creators"
  # Expected: Navigates to /creators
  # 5. Click "Try Again"
  # Expected: Retries API call
  # 6. Restore valid API key, verify normal operation returns
  ```

- [ ] **10. Final verification and testing**
  
  **What**: Run complete build check, comprehensive browser testing across all requirements, document behavior and limitations.
  
  **Files**:
  - All modified files
  - CREATE: `/Users/shaisthashaik/Desktop/Cinegen/cinegen/.agents/tasks/conversational-ai-verification.md` (test report)
  
  **Test Scenarios**:
  1. **Greeting without forcing briefing**: 
     - Enable voice → "Hey CineGen" → Expect personalized greeting
     - "How are you?" → Expect natural response, NOT campaign prompt
  
  2. **Natural conversation flow**:
     - "I'm stuck on an ad idea" → Expect brainstorming help
     - "What can CineGen do?" → Expect feature explanation
     - Multiple back-and-forth exchanges → Expect maintained context
  
  3. **Campaign idea capture**:
     - "I need a 30-second product video for Instagram" → Natural response
     - "Turn this into a brief" → Draft card appears with extracted details
  
  4. **Draft editing**:
     - Edit duration in draft card → State updates immediately
     - "Make it 15 seconds instead" → Draft updates, other fields preserved
     - "Change budget to 15000 rupees" → Budget updates, currency=INR preserved
  
  5. **Typed/spoken shared context**:
     - Voice: "30-second ad"
     - Switch to typing: "Make it 15 seconds"
     - Expect: Modification applies to same draft
  
  6. **AI unavailable fallback**:
     - Simulate network error
     - Expect: Honest error message, offers typing mode and discovery
  
  7. **Unauthorized action blocking**:
     - Attempt model-generated URL action
     - Expect: Console warning, no navigation
  
  8. **Stop controls**:
     - "Stop Speaking" during TTS → Immediate stop
     - "Interrupt and Speak" → Cancels speech, starts listening
  
  9. **Build check**:
     - `npm run build` → 0 TypeScript errors
  
  10. **Accessibility**:
      - Keyboard navigation through all controls
      - Screen reader announces states
      - Reduced motion respects preference
  
  11. **Mobile viewport**:
      - Test at 375px width
      - All controls accessible
      - Text readable, no horizontal scroll
  
  12. **Text contrast**:
      - Muted text now gray-300 (improved from gray-500)
      - Verify WCAG AA contrast ratio (minimum 4.5:1)
  
  **Limitations to Document**:
  - Not always-on (requires explicit enable click)
  - Not OS-level (works only in browser tab)
  - No background operation when tab inactive
  - No closed-browser voice activation
  - Voice features require Chrome/Edge
  - Microphone permission required
  - Network connection required for AI features
  
  **Verify**:
  ```bash
  npm run build
  # Expected: ✓ Compiled successfully, 0 errors
  
  # Run all test scenarios above
  # Document actual behavior in verification report
  # Note any limitations or known issues
  ```

---

## File Summary

**Files to CREATE**:
1. `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/chat/route.ts` - Conversational AI endpoint
2. `/Users/shaisthashaik/Desktop/Cinegen/cinegen/.agents/tasks/conversational-ai-verification.md` - Test report

**Files to MODIFY**:
1. `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx` - Conversation state, draft UI, controls
2. `/Users/shaisthashaik/Desktop/Cinegen/cinegen/types/index.ts` - Conversation types, action allowlist

**Total**: 2 new files, 2 modified files

---

## Key Design Decisions

1. **Why bounded conversation history (20 messages)?**
   - Prevents context window overflow with Gemini API
   - Keeps request sizes manageable
   - Most conversations resolve within 20 exchanges
   - Older context less relevant anyway

2. **Why NOT use streaming for responses?**
   - Existing backend doesn't support streaming cleanly (per requirements)
   - Gemini 2.0 Flash is fast enough (~1-2s) for good UX
   - Simpler implementation, fewer edge cases
   - Can add streaming later if needed

3. **Why strict action allowlist?**
   - Security: Prevents model from executing arbitrary commands
   - Predictability: UI can handle known actions with proper confirmation
   - Trust: Users know system won't surprise them with unintended actions
   - Maintainability: New actions added deliberately, not discovered in production

4. **Why separate "user stated" vs "assistant suggestions" in draft?**
   - Transparency: Users see what they said vs what AI inferred
   - Trust: Clear attribution of each requirement
   - Editability: Users can reject suggestions easily
   - Compliance: Audit trail for creative decisions

5. **Why NOT auto-save or auto-publish drafts?**
   - User control: All publishing actions require explicit confirmation
   - Safety: Prevents accidental brief publication
   - Expectations: Voice assistant suggests, user decides
   - Matches existing CineGen pattern (briefs/new has manual "Publish" button)

6. **Why preserve INR currency explicitly?**
   - User requirement: "preserve INR" mentioned in task
   - Existing codebase uses USD by default
   - Indian market context evident from creator names/locations
   - Draft must remember currency choice across corrections

7. **Why honest error fallback instead of canned responses?**
   - Trust: Users prefer honesty over fake AI
   - Debugging: Honest errors help users understand what's wrong
   - Alternatives: Offer real actions (typing mode, discovery) instead of pretending
   - Matches existing CineGen pattern (briefDrafter.ts labels fallback source)

8. **Why NOT implement full spoken interruption?**
   - Complexity: Echo cancellation requires advanced audio processing
   - Hardware: Not all mics support full-duplex properly
   - Platform: Web Speech API doesn't provide echo cancellation
   - Compromise: "Interrupt and Speak" button provides explicit control

---

## Risk Mitigation

**Risk**: Gemini API timeout during conversation  
**Mitigation**: 10-second timeout, 2 retries, honest fallback message, "Try Again" button

**Risk**: Conversation history grows unbounded  
**Mitigation**: Bounded to 20 messages, slice oldest on new additions

**Risk**: User expects always-on voice like Siri  
**Mitigation**: Clear documentation, "Off" state by default, no claims of OS-level activation

**Risk**: Action execution bypasses authorization  
**Mitigation**: Action allowlist, existing RLS policies apply to all data access, confirmation for consequential actions

**Risk**: Draft card too complex for mobile  
**Mitigation**: Collapsible sections, responsive design, test at 375px width

**Risk**: TypeScript errors break build  
**Mitigation**: Verify `npm run build` passes after each step

**Risk**: Reduced motion users get poor UX  
**Mitigation**: Preserve existing `prefersReducedMotion` checks, no required animations

**Risk**: Accessibility gaps  
**Mitigation**: Keyboard navigation, aria-labels, focus management, contrast fixes

---

## Success Criteria

✅ Natural greeting without forcing briefing workflow  
✅ Casual conversation works (e.g., "How are you?")  
✅ Typed and spoken input share same conversation context  
✅ Campaign draft extraction UI appears on request  
✅ Follow-up corrections preserve unrelated draft fields  
✅ Missing AI gives honest fallback with real alternatives  
✅ Unauthorized actions blocked and logged  
✅ Build passes with 0 TypeScript errors  
✅ Improved text contrast (gray-300 minimum)  
✅ Mobile viewport works (375px width)  
✅ Keyboard accessibility functional  
✅ Stop controls work without duplicate replies  
✅ Documentation includes actual behavior and limitations  

**NOT claiming**: Always-on, closed-browser, or OS-level voice activation

---

**End of Plan**
