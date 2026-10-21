# CineGen Director Component Fix Report

**Date:** October 19, 2026  
**Component:** `/components/voice/CineGenDirector.tsx`  
**Status:** ✅ All fixes implemented and build verified

---

## Summary of Changes

Fixed 4 major issues in the CineGen Director voice assistant component while preserving the current hero replacement (Shaistha card already removed).

---

## 1. FIX "TYPE INSTEAD" - ✅ IMPLEMENTED

### Root Cause
The "Type instead" button was calling `router.push("/briefs/new")`, which navigated away from the component instead of showing an inline text input interface.

### Changes Made
- Added `typingMode` state (boolean) to track typing vs. voice mode
- Added `typedInput` state (string) to store user's typed text
- Modified `handleTypeInstead()` to toggle `typingMode` instead of navigating
- Stops voice recognition when switching to typing mode
- Added multiline textarea component with auto-focus
- Implemented `handleSendTyped()` to submit typed messages via same `/api/brief` pipeline
- Added `handleTypedKeyDown()` to handle Enter (send) vs Shift+Enter (newline)
- Unsent text is preserved in state - survives errors and allows retry
- TTS responses are skipped in typing mode (respects `typingMode` flag in `speak()`)
- Added "Use voice instead" button to switch back from typing mode
- Message history shows both typed and spoken conversations
- Loading state shows spinner in textarea during processing

**Verification:** 
- TypeScript compiles without errors
- Browser testing needed: Click "Type instead" → verify textarea appears with focus → type message → press Enter → verify it sends

---

## 2. FIX BRAND PRONUNCIATION - ✅ IMPLEMENTED

### Problem
Browser TTS engines mispronounce "CineGen" (often as "sin-jen" instead of intended "SIH-nee-jen")

### Changes Made
- Created `getPhoneticText()` helper that replaces "CineGen" with "Sinny-Jen" for TTS
- Display text still shows "CineGen" everywhere
- Speech text uses phonetic variant automatically
- Added voice loading with `voiceschanged` event listener for async voice availability
- Added `availableVoices` state array
- Added `selectedVoice` state
- Implemented voice persistence via localStorage (`cinegen_voice` key)
- Added Voice Preview UI section (shows when `state === "off"` and not in typing mode):
  - Dropdown to select from available voices
  - "Test" button that speaks: "Hey, welcome to CineGen. I'm ready to help you create your campaign."
  - Shows voice name and language code
- Defaults to first English voice if none selected
- All `speak()` calls now use selected voice via `utterance.voice`

### Wake Word Detection Improvements
- Created `isWakePhrase()` helper with normalization:
  - Removes punctuation: `[.,!?;:-]`
  - Collapses multiple spaces
  - Case-insensitive comparison
- Supports variants:
  - "hey cinegen"
  - "hey cine gen"
  - "hey cine-gen"
  - "hey cin gen"
  - "hey sinegen" (common mispronunciation)
  - "hey sine gen"
- Does NOT trigger on sentences containing "cinema" without "hey" prefix

**Verification:**
- Build passes
- Browser testing needed: Select different voices → click Test → verify pronunciation → say wake variants → verify detection

---

## 3. MEASURE AND REDUCE DELAYS - ✅ IMPLEMENTED

### Performance Instrumentation
Added `TimingMetrics` interface and `timingRef` to track:
1. Enable click → Recognition ready
2. Wake detected → Acknowledgement TTS starts
3. Command end → Request start
4. Request start → Response ready
5. Response ready → TTS start

All timing logs use `performance.now()` for high-resolution timestamps and log to console with format:
```
[Timing] Enable click → Recognition ready: 234ms
[Timing] Wake detected → Acknowledgement start: 15ms
[Timing] Command end → Request start: 8ms
[Timing] Request start → Response ready: 1843ms
[Timing] Response ready → TTS start: 12ms
```

**No conversation content or audio is logged** - only timing metadata.

### Optimizations Implemented
1. **Request cancellation:** Added `AbortController` to cancel stale API requests when new one starts
2. **Local command handling:** Simple commands handled without API roundtrip:
   - "stop", "cancel", "quit" → calls `handleStop()`
   - "mute", "be quiet" → sets `isMuted = true`
   - "unmute", "speak" → sets `isMuted = false` and speaks confirmation
3. **Voice preloading:** Voices loaded on mount and stored in state
4. **Interim transcription:** Shows immediately for feedback but only submits final results
5. **Single recognition instance:** Cleaned up before creating new one
6. **Removed duplicate handlers:** Each handler only attached once
7. **Error retry limits:** `errorRetryCountRef` prevents infinite loops:
   - "no-speech" errors: max 3 retries
   - Other errors: max 1 retry
   - "not-allowed" errors: no retry (999 flag)

### Command Preservation After Wake Phrase
Fixed: If user says "Hey CineGen, find video creators" in one utterance, the command "find video creators" is now preserved.

**Implementation:**
- After wake detection, extracts text after wake phrase using regex
- If extracted command > 5 characters, preserves it in transcript
- Next final result processes the preserved command
- No longer clears transcript immediately after wake detection

**Verification:**
- Build passes
- Browser testing needed: Check console for timing logs → say "Hey CineGen, [command]" in one breath → verify command is processed

---

## 4. SESSION CONTROL - ✅ IMPLEMENTED

### Microphone Access Control
- No microphone access before explicit "Enable voice" click
- Permission requested via `navigator.mediaDevices.getUserMedia()` only when user clicks button

### Recognition Pause During TTS
- `utterance.onstart` stops recognition to prevent self-triggering
- `utterance.onend` resumes recognition if session still active and not in typing mode
- `utterance.onerror` also resumes recognition

