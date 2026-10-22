# CineGen Director - Multilingual Conversation Testing Guide

**Date**: 2024-01-19  
**Status**: Implementation Complete, Manual Testing Required  
**Environment**: Localhost only (http://localhost:3001)

---

## Quick Start

```bash
cd /Users/shaisthashaik/Desktop/Cinegen/cinegen
npm run dev
# Open http://localhost:3001 in Chrome
# Navigate to CineGen Director (voice assistant)
```

---

## What Was Fixed

### Root Cause
The assistant responded in English regardless of language selection because:
1. **Weak AI prompt**: Gemini received only `"Respond in {language}"` - a single line it ignored
2. **Hardcoded UI**: All buttons, labels, and messages were English-only strings
3. **No translation infrastructure**: No way to switch UI language dynamically

### The Solution
1. **Strengthened Gemini prompt** with emphatic multilingual instructions, native-script examples, and conditional logic
2. **Created complete translation system** (`lib/voice/translations.ts`) with 40+ strings × 10 languages = 400+ translations
3. **Connected translations throughout UI** - every label, button, error message now switches dynamically

---

## Testing Checklist

### ✅ Test 1: Telugu Text Conversation (Easiest - No mic needed)

**Steps:**
1. Open Voice & Language Settings panel
2. Set "Reply language" dropdown to **"తెలుగు / Telugu · te-IN"**
3. Observe: ALL UI labels instantly switch to Telugu
4. Click **"టైప్ చేయండి"** button (was "Type instead")
5. Type in Telugu script: **"నేను ఒక వీడియో తయారు చేయాలనుకుంటున్నాను"**
   - Translation: "I want to create a video"
6. Press Enter to send

**Expected Results:**
- ✅ UI shows **"ఆలోచిస్తున్నాను..."** (Thinking...)
- ✅ Assistant responds in Telugu using Telugu script (తెలుగు characters)
- ✅ Response is conversational, not just a translation

**Failure Indicators:**
- ❌ Response is in English
- ❌ Response is transliterated Telugu (using Latin letters like "Namaskaram")
- ❌ UI labels still show English

---

### ✅ Test 2: Hindi Text Conversation

**Steps:**
1. Set "Reply language" to **"हिन्दी / Hindi · hi-IN"**
2. Verify UI switches to Devanagari script labels
3. Click **"टाइप करें"** (Type instead)
4. Type in Hindi: **"मैं एक वीडियो बनाना चाहता हूं"**
5. Press Enter

**Expected:**
- Response in Hindi using Devanagari script (not Latin transliteration)

---

### ✅ Test 3: Marathi Text Conversation

**Steps:**
1. Set "Reply language" to **"मराठी / Marathi · mr-IN"**
2. Type in Marathi: **"मी व्हिडिओ तयार करू इच्छितो"**
3. Press Enter

**Expected:**
- Response in Marathi Devanagari script

---

### ✅ Test 4: Language Switching Mid-Conversation

**Steps:**
1. Start conversation in Telugu (send 2-3 messages)
2. Open settings panel
3. Change "Reply language" to Hindi
4. Continue conversation

**Expected:**
- UI labels switch to Hindi immediately
- Next assistant response is in Hindi (not Telugu)
- Conversation context is preserved (assistant remembers previous exchanges)

---

### ✅ Test 5: Telugu Voice Conversation (Requires microphone + Chrome)

**Prerequisites:**
- Chrome browser (best speech recognition support)
- Working microphone
- Microphone permissions granted

**Steps:**
1. Set "I speak" to **"తెలుగు / Telugu · te-IN"**
2. Set "Reply language" to **"తెలుగు / Telugu · te-IN"**
3. Click **"వాయిస్ అసిస్టెంట్ ప్రారంభించండి"** (Enable Voice Assistant)
4. Grant microphone permission when prompted
5. Click **"ఇప్పుడు మాట్లాడండి"** (Talk now) button
6. Speak clearly in Telugu: **"నమస్కారం! నేను ఒక వీడియో క్యాంపెయిన్ సృష్టించాలనుకుంటున్నాను"**
   - Translation: "Hello! I want to create a video campaign"

**Expected:**
- Telugu transcript appears in cyan box (interim results)
- Final transcript finalized when you stop speaking
- Status shows **"ఆలోచిస్తున్నాను..."** (Thinking)
- Assistant responds in Telugu
- If Telugu TTS voice available on your OS: response is spoken aloud in Telugu

**Note:** Telugu speech recognition works best in Chrome. Firefox/Safari may not support Telugu.

---

### ✅ Test 6: Hindi Voice Conversation

**Steps:**
1. Set both "I speak" and "Reply language" to **"हिन्दी / Hindi · hi-IN"**
2. Click **"वॉयस असिस्टेंट शुरू करें"** (Enable Voice)
3. Click **"अभी बात करें"** (Talk now)
4. Speak in Hindi: **"नमस्ते! मुझे एक शॉर्ट वीडियो चाहिए"**

**Expected:**
- Hindi transcript appears
- Hindi response using Devanagari script
- TTS speaks Hindi (if device voice available)

---

### ✅ Test 7: Missing TTS Voice (Bengali Example)

**Steps:**
1. Set "Reply language" to **"বাংলা / Bengali · bn-IN"**
2. Click **"ভয়েস অাসিস্টেন্ট শুরু করুন"** (Enable Voice)
3. Observe voice dropdown

**Expected:**
- Warning message appears: **"এই ডিভাইসে বাংলা এর জন্য কোন কথা বলার কণ্ঠস্বর উপলব্ধ নেই।"**
  - Translation: "No speaking voice available for Bengali on this device."
- Additional message: **"পাঠ্য উত্তরগুলি এখনও কাজ করবে।"** (Text replies will still work.)
- Text conversation still functions normally (graceful degradation)

---

### ✅ Test 8: English Conversation (Regression Test)

**Steps:**
1. Set "Reply language" to **"English — US (en-US)"**
2. Type: "I want to create a promotional video"
3. Press Enter

**Expected:**
- Assistant responds in natural English
- No Telugu/Hindi/Marathi characters appear
- Conversation flows normally (no regression from multilingual changes)

---

### ✅ Test 9: Preview Voice Before Conversation

**Steps:**
1. Set "Reply language" to **"తెలుగు / Telugu · te-IN"**
2. In voice dropdown, select a Telugu voice (if available, e.g., "Heera" or "Kalpana")
3. Click **"ప్రివ్యూ"** (Preview) button

**Expected:**
- TTS speaks Telugu preview sentence: **"నమస్కారం! మీరు ఎలాంటి వీడియోను రూపొందించాలనుకుంటున్నారు?"**
  - Translation: "Hello! What kind of video do you want to create?"
- NO microphone permission requested (preview doesn't need mic)
- If no Telugu voice: "Preview" button disabled

---

### ✅ Test 10: "Talk Now" Button vs Wake Word

**Steps:**
1. Enable voice assistant in English
2. Try saying: "Hey CineGen, I want to create a video"
3. Now switch to Telugu, try: "హే సినీజెన్..." (wake word in Telugu)
4. Instead, click **"ఇప్పుడు మాట్లాడండి"** (Talk now) button and speak Telugu directly

**Expected:**
- "Hey CineGen" wake word works reliably in English
- May not work in Telugu/Hindi (browser speech recognition limitation)
- "Talk now" button bypasses wake word - works for all languages
- "Talk now" button is labeled in the selected language

---

## Language Capability Matrix

| Feature | Telugu | Hindi | Marathi | Tamil | Kannada | Malayalam | Bengali | Gujarati | Punjabi | English |
|---------|--------|-------|---------|-------|---------|-----------|---------|----------|---------|---------|
| **UI Labels** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AI Responses** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Typed Input** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Speech Recognition** | ⚠️ Chrome | ✅ Most | ⚠️ Chrome | ⚠️ Chrome | ⚠️ Chrome | ⚠️ Chrome | ⚠️ Chrome | ⚠️ Chrome | ⚠️ Chrome | ✅ All |
| **TTS Output** | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | 🔧 | ✅ |
| **Native Script** | తెలుగు | देवनागरी | देवनागरी | தமிழ் | ಕನ್ನಡ | മലയാളം | বাংলা | ગુજરાતી | ਗੁਰਮੁਖੀ | Latin |

**Legend:**
- ✅ **Implemented & Expected to Work**
- ⚠️ **Requires Chrome**: Other browsers may not support speech recognition
- 🔧 **OS-Dependent**: Requires language pack installation on your device

---

## TTS Voice Installation

### Windows 10/11
1. Settings → Time & Language → Language
2. Click "Add a language"
3. Search for Telugu/Hindi/Marathi
4. Click Options → Download Text-to-speech

### macOS
1. System Preferences → Accessibility → Speech
2. System Voice dropdown → Customize...
3. Check boxes for Telugu/Hindi/Marathi voices
4. Click OK to download

### Android
- Google TTS includes most Indic languages by default
- Settings → System → Languages & input → Text-to-Speech → Google TTS

### iOS
- Limited Indic language TTS support
- May require third-party TTS apps

---

## Troubleshooting

### Problem: Assistant still responds in English for Telugu/Hindi

**Diagnosis Steps:**
1. Check browser console for any API errors
2. Verify `replyLanguage` is actually being sent to API:
   - Open browser DevTools → Network tab
   - Look for POST to `/api/director/chat`
   - Check request payload contains `"replyLanguage": "te-IN"` or similar
3. Check Gemini API response:
   - In Network tab, view response body
   - Does `reply` field contain Telugu/Hindi script or English?

**If English in API response:**
- Gemini prompt may need further strengthening
- Report issue with exact language code and sample response

**If Telugu/Hindi in API response but English on screen:**
- Frontend rendering issue
- Check browser console for React errors

---

### Problem: UI labels still show English

**Diagnosis:**
1. Open DevTools → Console
2. Type: `localStorage.getItem('cinegen_voice_prefs')`
3. Check if `replyLanguage` is set correctly
4. Clear localStorage and refresh if needed:
   ```javascript
   localStorage.clear()
   location.reload()
   ```

---

### Problem: Speech recognition doesn't start

**Diagnosis:**
1. Check browser: Telugu/Hindi work best in Chrome
2. Verify microphone permission granted
3. Check browser console for errors like:
   - `"language-not-supported"` → Try Chrome or English
   - `"not-allowed"` → Grant microphone permission
   - `"no-speech"` → Speak louder or check mic hardware
4. Click "Microphone Check" to test audio levels

---

### Problem: No Telugu/Hindi voice in dropdown

**Expected Behavior:** This is NORMAL if OS language packs not installed.

**What Happens:**
- Warning message displays: "No speaking voice available for {language}"
- Text conversation still works perfectly
- Install OS language pack (see "TTS Voice Installation" above)

---

### Problem: "Hey CineGen" wake word doesn't work in Telugu

**Expected Behavior:** Wake word detection is English-only limitation.

**Solution:** Use the **"Talk now"** button instead. It's labeled in your selected language:
- Telugu: **"ఇప్పుడు మాట్లాడండి"**
- Hindi: **"अभी बात करें"**
- Marathi: **"आता बोला"**

---

## Files Changed

### New Files
- `lib/voice/translations.ts` (600 lines, 10 languages × 40+ strings)

### Modified Files
- `app/api/director/chat/route.ts` - Strengthened Gemini multilingual prompt (lines 108-156)
- `components/voice/CineGenDirector.tsx` - Integrated translations throughout UI (~30 replacements)

### Build Status
- ✅ TypeScript compilation: 0 errors
- ✅ Next.js build: Success
- ✅ All pages compile correctly

---

## Next Steps

1. **Run Test 1** (Telugu text) → Easiest first verification
2. **Check actual AI response language** → Key success metric
3. **Test in Chrome** with microphone for voice tests
4. **Optional**: Install OS TTS voices for full experience
5. **Report findings**: Which tests passed/failed

**If AI still responds in English:** Provide:
- Selected language code (e.g., te-IN)
- Your typed input
- Actual AI response
- Browser console screenshot

---

**Ready for Manual Testing ✅**
