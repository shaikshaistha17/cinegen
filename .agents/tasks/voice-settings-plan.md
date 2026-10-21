# Implementation Plan: Voice & Language Settings for CineGen Director

## Context
The CineGen Director component (`components/voice/CineGenDirector.tsx`) currently uses a raw voice dropdown with all system voices. This plan implements a structured Voice & Language settings panel with three separate settings: input language for speech recognition, reply language for text responses, and speaking voice filtered by language.

**Project:** Next.js 14.2.35 + React 18 + TypeScript  
**Build:** `npm run build`  
**Verification:** `npm run build` (type checking + linting), manual browser testing on localhost:3001  
**UI Library:** Radix UI primitives, Framer Motion, Lucide React icons, Tailwind CSS  
**Pattern:** Follow existing Radix UI usage (see `ApprovalButton.tsx`, `MessagesTab.tsx` for Dialog/Select patterns)

---

## Implementation Steps

- [ ] 1. **Create language constants and voice filtering utilities**
   
   Add a new file `lib/voice/languages.ts` with:
   - Prioritized language list (English India en-IN, English US, English UK, Telugu te-IN, Hindi hi-IN, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi)
   - Recognition language support detection (using `speechRecognition.lang` availability)
   - Voice filtering by language code with accent grouping
   - Novelty voice blacklist (Bells, Boing, Bubbles, Bad News, Good News, Trinoids, Albert, Cellos, Organ, Wobble, Zarvox)
   - Native-language preview text samples for each supported language
   - Voice identity serialization/deserialization functions (name + lang, not index)
   
   **Files:** Create `lib/voice/languages.ts`  
   **Verify:** `npm run build` passes with no type errors

- [ ] 2. **Add voice settings state to CineGenDirector component**
   
   In `components/voice/CineGenDirector.tsx`, add new state variables:
   - `inputLanguage` (default: "en-IN")
   - `replyLanguage` (default: "en-US")
   - `showSettingsPanel` (boolean for collapsible panel)
   - `showAllVoices` (boolean toggle for novelty voices)
   - `isPreviewPlaying` (boolean)
   - `recognitionWasActiveBeforePreview` (boolean to restore state correctly)
   
   Replace the current `selectedVoice` localStorage persistence with stable identity (name + lang) using the utility from step 1.
   
   Load saved settings from localStorage on mount (`cinegen_input_lang`, `cinegen_reply_lang`, `cinegen_voice_identity`).
   
   **Files:** Modify `components/voice/CineGenDirector.tsx`  
   **Verify:** `npm run build` passes, component renders without errors on localhost:3001

- [ ] 3. **Update speech recognition to use selected input language**
   
   In the `startRecognition` callback:
   - Set `recognition.lang = inputLanguage` (currently hardcoded to "en-US")
   - When `inputLanguage` changes while recognition is active, safely restart recognition: stop current instance, clear refs, update state to "awaiting_wake", then call `startRecognitionRef.current()` after a 100ms delay
   - Add error handling for unsupported language codes (show helpful error message)
   
   **Files:** Modify `components/voice/CineGenDirector.tsx` (startRecognition callback and new useEffect for language change)  
   **Verify:** `npm run build` passes, recognition restarts cleanly when input language changed

- [ ] 4. **Pass replyLanguage to API endpoint**
   
   In `processCampaignIdea` callback:
   - Add `replyLanguage` to the POST body sent to `/api/director/chat`
   
   In `app/api/director/chat/route.ts`:
   - Accept `replyLanguage` parameter in request body
   - Pass it to `generateConversationalResponse` function
   - Update system prompt to include: "Respond in {languageName}. Use natural, conversational {languageName}."
   - Keep English as fallback if replyLanguage is invalid or missing
   
   **Files:** Modify `components/voice/CineGenDirector.tsx`, `app/api/director/chat/route.ts`  
   **Verify:** `npm run build` passes, API accepts new parameter

