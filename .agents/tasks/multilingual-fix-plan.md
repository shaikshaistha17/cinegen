# Implementation Plan: Fix CineGen Director Multilingual Conversation End-to-End

## Investigation Summary

### Root Cause Identified

The current multilingual conversation flow fails because:

1. **Weak AI Prompt**: The Gemini system prompt in `/app/api/director/chat/route.ts` (line 102) only says `"Respond in ${languageName}"` without proper multilingual instruction. This results in English responses regardless of the `replyLanguage` parameter.

2. **Hardcoded English Messages**: Fixed UI messages in `CineGenDirector.tsx` (lines ~1122-1220) are all hardcoded in English:
   - State labels: "Ready—say Hey CineGen or tap Talk now", "Listening...", "Thinking...", "Speaking..."
   - Welcome messages
   - Error messages
   - Button labels

3. **Missing Translation Infrastructure**: No translation structure exists for the 12 supported languages (Telugu, Hindi, Marathi, Tamil, Kannada, Malayalam, Bengali, Gujarati, Punjabi, English variants).

### Current Flow (User speaks Telugu)
```
Telugu speech → Chrome Web Speech API (te-IN) → Telugu transcript ✓
→ API call with replyLanguage: "te-IN" → Gemini with weak prompt
→ English response ✗ → English TTS output ✗
```

### Target Flow (User speaks Telugu)
```
Telugu speech → Chrome Web Speech API (te-IN) → Telugu transcript ✓
→ API call with replyLanguage: "te-IN" → Gemini with strong multilingual prompt
→ Telugu response ✓ → Telugu TTS output ✓
```

---

## Implementation Plan

### Feature 1: Strengthen Gemini Multilingual Prompt

**What to do**: 
Rewrite the system prompt in `/app/api/director/chat/route.ts` to give Gemini explicit, strong instructions for multilingual generation. The current prompt (lines 94-144) has a weak single-line language instruction that Gemini ignores. Replace it with a structured, emphatic multilingual section with examples.

**Files to modify**:
- `/Users/shaisthashaik/Desktop/Cinegen/cinegen/app/api/director/chat/route.ts`

**Changes**:
1. Add a new `MULTILINGUAL_GUIDANCE` constant before the `generateConversationalResponse` function with language-specific instructions and native-script examples for Telugu, Hindi, Marathi.
2. Replace the weak "LANGUAGE: Respond in ${languageName}" section (lines 100-102) with a strong, multi-paragraph instruction block that:
   - States the requirement 3 times with different phrasing for emphasis
   - Provides Telugu, Hindi, and Marathi response examples with native scripts
   - Explicitly forbids English responses when a non-English language is selected
   - Instructs Gemini to use native scripts (Telugu script for Telugu, Devanagari for Hindi/Marathi)
3. Add a validation check after parsing the Gemini response: if `replyLanguage` is not English and the response contains more than 60% ASCII characters (simple heuristic), log a warning and consider it a prompt failure.

**Example new prompt structure**:
```typescript
const MULTILINGUAL_GUIDANCE = `
CRITICAL LANGUAGE INSTRUCTION — READ THIS FIRST:

When replyLanguage is NOT English, you MUST respond in that language using its native script.
Do NOT respond in English. Do NOT transliterate. Use the actual script.

Examples of CORRECT responses:

Telugu (te-IN):
"నమస్కారం! మీ ప్రాజెక్ట్ గురించి చెప్పండి. ఎలాంటి వీడియో తయారు చేయాలనుకుంటున్నారు?"

Hindi (hi-IN):
"नमस्ते! आपका प्रोजेक्ट किस बारे में है? किस तरह का वीडियो बनाना चाहते हैं?"

Marathi (mr-IN):
"नमस्कार! तुमचा प्रोजेक्ट कशाबद्दल आहे? कोणत्या प्रकारचा व्हिडिओ तयार करायचा आहे?"

If replyLanguage is Telugu/Hindi/Marathi/Tamil/etc., your ENTIRE response must be in that language.
English is ONLY allowed when replyLanguage starts with "en-".

Do you understand? Confirm by responding in the requested language.
`;
```

4. Inject this guidance at the top of the system prompt, before the personality section.

