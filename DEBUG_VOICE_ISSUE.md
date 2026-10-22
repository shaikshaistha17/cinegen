# Voice Assistant Debug Guide

## Current Issue
Voice button appears but voice functionality is not working.

## Diagnostic Steps

### 1. Open Browser Console
1. Open http://localhost:3001
2. Press F12 (or Cmd+Option+I on Mac)
3. Click "Console" tab

### 2. Check for JavaScript Errors
Look for any RED error messages in console when:
- Page loads
- You click "Talk now" button
- You try to enable voice

### 3. Common Issues to Check

#### Issue A: Browser Support
**Symptom**: Button appears but clicking does nothing
**Check**: Type in console:
```javascript
!!(window.SpeechRecognition || window.webkitSpeechRecognition)
```
**Expected**: `true`
**If false**: Browser doesn't support speech recognition (use Chrome)

#### Issue B: Microphone Permission
**Symptom**: Button click shows permission denied error
**Check**: Look for browser permission popup at top of window
**Fix**: Click "Allow" when browser asks for microphone permission

#### Issue C: Translation Undefined
**Symptom**: Component crashes, nothing renders
**Check console for**:
```
TypeError: Cannot read properties of undefined (reading 'buttonStop')
```
**Fix**: Translation keys missing - already fixed in code

#### Issue D: Recognition Not Starting
**Symptom**: Button changes but no "Listening..." state
**Check console for**:
```
[Recognition] Started
[Recognition] Audio capture started
```
**If missing**: Recognition setup failing silently

### 4. Manual Test Commands

Open console and run:

```javascript
// Test 1: Check if component is mounted
document.querySelector('[aria-label*="CineGen"]') !== null

// Test 2: Check speech recognition availability
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
console.log("SpeechRecognition available:", !!SR);

// Test 3: Check speech synthesis
console.log("SpeechSynthesis available:", !!window.speechSynthesis);

// Test 4: List available voices
window.speechSynthesis.getVoices().forEach(v => console.log(v.name, v.lang));

// Test 5: Check localStorage for saved preferences
console.log(JSON.parse(localStorage.getItem('cinegen_voice_prefs') || '{}'));
```

### 5. What the Screenshot Shows

Looking at your screenshot:
- ✅ CineGen Director card is visible
- ✅ "Talk now" button is showing
- ✅ UI is rendering correctly
- ❓ Not clear if button is clickable or if there are console errors

### 6. Most Likely Issues

**Based on the code review:**

1. **Missing Error Handler** - FIXED ✅
   - Added proper error handling for speech recognition

2. **Translation Keys** - FIXED ✅  
   - All missing keys added to all 10 languages

3. **Possible Issue: Recognition State Not Updating**
   - If clicking "Talk now" doesn't change button state
   - Check if `setState` calls are working
   - Console should show: `[State] off → listening`

### 7. Quick Fix Test

If clicking "Talk now" does nothing, try:

**Open console and manually trigger:**
```javascript
// Get microphone permission
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(() => console.log("✅ Microphone permission granted"))
  .catch(err => console.error("❌ Microphone denied:", err));
```

### 8. Expected Console Log Pattern (Normal Flow)

When clicking "Talk now", you should see:
```
[State] off → awaiting_wake (timestamp: ...)
[Recognition] Started
[Recognition] Audio capture started
[State] awaiting_wake → listening (timestamp: ...)
```

If you see something different, copy the actual console output.

### 9. Next Steps

**If still not working after checking above:**

1. Take screenshot of browser console
2. Note which button you clicked
3. Note what error messages appear (if any)
4. Check if browser is Chrome (other browsers have limited support)

---

## Quick Test for Telugu

Once voice is working, test Telugu:

1. Click "Voice & Language Settings"
2. Set "Reply language" to "తెలుగు / Telugu"
3. Click "టైప్ చేయండి" (Type instead)
4. Type: `నేను ఒక వీడియో తయారు చేయాలనుకుంటున్నాను`
5. Press Enter
6. Check if response is in Telugu script

---

## Report Format

When reporting the issue, include:

1. **Browser**: Chrome / Firefox / Safari / Edge + version
2. **Operating System**: Windows / Mac / Linux
3. **Console Errors**: Copy/paste any red error messages
4. **Button Clicked**: "Talk now" / "Enable Voice Assistant" / other
5. **What Happened**: Nothing / Error message / Other behavior
6. **Screenshot**: Of console when error occurs