- [ ] 5. **Implement voice preview with recognition pause/resume**
   
   Add functions:
   - `handlePlayPreview()`: Stop any current preview, get sample text from languages.ts for `replyLanguage`, create utterance with `selectedVoice`, set `utterance.lang = replyLanguage`. Before speaking, check if recognition is active (state is "awaiting_wake" or "listening"), save that boolean to `recognitionWasActiveBeforePreview`, then pause recognition WITHOUT stopping the session (call `recognition.stop()` but keep `recognitionRef.current` intact). Set `isPreviewPlaying = true`. On utterance.onend and utterance.onerror, set `isPreviewPlaying = false`, and if `recognitionWasActiveBeforePreview` is true, restart recognition by calling `startRecognitionRef.current()`.
   - `handleStopPreview()`: Call `speechSynthesis.cancel()`, set `isPreviewPlaying = false`, restore recognition if needed.
   
   **Files:** Modify `components/voice/CineGenDirector.tsx`  
   **Verify:** Preview plays correct language sample, recognition resumes correctly, microphone does NOT activate when previewing from "off" state

- [ ] 6. **Build collapsible Voice & Language settings panel UI**
   
   Below the "Voice Preview" section (when state is "off" and not in typing mode), add a new collapsible panel using Radix Collapsible or a simple show/hide div:
   
   **Panel structure:**
   - Header button: "Voice & Language Settings" with Settings icon (from lucide-react), click toggles `showSettingsPanel`
   - When expanded, show three sections with clear visual separation (border-t between sections):
   
   **Section 1: I speak (input language)**
   - Label: "I speak" with small help text "(language you speak to CineGen)"
   - Dropdown: Language selector filtered to show languages where speech recognition is likely supported (en-*, hi-IN, te-IN, etc.)
   - Display format: "English (India) · en-IN" with a microphone icon if recognition is confirmed supported
   - On change: update `inputLanguage`, save to localStorage, show toast "Input language changed to {name}"
   
   **Section 2: Reply language**
   - Label: "Reply language" with help text "(language for text responses)"
   - Dropdown: Same language list, independent selection
   - Display format: "తెలుగు / Telugu · te-IN"
   - On change: update `replyLanguage`, save to localStorage
   
   **Section 3: Speaking voice**
   - Label: "Speaking voice" with help text "(text-to-speech voice)"
   - Filter `availableVoices` by `replyLanguage` prefix (e.g., if reply is "te-IN", show voices where `voice.lang.startsWith("te")`)
   - If `!showAllVoices`, also filter out novelty voices using blacklist from step 1
   - If no voices match after filtering, show: "No speaking voice available for {languageName}. Text replies will still work."
   - Display format: "English (United Kingdom) · Daniel · Device voice"
   - Preview and Stop preview buttons inline
   - Checkbox: "Show all device voices" to toggle `showAllVoices`
   
   Use Radix Select for dropdowns (follow pattern from `MessagesTab.tsx`), Tailwind styling consistent with existing glassmorphic design (bg-violet-500/5, border-violet-500/20).
   
   **Files:** Modify `components/voice/CineGenDirector.tsx`  
   **Verify:** Panel renders correctly, all three settings are clearly separated and labeled, keyboard navigation works

- [ ] 7. **Handle missing voices gracefully**
   
   When `selectedVoice` is null or filtered voices array is empty for the current `replyLanguage`:
   - In the speaking voice section, show: "No speaking voice available for this language on this device."
   - In `speak()` function, if no `selectedVoice` exists, skip TTS entirely but still show the text message in conversation history
   - Add a small info notice in the message bubble: "(Voice unavailable, text only)"
   
   **Files:** Modify `components/voice/CineGenDirector.tsx`  
   **Verify:** When Telugu/Hindi selected but no voice exists, component shows honest message, text replies work, no silent fallback to English voice