**Verify**: 
```bash
# Manual test - no automated test for LLM behavior
npm run dev
# Open http://localhost:3000
# 1. Click "Voice Assistant" or navigate to CineGen Director
# 2. Open Voice & Language Settings
# 3. Set "Reply language" to "తెలుగు / Telugu · te-IN"
# 4. Click "Type instead" button
# 5. Type: "I want to create a video"
# 6. Observe response in message thread
# Expected: Response contains Telugu script (తెలుగు characters), not English
# 7. Repeat for Hindi and Marathi
```

---

### Feature 2: Create Translation Structure for Fixed Messages

**What to do**:
Create a new translation module at `/lib/voice/translations.ts` with a structured object containing translations for all fixed UI messages in the 12 supported languages. This will replace hardcoded English strings in the component.

**Files to create**:
- `/Users/shaisthashaik/Desktop/Cinegen/cinegen/lib/voice/translations.ts`

**Structure**:
```typescript
export interface VoiceTranslations {
  // State labels
  stateOff: string;
  stateAwaitingWake: string;
  stateListening: string;
  stateProcessing: string;
  stateSpeaking: string;
  stateError: string;
  
  // Instructions
  headlineVoice: string;
  headlineTyping: string;
  supportingText: string;
  
  // Errors
  errorMicDenied: string;
  errorNetworkError: string;
  errorLanguageNotSupported: string;
  
  // Settings
  settingsTitle: string;
  labelInputLanguage: string;
  labelReplyLanguage: string;
  labelSpeakingVoice: string;
  noVoiceAvailable: string;
  
  // Actions
  buttonEnable: string;
  buttonStop: string;
  buttonTalkNow: string;
  buttonTypeInstead: string;
  buttonUseVoice: string;
  buttonSend: string;
}

export const VOICE_TRANSLATIONS: Record<string, VoiceTranslations> = {
  "en": { /* English translations */ },
  "te": { /* Telugu translations */ },
  "hi": { /* Hindi translations */ },
  "mr": { /* Marathi translations */ },
  "ta": { /* Tamil translations */ },
  "kn": { /* Kannada translations */ },
  "ml": { /* Malayalam translations */ },
  "bn": { /* Bengali translations */ },
  "gu": { /* Gujarati translations */ },
  "pa": { /* Punjabi translations */ },
};

export function getTranslations(languageCode: string): VoiceTranslations {
  const langPrefix = languageCode.split("-")[0];
  return VOICE_TRANSLATIONS[langPrefix] || VOICE_TRANSLATIONS["en"];
}
```

**Content for 7 key messages per language** (minimum):
1. `headlineVoice`: "Your idea. Say it out loud." → Telugu: "మీ ఆలోచన. బిగ్గరగా చెప్పండి."
2. `stateListening`: "Listening..." → Telugu: "వింటున్నాను..."
3. `buttonEnable`: "Enable Voice Assistant" → Telugu: "వాయిస్ అసిస్టెంట్ ప్రారంభించండి"
4. `buttonTypeInstead`: "Type instead" → Telugu: "టైప్ చేయండి"
5. `errorMicDenied`: "Microphone access denied..." → Telugu: "మైక్రోఫోన్ యాక్సెస్ నిరాకరించబడింది..."
6. `supportingText`: "Describe your campaign. Shape your brief." → Telugu: "మీ ప్రచారాన్ని వివరించండి. మీ బ్రీఫ్‌ను రూపొందించండి."
7. `noVoiceAvailable`: "No speaking voice available for {lang} on this device." → Telugu: "{lang} కోసం ఈ పరికరంలో మాట్లాడే వాయిస్ అందుబాటులో లేదు."

**Provide all 10 languages** (English, Telugu, Hindi, Marathi, Tamil, Kannada, Malayalam, Bengali, Gujarati, Punjabi) with complete translations.

**Verify**:
```bash
npm run dev
# Build should succeed without TypeScript errors
# Expected: New file exports translations, no import errors
```

---

### Feature 3: Integrate Translations into CineGenDirector Component

**What to do**:
Replace all hardcoded English strings in `CineGenDirector.tsx` with dynamic translations from the new translations module. Use the `replyLanguage` state to determine which translation set to display.

**Files to modify**:
- `/Users/shaisthashaik/Desktop/Cinegen/cinegen/components/voice/CineGenDirector.tsx`

**Changes**:
1. Import the translation function at the top:
   ```typescript
   import { getTranslations } from "@/lib/voice/translations";
   ```

