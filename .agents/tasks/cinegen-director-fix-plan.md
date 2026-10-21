# Implementation Plan: CineGen Director Voice Assistant Fixes

## Project Context

**Current State:**
- CineGenDirector component located at `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx`
- Uses browser SpeechRecognition API and SpeechSynthesis for voice interaction
- Fetches `/api/brief` endpoint (exists at `app/api/brief/route.ts`) for brief generation
- Currently "Type instead" button navigates away to `/briefs/new` instead of showing inline input
- Wake word detection checks for "hey cinegen" but likely has pronunciation issues
- Multiple potential delay sources: fixed setTimeout delays, repeated recognition restarts, processing flags
- Session control exists but may have edge cases in pause/resume during TTS

**Tech Stack:**
- Next.js 14.2.35 with App Router
- TypeScript 5.x
- React 18 with Framer Motion for animations
- Lucide React for icons
- No formal test framework configured (no vitest/jest found)
- Build: `npm run build` (next build)
- Dev: `npm run dev` (next dev)
- Lint: `npm run lint` (next lint)

**Verification Commands:**
- Type check: `npm run build` (full Next.js build includes TypeScript check)
- Lint: `npm run lint`
- Manual browser testing required for voice features

---

## Implementation Steps

- [ ] 1. **Add typed input mode UI and state management**
      
      **What:** Add state for `typingMode` (boolean), `typedInput` (string), and modify the UI to show a multiline textarea with Send button when typing mode is active. The textarea should support Enter to send and Shift+Enter for newlines. Include loading state during submission and preserve unsent text on errors.
      
      **Why:** Currently `handleTypeInstead` only calls `router.push("/briefs/new")`, which navigates away. The component must provide an inline typing interface as an alternative to voice input.
      
      **Files:**
      - `components/voice/CineGenDirector.tsx` — add `typingMode` state, `typedInput` state, modify `handleTypeInstead` to toggle mode instead of routing, add textarea rendering in the controls section
      
      **Verify:** Run `npm run build` to check TypeScript compilation. Test in browser at `http://localhost:3000` that clicking "Type instead" shows textarea with Send button, typing text and pressing Enter submits via the same `processCampaignIdea` function, and unsent text remains after error states.

---

- [ ] 2. **Implement typed message submission and chat interface**
      
      **What:** When user submits typed input (Enter key or Send button click), call `processCampaignIdea(typedInput)` to reuse the existing conversation pipeline. Show user messages and assistant responses in the `messages` array (already tracked). Add visual distinction for typed vs. spoken sessions. Keep TTS optional in typed mode (check `typingMode` before calling `speak`). Allow switching back to voice mode via a "Use voice" button when in typed mode.
      
      **Why:** Typed and spoken inputs should use the same backend (`/api/brief`), but typed mode should work without microphone permission and without forcing audio playback of responses.
      
      **Files:**
      - `components/voice/CineGenDirector.tsx` — add `handleSendTyped` function, modify `speak` to check `typingMode` and skip TTS if true, add conditional button to toggle back to voice mode
      
      **Verify:** Run `npm run build`. In browser, type a campaign idea and submit. Confirm the message appears in the chat history, the API request is made to `/api/brief`, the response appears as assistant message, and no TTS plays. Switch back to voice mode and verify microphone can be re-enabled.

---

- [ ] 3. **Fix brand pronunciation with SSML/phonetic variants and voice preview**
      
      **What:** Separate displayed text ("CineGen") from spoken text. When speaking the brand name, use phonetic variants or SSML markup to encourage "SIH-nee-jen" pronunciation. Test multiple spellings like "Sinny-jen", "Cinnagen", or SSML `<phoneme>` tags if supported by browser's SpeechSynthesis. Add a "Voice Preview" dropdown control showing available voices with a "Test" button that speaks "Hey, welcome to CineGen" using selected voice. Store user's voice choice in component state or localStorage. Handle voices loading asynchronously via `speechSynthesis.getVoices()` with event listener for `voiceschanged`.
      
      **Why:** TTS engines often mispronounce "CineGen" as "sin-jen". SSML or phonetic spelling can guide correct pronunciation. Voice preview lets the user hear and choose the best-sounding voice.
      
      **Files:**
      - `components/voice/CineGenDirector.tsx` — add `selectedVoice` state, `availableVoices` state, useEffect to load voices, modify `speak` function to use selected voice and phonetic brand name replacement, add voice preview UI with dropdown and test button
      
      **Verify:** Run `npm run build`. In browser, open the component and check that voice dropdown populates with available voices. Click "Test" to hear the pronunciation of "CineGen". Enable voice assistant and trigger a welcome message to confirm the selected voice and pronunciation are used.