- [ ] 8. **Persist and restore settings correctly**
   
   On component mount:
   - Load `cinegen_input_lang`, `cinegen_reply_lang`, `cinegen_voice_identity` from localStorage
   - Deserialize voice identity (name + lang) and find matching voice in `availableVoices` array
   - If saved voice not found (removed or different device), select first voice matching `replyLanguage` or null
   - If no saved settings, use defaults: en-IN input, en-US reply, first English voice
   
   On settings change:
   - Save each setting immediately to localStorage
   - When replyLanguage changes, check if current selectedVoice still matches new language; if not, auto-select first matching voice or clear to null
   
   **Files:** Modify `components/voice/CineGenDirector.tsx`  
   **Verify:** Settings persist across page refresh, voice selection survives voiceschanged event, changing reply language updates voice options correctly

- [ ] 9. **Add keyboard accessibility and ARIA labels**
   
   - Settings panel toggle button: `aria-label="Voice and language settings"`, `aria-expanded={showSettingsPanel}`
   - Each dropdown: `aria-label` matching visible label ("Select input language", "Select reply language", "Select speaking voice")
   - Preview button: `aria-label="Preview voice pronunciation"`
   - Stop preview button: `aria-label="Stop preview"`
   - Show all voices checkbox: proper label association
   - Ensure tab order flows logically: Settings button → Input language → Reply language → Speaking voice → Preview → Show all toggle
   
   **Files:** Modify `components/voice/CineGenDirector.tsx`  
   **Verify:** Tab navigation works, screen reader announces labels correctly (test with browser dev tools accessibility inspector)

- [ ] 10. **Update existing voice preview to use new structure**
   
   The current "Voice Preview" section (shown when state is "off") should be replaced/merged with the new settings panel. Keep the "Test" button but move it into the "Speaking voice" section of the settings panel.
   
   Remove the old giant voice dropdown that was directly under "Voice Preview".
   
   **Files:** Modify `components/voice/CineGenDirector.tsx`  
   **Verify:** Old dropdown is gone, new settings panel is the only voice configuration UI

- [ ] 11. **Test and handle edge cases**
   
   Add handling for:
   - `voiceschanged` event fires after settings panel already rendered: re-filter voices, re-validate selectedVoice
   - User selects Telugu input language: recognition may fail with "no-speech" or "language-not-supported" error → show specific error message: "Telugu speech recognition is not supported on this device. Try English or use Type instead."
   - Preview interrupted by user clicking Enable voice: cancel preview cleanly, don't let both recognition and preview run
   - Settings panel open when Enable voice clicked: collapse panel, start recognition
   - Mobile layout: ensure settings panel fits in narrow viewport, dropdowns don't overflow
   
   **Files:** Modify `components/voice/CineGenDirector.tsx`  
   **Verify:** All edge cases handled gracefully, no console errors, clear user feedback

- [ ] 12. **Manual testing checklist**
   
   On localhost:3001, test:
   - [ ] Settings panel toggles open/closed
   - [ ] Change input language to English (India), enable voice, say "Hey CineGen", verify recognition works
   - [ ] Change input language to Telugu, enable voice → expect error or prompt to use Type instead (unless device supports it)
   - [ ] Change reply language to Hindi, verify next API response attempts Hindi text (if Gemini supports it)
   - [ ] Select English (UK) voice, preview plays with British accent and correct sample text
   - [ ] Select Telugu reply language with no Telugu voice → "No speaking voice available" shown, text replies still work
   - [ ] Change reply language while voice is enabled → recognition safely restarts with new input language if also changed
   - [ ] Preview while recognition is active → recognition pauses, resumes after preview
   - [ ] Preview while state is "off" → microphone does NOT activate
   - [ ] Toggle "Show all device voices" → Bells, Boing, etc. appear/disappear
   - [ ] Refresh page → settings persist (input lang, reply lang, voice)
   - [ ] Keyboard navigation: Tab through all settings, Enter to open dropdowns, Escape to close
   - [ ] Mobile layout: Settings panel readable, dropdowns usable
   
   **Files:** None (manual testing only)  
   **Verify:** All manual tests pass, document any device-dependent limitations (e.g., "Telugu recognition not available on macOS Chrome")