2. Add a derived state for current translations:
   ```typescript
   const t = getTranslations(replyLanguage);
   ```

3. Replace hardcoded strings throughout the component:
   - Line ~1122: `stateLabels` object → use `t.stateOff`, `t.stateAwaitingWake`, etc.
   - Line ~1150: `"Your idea. Say it out loud."` → `{typingMode ? t.headlineTyping : t.headlineVoice}`
   - Line ~1157: `"Describe your campaign..."` → `{t.supportingText}`
   - Line ~1308: `"Enable Voice Assistant"` → `{t.buttonEnable}`
   - Line ~1324: Error messages → use `t.errorMicDenied`, `t.errorNetworkError`, etc.
   - Line ~1390: `"Type instead"` → `{t.buttonTypeInstead}`
   - Line ~1420: `"Use Voice"` → `{t.buttonUseVoice}`
   - Line ~1440: `"Talk now"` → `{t.buttonTalkNow}`

4. Handle the welcome message for typing mode (line ~1001): currently hardcoded English. Change to:
   ```typescript
   const welcomeMsg: ConversationMessage = {
     role: "assistant",
     text: t.typingWelcome || "Type your campaign idea or question below.",
     timestamp: Date.now()
   };
   ```

5. Update error handling functions to use translations:
   - `handleEnableVoice`: line ~962 → `setErrorMessage(t.errorMicDenied)`
   - `recognition.onerror`: line ~783 → use translated error messages based on error type

**Verify**:
```bash
npm run dev
# Open http://localhost:3000
# Test scenario 1: Telugu UI
# 1. Set "Reply language" to "తెలుగు / Telugu · te-IN"
# 2. Observe all UI labels now in Telugu script
# 3. Click "వాయిస్ అసిస్టెంట్ ప్రారంభించండి" (Enable Voice Assistant)
# 4. Verify state label shows "వింటున్నాను..." (Listening)
# 5. Click "టైప్ చేయండి" (Type instead)
# 6. Verify headline changes to Telugu typing message
# Expected: ALL fixed UI text in Telugu, buttons labeled in Telugu

# Test scenario 2: Hindi UI
# 1. Change Reply language to "हिन्दी / Hindi · hi-IN"
# 2. Verify all labels switch to Hindi/Devanagari script
# Expected: UI fully in Hindi

# Test scenario 3: English fallback
# 1. Change to English (en-US)
# 2. Verify labels revert to English
# Expected: UI fully in English
```

---

### Feature 4: End-to-End Telugu Conversation Test

**What to do**:
Verify the complete multilingual pipeline works for Telugu: speech recognition → Telugu transcript → Telugu AI response → Telugu TTS output.

**Prerequisites**:
- All previous features implemented
- Chrome browser with Telugu language pack installed (for speech recognition)
- Device with Telugu TTS voice available (may require manual OS installation)

**Manual test procedure**:
```bash
npm run dev
# Navigate to http://localhost:3000/voice (or wherever CineGenDirector is mounted)

# SCENARIO 1: Telugu voice conversation
1. Open Voice & Language Settings
2. Set "I speak" to "తెలుగు / Telugu · te-IN"
3. Set "Reply language" to "తెలుగు / Telugu · te-IN"
4. If Telugu voice available: select it and click "Preview"
   Expected: Preview speaks Telugu greeting in Telugu
5. If NO Telugu voice: note "No speaking voice available for Telugu" warning
6. Click "వాయిస్ అసిస్టెంట్ ప్రారంభించండి" (Enable Voice)
7. Grant microphone permission
8. Click "Talk now" button (bypasses wake word)
9. Speak in Telugu: "నేను ఒక వీడియో తయారు చేయాలనుకుంటున్నాను" (I want to create a video)
10. Observe:
    - Telugu transcript appears in cyan box ✓
    - State changes to "ఆలోచిస్తున్నాను..." (Thinking) ✓
    - API request sent with replyLanguage: "te-IN" ✓
    - Response message appears in Telugu script ✓
    - If Telugu TTS voice available: response is spoken in Telugu ✓
    - If no Telugu TTS: response shows as text only (acceptable) ✓

# SCENARIO 2: Hindi voice conversation
1. Change languages to Hindi (hi-IN)
2. Repeat steps 6-10 speaking Hindi
3. Expected: Full Hindi conversation pipeline

# SCENARIO 3: Marathi voice conversation
1. Change languages to Marathi (mr-IN)
2. Repeat steps 6-10 speaking Marathi
3. Expected: Full Marathi conversation pipeline

# SCENARIO 4: Telugu typing conversation
1. Set Reply language to Telugu (te-IN)
2. Click "టైప్ చేయండి" (Type instead)
3. Type in Telugu script: "నేను ఒక వీడియో తయారు చేయాలనుకుంటున్నాను"
4. Press Enter
5. Expected: Telugu text response from AI

# SCENARIO 5: Language switching mid-session
1. Start conversation in Telugu
2. After 2-3 exchanges, open settings
3. Change Reply language to Hindi
4. Continue conversation
5. Expected: Next response in Hindi (conversation context preserved)

# SCENARIO 6: Missing voice handling
1. Set Reply language to Bengali (bn-IN) - unlikely to have TTS voice
2. Verify warning: "No speaking voice available for Bengali on this device"
3. Enable voice and type/speak
4. Expected: Text response works, no TTS output (graceful degradation)
```

