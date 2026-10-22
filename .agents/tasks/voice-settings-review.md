# Voice & Language Settings Implementation Review

**Reviewer:** Kiro AI Review Agent  
**Review Date:** 2026-10-21  
**Commit:** 4f08a7c - "feat: add voice and language settings panel to CineGen Director"  
**Files Reviewed:**
- `components/voice/CineGenDirector.tsx`
- `lib/voice/languages.ts`
- `app/api/director/chat/route.ts`

## Review Scope

This review verifies the implementation of voice and language settings against the approved plan in `voice-settings-plan.md` and the original user requirements.

**Verification Checklist:**
1. ✅ Three settings clearly separated (input language, reply language, speaking voice)
2. ✅ Default English (India) for input recognition
3. ✅ Voice filtering by reply language works
4. ✅ Novelty voices hidden by default
5. ✅ Native-language preview sentences implemented
6. ✅ Preview pauses/resumes recognition correctly
7. ✅ Preview does NOT activate microphone from "off" state
8. ✅ Missing voices shown honestly
9. ✅ Voice persistence by stable identity (not index)
10. ✅ replyLanguage passed to API
11. ✅ Build passes with 0 errors (verified in commit message)
12. ✅ Keyboard accessible (Tab navigation, ARIA labels)
13. ✅ No invented voices or quality ratings
14. ✅ Recognition availability tracked separately from TTS

---

## Detailed Findings

### 1. Three Settings Clearly Separated ✅ PASS

**Location:** `CineGenDirector.tsx` lines 1175-1315

**Evidence:**
- **Section 1 "I speak"** (input language): Lines 1175-1202
  - Label: "I speak"
  - Help text: "(language you speak to CineGen)"
  - Separate dropdown with microphone icons for recognition-supported languages
  
- **Section 2 "Reply language"**: Lines 1204-1235
  - Label: "Reply language"
  - Help text: "(language for text responses)"
  - Independent selection from input language
  
- **Section 3 "Speaking voice"**: Lines 1237-1315
  - Label: "Speaking voice"
  - Help text: "(text-to-speech voice)"
  - Filtered voices based on reply language selection

Each section is in its own div with `p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg` styling, providing clear visual separation.

**Verdict:** APPROVED - Three settings are clearly distinct with proper labels and help text.

---

### 2. Default English (India) for Input Recognition ✅ PASS

**Location:** `CineGenDirector.tsx` line 72

**Evidence:**
```typescript
const [inputLanguage, setInputLanguage] = useState("en-IN");
```

The input language defaults to "en-IN" (English India) as required.

**Verdict:** APPROVED

---

### 3. Voice Filtering by Reply Language ✅ PASS

**Location:** 
- `languages.ts` lines 68-83 (filterVoicesByLanguage function)
- `CineGenDirector.tsx` line 1241

**Evidence:**
```typescript
// languages.ts
export function filterVoicesByLanguage(
  voices: SpeechSynthesisVoice[],
  languageCode: string,
  includeNovelty = false
): SpeechSynthesisVoice[] {
  const langPrefix = languageCode.split("-")[0];
  
  let filtered = voices.filter(voice => voice.lang.toLowerCase().startsWith(langPrefix));
  
  if (!includeNovelty) {
    filtered = filtered.filter(voice => 
      !NOVELTY_VOICE_NAMES.some(novelty => voice.name.includes(novelty))
    );
  }
  
  return filtered;
}

// CineGenDirector.tsx
const filteredVoices = filterVoicesByLanguage(availableVoices, replyLanguage, showAllVoices);
```

Filtering correctly:
1. Extracts language prefix (e.g., "te" from "te-IN")
2. Filters voices by matching language prefix
3. Removes novelty voices when `includeNovelty` is false

**Verdict:** APPROVED

---

### 4. Novelty Voices Hidden by Default ✅ PASS

**Location:** 
- `languages.ts` lines 29-41 (NOVELTY_VOICE_NAMES)
- `languages.ts` lines 78-81 (filter logic)
- `CineGenDirector.tsx` lines 1298-1307 (toggle checkbox)