---

- [ ] 4. **Normalize wake word detection to support variants**
      
      **What:** Update the wake word detection logic to normalize spacing, punctuation, and case. Accept "hey cinegen", "hey cine gen", "hey cine-gen", "hey cin gen" as valid triggers. Use a regex or string normalization (remove punctuation, collapse multiple spaces, lowercase) to match flexibly. Do NOT trigger on sentences containing "cinema" unless they also have "hey" preceding it closely.
      
      **Why:** Users may naturally say the wake phrase with pauses or different spacing. Brittle exact-match detection causes frustration. However, false positives on "cinema" would be disruptive.
      
      **Files:**
      - `components/voice/CineGenDirector.tsx` — replace `currentText.includes("hey cinegen")` with a function `isWakePhrase(text: string)` that normalizes and checks for variants
      
      **Verify:** Run `npm run build`. In browser, say "hey cine gen" (with pause), "hey cine-gen", "hey cinegen", and verify all trigger. Say "I love cinema" or "cinema is great" and verify they do NOT trigger. Check console logs or UI state changes to confirm detection.

---

- [ ] 5. **Add timing instrumentation for performance measurement**
      
      **What:** Create a timing tracker object in component state or refs to record timestamps for: (1) Enable click → recognition started, (2) Wake detected → acknowledgement TTS starts, (3) End of user command (final transcript) → API fetch starts, (4) API fetch starts → first response text visible, (5) Response ready → TTS starts. Log timing deltas to console (do NOT log conversation content or audio). Use `performance.now()` for high-resolution timestamps.
      
      **Why:** Objective timing data is needed to identify bottlenecks and validate optimizations. Logging must exclude sensitive content.
      
      **Files:**
      - `components/voice/CineGenDirector.tsx` — add `timingRef` (useRef), instrument key events (handleEnableVoice start, recognition.onresult final, fetch start/end, speak start), console.log timing metrics
      
      **Verify:** Run `npm run build`. In browser, enable voice, say wake phrase, give a command. Open browser console and confirm timing logs appear with labels and millisecond deltas. Verify no conversation content is logged, only timing metadata.

---

- [ ] 6. **Remove unnecessary delays and optimize request handling**
      
      **What:** Audit the component for fixed delays (setTimeout with arbitrary waits), repeated initialization (multiple new SpeechRecognition instances), duplicate event handlers (multiple `onresult` or `onend` listeners), excessive debounce (if any). Remove or reduce these. Ensure only one API request is active at a time by canceling stale fetch requests using AbortController. Cancel queued TTS on new user input via `speechSynthesis.cancel()`. Do NOT add fake progress animations. Ensure greeting ("I'm listening") and simple controls like "stop", "mute", "repeat that" are handled locally without AI roundtrip (check transcript for these keywords and handle in component).
      
      **Why:** Arbitrary delays and repeated setup increase latency. Multiple concurrent requests waste resources. Fake animations mislead users. Local handling of simple commands reduces roundtrip time.
      
      **Files:**
      - `components/voice/CineGenDirector.tsx` — remove/reduce timeouts, add AbortController for fetch, add local command handler for "stop"/"mute"/"repeat", ensure single recognition instance lifecycle
      
      **Verify:** Run `npm run build`. In browser, test voice session and confirm no artificial delays between wake detection and acknowledgement. Say "stop" and verify it stops locally without API call. Submit a command, then immediately give another command and verify the first request is canceled (check Network tab in DevTools for aborted requests).

---

- [ ] 7. **Preserve command after wake phrase in single utterance**
      
      **What:** If user says "Hey CineGen, find video creators" in one continuous utterance, the current code detects wake, sets `wakeWordDetectedRef.current = true`, clears transcript, and speaks acknowledgement. The remainder ("find video creators") arrives in subsequent `onresult` events. Ensure that after wake detection, the component continues listening and accumulates the final transcript as the user's command, rather than discarding everything after the wake phrase.
      
      **Why:** Users expect to speak the entire command in one breath. Discarding the command portion after wake detection breaks this flow.
      
      **Files:**
      - `components/voice/CineGenDirector.tsx` — modify wake detection logic to extract and preserve text after "hey cinegen" in the same result event, or ensure subsequent final transcripts are captured as the command
      
      **Verify:** Run `npm run build`. In browser, say "Hey CineGen, I need a thirty second ad for shoes" in one continuous sentence. Verify the assistant processes "I need a thirty second ad for shoes" as the command, not just an empty or truncated message.

---

