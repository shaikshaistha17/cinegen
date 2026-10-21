/**
 * Language and voice utilities for CineGen Director
 */

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  recognitionSupported: boolean;
}

// Prioritized language list with native names
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "en-IN", name: "English (India)", nativeName: "English (India)", recognitionSupported: true },
  { code: "en-US", name: "English (United States)", nativeName: "English (United States)", recognitionSupported: true },
  { code: "en-GB", name: "English (United Kingdom)", nativeName: "English (United Kingdom)", recognitionSupported: true },
  { code: "te-IN", name: "Telugu", nativeName: "తెలుగు / Telugu", recognitionSupported: false },
  { code: "hi-IN", name: "Hindi", nativeName: "हिन्दी / Hindi", recognitionSupported: true },
  { code: "ta-IN", name: "Tamil", nativeName: "தமிழ் / Tamil", recognitionSupported: false },
  { code: "kn-IN", name: "Kannada", nativeName: "ಕನ್ನಡ / Kannada", recognitionSupported: false },
  { code: "ml-IN", name: "Malayalam", nativeName: "മലയാളം / Malayalam", recognitionSupported: false },
  { code: "mr-IN", name: "Marathi", nativeName: "मराठी / Marathi", recognitionSupported: false },
  { code: "bn-IN", name: "Bengali", nativeName: "বাংলা / Bengali", recognitionSupported: false },
  { code: "gu-IN", name: "Gujarati", nativeName: "ગુજરાતી / Gujarati", recognitionSupported: false },
  { code: "pa-IN", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ / Punjabi", recognitionSupported: false },
];

// Novelty voices to filter out by default
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

// Native-language preview sentences
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

/**
 * Get preview sentence for a language code
 */
export function getPreviewSentence(languageCode: string): string {
  const langPrefix = languageCode.split("-")[0];
  return PREVIEW_SENTENCES[langPrefix] || PREVIEW_SENTENCES["en"];
}

/**
 * Filter voices by language prefix
 */
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

/**
 * Format voice display string
 */
export function formatVoiceDisplay(voice: SpeechSynthesisVoice): string {
  const lang = SUPPORTED_LANGUAGES.find(l => voice.lang.startsWith(l.code.split("-")[0]));
  const langDisplay = lang ? lang.name : voice.lang;
  const voiceType = voice.localService ? "Device voice" : "Network voice";
  
  return `${langDisplay} · ${voice.name} · ${voiceType}`;
}

/**
 * Voice identity for persistence
 */
export interface VoiceIdentity {
  name: string;
  lang: string;
  voiceURI: string;
}

/**
 * Serialize voice to stable identity
 */
export function serializeVoice(voice: SpeechSynthesisVoice): VoiceIdentity {
  return {
    name: voice.name,
    lang: voice.lang,
    voiceURI: voice.voiceURI,
  };
}

/**
 * Find matching voice from identity
 */
export function findVoiceByIdentity(
  voices: SpeechSynthesisVoice[],
  identity: VoiceIdentity
): SpeechSynthesisVoice | null {
  // Try exact match first (name + lang + URI)
  let match = voices.find(
    v => v.name === identity.name && v.lang === identity.lang && v.voiceURI === identity.voiceURI
  );
  
  if (match) return match;
  
  // Fallback: match by name and lang only
  match = voices.find(v => v.name === identity.name && v.lang === identity.lang);
  
  if (match) return match;
  
  // No match found
  return null;
}

/**
 * Get language name from code
 */
export function getLanguageName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang ? lang.name : code;
}

/**
 * Get first available voice for a language
 */
export function getDefaultVoiceForLanguage(
  voices: SpeechSynthesisVoice[],
  languageCode: string,
  includeNovelty = false
): SpeechSynthesisVoice | null {
  const filtered = filterVoicesByLanguage(voices, languageCode, includeNovelty);
  return filtered.length > 0 ? filtered[0] : null;
}