---

## Design Decisions

1. **Three separate settings instead of inferring input from voice:** Users need explicit control over recognition language because TTS voice availability does not guarantee recognition support. Making input language obvious prevents confusion when speech isn't captured.

2. **Collapsible panel instead of modal:** Settings are contextual to the voice session and may be adjusted frequently. A collapsible panel keeps them accessible without blocking the conversation view.

3. **Native-language preview text:** Demonstrates correct pronunciation and script rendering. Using English samples for non-English voices would mislead users about voice quality.

4. **Pause recognition during preview, don't stop session:** Stopping would reset wake detection state. Pausing lets the user preview without losing their active session state.

5. **Filter voices by reply language, not input:** TTS reads the assistant's replies, which are generated in replyLanguage. Input language is irrelevant to voice selection.

6. **Persist by (name, lang) not index:** Voice array order changes across browsers and OS updates. Stable identity allows reliable restoration.

7. **Curate novelty voices behind toggle:** Professional use case (campaign briefs) doesn't need Zarvox or Bad News. Power users can enable them.

8. **Honest "not available" message instead of silent fallback:** Silently speaking English when user selected Telugu breaks trust. Show limitation honestly, keep text functional.

9. **Restart recognition when input language changes:** Web Speech API requires recognition.lang to be set before start(). Changing it mid-session has no effect; restart is necessary.

10. **Use Radix UI Select for consistency:** Project already uses Radix primitives. Custom dropdowns would add complexity and accessibility burden.

---

## Files Changed

- **Create:** `lib/voice/languages.ts` (language constants, filtering, samples)
- **Modify:** `components/voice/CineGenDirector.tsx` (add settings panel, update recognition/TTS, handle previews)
- **Modify:** `app/api/director/chat/route.ts` (accept replyLanguage parameter, update prompt)

---

## Dependencies

No new dependencies required. Uses existing:
- Radix UI Select (already in package.json: `@radix-ui/react-select`)
- Lucide React icons (`Settings` icon)
- Framer Motion (optional smooth expand/collapse animation)
- Browser APIs: SpeechRecognition, speechSynthesis (already used)

---

## Risks & Mitigations

**Risk:** Telugu/Hindi speech recognition not supported on most browsers.  
**Mitigation:** Show clear error message with specific language name. Offer "Type instead" as fallback. Document limitations in manual test results.

**Risk:** Gemini API may not support reply generation in all languages.  
**Mitigation:** System prompt requests target language but English fallback is acceptable. Test common cases (Hindi, Telugu) and document behavior.

**Risk:** Preview interrupting active recognition causes state confusion.  
**Mitigation:** Explicitly save `recognitionWasActiveBeforePreview` boolean, use it to restore state correctly in preview onend/onerror handlers.

**Risk:** Voice filtering leaves zero voices for a language.  
**Mitigation:** Show "No speaking voice available" UI, keep text replies functional, do NOT attempt TTS.

**Risk:** Settings panel adds visual clutter.  
**Mitigation:** Make it collapsible, collapsed by default, only show when state is "off" (not during active conversation).

---

## Success Criteria

- Three settings are clearly separated and labeled
- Input language defaults to English (India) with obvious way to change
- Changing input language safely restarts recognition without losing conversation history
- Reply language is passed to API and affects response text (observable in Hindi/Telugu test)
- Speaking voice is filtered to match reply language
- No Telugu voice found → honest "not available" message shown
- Preview uses native-language sample, pauses recognition, does NOT activate microphone from "off" state
- Novelty voices hidden by default, accessible via toggle
- Settings persist across refresh
- Keyboard accessible (tab navigation, ARIA labels)
- Build passes (`npm run build` with no type errors)
- Manual testing checklist completed with results documented