- [ ] 8. **Ensure recognition pauses during TTS and resumes correctly**
      
      **What:** Verify that `utterance.onstart` stops recognition, and `utterance.onend` restarts recognition only if `state !== "off"`. Check that `recognition.stop()` is called in try-catch to handle already-stopped state. Add a flag or state check to prevent restart loops if recognition.onend fires and immediately restarts, causing rapid on/off cycling.
      
      **Why:** Self-triggering (assistant hearing its own voice) is a critical bug. Infinite restart loops degrade UX and waste resources.
      
      **Files:**
      - `components/voice/CineGenDirector.tsx` — audit `utterance.onstart`, `utterance.onend`, `utterance.onerror`, `recognition.onend`, `recognition.onerror` handlers; add state guards to prevent restart loops
      
      **Verify:** Run `npm run build`. In browser, enable voice, trigger a response, and observe Network/Console logs. Confirm recognition stops during TTS playback and resumes after. Trigger multiple responses in sequence and verify no rapid restart loops occur (check for repeated "recognition started" console logs in short time).

---

- [ ] 9. **Improve session control and error recovery**
      
      **What:** Ensure microphone access is not requested before user clicks "Enable voice". Add explicit stop on page hidden (already exists, verify it works). Add explicit stop on component unmount (already exists, verify it works). In `recognition.onerror`, handle "not-allowed" (permission denied), "no-speech" (silence), "network" (connectivity), and other errors gracefully. For "no-speech", restart recognition. For "not-allowed", set error state and do NOT restart. For other errors, log and attempt restart once, then stop to avoid infinite loops. Add a "retry" button in error state to re-enable voice. Ensure typed fallback is always visible, even in error states.
      
      **Why:** Users must have control over when microphone is accessed. Unhandled errors lead to bad UX. Infinite retry loops drain battery and confuse users.
      
      **Files:**
      - `components/voice/CineGenDirector.tsx` — audit `recognition.onerror`, add error-specific handling, add retry counter or flag to prevent infinite restarts, ensure "Type instead" button is always available
      
      **Verify:** Run `npm run build`. In browser, deny microphone permission and verify error message shows and recognition does NOT restart. Re-enable and test. Trigger a "no-speech" error (long silence) and verify recognition restarts once. Trigger an unknown error and verify component stops gracefully with retry option.

---

- [ ] 10. **Add click-to-talk and keep typed fallback always available**
      
      **What:** Add a "Push to talk" or "Click to talk" button that appears when voice is enabled, allowing the user to manually trigger listening for a single command without relying on wake word. This button should temporarily set state to "listening" and capture one final transcript, then return to "awaiting_wake". Keep the "Type instead" button visible in all non-off states (not just off) so users can switch to typing mid-session without stopping the voice session.
      
      **Why:** Wake word detection can fail or be inconvenient in noisy environments. Push-to-talk is a reliable fallback. Typed input should always be an escape hatch.
      
      **Files:**
      - `components/voice/CineGenDirector.tsx` — add `handleClickToTalk` function, add button in controls when state is "awaiting_wake", keep "Type instead" button always visible (not just when state === "off")
      
      **Verify:** Run `npm run build`. In browser, enable voice, reach "awaiting_wake" state, click "Click to talk" button, speak a command without saying wake word, and verify it is captured and processed. Confirm "Type instead" button is visible and functional in all states.

---

- [ ] 11. **Preload and prepare speech synthesis voices**
      
      **What:** Call `speechSynthesis.getVoices()` on component mount and whenever `voiceschanged` event fires (some browsers load voices asynchronously). Store voices in state. When user selects a voice, store the choice in localStorage for persistence across sessions. When `speak` is called, set `utterance.voice` to the selected voice if available, improving consistency and reducing first-speak delay.
      
      **Why:** First TTS call can have delay if voices aren't loaded. Preloading and caching the user's choice reduces latency and improves consistency.
      
      **Files:**
      - `components/voice/CineGenDirector.tsx` — add useEffect for voices, localStorage read/write for selected voice, set `utterance.voice` in `speak` function
      
      **Verify:** Run `npm run build`. In browser, select a voice, refresh the page, and verify the same voice is still selected. Enable voice and trigger TTS; confirm the selected voice is used (listen to audio characteristics).

---

- [ ] 12. **Show interim transcription without repeated submissions**
      
      **What:** Display interim transcript results immediately in the UI (`transcript` state is already shown) to provide feedback. However, do NOT submit interim results to the `/api/brief` endpoint. Only submit when `event.results[i].isFinal` is true and the transcript length exceeds a threshold (current code checks `cleanIdea.length > 10`, keep or adjust). Ensure interim display updates smoothly without causing re-renders that disrupt input.
      
      **Why:** Interim transcription shows the user what is being recognized, improving perceived responsiveness. Submitting unstable interim results would spam the API and generate incorrect briefs.
      
      **Files:**
      - `components/voice/CineGenDirector.tsx` — verify `setTranscript(currentText)` is called for all results, verify `processCampaignIdea` is only called with `finalTranscript` that is final and long enough
      
      **Verify:** Run `npm run build`. In browser, enable voice, say wake word, then speak a long command slowly. Observe the transcript area updating word-by-word (interim). Verify the API request is only sent once when speech ends (final result), not repeatedly during speech. Check Network tab to confirm single request.