### Stop Conditions
- **Explicit Stop button:** Calls `handleStop()` which:
  - Stops recognition
  - Cancels speech synthesis
  - Aborts pending API requests
  - Resets all state and refs
- **Page hidden:** `visibilitychange` event listener calls `handleStop()`
- **Component unmount:** useEffect cleanup calls stop functions

### Infinite Loop Prevention
- `errorRetryCountRef` limits retries (see section 3)
- Recognition restart check uses refs instead of state to avoid stale closures
- `isProcessingRef` prevents concurrent API requests
- Removed state checks from setTimeout callbacks (TypeScript errors fixed)

### Always-Available Fallbacks
- "Type instead" button visible in all states (not just "off")
- Keyboard shortcut works even during voice session
- Typed mode works without microphone permission

**Verification:**
- Build passes
- Browser testing needed: Enable voice → hide tab → return → verify stopped → deny mic permission → verify error and no restart loop

---

## Build Verification

```bash
npm run build
```

**Result:** ✅ SUCCESS
- 0 TypeScript errors
- 44 pages generated
- Only ESLint warnings (exhaustive-deps - non-blocking)
- Bundle size: First Load JS 87.4 kB

---

## Files Changed

1. **`/components/voice/CineGenDirector.tsx`**
   - Added typing mode UI and state management
   - Added voice selection and preview
   - Added timing instrumentation
   - Added local command handling
   - Improved wake word detection
   - Fixed command preservation after wake phrase
   - Improved error handling and retry logic
   - Added request cancellation

**Lines changed:** ~800 lines (major refactor)

---

## Browser Testing Checklist

### Typing Mode (Priority 1 - was broken)
- [ ] Click "Type instead" → textarea appears with focus
- [ ] Type message and press Enter → sends to API
- [ ] Shift+Enter adds newline without sending
- [ ] Loading state shows during processing
- [ ] Error preserves unsent text for retry
- [ ] Response appears in message history without TTS
- [ ] "Use voice instead" button switches back
- [ ] Typed mode works without mic permission

### Voice Pronunciation (Priority 2)
- [ ] Voice dropdown populates with available voices
- [ ] Click "Test" → hear "Hey, welcome to CineGen"
- [ ] Pronunciation sounds like "SIH-nee-jen" (or close)
- [ ] Selected voice persists across page refresh
- [ ] Wake word detection accepts variants:
  - [ ] "hey cinegen"
  - [ ] "hey cine gen" (with pause)
  - [ ] "hey cine-gen"
  - [ ] "hey cin gen"
- [ ] Does NOT trigger on "I love cinema" (no "hey" prefix)

### Performance & Timing (Priority 3)
- [ ] Open browser console
- [ ] Enable voice → see timing log for "Enable click → Recognition ready"
- [ ] Say wake phrase → see timing log for "Wake detected → Acknowledgement"
- [ ] Give command → see timing logs for request/response cycle
- [ ] Say "Hey CineGen, [command]" in one breath → verify command processed
- [ ] Say "stop" → voice stops without API call
- [ ] Say "mute" → TTS stops

### Session Control (Priority 4)
- [ ] Mic access not requested until "Enable voice" clicked
- [ ] During TTS, recognition pauses (check console or try interrupting)
- [ ] After TTS, recognition resumes
- [ ] Hide page → return → verify session stopped
- [ ] Deny mic permission → verify error message and no restart loop
- [ ] Click Stop button → everything stops cleanly
- [ ] "Type instead" available during voice session

---

## Known Limitations

1. **Voice pronunciation:** TTS pronunciation varies by browser and installed voices. "Sinny-Jen" is an approximation; actual pronunciation depends on selected voice engine.

2. **Speech recognition accuracy:** Browser SpeechRecognition API accuracy varies. Best support in Chrome/Edge; limited in Safari.

3. **Wake word detection:** Not a dedicated wake-word engine. Uses transcript matching, so may occasionally miss or false-trigger.

4. **Streaming responses:** Not implemented. The `/api/brief` endpoint returns complete response. Streaming would require backend changes.

5. **Voice features browser-specific:** 
   - Chrome/Edge: Full support
   - Safari: Limited support
   - Firefox: No support for SpeechRecognition

---

## Next Steps

1. **Browser testing:** Test all items in checklist above
2. **Measure actual timings:** Record baseline metrics in console
3. **User acceptance:** Verify pronunciation acceptable with selected voice
4. **Mobile testing:** Test on mobile devices (touch targets, keyboard behavior)
5. **Accessibility audit:** Test with keyboard only, verify ARIA labels with screen reader

---

## Success Criteria - Status

✅ **"Type instead" shows inline text input** - Implemented, build verified  
✅ **Typed messages use same pipeline as voice** - Implemented  
✅ **Brand pronunciation improved with voice selection** - Implemented  
✅ **Wake word detection accepts variants** - Implemented  
✅ **Timing instrumented for 5 key metrics** - Implemented  
✅ **Command preservation after wake phrase** - Implemented  
✅ **Local command handling (stop, mute)** - Implemented  
✅ **Request cancellation prevents stale requests** - Implemented  
✅ **Session control prevents infinite loops** - Implemented  
✅ **Build passes with 0 errors** - Verified  
⏳ **In-browser testing** - Awaiting verification  
⏳ **Measured timing improvements** - Awaiting verification

---

## Testing Instructions

The dev server is running at **http://localhost:3001**

1. Open browser to http://localhost:3001
2. Click "Type instead" to verify typing mode works
3. Type a campaign idea and press Enter
4. Click "Use voice instead" and test voice selection
5. Open DevTools Console to see timing logs
6. Test wake word variants
7. Say "Hey CineGen, [command]" in one breath
8. Test "stop" and "mute" local commands

Report any issues with specific reproduction steps.
