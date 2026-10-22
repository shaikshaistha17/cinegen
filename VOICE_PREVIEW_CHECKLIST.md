# Voice Preview Manual Testing Checklist

## Prerequisites
- Open http://localhost:3001 in a browser that supports Web Speech API (Chrome, Edge, Safari)
- Click "Start Voice Assistant"
- Click Settings icon to access Voice & Language Settings

## Test Cases

### English (en-US)
**Sample Sentence:** "Hello! I'm your creative assistant. What would you like to create?"

**Steps:**
1. Set "Reply Language" dropdown to "English (United States)"
2. Select any English voice from the "Select Voice" dropdown
3. Click the **"Preview"** button
4. Expected: Hear the English sample sentence in the selected voice
5. ❌ UNVERIFIED - Audio playback requires manual user testing

**Verification Points:**
- [ ] Preview button visible and enabled
- [ ] Button changes to "Stop preview" during playback
- [ ] Preview does NOT activate microphone
- [ ] Preview does NOT appear in conversation history
- [ ] Selected voice matches playback voice

---

### Telugu (te-IN)
**Sample Sentence:** "నమస్కారం! మీరు ఎలాంటి వీడియోను రూపొందించాలనుకుంటున్నారు?"  
**Translation:** "Hello! What kind of video would you like to create?"

**Steps:**
1. Set "Reply Language" dropdown to "తెలుగు / Telugu"
2. Select a Telugu voice (if available on your system)
3. Click the **"Preview"** button (labeled "ప్రివ్యూ" in Telugu UI)
4. Expected: Hear the Telugu sample sentence
5. ❌ UNVERIFIED - Audio playback requires manual user testing

**Verification Points:**
- [ ] Preview button shows Telugu translation "ప్రివ్యూ"
- [ ] Telugu voices appear in dropdown (system-dependent)
- [ ] Preview plays Telugu text
- [ ] Stop button shows "ప్రివ్యూ ఆపండి"

**Note:** Telugu voice availability depends on OS/browser. On macOS, Telugu voices may not be pre-installed.

---

### Hindi (hi-IN)
**Sample Sentence:** "नमस्ते! आप किस तरह का वीडियो बनाना चाहते हैं?"  
**Translation:** "Hello! What kind of video would you like to create?"

**Steps:**
1. Set "Reply Language" dropdown to "हिन्दी / Hindi"
2. Select a Hindi voice from dropdown
3. Click the **"Preview"** button (labeled "प्रीव्यू")
4. Expected: Hear the Hindi sample sentence
5. ❌ UNVERIFIED - Audio playback requires manual user testing

**Verification Points:**
- [ ] Preview button shows Hindi translation "प्रीव्यू"
- [ ] Hindi voices appear in dropdown
- [ ] Preview plays Hindi text correctly
- [ ] Stop button shows "प्रीव्यू रोकें"

**Note:** Hindi voices commonly available on macOS (e.g., "Lekha")

---

### Marathi (mr-IN)
**Sample Sentence:** "नमस्कार! तुम्ही कोणत्या प्रकारचा व्हिडिओ तयार करू इच्छिता?"  
**Translation:** "Hello! What kind of video would you like to create?"

**Steps:**
1. Set "Reply Language" dropdown to "मराठी / Marathi"
2. Select a Marathi voice (if available)
3. Click the **"Preview"** button (labeled "प्रीव्ह्यू")
4. Expected: Hear the Marathi sample sentence
5. ❌ UNVERIFIED - Audio playback requires manual user testing

**Verification Points:**
- [ ] Preview button shows Marathi translation "प्रीव्ह्यू"
- [ ] Marathi voices appear in dropdown (system-dependent)
- [ ] Preview plays Marathi text
- [ ] Stop button shows "प्रीव्ह्यू थांबवा"

**Note:** Marathi voice availability depends on OS. May require manual voice installation.

---

## Common Issues

### No voices available for language
- **Symptom:** Dropdown shows no voices or only "Show all voices" checkbox
- **Cause:** OS/browser doesn't have that language pack installed
- **Solution:** Install language pack from OS settings or use English fallback

### Preview plays wrong language
- **Symptom:** English voice speaks non-English text (sounds garbled)
- **Cause:** Selected voice doesn't match reply language
- **Solution:** Select a voice that matches the reply language code

### Preview activates microphone
- **Test:** Watch for microphone permission prompt or recording indicator
- **Expected:** No microphone activity during preview
- **If activated:** Report as bug - preview should pause recognition, not trigger it

---

## Technical Notes

- **Voice availability:** Depends on operating system and browser
- **macOS voices:** English (multiple), Hindi (Lekha), limited regional languages
- **Windows voices:** More comprehensive regional Indian language support
- **Browser support:** Chrome/Edge best, Safari limited, Firefox varies
- **Audio output:** Actual playback UNVERIFIED until manual user testing