---

- [ ] 13. **Add mobile responsiveness and accessibility**
      
      **What:** Ensure the component renders correctly on mobile screens (already uses Tailwind responsive classes). Add ARIA labels to all interactive buttons (`aria-label` for icon-only buttons). Ensure keyboard navigation works (tab order, Enter to activate buttons). Add `role="status"` or `aria-live="polite"` to status text and transcript areas for screen reader announcements. Test with keyboard only (no mouse) to verify all functions are accessible.
      
      **Why:** Voice assistant is a complex interaction; accessibility and mobile support are critical for inclusive UX.
      
      **Files:**
      - `components/voice/CineGenDirector.tsx` — add `aria-label` to buttons, `aria-live` to status/transcript, verify focus-visible styles, test keyboard navigation
      
      **Verify:** Run `npm run build`. In browser, use Tab to navigate through all buttons and verify focus indicators. Use Enter/Space to activate buttons. Use browser DevTools accessibility inspector to check ARIA labels. Test on mobile device or responsive mode; verify touch targets are adequate and layout does not break.

---

- [ ] 14. **Final integration test and performance verification**
      
      **What:** Perform end-to-end test of all four required fixes: (1) Click "Type instead" → see textarea → type message → send → see response, (2) Select a voice → hear "CineGen" pronounced correctly, (3) Review console timing logs and confirm reduced delays compared to baseline, (4) Enable voice → hide page → return → verify session stopped. Document any browser-specific issues (Chrome vs Safari vs Edge). If timing measurements show specific bottlenecks, note them for potential further optimization.
      
      **Why:** Integration testing validates that all individual fixes work together without regressions. Performance data confirms optimization success.
      
      **Files:**
      - `components/voice/CineGenDirector.tsx` — no code changes, testing only
      
      **Verify:** Run `npm run build` and `npm run dev`. Test in Chrome, Safari, and/or Edge. Document browser support matrix. Record timing metrics before and after optimizations. Verify all acceptance criteria from the task description are met. Write a brief test report in `/Users/shaisthashaik/Desktop/Cinegen/cinegen/.agents/tasks/cinegen-director-test-report.md`.

---

## Acceptance Criteria

All items below must be verified before considering the task complete:

1. **Type instead works inline:** Clicking "Type instead" shows a multiline textarea with Send button. Typed messages are sent to `/api/brief`, responses appear in chat, no navigation away from component.
2. **Brand pronunciation:** "CineGen" is pronounced "SIH-nee-jen" (or as close as possible) using selected voice and phonetic variants. Voice preview control allows testing and selection.
3. **Reduced delays:** Timing logs show measurable reduction in key metrics (Enable→Ready, Wake→Ack, Command→Request, Request→Response, Response→TTS). No arbitrary fixed delays remain. Simple commands handled locally.
4. **Robust session control:** Microphone only accessed after "Enable voice" click. Recognition pauses during TTS. Recognition stops on Stop button, page hidden, unmount. No infinite restart loops. Typed fallback always available.
5. **Wake word variants:** "hey cinegen", "hey cine gen", "hey cine-gen", "hey cin gen" all trigger (case-insensitive, flexible spacing). "cinema" alone does NOT trigger.
6. **Command preservation:** Saying "Hey CineGen, find video creators" in one utterance processes "find video creators" as command, not discarded.
7. **Build succeeds:** `npm run build` completes without TypeScript or lint errors.
8. **Browser testing:** Manual verification in Chrome (and Safari/Edge if available) confirms all features work as expected.

---

## Notes

- No formal test framework is configured. Verification relies on `npm run build` for type checking and manual browser testing for runtime behavior.
- Voice features are browser-dependent. Chrome/Edge have best SpeechRecognition support. Safari support is limited.
- Timing instrumentation will log to console. Actual latency depends on user's hardware, network, and browser.
- Do NOT claim guaranteed response times or hide latency with fake progress. Be honest about measured performance.
- The `/api/brief` endpoint already exists and supports both typed and spoken input (it receives `{ idea: string }` and returns `{ brief, source, aiLabeled, preservedIdea }`).
- Preserve all existing functionality (hero replacement, existing state transitions, error handling, Review brief button, etc.).