**Evidence:**
```typescript
export const NOVELTY_VOICE_NAMES = [
  "Bells",
  "Boing",
  "Bubbles",
  "Bad News",
  "Good News",
  "Trinoids",
  "Albert",
  "Cellos",
  "Organ",
  "Wobble",
  "Zarvox",
];
```

Novelty voices are filtered out by default (line 78-81), and user can reveal them via "Show all device voices" checkbox (line 1300-1306).

**Verdict:** APPROVED

---

### 5. Native-Language Preview Sentences ✅ PASS

**Location:** `languages.ts` lines 44-56

**Evidence:**
```typescript
export const PREVIEW_SENTENCES: Record<string, string> = {
  "en": "Hello! I'm your creative assistant. What would you like to create?",
  "te": "నమస్కారం! మీరు ఎలాంటి వీడియోను రూపొందించాలనుకుంటున్నారు?",
  "hi": "नमस्ते! आप किस तरह का वीडियो बनाना चाहते हैं?",
  "ta": "வணக்கம்! நீங்கள் எந்த வகையான காணொளியை உருவாக்க விரும்புகிறீர்கள்?",
  "kn": "ನಮಸ್ಕಾರ! ನೀವು ಯಾವ ರೀತಿಯ ವೀಡಿಯೊವನ್ನು ರಚಿಸಲು ಬಯಸುತ್ತೀರಿ?",
  "ml": "നമസ്കാരം! നിങ്ങൾ ഏത് തരത്തിലുള്ള വീഡിയോ സൃഷ്ടിക്കാൻ ആഗ്രഹിക്കുന്നു?",
  "mr": "नमस्कार! तुम्ही कोणत्या प्रकारचा व्हिडिओ तयार करू इच्छिता?",
  "bn": "নমস্কার! আপনি কি ধরনের ভিডিও তৈরি করতে চান?",
  "gu": "નમસ્તે! તમે કેવા પ્રકારનો વિડિયો બનાવવા માંગો છો?",
  "pa": "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਤੁਸੀਂ ਕਿਸ ਤਰ੍ਹਾਂ ਦੀ ਵੀਡੀਓ ਬਣਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?",
};
```

Native-language preview sentences are provided for all supported languages. Each uses culturally appropriate greetings and natural phrasing.

**Verdict:** APPROVED

---

### 6. Preview Pauses/Resumes Recognition Correctly ✅ PASS

**Location:** `CineGenDirector.tsx` lines 928-970

**Evidence:**

**Pause logic (lines 935-946):**
```typescript
// Check if recognition is active and pause it
const isRecognitionActive = state === "awaiting_wake" || state === "listening";
if (isRecognitionActive && recognitionRef.current) {
  setRecognitionWasActiveBeforePreview(true);
  try {
    recognitionRef.current.stop();
  } catch (e) {
    // Already stopped
  }
} else {
  setRecognitionWasActiveBeforePreview(false);
}
```

**Resume logic (lines 955-964):**
```typescript
const handlePreviewEnd = () => {
  setIsPreviewPlaying(false);
  // Restore recognition if it was active
  if (recognitionWasActiveBeforePreview && recognitionRef.current === null) {
    setTimeout(() => {
      startRecognitionRef.current();
    }, 100);
  }
};

utterance.onend = handlePreviewEnd;
utterance.onerror = handlePreviewEnd;
```

The implementation correctly:
1. Checks if recognition is active before preview
2. Saves the active state to `recognitionWasActiveBeforePreview`
3. Stops recognition during preview
4. Restores recognition only if it was active before AND recognitionRef is null
5. Handles both onend and onerror to ensure cleanup

**Verdict:** APPROVED

---

### 7. Preview Does NOT Activate Microphone from "off" State ✅ PASS

**Location:** `CineGenDirector.tsx` lines 935-946

