# CineGen Director Unified Handler Test Plan

## Test Matrix: Voice vs Text Inputs

All features must work through BOTH voice and text inputs using the shared handler.

---

## Test 1: Greeting
**Input:** "Hi" or "Hello"  
**Expected:** Display greeting with user's name (if logged in), speak it if enabled

### Voice Test
- [ ] Say "Hi" → Greeting appears in conversation
- [ ] Greeting is spoken back (if not muted)
- [ ] Recognition continues listening after greeting
- [ ] **UNVERIFIED** - Requires manual microphone testing

### Text Test
- [ ] Type "Hi" → Greeting appears in conversation
- [ ] Greeting is spoken if "Spoken replies" enabled
- [ ] Greeting is NOT spoken if muted
- [ ] Text input remains available
- ✅ **VERIFIED** - Can be tested with `curl` or typing

**Test Command (Text):**
```bash
curl -X POST http://localhost:3001/api/director/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi","sessionId":"test1","conversationHistory":[],"replyLanguage":"en-US"}'
```

**Expected Response:**
```json
{
  "reply": "Hey! Welcome to CineGen. What would you like to do?",
  "action": "none"
}
```

---

## Test 2: Get Started Navigation
**Input:** "Get started" or "Get start"  
**Expected:** Acknowledge and navigate to `/discovery`

### Voice Test
- [ ] Say "Get started" → "Opening creator discovery for you!" response
- [ ] Page navigates to discovery
- [ ] Response is spoken
- [ ] **UNVERIFIED** - Requires manual microphone testing

### Text Test
- [ ] Type "Get started" → Response appears
- [ ] Page navigates to `/discovery`
- [ ] Response spoken if enabled
- ✅ **CAN VERIFY** - Type in text mode

**Local Command:** Works offline (no Gemini API call needed)

---

## Test 3: Farewell
**Input:** "Good night" or "Goodbye"  
**Expected:** Display farewell, speak it, stop microphone but keep text available

### Voice Test
- [ ] Say "Good night" → Farewell message appears
- [ ] Farewell is spoken
- [ ] Microphone stops after 3 seconds (waiting for speech to complete)
- [ ] Text input remains visible and functional
- [ ] **UNVERIFIED** - Requires manual microphone testing

### Text Test
- [ ] Type "Good night" → Farewell appears
- [ ] Farewell spoken if enabled
- [ ] Text mode stays active
- [ ] Can continue typing after farewell
- ✅ **CAN VERIFY** - Type in text mode

**Local Command:** Works offline

---

## Test 4: General AI Questions
**Input:** Any question not matching local commands  
**Expected:** Use Gemini API, respect reply language, show errors honestly

### Voice Test
- [ ] Say "Create a video about sustainability" → AI response
- [ ] Response in selected reply language (e.g., Telugu)
- [ ] Response is spoken
- [ ] If API fails: Show error "The AI service is temporarily busy..." with Retry button
- [ ] **UNVERIFIED** - Requires manual microphone testing

### Text Test
- [ ] Type "Create a video about sustainability" → AI response
- [ ] Response in selected reply language
- [ ] Response spoken only if "Spoken replies" enabled
- [ ] If API fails: Error shown in text with Retry button
- ✅ **CAN VERIFY** - Type in text mode

**Current Status:** Gemini API returns 503 errors, so error handling can be verified

---

## Test 5: Multilingual Support

### Telugu (te-IN)
**Voice Test:**
- [ ] Set reply language to Telugu
- [ ] Say "Hi" → Greeting in Telugu: "నమస్కారం! మీరు ఏమి చేయాలనుకుంటున్నారు?"
- [ ] **UNVERIFIED** - Requires microphone

**Text Test:**
- [ ] Set reply language to Telugu
- [ ] Type "Hi" → Greeting in Telugu
- ✅ **CAN VERIFY**

### Hindi (hi-IN)
**Voice Test:**
- [ ] Set reply language to Hindi
- [ ] Say "Namaste" → Greeting in Hindi: "नमस्ते! आप क्या करना चाहते हैं?"
- [ ] **UNVERIFIED** - Requires microphone

**Text Test:**
- [ ] Set reply language to Hindi
- [ ] Type "Namaste" → Greeting in Hindi
- ✅ **CAN VERIFY**

### Marathi (mr-IN)
**Voice Test:**
- [ ] Set reply language to Marathi
- [ ] Say "Namaskar" → Greeting in Marathi: "नमस्कार! तुम्हाला काय करायचे आहे?"
- [ ] **UNVERIFIED** - Requires microphone

**Text Test:**
- [ ] Set reply language to Marathi
- [ ] Type "Namaskar" → Greeting in Marathi
- ✅ **CAN VERIFY**