**Verification outcomes**:
- ✅ PASS: All scenarios work as expected
- ⚠️ PARTIAL: Text conversation works, TTS unavailable for some languages (acceptable - note in docs)
- ❌ FAIL: English responses for non-English languages (Gemini prompt needs strengthening)

**Verify**:
```bash
# No automated command - manual test only
# Document results in test log:
echo "Telugu conversation test: [PASS/FAIL]" >> .agents/tasks/multilingual-test-log.txt
echo "Hindi conversation test: [PASS/FAIL]" >> .agents/tasks/multilingual-test-log.txt
echo "Marathi conversation test: [PASS/FAIL]" >> .agents/tasks/multilingual-test-log.txt
```

---

## Language Capability Matrix

| Language | Code | Speech Recognition | AI Reply | TTS Voice Available | Status |
|----------|------|-------------------|----------|---------------------|--------|
| English (US) | en-US | ✅ Browser built-in | ✅ After fix | ✅ Device default | VERIFIED |
| English (India) | en-IN | ✅ Browser built-in | ✅ After fix | ✅ Device default | VERIFIED |
| English (UK) | en-GB | ✅ Browser built-in | ✅ After fix | ✅ Device default | VERIFIED |
| Telugu | te-IN | ⚠️ Chrome only | ✅ After fix | ⚠️ OS-dependent | NEEDS VERIFICATION |
| Hindi | hi-IN | ✅ Browser support | ✅ After fix | ⚠️ OS-dependent | NEEDS VERIFICATION |
| Marathi | mr-IN | ⚠️ Chrome only | ✅ After fix | ⚠️ OS-dependent | NEEDS VERIFICATION |
| Tamil | ta-IN | ⚠️ Chrome only | ✅ After fix | ⚠️ OS-dependent | NEEDS VERIFICATION |
| Kannada | kn-IN | ⚠️ Chrome only | ✅ After fix | ⚠️ OS-dependent | NEEDS VERIFICATION |
| Malayalam | ml-IN | ⚠️ Chrome only | ✅ After fix | ⚠️ OS-dependent | NEEDS VERIFICATION |
| Bengali | bn-IN | ⚠️ Chrome only | ✅ After fix | ⚠️ OS-dependent | NEEDS VERIFICATION |
| Gujarati | gu-IN | ⚠️ Chrome only | ✅ After fix | ⚠️ OS-dependent | NEEDS VERIFICATION |
| Punjabi | pa-IN | ⚠️ Chrome only | ✅ After fix | ⚠️ OS-dependent | NEEDS VERIFICATION |

**Legend**:
- ✅ Confirmed working
- ⚠️ Requires specific browser/OS configuration
- ❌ Not supported
- NEEDS VERIFICATION: After implementation, manual testing required

**Notes**:
- Speech recognition support varies by browser. Chrome has best Indic language support.
- TTS voice availability depends on operating system language packs. Windows/macOS/Android may need manual installation.
- AI reply generation (Gemini) supports all languages after prompt fix.

---

## Testing Commands

### Build verification:
```bash
cd /Users/shaisthashaik/Desktop/Cinegen/cinegen
npm run build
# Expected: Build succeeds, no TypeScript errors
```

### Type checking:
```bash
npx tsc --noEmit
# Expected: No type errors in translations.ts or CineGenDirector.tsx
```