**Evidence:**
The critical check is:
```typescript
const isRecognitionActive = state === "awaiting_wake" || state === "listening";
if (isRecognitionActive && recognitionRef.current) {
  setRecognitionWasActiveBeforePreview(true);
  // ... stop recognition
} else {
  setRecognitionWasActiveBeforePreview(false);
}
```

When state is "off", `isRecognitionActive` evaluates to `false`, so `recognitionWasActiveBeforePreview` is set to `false`. The resume logic (line 958) checks:
```typescript
if (recognitionWasActiveBeforePreview && recognitionRef.current === null) {
  // ... restart recognition
}
```

Since `recognitionWasActiveBeforePreview` is false, recognition is NOT restarted. The microphone remains off.

**Verdict:** APPROVED

---

### 8. Missing Voices Shown Honestly ✅ PASS

**Location:** `CineGenDirector.tsx` lines 1244-1258

**Evidence:**
```typescript
if (filteredVoices.length === 0) {
  return (
    <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded">
      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs text-amber-300">
          No speaking voice available for {getLanguageName(replyLanguage)} on this device.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Text replies will still work.
        </p>
      </div>
    </div>
  );
}
```

Additionally, in the `speak()` function (lines 209-215):
```typescript
// If no voice selected, skip TTS but keep text functional
if (!selectedVoice) {
  console.log("[Speech] No voice available, text-only mode");
  return;
}
```

The implementation:
1. Shows honest "No speaking voice available" message with language name
2. Clarifies that text replies still work
3. Skips TTS entirely when no voice is available
4. Does NOT silently fall back to English or another language

**Verdict:** APPROVED

---

### 9. Voice Persistence by Stable Identity ✅ PASS

**Location:** 
- `languages.ts` lines 100-146 (VoiceIdentity interface and helper functions)
- `CineGenDirector.tsx` lines 115-125 (restore logic)
- `CineGenDirector.tsx` lines 152-156 (save logic)

**Evidence:**

**Identity structure (languages.ts):**
```typescript
export interface VoiceIdentity {
  name: string;
  lang: string;
  voiceURI: string;
}

export function serializeVoice(voice: SpeechSynthesisVoice): VoiceIdentity {
  return {
    name: voice.name,
    lang: voice.lang,
    voiceURI: voice.voiceURI,
  };
}
```

**Save to localStorage (CineGenDirector.tsx):**
```typescript
useEffect(() => {
  if (selectedVoice) {
    const identity = serializeVoice(selectedVoice);
    localStorage.setItem('cinegen_voice_identity', JSON.stringify(identity));
  }
}, [selectedVoice]);
```

**Restore from localStorage (CineGenDirector.tsx):**
```typescript
const savedVoiceJSON = localStorage.getItem('cinegen_voice_identity');
if (savedVoiceJSON && voices.length > 0) {
  try {
    const identity: VoiceIdentity = JSON.parse(savedVoiceJSON);
    const voice = findVoiceByIdentity(voices, identity);
    if (voice) {
      setSelectedVoice(voice);
      return;
    }
  } catch (e) {
    // Invalid JSON, fall through to default
  }
}
```

The implementation uses a stable identity (name, lang, voiceURI) instead of array index, ensuring correct voice restoration across sessions and voice list changes.

**Verdict:** APPROVED

---

### 10. replyLanguage Passed to API ✅ PASS

**Location:** 
- `CineGenDirector.tsx` lines 357-363 (fetch call)
- `app/api/director/chat/route.ts` lines 7-15 (parameter extraction)
- `app/api/director/chat/route.ts` lines 43-48 (passed to generator)
- `app/api/director/chat/route.ts` lines 58-71 (used in system prompt)

**Evidence:**

**Client-side request (CineGenDirector.tsx):**
```typescript
const response = await fetch("/api/director/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    message: idea,
    sessionId,
    conversationHistory: conversationHistory,
    replyLanguage: replyLanguage
  }),
  signal: abortControllerRef.current.signal
});
```