---

## Test 6: Text Mode Requirements

### Input Behavior
- [ ] "Type instead" button opens text input
- [ ] Microphone pauses when typing mode enabled
- [ ] Enter key sends message
- [ ] Shift+Enter adds newline
- [ ] Send button visible and functional
- [ ] Text never requires microphone permission
- ✅ **CAN VERIFY**

### Draft Preservation
- [ ] Type partial message
- [ ] Switch to voice mode
- [ ] Switch back to text
- [ ] Draft text is preserved
- ✅ **CAN VERIFY**

### Reply Display
- [ ] Replies shown in text even if audio fails
- [ ] Conversation scrolls automatically
- [ ] Long messages wrap correctly
- ✅ **CAN VERIFY**

---

## Test 7: Voice Mode Requirements

### Microphone Control
- [ ] Explicit microphone button to start
- [ ] Captured transcript shown during speech
- [ ] Each finalized utterance submitted once (no duplicates)
- [ ] Assistant speech not transcribed back
- [ ] **UNVERIFIED** - Requires microphone

### Speech Prevention
- [ ] Set recognition to pause during assistant speech
- [ ] Speech synthesis `onstart` stops recognition
- [ ] Speech synthesis `onend` resumes recognition
- [ ] **UNVERIFIED** - Requires manual testing

---

## Test 8: Mode Switching

### Voice → Text
- [ ] Click "Type instead"
- [ ] Microphone stops
- [ ] Text input appears
- [ ] Conversation preserved (no duplicates)
- [ ] Previous messages visible
- [ ] **PARTIALLY VERIFIED** - Button exists, behavior testable

### Text → Voice
- [ ] Click microphone button
- [ ] Text input hidden
- [ ] Voice interface appears
- [ ] Conversation preserved
- [ ] No duplicate messages
- [ ] **UNVERIFIED** - Requires microphone permission

### No Simultaneous Submissions
- [ ] Typing while voice active → voice takes priority
- [ ] Speaking while processing text → queued or ignored
- [ ] ✅ **CODE VERIFIED** - `isProcessingRef` prevents concurrent requests

---

## Test 9: Spoken Replies Toggle

### Independent Control
- [ ] Mute icon visible in UI
- [ ] Clicking toggles `isMuted` state
- [ ] When muted: Text responses shown, no speech
- [ ] When unmuted: Text shown AND spoken
- [ ] Works in both voice and text modes
- ✅ **CAN VERIFY** - Toggle UI exists

### Behavior
- [ ] Type "Hi" while muted → Greeting shown, not spoken
- [ ] Type "Hi" while unmuted → Greeting shown AND spoken
- [ ] Say "Hi" (voice always speaks regardless of toggle for own input)
- [ ] **PARTIALLY VERIFIED** - Logic implemented, audio unverified

---

## Test 10: Offline Resilience

### Local Commands During Gemini Outage
- [ ] Type "Hi" → Greeting works (no API call)
- [ ] Type "Get started" → Navigation works (no API call)
- [ ] Type "Good night" → Farewell works (no API call)
- [ ] Type general question → Honest error message with Retry
- ✅ **CAN VERIFY** - Local commands don't call API

### Error Handling
- [ ] API 503 error → "The AI service is temporarily busy. Please try again shortly."
- [ ] Retry button available
- [ ] User's message preserved for retry
- [ ] Error shown in text, spoken if enabled
- ✅ **VERIFIED** - 503 errors tested with mocks

---

## Automated vs Manual Tests

### ✅ Automated / Code-Verifiable (No Microphone)
1. Text input → greeting (local command)
2. Text input → navigation (local command)
3. Text input → farewell (local command)
4. Text input → API call (with mock or real)
5. Multilingual greetings (text input)
6. Error handling (503 responses)
7. Mode switching UI (buttons exist)
8. Conversation history preservation
9. Draft preservation on mode switch
10. Concurrent request prevention (`isProcessingRef`)

### ❌ Requires Manual Microphone Testing
1. Voice input → greeting (spoken)
2. Voice input → navigation (spoken)
3. Voice input → farewell (spoken + mic stop)
4. Voice input → AI response (spoken)
5. Transcript capture accuracy
6. Speech-to-text finalization
7. Assistant not transcribing itself
8. Microphone button activation
9. Voice mode → text mode transition
10. Audio playback verification

---

## Summary

**Text Mode:** Fully verifiable without microphone  
**Voice Mode:** Requires manual testing with actual microphone and audio output  
**Shared Handler:** Implemented, text path testable  
**Local Commands:** Work offline, testable  
**API Integration:** Returns expected errors (503 during outage)  

**Status:** Implementation complete, voice/audio functionality marked **UNVERIFIED** pending manual testing.
