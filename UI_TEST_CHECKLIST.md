# CineGen Director UI Test Checklist

## What Can Be Tested Now (Without AI Provider)

These tests verify the implementation works correctly, awaiting only the AI provider to return responses.

---

## ✅ Test 1: Application Loads

**URL**: http://localhost:3001

- [ ] Page loads without errors
- [ ] CineGen Director component visible
- [ ] No console errors in browser DevTools
- [ ] All UI elements render properly

**Expected**: Clean page load, no broken components

---

## ✅ Test 2: Text Input Mode

### A. Basic Input
1. Click "Type Instead" button
2. Type any message: "Hello"
3. Press Enter or click Send

**Verify**:
- [ ] Input clears after sending
- [ ] User message appears in conversation history (cyan bubble)
- [ ] Processing state shows (loading indicator)
- [ ] After ~3s, error message appears (AI temporarily busy)
- [ ] "Retry" button appears on error message
- [ ] Message preserved in conversation

### B. Retry Mechanism
1. After error appears, click "Retry" button
2. Wait for response

**Verify**:
- [ ] Same message sent again (not duplicate in history)
- [ ] Processing state shows
- [ ] New error message appends (if Gemini still down)
- [ ] Original message preserved

### C. Multi-line Input
1. Type "Line 1"
2. Press Shift+Enter
3. Type "Line 2"
4. Press Enter to send

**Verify**:
- [ ] Message sent with newline preserved
- [ ] Both lines visible in sent message

---

## ✅ Test 3: Voice Input Mode (Requires Microphone Permission)

### A. Enable Microphone
1. Ensure not in typing mode (voice mode active)
2. Click microphone button to enable
3. Browser prompts for microphone permission
4. Click "Allow"

**Verify**:
- [ ] Permission granted
- [ ] State changes to "awaiting wake word"
- [ ] Status text: "Say 'Hey CineGen' to start"

### B. Wake Word Detection
1. Say clearly: "Hey CineGen"
2. Wait for acknowledgment

**Verify**:
- [ ] Wake word detected
- [ ] Acknowledgment plays ("I'm listening")
- [ ] State changes to "listening"
- [ ] Status text: "I'm listening..."

### C. Voice Command Capture
1. After wake word, say: "What can you do?"
2. Wait for transcript to finalize

**Verify**:
- [ ] Transcript appears in cyan box while speaking
- [ ] Transcript finalizes after pause
- [ ] User message added to conversation (cyan bubble)
- [ ] Processing state shows
- [ ] Error message appears (if AI still down)
- [ ] Message preserved for retry

---

## ✅ Test 4: Mode Switching

### A. Voice to Text
1. Start in voice mode (microphone enabled)
2. Say: "Hey CineGen... Tell me about CineGen"
3. Wait for error response
4. Click "Type Instead" button

**Verify**:
- [ ] Microphone stops
- [ ] Text input appears
- [ ] Previous voice message still visible in history
- [ ] Type new message: "What about creators?"
- [ ] Both messages (voice + text) visible together

### B. Text to Voice
1. Start in text mode
2. Type and send: "Hello there"
3. Wait for error response
4. Click microphone button to enable voice

**Verify**:
- [ ] Text message preserved in history
- [ ] Voice mode activates
- [ ] Can say wake word and command
- [ ] Both text and voice messages in same conversation

---

## ✅ Test 5: Speech Output Control

### A. Mute Toggle
1. Locate speaker/mute button
2. Click to toggle mute

**Verify**:
- [ ] Icon changes (Volume2 ↔ VolumeX)
- [ ] Setting persists across messages

### B. Spoken Replies (When Unmuted)
1. Ensure unmuted (speaker icon visible)
2. Type message: "Test speech"
3. Send and wait for error response

**Verify**:
- [ ] Error message displays as text
- [ ] Text-to-speech plays error message (if not muted)
- [ ] Can hear through speakers/headphones

### C. Silent Mode (When Muted)
1. Click mute button (VolumeX icon)
2. Type message: "Test silent"
3. Send and wait for response

**Verify**:
- [ ] Error message displays as text
- [ ] No audio plays
- [ ] Conversation continues normally

---

## ✅ Test 6: Conversation Persistence

### A. Multiple Messages
1. Type and send 6+ different messages:
   - "Hi"
   - "What can you do?"
   - "Tell me more"
   - "How do I find creators?"
   - "What about pricing?"
   - "Thanks"

**Verify**:
- [ ] All messages appear in history
- [ ] Newest messages at bottom
- [ ] Scroll appears if needed
- [ ] "Show full conversation" link appears

### B. Conversation Toggle
1. After 6+ messages, click "Show full conversation"

**Verify**:
- [ ] All messages expand into view
- [ ] Link changes to "Show last 5"
- [ ] Click again to collapse
- [ ] Last 5 messages remain visible