**API handler (route.ts):**
```typescript
const { message, sessionId, conversationHistory, replyLanguage }: {
  message: string;
  sessionId: string;
  conversationHistory: ConversationMessage[];
  replyLanguage?: string;
} = body;

// ...

const response = await generateConversationalResponse(
  message,
  boundedHistory,
  displayName,
  replyLanguage || 'en-US'
);
```

**System prompt includes language instruction (route.ts):**
```typescript
const languageNames: Record<string, string> = {
  "en-US": "English",
  "en-IN": "English",
  "en-GB": "English",
  "te-IN": "Telugu",
  "hi-IN": "Hindi",
  // ... other languages
};

const languageName = languageNames[replyLanguage] || "English";

const systemPrompt = `You are the CineGen Director...

LANGUAGE:
- Respond in ${languageName}. Use natural, conversational ${languageName}.
- Keep the tone warm and professional regardless of language.
...`;
```

The replyLanguage is correctly passed from client to API and used to instruct the AI to respond in the selected language.

**Verdict:** APPROVED

---

### 11. Build Passes with 0 Errors ✅ PASS

**Evidence:** Commit message states:
```
Build verification: npm run build passed with no type errors
```

The coder verified the build before committing. No need to re-run the build per review instructions.

**Verdict:** APPROVED

---

### 12. Keyboard Accessible ✅ PASS

**Location:** Throughout `CineGenDirector.tsx` lines 1143-1315

**Evidence:**

**ARIA labels:**
- Settings panel button: `aria-label="Voice and language settings"` (line 1154)
- Settings panel expansion state: `aria-expanded={showSettingsPanel}` (line 1155)
- Input language select: `aria-label="Select input language"` (line 1193)
- Reply language select: `aria-label="Select reply language"` (line 1224)
- Speaking voice select: `aria-label="Select speaking voice"` (line 1269)
- Preview button: `aria-label="Preview voice pronunciation"` (line 1284)
- Stop preview button: `aria-label="Stop preview"` (line 1292)

**Focus management:**
- All interactive elements have `focus-visible:ring-2` classes for visible focus indicators
- Select dropdowns have `focus:outline-none focus:ring-2 focus:ring-violet-400`
- Buttons have `focus-visible:ring-2 focus-visible:ring-violet-400`

**Tab order:**
The natural DOM order provides logical tab flow:
1. Settings panel toggle button
2. Input language dropdown
3. Reply language dropdown
4. Speaking voice dropdown
5. Preview/Stop preview button
6. Show all voices checkbox

**Verdict:** APPROVED - Keyboard navigation and screen reader accessibility are properly implemented.

---

### 13. No Invented Voices or Quality Ratings ✅ PASS

**Location:** `languages.ts` lines 86-95 (formatVoiceDisplay)

**Evidence:**
```typescript
export function formatVoiceDisplay(voice: SpeechSynthesisVoice): string {
  const lang = SUPPORTED_LANGUAGES.find(l => voice.lang.startsWith(l.code.split("-")[0]));
  const langDisplay = lang ? lang.name : voice.lang;
  const voiceType = voice.localService ? "Device voice" : "Network voice";
  
  return `${langDisplay} · ${voice.name} · ${voiceType}`;
}
```

The function only displays:
1. Language name (from actual voice.lang or mapped name)
2. Voice name (voice.name - actual browser-provided name)
3. Voice type (Device/Network based on voice.localService)

No quality ratings (e.g., "high quality", "premium"), gender labels, or invented voice names are added.

**Verdict:** APPROVED

---

### 14. Recognition Availability Tracked Separately from TTS ✅ PASS

**Location:** `languages.ts` lines 5-26

**Evidence:**
```typescript
export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  recognitionSupported: boolean;  // <-- Separate flag
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "en-IN", name: "English (India)", nativeName: "English (India)", recognitionSupported: true },
  { code: "en-US", name: "English (United States)", nativeName: "English (United States)", recognitionSupported: true },
  { code: "en-GB", name: "English (United Kingdom)", nativeName: "English (United Kingdom)", recognitionSupported: true },
  { code: "te-IN", name: "Telugu", nativeName: "తెలుగు / Telugu", recognitionSupported: false },
  { code: "hi-IN", name: "Hindi", nativeName: "हिन्दी / Hindi", recognitionSupported: true },
  { code: "ta-IN", name: "Tamil", nativeName: "தமிழ் / Tamil", recognitionSupported: false },
  // ... etc
];
```

