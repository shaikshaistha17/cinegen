# Voice Assistant Not Working - Troubleshooting Checklist

## What You See in Screenshot
- ✅ CineGen Director card is visible
- ✅ "Talk now" button appears (cyan/blue button)
- ✅ "Stop" button appears (red button)
- ⚠️ Status shows "Ready—say Hey CineGen or tap Talk now"

## Most Likely Issues

### Issue #1: Need to Enable Voice First (MOST LIKELY)
**Problem**: The assistant is in "awaiting_wake" state but you need to enable it first on page load

**Test**:
1. Refresh the page (Cmd+R or Ctrl+R)
2. Look for an **"Enable Voice Assistant"** button (should appear BEFORE "Talk now" button)
3. Click that button FIRST
4. Grant microphone permission when browser asks
5. THEN click "Talk now"

**What's happening**: The component shows "off" state on initial page load. You must:
1. Click "Enable Voice Assistant" → grants mic permission
2. State changes to "awaiting_wake" → shows "Talk now" button
3. Click "Talk now" → state changes to "listening"
4. Speak → gets transcribed

---

### Issue #2: Browser Not Supported
**Symptoms**: Nothing happens when clicking buttons, or errors appear

**Check**: Open browser console (F12), type:
```javascript
console.log("Speech Recognition:", !!(window.SpeechRecognition || window.webkitSpeechRecognition));
console.log("Speech Synthesis:", !!window.speechSynthesis);
console.log("Browser:", navigator.userAgent);
```

**Expected**:
```
Speech Recognition: true
Speech Synthesis: true
Browser: Chrome/...
```

**If false**: Use Chrome browser (best support for Indic languages)

---

### Issue #3: Microphone Permission Denied
**Symptoms**: Error message appears after clicking "Enable Voice Assistant"

**Fix**:
1. Look for browser permission popup at top of window
2. Click "Allow" (not "Block")
3. If you already blocked it:
   - Chrome: Click lock icon in address bar → Site settings → Microphone → Allow
   - Firefox: Click lock icon → Clear permissions → Reload page
   - Safari: Safari menu → Settings → Websites → Microphone → Allow

---

### Issue #4: Component Not Rendering Properly
**Symptoms**: Buttons appear but clicking does nothing

**Check Console** (F12 → Console tab):
Look for red errors like:
```
TypeError: Cannot read properties of undefined
ReferenceError: ... is not defined
```

If you see translation-related errors:
```
TypeError: Cannot read property 'buttonTalkNow' of undefined
```
→ This was fixed in the code but verify localStorage is clear

---

### Issue #5: Recognition Not Starting
**Symptoms**: Button click doesn't change state, no "Listening..." appears

**Check Console logs**:
Should see:
```
[State] off → awaiting_wake
[Recognition] Started
[State] awaiting_wake → listening
[Recognition] Audio capture started
```

If logs are missing → Recognition setup failing

---

## Step-by-Step Test Procedure

### Test 1: Basic Voice Flow (English)
1. Go to http://localhost:3001
2. Scroll to CineGen Director card
3. **Click "Enable Voice Assistant"** button (should be visible on page load)
4. When browser asks: Click "Allow" for microphone
5. Wait 1 second
6. Click "Talk now" (cyan button)
7. Status should change to "Listening..." (with cyan pulsing animation)
8. Speak clearly: "I want to create a video"
9. Watch for transcript to appear in cyan box
10. Response should appear below

**If this works**: Voice is functioning! Move to Telugu test.

**If this doesn't work**: Check which step failed and see Issue #1-5 above.

---

### Test 2: Telugu Conversation (After English Works)
1. Click "Voice & Language Settings" (collapsible panel)
2. Expand settings panel
3. Find "Reply language" dropdown
4. Select **"తెలుగు / Telugu · te-IN"**
5. Observe: ALL UI labels switch to Telugu
6. Click **"టైప్ చేయండి"** button (was "Type instead")
7. Type: `నేను ఒక వీడియో తయారు చేయాలనుకుంటున్నాను`
8. Press Enter
9. **Expected**: Response in Telugu script (not English)

---

### Test 3: Check What State Component Is In

Open Console (F12) and run:
```javascript
// Check if component is mounted
const directorCard = document.querySelector('[aria-label*="CineGen"]');
console.log("Component mounted:", !!directorCard);

// Check localStorage for preferences
const prefs = localStorage.getItem('cinegen_voice_prefs');
console.log("Saved preferences:", prefs ? JSON.parse(prefs) : "none");

// Clear localStorage if corrupted
// localStorage.removeItem('cinegen_voice_prefs');
// location.reload();
```

---

## What "Not Working" Means - Clarify:

**A. Buttons don't respond to clicks?**
→ Check Issue #4 (Component rendering)

**B. Microphone permission denied?**
→ Check Issue #3 (Permissions)

**C. Recognition doesn't start (no "Listening..." state)?**
→ Check Issue #5 (Recognition failing)

**D. English works but Telugu doesn't?**
→ Different issue - test English first

**E. Voice assistant works but response is in English instead of Telugu?**
→ This is the multilingual fix we just implemented - test by typing first

---

## Quick Diagnostic Commands

Run these in browser console (F12):

```javascript
// Test 1: Browser support
console.log({
  speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  speechSynthesis: !!window.speechSynthesis,
  mediaDevices: !!navigator.mediaDevices?.getUserMedia
});

// Test 2: Check mic permission
navigator.permissions.query({ name: 'microphone' })
  .then(result => console.log("Mic permission:", result.state))
  .catch(e => console.log("Cannot check permission:", e));

// Test 3: Manual mic test
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log("✅ Microphone access granted");
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => console.error("❌ Microphone denied:", err));

// Test 4: Check available voices
window.speechSynthesis.getVoices().forEach(v => 
  console.log(`${v.name} (${v.lang})`)
);

// Test 5: Create recognition instance manually
try {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SR();
  recognition.lang = 'en-US';
  recognition.start();
  console.log("✅ Recognition created successfully");
  recognition.stop();
} catch (e) {
  console.error("❌ Recognition failed:", e);
}
```

---

## Report Back

When reporting what's not working, please specify:

1. **Which button did you click**: "Enable Voice Assistant" or "Talk now" or something else?
2. **What happened**: Nothing / Error message / Different behavior / Something else
3. **Browser**: Chrome 120 / Firefox 121 / Safari 17 / etc.
4. **Console errors**: Copy/paste any red errors from console
5. **State**: Does it say "Ready—say Hey CineGen" or "Listening..." or something else?

---

## If Everything Above Works But Telugu Doesn't Respond in Telugu

That's a **separate issue** from "voice not working". That means:
- ✅ Voice IS working (microphone, recognition, TTS)
- ❌ AI response language is wrong

For that issue, test:
1. Type Telugu text (don't use voice)
2. Check if AI responds in Telugu
3. If still English → Gemini prompt needs tuning
4. Check Network tab → POST /api/director/chat → Check response body

---

**Most common issue**: Forgetting to click "Enable Voice Assistant" button BEFORE clicking "Talk now"

Let me know which specific step fails!