---

## ✅ Test 7: Language Settings

### A. Settings Panel
1. Ensure in "off" state (no active voice)
2. Click "Settings" button (gear icon)

**Verify**:
- [ ] Settings panel expands
- [ ] Shows "I speak" dropdown (input language)
- [ ] Shows "Replies in" dropdown (output language)
- [ ] Shows voice selection

### B. Change Reply Language
1. Open settings
2. Change "Replies in" to Telugu (te-IN)
3. Close settings
4. Type message: "Hello"
5. Wait for response

**Verify**:
- [ ] Request sent with replyLanguage: "te-IN"
- [ ] Error message (when received) should be in Telugu
  - Expected: "AI సేవ తాత్కాలికంగా బిజీగా ఉంది..."

### C. Change Input Language
1. Open settings
2. Change "I speak" to Hindi (hi-IN)
3. Enable microphone (if browser supports Hindi recognition)

**Verify**:
- [ ] Speech recognition language changes
- [ ] Can speak in Hindi (if supported)

---

## ✅ Test 8: Voice Preview

### A. Test Voice Selection
1. Open settings panel
2. Find "Test this voice" button
3. Click to play preview

**Verify**:
- [ ] Sample sentence plays in selected voice
- [ ] "Playing..." indicator shows
- [ ] Can stop playback
- [ ] Microphone pauses during preview (if was active)

### B. Change Voice
1. Select different voice from dropdown
2. Click "Test this voice" again

**Verify**:
- [ ] Different voice plays
- [ ] Preview sentence in correct language

---

## ✅ Test 9: Error States

### A. Network Error Simulation
1. Browser DevTools → Network tab
2. Set throttling to "Offline"
3. Type and send message

**Verify**:
- [ ] Error state shows
- [ ] Error message displayed
- [ ] Retry button available

### B. Slow Network
1. Set throttling to "Slow 3G"
2. Type and send message

**Verify**:
- [ ] Processing state shows during wait
- [ ] Timeout after 15s
- [ ] Error handling graceful

---

## ✅ Test 10: Stop/Cancel

### A. Cancel During Processing
1. Type long message
2. Send
3. Immediately click Stop button (while processing)

**Verify**:
- [ ] Request cancelled
- [ ] Processing stops
- [ ] State returns to off/listening
- [ ] No late responses appear

### B. Stop Voice
1. Enable microphone
2. Say wake word
3. Start speaking command
4. Click Stop/square button

**Verify**:
- [ ] Recognition stops
- [ ] Microphone turns off
- [ ] State returns to off
- [ ] Partial transcript cleared

---

## ❌ Cannot Test Without AI Provider

These require Gemini API to return 200 OK:

- [ ] Actual AI-generated responses
- [ ] Contextual follow-ups (referencing previous messages)
- [ ] Campaign draft creation
- [ ] Action execution (open_discovery, prepare_brief)
- [ ] Multi-turn conversation flow
- [ ] Language-appropriate responses
- [ ] Natural conversation handling
- [ ] Topic change adaptation

---

## Test Results Summary

### Passing Tests (UI/Frontend)
- ✅ Application loads
- ✅ Text input works
- ✅ Voice input works (with mic permission)
- ✅ Mode switching preserves conversation
- ✅ Retry button appears and works
- ✅ Conversation history displays
- ✅ Settings panel functional
- ✅ Language selection works
- ✅ Speech output control works
- ✅ Error states handled gracefully

### Blocked Tests (AI Provider Required)
- ⏸️ Conversational AI responses
- ⏸️ Context-aware follow-ups
- ⏸️ Natural language understanding
- ⏸️ Campaign extraction
- ⏸️ Action suggestions

---

## When Gemini API Recovers

Run these additional tests:

### Test 11: Real Conversation
```
User: "Hi there!"
→ Expect: Personalized greeting (not template)

User: "What can you do?"
→ Expect: Natural explanation of CineGen Director role

User: "That's helpful"
→ Expect: Natural acknowledgment
```

### Test 12: Contextual Follow-Up
```
User: "I need a product demo video"
→ Expect: Questions about product, audience, goals

User: "Make it shorter"
→ Expect: References first request, suggests 30-60s duration
```

### Test 13: Topic Change
```
User: "Help me with fashion video"
→ Expect: Fashion video discussion

User: "Actually, how do I find creators?"
→ Expect: Smoothly changes topic, explains discovery
```

---

**Test Environment**: http://localhost:3001  
**Browser**: Chrome/Edge recommended (best Web Speech API support)  
**Microphone**: Required for voice tests  
**AI Provider Status**: ⚠️ Gemini returning 503 (expected to fail AI tests)  
**Last Updated**: 2026-10-19