Each language has a `recognitionSupported` boolean that is independent of TTS voice availability. This is displayed in the UI with a microphone emoji (line 1197):
```typescript
{lang.recognitionSupported ? "🎤 " : ""}{lang.nativeName} · {lang.code}
```

**Verdict:** APPROVED

---

## Additional Verification

### Input Language Change Handler ✅ PASS

**Location:** `CineGenDirector.tsx` lines 688-708

**Evidence:**
```typescript
// Handle input language change - restart recognition if active
useEffect(() => {
  if (recognitionRef.current && (state === "awaiting_wake" || state === "listening")) {
    // Stop current recognition
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // Already stopped
    }
    recognitionRef.current = null;
    
    // Restart after a brief delay
    setTimeout(() => {
      if (state === "awaiting_wake" || state === "listening") {
        setState("awaiting_wake");
        wakeWordDetectedRef.current = false;
        startRecognitionRef.current();
      }
    }, 100);
  }
}, [inputLanguage]); // Only trigger on language change
```

And recognition.lang is set correctly (line 455):
```typescript
recognition.lang = inputLanguage;
```

Changes to input language safely restart recognition without losing the session state.

**Verdict:** APPROVED

---

### Unsupported Language Error Handling ✅ PASS

**Location:** `CineGenDirector.tsx` lines 608-617

**Evidence:**
```typescript
} else if (event.error === "language-not-supported") {
  const langName = getLanguageName(inputLanguage);
  setErrorMessage(`${langName} speech recognition is not supported on this device. Try English or use Type instead.`);
  setState((prevState) => {
    console.log(`[State] ${prevState} → error (timestamp: ${new Date().toISOString()})`);
    return "error";
  });
  errorRetryCountRef.current = 999; // Don't retry unsupported language
}
```

The error message:
1. Uses the actual language name via `getLanguageName()`
2. Provides specific guidance ("Try English or use Type instead")
3. Does not retry unsupported languages (errorRetryCount = 999)

**Verdict:** APPROVED

---

### getPhoneticText Only Applied to English Voices ✅ PASS

**Location:** `CineGenDirector.tsx` lines 223-225

**Evidence:**
```typescript
// Only use phonetic text for English voices
const isEnglish = selectedVoice.lang.startsWith('en');
const textToSpeak = isEnglish ? getPhoneticText(text) : text;
```

The phonetic transformation (CineGen → "Sinny-Jen") is only applied when the selected voice is English. Non-English voices receive the original text.

**Verdict:** APPROVED

---

## Summary

### Approved Requirements: 14/14 ✅

All 14 verification points from the review instructions PASS:

1. ✅ Three settings clearly separated
2. ✅ Default English (India) for input
3. ✅ Voice filtering by reply language
4. ✅ Novelty voices hidden by default
5. ✅ Native-language preview sentences
6. ✅ Preview pauses/resumes recognition correctly
7. ✅ Preview does NOT activate microphone from "off"
8. ✅ Missing voices shown honestly
9. ✅ Voice persistence by stable identity
10. ✅ replyLanguage passed to API
11. ✅ Build passes with 0 errors
12. ✅ Keyboard accessible
13. ✅ No invented voices or quality ratings
14. ✅ Recognition availability tracked separately from TTS

### Code Quality

- Clean separation of concerns (languages.ts utility module)
- Proper state management with React hooks
- Defensive error handling
- Type-safe TypeScript implementation
- Accessible UI with ARIA labels
- Consistent styling and UX patterns

### No Blockers Found

The implementation fully satisfies the approved requirements. No correctness, security, or data failures were identified. The feature is ready for user testing.

---

## Verdict: APPROVED ✅

All required functionality is correctly implemented with no material defects.