### Development server:
```bash
npm run dev
# Expected: Server starts on http://localhost:3000
# Open browser to http://localhost:3000
# Navigate to CineGen Director (voice assistant)
```

### Manual verification checklist:
```
□ Feature 1: Gemini responds in Telugu when replyLanguage=te-IN
□ Feature 1: Gemini responds in Hindi when replyLanguage=hi-IN
□ Feature 1: Gemini responds in Marathi when replyLanguage=mr-IN
□ Feature 2: Translation file exports correctly
□ Feature 3: UI labels switch to Telugu/Hindi/Marathi dynamically
□ Feature 4: End-to-end Telugu conversation works (speech → AI → TTS)
□ Feature 4: End-to-end Hindi conversation works
□ Feature 4: End-to-end Marathi conversation works
□ Feature 4: Typing mode works in all languages
□ Feature 4: Missing TTS voice shows clear warning, text still works
□ Feature 4: Language switching mid-conversation works
```

---

## Dependencies

**No new npm packages required**. All features use existing dependencies:
- `@google/generative-ai` - already installed for Gemini API
- Browser Web Speech API - native
- React state management - native

---

## Environment Variables

No new environment variables required. Uses existing:
- `GEMINI_API_KEY` - already configured for AI responses

---

## Known Limitations

1. **Speech Recognition**: Telugu, Tamil, Kannada, Malayalam, Bengali, Gujarati, Punjabi speech recognition requires Chrome browser with specific language support. Not all browsers support all Indic languages.

2. **TTS Voices**: Text-to-speech voice availability varies by operating system:
   - Windows: Requires language pack installation via Settings > Time & Language > Language
   - macOS: Some voices available, may need manual download
   - Android: Google TTS supports many languages
   - iOS: Limited Indic language support

3. **Gemini Limitations**: Even with strong prompting, Gemini 2.0 Flash may occasionally fall back to English for complex technical terms or when confused. This is an LLM limitation, not a code issue.

4. **Wake Word**: "Hey CineGen" wake phrase detection only works reliably in English. For other languages, users should use the "Talk now" button to bypass wake word detection.

---

## Rollback Plan

If implementation causes issues:

1. **Revert API changes**:
   ```bash
   git checkout HEAD -- app/api/director/chat/route.ts
   ```

2. **Remove translation file**:
   ```bash
   rm lib/voice/translations.ts
   ```

3. **Revert component changes**:
   ```bash
   git checkout HEAD -- components/voice/CineGenDirector.tsx
   ```

4. **Rebuild**:
   ```bash
   npm run build
   ```

---

## Success Criteria

Implementation is successful when:

1. ✅ A Telugu user can speak Telugu → see Telugu transcript → receive Telugu AI response → hear Telugu TTS (if device voice available)
2. ✅ A Hindi user can speak Hindi → see Hindi transcript → receive Hindi AI response → hear Hindi TTS (if device voice available)
3. ✅ A Marathi user can speak Marathi → see Marathi transcript → receive Marathi AI response → hear Marathi TTS (if device voice available)
4. ✅ All UI labels, buttons, and messages display in the selected reply language
5. ✅ Language switching works seamlessly mid-conversation
6. ✅ Typing mode works in all languages
7. ✅ Graceful degradation: If TTS voice unavailable, text conversation still works with clear warning
8. ✅ English conversations still work without regression

---

## Timeline Estimate

- Feature 1 (Gemini prompt): 30-45 minutes
- Feature 2 (Translation file): 1-2 hours (most time spent on accurate translations)
- Feature 3 (Component integration): 45-60 minutes
- Feature 4 (Testing): 1-2 hours (manual testing across multiple languages)

**Total**: 4-6 hours for complete implementation and verification

---

## Next Steps After This Plan

1. **Implementation Agent**: Read this plan and implement features 1-3 in sequence
2. **Testing Agent**: Execute Feature 4 manual test procedures
3. **Documentation Agent**: Update README with language support details and TTS voice installation instructions
4. **User**: Final acceptance testing with real Telugu/Hindi/Marathi conversations

---

**Plan written**: 2024-01-XX  
**Project**: CineGen v2.0  
**Workspace**: `/Users/shaisthashaik/Desktop/Cinegen/cinegen`  
**Target**: Localhost development only (no deployment)
