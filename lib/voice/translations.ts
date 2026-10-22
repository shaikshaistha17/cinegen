/**
 * Voice UI translations for all supported languages
 * Used by CineGenDirector component for UI labels, messages, and instructions
 */

export interface VoiceTranslations {
  // State labels
  stateOff: string;
  stateAwaitingWake: string;
  stateListening: string;
  stateProcessing: string;
  stateSpeaking: string;
  stateError: string;
  
  // Headlines and supporting text
  headlineVoice: string;
  headlineTyping: string;
  supportingText: string;
  
  // Instructions and prompts
  typingWelcome: string;
  
  // Buttons
  buttonEnable: string;
  buttonStop: string;
  buttonTalkNow: string;
  buttonTypeInstead: string;
  buttonUseVoice: string;
  buttonSend: string;
  buttonPreview: string;
  buttonStopPreview: string;
  buttonReviewBrief: string;
  buttonRetry: string;
  buttonStopSpeaking: string;
  buttonInterrupt: string;
  
  // Settings
  settingsTitle: string;
  labelConversationLanguage: string;
  conversationLanguageDesc: string;
  labelInputLanguage: string;
  inputLanguageDesc: string;
  labelReplyLanguage: string;
  replyLanguageDesc: string;
  labelSpeakingVoice: string;
  speakingVoiceDesc: string;
  showAllVoices: string;
  advancedSettings: string;
  
  // Error messages
  errorMicDenied: string;
  errorNotSupported: string;
  errorLanguageNotSupported: string;
  errorNetwork: string;
  errorGeneric: string;
  errorMicCheck: string;
  
  // Warnings
  noVoiceAvailable: string;
  textOnlyMode: string;
  
  // Microphone check
  micCheckTitle: string;
  micCheckClose: string;
  micCheckAudioLevel: string;
  micCheckSpeak: string;
  
  // Titles and ARIA labels
  titleEnableSpokenReplies: string;
  titleDisableSpokenReplies: string;
  ariaReviewBrief: string;
  ariaStopVoice: string;
  ariaStopSpeaking: string;
  ariaInterrupt: string;
}

export const VOICE_TRANSLATIONS: Record<string, VoiceTranslations> = {
  // English
  "en": {
    stateOff: "Off",
    stateAwaitingWake: "Ready—say Hey CineGen or tap Talk now",
    stateListening: "Listening...",
    stateProcessing: "Thinking...",
    stateSpeaking: "Speaking...",
    stateError: "Error",
    
    headlineVoice: "Your idea. Say it out loud.",
    headlineTyping: "Type your idea.",
    supportingText: "Describe your campaign. Shape your brief.",
    
    typingWelcome: "Type your campaign idea or question below. Press Enter to send, Shift+Enter for a new line.",
    
    buttonEnable: "Enable Voice Assistant",
    buttonStop: "Stop",
    buttonTalkNow: "Talk now",
    buttonTypeInstead: "Type instead",
    buttonUseVoice: "Use Voice",
    buttonSend: "Send",
    buttonPreview: "Preview",
    buttonStopPreview: "Stop preview",
    buttonReviewBrief: "Review brief",
    buttonRetry: "Retry",
    buttonStopSpeaking: "Stop speaking",
    buttonInterrupt: "Interrupt & speak",
    
    settingsTitle: "Voice & Language Settings",
    labelConversationLanguage: "Conversation language",
    conversationLanguageDesc: "(primary language for your conversation)",
    labelInputLanguage: "I speak",
    inputLanguageDesc: "(language you speak to CineGen)",
    labelReplyLanguage: "Reply language",
    replyLanguageDesc: "(language for text responses)",
    labelSpeakingVoice: "Speaking voice",
    speakingVoiceDesc: "(text-to-speech voice)",
    showAllVoices: "Show all device voices",
    advancedSettings: "Advanced settings",
    
    errorMicDenied: "Microphone access denied. Please grant permission to use voice features.",
    errorNotSupported: "Voice features are not supported in this browser. Please try Chrome or Edge.",
    errorLanguageNotSupported: "speech recognition is not supported on this device. Try English or use Type instead.",
    errorNetwork: "Network error. Please check your connection.",
    errorGeneric: "Speech recognition error. Please try again.",
    errorMicCheck: "Could not access microphone. Please check permissions.",
    
    noVoiceAvailable: "No speaking voice available for {lang} on this device.",
    textOnlyMode: "Text replies will still work.",
    
    micCheckTitle: "Microphone Check",
    micCheckClose: "Close",
    micCheckAudioLevel: "Audio level",
    micCheckSpeak: "Speak to test your microphone",
    
    titleEnableSpokenReplies: "Enable spoken replies",
    titleDisableSpokenReplies: "Disable spoken replies",
    ariaReviewBrief: "Review campaign brief",
    ariaStopVoice: "Stop voice assistant",
    ariaStopSpeaking: "Stop speaking",
    ariaInterrupt: "Interrupt and speak",
  },
  
  // Telugu (te)
  "te": {
    stateOff: "ఆఫ్",
    stateAwaitingWake: "సిద్ధంగా ఉంది—'హే సినీజెన్' అనండి లేదా 'మాట్లాడండి' నొక్కండి",
    stateListening: "వింటున్నాను...",
    stateProcessing: "ఆలోచిస్తున్నాను...",
    stateSpeaking: "మాట్లాడుతున్నాను...",
    stateError: "ఎర్రర్",
    
    headlineVoice: "మీ ఆలోచన. బిగ్గరగా చెప్పండి.",
    headlineTyping: "మీ ఆలోచన టైప్ చేయండి.",
    supportingText: "మీ ప్రచారాన్ని వివరించండి. మీ బ్రీఫ్‌ను రూపొందించండి.",
    
    typingWelcome: "మీ ప్రచార ఆలోచన లేదా ప్రశ్న కింద టైప్ చేయండి. పంపడానికి Enter నొక్కండి, కొత్త లైన్ కోసం Shift+Enter.",
    
    buttonEnable: "వాయిస్ అసిస్టెంట్ ప్రారంభించండి",
    buttonStop: "ఆపండి",
    buttonTalkNow: "ఇప్పుడు మాట్లాడండి",
    buttonTypeInstead: "టైప్ చేయండి",
    buttonUseVoice: "వాయిస్ ఉపయోగించండి",
    buttonSend: "పంపండి",
    buttonPreview: "ప్రివ్యూ",
    buttonStopPreview: "ప్రివ్యూ ఆపండి",
    buttonReviewBrief: "బ్రీఫ్ సమీక్షించండి",
    buttonRetry: "మళ్లీ ప్రయత్నించండి",
    buttonStopSpeaking: "మాట్లాడడం ఆపండి",
    buttonInterrupt: "అంతరాయం & మాట్లాడండి",
    
    settingsTitle: "వాయిస్ & భాషా సెట్టింగ్‌లు",
    labelConversationLanguage: "సంభాషణ భాష",
    conversationLanguageDesc: "(మీ సంభాషణ కోసం ప్రాథమిక భాష)",
    labelInputLanguage: "నేను మాట్లాడేది",
    inputLanguageDesc: "(మీరు సినీజెన్‌తో మాట్లాడే భాష)",
    labelReplyLanguage: "ప్రత్యుత్తర భాష",
    replyLanguageDesc: "(టెక్స్ట్ ప్రత్యుత్తరాల భాష)",
    labelSpeakingVoice: "మాట్లాడే వాయిస్",
    speakingVoiceDesc: "(టెక్స్ట్-టు-స్పీచ్ వాయిస్)",
    showAllVoices: "అన్ని డివైస్ వాయిస్‌లు చూపించు",
    advancedSettings: "అధునాతన సెట్టింగ్‌లు",
    
    errorMicDenied: "మైక్రోఫోన్ యాక్సెస్ నిరాకరించబడింది. వాయిస్ ఫీచర్లు ఉపయోగించడానికి అనుమతి ఇవ్వండి.",
    errorNotSupported: "ఈ బ్రౌజర్‌లో వాయిస్ ఫీచర్లు సపోర్ట్ చేయబడవు. దయచేసి Chrome లేదా Edge ప్రయత్నించండి.",
    errorLanguageNotSupported: "స్పీచ్ రికగ్నిషన్ ఈ పరికరంలో సపోర్ట్ చేయబడదు. English ప్రయత్నించండి లేదా టైప్ చేయండి.",
    errorNetwork: "నెట్‌వర్క్ ఎర్రర్. దయచేసి మీ కనెక్షన్ తనిఖీ చేయండి.",
    errorGeneric: "స్పీచ్ రికగ్నిషన్ ఎర్రర్. దయచేసి మళ్లీ ప్రయత్నించండి.",
    errorMicCheck: "మైక్రోఫోన్‌ను యాక్సెస్ చేయలేకపోయింది. దయచేసి అనుమతులు తనిఖీ చేయండి.",
    
    noVoiceAvailable: "ఈ పరికరంలో {lang} కోసం మాట్లాడే వాయిస్ అందుబాటులో లేదు.",
    textOnlyMode: "టెక్స్ట్ ప్రత్యుత్తరాలు ఇప్పటికీ పని చేస్తాయి.",
    
    micCheckTitle: "మైక్రోఫోన్ తనిఖీ",
    micCheckClose: "మూసివేయండి",
    micCheckAudioLevel: "ఆడియో స్థాయి",
    micCheckSpeak: "మీ మైక్రోఫోన్ పరీక్షించడానికి మాట్లాడండి",
    
    titleEnableSpokenReplies: "మాట్లాడే ప్రత్యుత్తరాలను ప్రారంభించండి",
    titleDisableSpokenReplies: "మాట్లాడే ప్రత్యుత్తరాలను నిలిపివేయండి",
    ariaReviewBrief: "ప్రచార బ్రీఫ్ సమీక్షించండి",
    ariaStopVoice: "వాయిస్ అసిస్టెంట్ ఆపండి",
    ariaStopSpeaking: "మాట్లాడడం ఆపండి",
    ariaInterrupt: "అంతరాయం & మాట్లాడండి",
  },
  
  // Hindi (hi)
  "hi": {
    stateOff: "बंद",
    stateAwaitingWake: "तैयार—'हे सिनीजेन' कहें या 'बात करें' दबाएं",
    stateListening: "सुन रहा हूँ...",
    stateProcessing: "सोच रहा हूँ...",
    stateSpeaking: "बोल रहा हूँ...",
    stateError: "एरर",
    
    headlineVoice: "आपका विचार। ज़ोर से बोलें।",
    headlineTyping: "अपना विचार टाइप करें।",
    supportingText: "अपने अभियान का वर्णन करें। अपना ब्रीफ़ बनाएं।",
    
    typingWelcome: "नीचे अपना अभियान विचार या प्रश्न टाइप करें। भेजने के लिए Enter दबाएं, नई लाइन के लिए Shift+Enter।",
    
    buttonEnable: "वॉयस असिस्टेंट शुरू करें",
    buttonStop: "रोकें",
    buttonTalkNow: "अभी बात करें",
    buttonTypeInstead: "टाइप करें",
    buttonUseVoice: "वॉयस इस्तेमाल करें",
    buttonSend: "भेजें",
    buttonPreview: "प्रीव्यू",
    buttonStopPreview: "प्रीव्यू रोकें",
    buttonReviewBrief: "ब्रीफ़ की समीक्षा करें",
    buttonRetry: "पुनः प्रयास करें",
    buttonStopSpeaking: "बोलना बंद करें",
    buttonInterrupt: "बाधित करें और बोलें",
    
    settingsTitle: "वॉयस और भाषा सेटिंग्स",
    labelConversationLanguage: "बातचीत की भाषा",
    conversationLanguageDesc: "(आपकी बातचीत के लिए प्राथमिक भाषा)",
    labelInputLanguage: "मैं बोलता हूँ",
    inputLanguageDesc: "(वह भाषा जो आप सिनीजेन से बात करते हैं)",
    labelReplyLanguage: "जवाब की भाषा",
    replyLanguageDesc: "(टेक्स्ट जवाबों की भाषा)",
    labelSpeakingVoice: "बोलने वाली आवाज़",
    speakingVoiceDesc: "(टेक्स्ट-टू-स्पीच आवाज़)",
    showAllVoices: "सभी डिवाइस आवाज़ें दिखाएं",
    advancedSettings: "उन्नत सेटिंग्स",
    
    errorMicDenied: "माइक्रोफ़ोन एक्सेस अस्वीकृत। वॉयस फीचर्स के लिए अनुमति दें।",
    errorNotSupported: "इस ब्राउज़र में वॉयस फीचर्स समर्थित नहीं हैं। कृपया Chrome या Edge आज़माएं।",
    errorLanguageNotSupported: "स्पीच रिकग्निशन इस डिवाइस पर समर्थित नहीं है। English आज़माएं या टाइप करें।",
    errorNetwork: "नेटवर्क एरर। कृपया अपना कनेक्शन जांचें।",
    errorGeneric: "स्पीच रिकग्निशन एरर। कृपया पुनः प्रयास करें।",
    errorMicCheck: "माइक्रोफ़ोन एक्सेस नहीं हो सका। कृपया अनुमतियां जांचें।",
    
    noVoiceAvailable: "इस डिवाइस पर {lang} के लिए कोई बोलने वाली आवाज़ उपलब्ध नहीं है।",
    textOnlyMode: "टेक्स्ट जवाब अभी भी काम करेंगे।",
    
    micCheckTitle: "माइक्रोफ़ोन जांच",
    micCheckClose: "बंद करें",
    micCheckAudioLevel: "ऑडियो स्तर",
    micCheckSpeak: "अपने माइक्रोफ़ोन को परखने के लिए बोलें",
    
    titleEnableSpokenReplies: "बोले गए जवाब सक्षम करें",
    titleDisableSpokenReplies: "बोले गए जवाब अक्षम करें",
    ariaReviewBrief: "अभियान ब्रीफ़ की समीक्षा करें",
    ariaStopVoice: "वॉयस असिस्टेंट रोकें",
    ariaStopSpeaking: "बोलना बंद करें",
    ariaInterrupt: "बाधित करें और बोलें",
  },
  
  // Marathi (mr)
  "mr": {
    stateOff: "बंद",
    stateAwaitingWake: "तयार—'हे सिनीजेन' म्हणा किंवा 'बोला' दाबा",
    stateListening: "ऐकत आहे...",
    stateProcessing: "विचार करत आहे...",
    stateSpeaking: "बोलत आहे...",
    stateError: "एरर",
    
    headlineVoice: "तुमचा विचार। मोठ्याने बोला।",
    headlineTyping: "तुमचा विचार टाइप करा।",
    supportingText: "तुमच्या मोहिमेचे वर्णन करा। तुमचा ब्रीफ तयार करा।",
    
    typingWelcome: "खाली तुमचा मोहीम विचार किंवा प्रश्न टाइप करा। पाठवण्यासाठी Enter दाबा, नवीन ओळीसाठी Shift+Enter.",
    
    buttonEnable: "व्हॉइस असिस्टंट सुरू करा",
    buttonStop: "थांबवा",
    buttonTalkNow: "आता बोला",
    buttonTypeInstead: "टाइप करा",
    buttonUseVoice: "व्हॉइस वापरा",
    buttonSend: "पाठवा",
    buttonPreview: "प्रीव्ह्यू",
    buttonStopPreview: "प्रीव्ह्यू थांबवा",
    
    settingsTitle: "व्हॉइस आणि भाषा सेटिंग्ज",
    labelInputLanguage: "मी बोलतो",
    inputLanguageDesc: "(ज्या भाषेत तुम्ही सिनीजेनशी बोलता)",
    labelReplyLanguage: "उत्तराची भाषा",
    replyLanguageDesc: "(मजकूर उत्तरांची भाषा)",
    labelSpeakingVoice: "बोलणारा आवाज",
    speakingVoiceDesc: "(टेक्स्ट-टू-स्पीच आवाज)",
    showAllVoices: "सर्व डिव्हाइस आवाज दाखवा",
    
    errorMicDenied: "मायक्रोफोन प्रवेश नाकारला. व्हॉइस वैशिष्ट्यांसाठी परवानगी द्या.",
    errorNotSupported: "या ब्राउझरमध्ये व्हॉइस वैशिष्ट्ये समर्थित नाहीत. कृपया Chrome किंवा Edge वापरून पहा.",
    errorLanguageNotSupported: "स्पीच रेकग्निशन या डिव्हाइसवर समर्थित नाही. English वापरून पहा किंवा टाइप करा.",
    errorNetwork: "नेटवर्क एरर. कृपया तुमचे कनेक्शन तपासा.",
    errorGeneric: "स्पीच रेकग्निशन एरर. कृपया पुन्हा प्रयत्न करा.",
    errorMicCheck: "मायक्रोफोन प्रवेश मिळू शकला नाही. कृपया परवानग्या तपासा.",
    
    noVoiceAvailable: "या डिव्हाइसवर {lang} साठी कोणताही बोलणारा आवाज उपलब्ध नाही.",
    textOnlyMode: "मजकूर उत्तरे तरीही कार्य करतील.",
    
    buttonReviewBrief: "Review brief",
    buttonRetry: "Retry",
    buttonStopSpeaking: "Stop speaking",
    buttonInterrupt: "Interrupt & speak",
    labelConversationLanguage: "Conversation language",
    conversationLanguageDesc: "(primary language for your conversation)",
    advancedSettings: "Advanced settings",
    micCheckTitle: "Microphone Check",
    micCheckClose: "Close",
    micCheckAudioLevel: "Audio level",
    micCheckSpeak: "Speak to test your microphone",
    titleEnableSpokenReplies: "Enable spoken replies",
    titleDisableSpokenReplies: "Disable spoken replies",
    ariaReviewBrief: "Review campaign brief",
    ariaStopVoice: "Stop voice assistant",
    ariaStopSpeaking: "Stop speaking",
    ariaInterrupt: "Interrupt and speak",
  },
  
  // Tamil (ta)
  "ta": {
    stateOff: "ஆஃப்",
    stateAwaitingWake: "தயார்—'ஹே சினீஜென்' என்று கூறுங்கள் அல்லது 'பேசுங்கள்' அழுத்துங்கள்",
    stateListening: "கேட்கிறேன்...",
    stateProcessing: "சிந்திக்கிறேன்...",
    stateSpeaking: "பேசுகிறேன்...",
    stateError: "பிழை",
    
    headlineVoice: "உங்கள் யோசனை. சத்தமாக சொல்லுங்கள்.",
    headlineTyping: "உங்கள் யோசனையை டைப் செய்யுங்கள்.",
    supportingText: "உங்கள் பிரச்சாரத்தை விவரிக்கவும். உங்கள் சுருக்கத்தை உருவாக்குங்கள்.",
    
    typingWelcome: "கீழே உங்கள் பிரச்சார யோசனை அல்லது கேள்வியை டைப் செய்யுங்கள். அனுப்ப Enter அழுத்தவும், புதிய வரிக்கு Shift+Enter.",
    
    buttonEnable: "குரல் உதவியாளரைத் தொடங்கவும்",
    buttonStop: "நிறுத்து",
    buttonTalkNow: "இப்போது பேசுங்கள்",
    buttonTypeInstead: "டைப் செய்யுங்கள்",
    buttonUseVoice: "குரலைப் பயன்படுத்துங்கள்",
    buttonSend: "அனுப்பு",
    buttonPreview: "முன்னோட்டம்",
    buttonStopPreview: "முன்னோட்டத்தை நிறுத்து",
    
    settingsTitle: "குரல் & மொழி அமைப்புகள்",
    labelInputLanguage: "நான் பேசுவது",
    inputLanguageDesc: "(நீங்கள் சினீஜென் உடன் பேசும் மொழி)",
    labelReplyLanguage: "பதில் மொழி",
    replyLanguageDesc: "(உரை பதில்களுக்கான மொழி)",
    labelSpeakingVoice: "பேசும் குரல்",
    speakingVoiceDesc: "(உரை-க்கு-பேச்சு குரல்)",
    showAllVoices: "அனைத்து சாதன குரல்களையும் காட்டு",
    
    errorMicDenied: "மைக்ரோஃபோன் அணுகல் மறுக்கப்பட்டது. குரல் அம்சங்களுக்கு அனுமதி அளிக்கவும்.",
    errorNotSupported: "இந்த உலாவியில் குரல் அம்சங்கள் ஆதரிக்கப்படவில்லை. Chrome அல்லது Edge ஐ முயற்சிக்கவும்.",
    errorLanguageNotSupported: "பேச்சு அடையாளம் இந்த சாதனத்தில் ஆதரிக்கப்படவில்லை. English முயற்சிக்கவும் அல்லது டைப் செய்யுங்கள்.",
    errorNetwork: "நெட்வொர்க் பிழை. உங்கள் இணைப்பை சரிபார்க்கவும்.",
    errorGeneric: "பேச்சு அடையாளப் பிழை. மீண்டும் முயற்சிக்கவும்.",
    errorMicCheck: "மைக்ரோஃபோனை அணுக முடியவில்லை. அனுமதிகளைச் சரிபார்க்கவும்.",
    
    noVoiceAvailable: "இந்த சாதனத்தில் {lang} க்கான பேசும் குரல் கிடைக்கவில்லை.",
    textOnlyMode: "உரை பதில்கள் இன்னும் வேலை செய்யும்.",
    
    buttonReviewBrief: "Review brief",
    buttonRetry: "Retry",
    buttonStopSpeaking: "Stop speaking",
    buttonInterrupt: "Interrupt & speak",
    labelConversationLanguage: "Conversation language",
    conversationLanguageDesc: "(primary language for your conversation)",
    advancedSettings: "Advanced settings",
    micCheckTitle: "Microphone Check",
    micCheckClose: "Close",
    micCheckAudioLevel: "Audio level",
    micCheckSpeak: "Speak to test your microphone",
    titleEnableSpokenReplies: "Enable spoken replies",
    titleDisableSpokenReplies: "Disable spoken replies",
    ariaReviewBrief: "Review campaign brief",
    ariaStopVoice: "Stop voice assistant",
    ariaStopSpeaking: "Stop speaking",
    ariaInterrupt: "Interrupt and speak",
  },
  
  // Kannada (kn)
  "kn": {
    stateOff: "ಆಫ್",
    stateAwaitingWake: "ಸಿದ್ಧ—'ಹೇ ಸಿನೀಜೆನ್' ಎಂದು ಹೇಳಿ ಅಥವಾ 'ಮಾತನಾಡಿ' ಒತ್ತಿ",
    stateListening: "ಕೇಳುತ್ತಿದ್ದೇನೆ...",
    stateProcessing: "ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...",
    stateSpeaking: "ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ...",
    stateError: "ದೋಷ",
    
    headlineVoice: "ನಿಮ್ಮ ಆಲೋಚನೆ. ಜೋರಾಗಿ ಹೇಳಿ.",
    headlineTyping: "ನಿಮ್ಮ ಆಲೋಚನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ.",
    supportingText: "ನಿಮ್ಮ ಪ್ರಚಾರವನ್ನು ವಿವರಿಸಿ. ನಿಮ್ಮ ಸಂಕ್ಷಿಪ್ತವನ್ನು ರೂಪಿಸಿ.",
    
    typingWelcome: "ಕೆಳಗೆ ನಿಮ್ಮ ಪ್ರಚಾರ ಆಲೋಚನೆ ಅಥವಾ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ. ಕಳುಹಿಸಲು Enter ಒತ್ತಿ, ಹೊಸ ಸಾಲಿಗಾಗಿ Shift+Enter.",
    
    buttonEnable: "ವಾಯ್ಸ್ ಅಸಿಸ್ಟೆಂಟ್ ಪ್ರಾರಂಭಿಸಿ",
    buttonStop: "ನಿಲ್ಲಿಸಿ",
    buttonTalkNow: "ಈಗ ಮಾತನಾಡಿ",
    buttonTypeInstead: "ಟೈಪ್ ಮಾಡಿ",
    buttonUseVoice: "ವಾಯ್ಸ್ ಬಳಸಿ",
    buttonSend: "ಕಳುಹಿಸಿ",
    buttonPreview: "ಪೂರ್ವವೀಕ್ಷಣೆ",
    buttonStopPreview: "ಪೂರ್ವವೀಕ್ಷಣೆ ನಿಲ್ಲಿಸಿ",
    
    settingsTitle: "ವಾಯ್ಸ್ ಮತ್ತು ಭಾಷಾ ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    labelInputLanguage: "ನಾನು ಮಾತನಾಡುವುದು",
    inputLanguageDesc: "(ನೀವು ಸಿನೀಜೆನ್ ಜೊತೆ ಮಾತನಾಡುವ ಭಾಷೆ)",
    labelReplyLanguage: "ಉತ್ತರದ ಭಾಷೆ",
    replyLanguageDesc: "(ಪಠ್ಯ ಉತ್ತರಗಳ ಭಾಷೆ)",
    labelSpeakingVoice: "ಮಾತನಾಡುವ ಧ್ವನಿ",
    speakingVoiceDesc: "(ಪಠ್ಯ-ಟು-ಸ್ಪೀಚ್ ಧ್ವನಿ)",
    showAllVoices: "ಎಲ್ಲಾ ಸಾಧನದ ಧ್ವನಿಗಳನ್ನು ತೋರಿಸಿ",
    
    errorMicDenied: "ಮೈಕ್ರೋಫೋನ್ ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ. ವಾಯ್ಸ್ ವೈಶಿಷ್ಟ್ಯಗಳಿಗಾಗಿ ಅನುಮತಿ ನೀಡಿ.",
    errorNotSupported: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ವಾಯ್ಸ್ ವೈಶಿಷ್ಟ್ಯಗಳು ಬೆಂಬಲಿತವಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು Chrome ಅಥವಾ Edge ಪ್ರಯತ್ನಿಸಿ.",
    errorLanguageNotSupported: "ಸ್ಪೀಚ್ ರೆಕಗ್ನಿಷನ್ ಈ ಸಾಧನದಲ್ಲಿ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ. English ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.",
    errorNetwork: "ನೆಟ್‌ವರ್ಕ್ ದೋಷ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ.",
    errorGeneric: "ಸ್ಪೀಚ್ ರೆಕಗ್ನಿಷನ್ ದೋಷ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    errorMicCheck: "ಮೈಕ್ರೋಫೋನ್ ಪ್ರವೇಶಿಸಲಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಅನುಮತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
    
    noVoiceAvailable: "ಈ ಸಾಧನದಲ್ಲಿ {lang} ಗಾಗಿ ಯಾವುದೇ ಮಾತನಾಡುವ ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ.",
    textOnlyMode: "ಪಠ್ಯ ಉತ್ತರಗಳು ಇನ್ನೂ ಕೆಲಸ ಮಾಡುತ್ತವೆ.",
    
    buttonReviewBrief: "Review brief",
    buttonRetry: "Retry",
    buttonStopSpeaking: "Stop speaking",
    buttonInterrupt: "Interrupt & speak",
    labelConversationLanguage: "Conversation language",
    conversationLanguageDesc: "(primary language for your conversation)",
    advancedSettings: "Advanced settings",
    micCheckTitle: "Microphone Check",
    micCheckClose: "Close",
    micCheckAudioLevel: "Audio level",
    micCheckSpeak: "Speak to test your microphone",
    titleEnableSpokenReplies: "Enable spoken replies",
    titleDisableSpokenReplies: "Disable spoken replies",
    ariaReviewBrief: "Review campaign brief",
    ariaStopVoice: "Stop voice assistant",
    ariaStopSpeaking: "Stop speaking",
    ariaInterrupt: "Interrupt and speak",
  },
  
  // Malayalam (ml)
  "ml": {
    stateOff: "ഓഫ്",
    stateAwaitingWake: "തയ്യാറാണ്—'ഹേ സിനീജെൻ' എന്ന് പറയുക അല്ലെങ്കിൽ 'സംസാരിക്കുക' അമർത്തുക",
    stateListening: "കേൾക്കുന്നു...",
    stateProcessing: "ചിന്തിക്കുന്നു...",
    stateSpeaking: "സംസാരിക്കുന്നു...",
    stateError: "പിശക്",
    
    headlineVoice: "നിങ്ങളുടെ ആശയം. ഉറക്കെ പറയുക.",
    headlineTyping: "നിങ്ങളുടെ ആശയം ടൈപ്പ് ചെയ്യുക.",
    supportingText: "നിങ്ങളുടെ കാമ്പെയ്‌ൻ വിവരിക്കുക. നിങ്ങളുടെ സംഗ്രഹം രൂപപ്പെടുത്തുക.",
    
    typingWelcome: "താഴെ നിങ്ങളുടെ കാമ്പെയ്‌ൻ ആശയമോ ചോദ്യമോ ടൈപ്പ് ചെയ്യുക. അയയ്‌ക്കാൻ Enter അമർത്തുക, പുതിയ വരിക്ക് Shift+Enter.",
    
    buttonEnable: "വോയ്‌സ് അസിസ്റ്റന്റ് ആരംഭിക്കുക",
    buttonStop: "നിർത്തുക",
    buttonTalkNow: "ഇപ്പോൾ സംസാരിക്കുക",
    buttonTypeInstead: "ടൈപ്പ് ചെയ്യുക",
    buttonUseVoice: "വോയ്‌സ് ഉപയോഗിക്കുക",
    buttonSend: "അയയ്‌ക്കുക",
    buttonPreview: "പ്രിവ്യൂ",
    buttonStopPreview: "പ്രിവ്യൂ നിർത്തുക",
    
    settingsTitle: "വോയ്‌സ് & ഭാഷാ ക്രമീകരണങ്ങൾ",
    labelInputLanguage: "ഞാൻ സംസാരിക്കുന്നത്",
    inputLanguageDesc: "(നിങ്ങൾ സിനീജെനോട് സംസാരിക്കുന്ന ഭാഷ)",
    labelReplyLanguage: "മറുപടി ഭാഷ",
    replyLanguageDesc: "(വാചക മറുപടികളുടെ ഭാഷ)",
    labelSpeakingVoice: "സംസാരിക്കുന്ന ശബ്ദം",
    speakingVoiceDesc: "(വാചക-ടു-സ്പീച്ച് ശബ്ദം)",
    showAllVoices: "എല്ലാ ഉപകരണ ശബ്ദങ്ങളും കാണിക്കുക",
    
    errorMicDenied: "മൈക്രോഫോൺ ആക്‌സസ് നിരസിച്ചു. വോയ്‌സ് സവിശേഷതകൾക്ക് അനുമതി നൽകുക.",
    errorNotSupported: "ഈ ബ്രൗസറിൽ വോയ്‌സ് സവിശേഷതകൾ പിന്തുണയ്‌ക്കുന്നില്ല. Chrome അല്ലെങ്കിൽ Edge പരീക്ഷിക്കുക.",
    errorLanguageNotSupported: "സ്പീച്ച് റെക്കഗ്നിഷൻ ഈ ഉപകരണത്തിൽ പിന്തുണയ്‌ക്കുന്നില്ല. English പരീക്ഷിക്കുക അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക.",
    errorNetwork: "നെറ്റ്‌വർക്ക് പിശക്. നിങ്ങളുടെ കണക്ഷൻ പരിശോധിക്കുക.",
    errorGeneric: "സ്പീച്ച് റെക്കഗ്നിഷൻ പിശക്. ദയവായി വീണ്ടും ശ്രമിക്കുക.",
    errorMicCheck: "മൈക്രോഫോൺ ആക്‌സസ് ചെയ്യാനായില്ല. ദയവായി അനുമതികൾ പരിശോധിക്കുക.",
    
    noVoiceAvailable: "ഈ ഉപകരണത്തിൽ {lang} നായി സംസാരിക്കുന്ന ശബ്ദം ലഭ്യമല്ല.",
    textOnlyMode: "വാചക മറുപടികൾ ഇപ്പോഴും പ്രവർത്തിക്കും.",
    
    buttonReviewBrief: "Review brief",
    buttonRetry: "Retry",
    buttonStopSpeaking: "Stop speaking",
    buttonInterrupt: "Interrupt & speak",
    labelConversationLanguage: "Conversation language",
    conversationLanguageDesc: "(primary language for your conversation)",
    advancedSettings: "Advanced settings",
    micCheckTitle: "Microphone Check",
    micCheckClose: "Close",
    micCheckAudioLevel: "Audio level",
    micCheckSpeak: "Speak to test your microphone",
    titleEnableSpokenReplies: "Enable spoken replies",
    titleDisableSpokenReplies: "Disable spoken replies",
    ariaReviewBrief: "Review campaign brief",
    ariaStopVoice: "Stop voice assistant",
    ariaStopSpeaking: "Stop speaking",
    ariaInterrupt: "Interrupt and speak",
  },
  
  // Bengali (bn)
  "bn": {
    stateOff: "অফ",
    stateAwaitingWake: "প্রস্তুত—'হে সিনীজেন' বলুন বা 'কথা বলুন' চাপুন",
    stateListening: "শুনছি...",
    stateProcessing: "ভাবছি...",
    stateSpeaking: "বলছি...",
    stateError: "ত্রুটি",
    
    headlineVoice: "আপনার ধারণা। জোরে বলুন।",
    headlineTyping: "আপনার ধারণা টাইপ করুন।",
    supportingText: "আপনার প্রচারণা বর্ণনা করুন। আপনার সংক্ষিপ্ত বিবরণ তৈরি করুন।",
    
    typingWelcome: "নীচে আপনার প্রচারণা ধারণা বা প্রশ্ন টাইপ করুন। পাঠাতে Enter চাপুন, নতুন লাইনের জন্য Shift+Enter.",
    
    buttonEnable: "ভয়েস সহায়ক শুরু করুন",
    buttonStop: "থামুন",
    buttonTalkNow: "এখন কথা বলুন",
    buttonTypeInstead: "টাইপ করুন",
    buttonUseVoice: "ভয়েস ব্যবহার করুন",
    buttonSend: "পাঠান",
    buttonPreview: "প্রিভিউ",
    buttonStopPreview: "প্রিভিউ থামান",
    
    settingsTitle: "ভয়েস ও ভাষা সেটিংস",
    labelInputLanguage: "আমি বলি",
    inputLanguageDesc: "(আপনি সিনীজেনের সাথে যে ভাষায় কথা বলেন)",
    labelReplyLanguage: "উত্তরের ভাষা",
    replyLanguageDesc: "(পাঠ্য উত্তরের ভাষা)",
    labelSpeakingVoice: "কথা বলার কণ্ঠস্বর",
    speakingVoiceDesc: "(পাঠ্য-থেকে-বক্তৃতা কণ্ঠস্বর)",
    showAllVoices: "সমস্ত ডিভাইস কণ্ঠস্বর দেখান",
    
    errorMicDenied: "মাইক্রোফোন অ্যাক্সেস প্রত্যাখ্যান করা হয়েছে। ভয়েস বৈশিষ্ট্যগুলির জন্য অনুমতি দিন।",
    errorNotSupported: "এই ব্রাউজারে ভয়েস বৈশিষ্ট্য সমর্থিত নয়। দয়া করে Chrome বা Edge ব্যবহার করে দেখুন।",
    errorLanguageNotSupported: "স্পিচ রিকগনিশন এই ডিভাইসে সমর্থিত নয়। English চেষ্টা করুন বা টাইপ করুন।",
    errorNetwork: "নেটওয়ার্ক ত্রুটি। দয়া করে আপনার সংযোগ পরীক্ষা করুন।",
    errorGeneric: "স্পিচ রিকগনিশন ত্রুটি। দয়া করে আবার চেষ্টা করুন।",
    errorMicCheck: "মাইক্রোফোন অ্যাক্সেস করতে পারেনি। দয়া করে অনুমতিগুলি পরীক্ষা করুন।",
    
    noVoiceAvailable: "এই ডিভাইসে {lang} এর জন্য কোন কথা বলার কণ্ঠস্বর উপলব্ধ নেই।",
    textOnlyMode: "পাঠ্য উত্তরগুলি এখনও কাজ করবে।",
    
    buttonReviewBrief: "Review brief",
    buttonRetry: "Retry",
    buttonStopSpeaking: "Stop speaking",
    buttonInterrupt: "Interrupt & speak",
    labelConversationLanguage: "Conversation language",
    conversationLanguageDesc: "(primary language for your conversation)",
    advancedSettings: "Advanced settings",
    micCheckTitle: "Microphone Check",
    micCheckClose: "Close",
    micCheckAudioLevel: "Audio level",
    micCheckSpeak: "Speak to test your microphone",
    titleEnableSpokenReplies: "Enable spoken replies",
    titleDisableSpokenReplies: "Disable spoken replies",
    ariaReviewBrief: "Review campaign brief",
    ariaStopVoice: "Stop voice assistant",
    ariaStopSpeaking: "Stop speaking",
    ariaInterrupt: "Interrupt and speak",
  },
  
  // Gujarati (gu)
  "gu": {
    stateOff: "બંધ",
    stateAwaitingWake: "તૈયાર—'હે સિનીજેન' કહો અથવા 'બોલો' દબાવો",
    stateListening: "સાંભળી રહ્યો છું...",
    stateProcessing: "વિચારી રહ્યો છું...",
    stateSpeaking: "બોલી રહ્યો છું...",
    stateError: "ભૂલ",
    
    headlineVoice: "તમારો વિચાર. જોરથી બોલો.",
    headlineTyping: "તમારો વિચાર ટાઇપ કરો.",
    supportingText: "તમારી ઝુંબેશનું વર્ણન કરો. તમારું સંક્ષિપ્ત વર્ણન બનાવો.",
    
    typingWelcome: "નીચે તમારી ઝુંબેશ વિચાર અથવા પ્રશ્ન ટાઇપ કરો. મોકલવા માટે Enter દબાવો, નવી લાઇન માટે Shift+Enter.",
    
    buttonEnable: "વૉઇસ સહાયક શરૂ કરો",
    buttonStop: "રોકો",
    buttonTalkNow: "હવે બોલો",
    buttonTypeInstead: "ટાઇપ કરો",
    buttonUseVoice: "વૉઇસ વાપરો",
    buttonSend: "મોકલો",
    buttonPreview: "પૂર્વાવલોકન",
    buttonStopPreview: "પૂર્વાવલોકન રોકો",
    
    settingsTitle: "વૉઇસ અને ભાષા સેટિંગ્સ",
    labelInputLanguage: "હું બોલું છું",
    inputLanguageDesc: "(તમે સિનીજેન સાથે જે ભાષામાં બોલો છો)",
    labelReplyLanguage: "જવાબની ભાષા",
    replyLanguageDesc: "(ટેક્સ્ટ જવાબોની ભાષા)",
    labelSpeakingVoice: "બોલતો અવાજ",
    speakingVoiceDesc: "(ટેક્સ્ટ-ટુ-સ્પીચ અવાજ)",
    showAllVoices: "બધા ઉપકરણ અવાજો બતાવો",
    
    errorMicDenied: "માઇક્રોફોન ઍક્સેસ નકારવામાં આવી. વૉઇસ સુવિધાઓ માટે પરવાનગી આપો.",
    errorNotSupported: "આ બ્રાઉઝરમાં વૉઇસ સુવિધાઓ સમર્થિત નથી. કૃપા કરીને Chrome અથવા Edge અજમાવો.",
    errorLanguageNotSupported: "સ્પીચ રિકગ્નિશન આ ઉપકરણ પર સમર્થિત નથી. English અજમાવો અથવા ટાઇપ કરો.",
    errorNetwork: "નેટવર્ક ભૂલ. કૃપા કરીને તમારું કનેક્શન તપાસો.",
    errorGeneric: "સ્પીચ રિકગ્નિશન ભૂલ. કૃપા કરીને ફરી પ્રયાસ કરો.",
    errorMicCheck: "માઇક્રોફોન ઍક્સેસ કરી શકાયું નહીં. કૃપા કરીને પરવાનગીઓ તપાસો.",
    
    noVoiceAvailable: "આ ઉપકરણ પર {lang} માટે કોઈ બોલતો અવાજ ઉપલબ્ધ નથી.",
    textOnlyMode: "ટેક્સ્ટ જવાબો હજી પણ કાર્ય કરશે.",
    
    buttonReviewBrief: "Review brief",
    buttonRetry: "Retry",
    buttonStopSpeaking: "Stop speaking",
    buttonInterrupt: "Interrupt & speak",
    labelConversationLanguage: "Conversation language",
    conversationLanguageDesc: "(primary language for your conversation)",
    advancedSettings: "Advanced settings",
    micCheckTitle: "Microphone Check",
    micCheckClose: "Close",
    micCheckAudioLevel: "Audio level",
    micCheckSpeak: "Speak to test your microphone",
    titleEnableSpokenReplies: "Enable spoken replies",
    titleDisableSpokenReplies: "Disable spoken replies",
    ariaReviewBrief: "Review campaign brief",
    ariaStopVoice: "Stop voice assistant",
    ariaStopSpeaking: "Stop speaking",
    ariaInterrupt: "Interrupt and speak",
  },
  
  // Punjabi (pa)
  "pa": {
    stateOff: "ਬੰਦ",
    stateAwaitingWake: "ਤਿਆਰ—'ਹੇ ਸਿਨੀਜੇਨ' ਕਹੋ ਜਾਂ 'ਗੱਲ ਕਰੋ' ਦਬਾਓ",
    stateListening: "ਸੁਣ ਰਿਹਾ ਹਾਂ...",
    stateProcessing: "ਸੋਚ ਰਿਹਾ ਹਾਂ...",
    stateSpeaking: "ਬੋਲ ਰਿਹਾ ਹਾਂ...",
    stateError: "ਗਲਤੀ",
    
    headlineVoice: "ਤੁਹਾਡਾ ਵਿਚਾਰ। ਉੱਚੀ ਆਵਾਜ਼ ਵਿੱਚ ਬੋਲੋ।",
    headlineTyping: "ਆਪਣਾ ਵਿਚਾਰ ਟਾਈਪ ਕਰੋ।",
    supportingText: "ਆਪਣੀ ਮੁਹਿੰਮ ਦਾ ਵਰਣਨ ਕਰੋ। ਆਪਣਾ ਸੰਖੇਪ ਬਣਾਓ।",
    
    typingWelcome: "ਹੇਠਾਂ ਆਪਣੀ ਮੁਹਿੰਮ ਦਾ ਵਿਚਾਰ ਜਾਂ ਸਵਾਲ ਟਾਈਪ ਕਰੋ। ਭੇਜਣ ਲਈ Enter ਦਬਾਓ, ਨਵੀਂ ਲਾਈਨ ਲਈ Shift+Enter.",
    
    buttonEnable: "ਵੌਇਸ ਅਸਿਸਟੈਂਟ ਸ਼ੁਰੂ ਕਰੋ",
    buttonStop: "ਰੋਕੋ",
    buttonTalkNow: "ਹੁਣ ਗੱਲ ਕਰੋ",
    buttonTypeInstead: "ਟਾਈਪ ਕਰੋ",
    buttonUseVoice: "ਵੌਇਸ ਵਰਤੋ",
    buttonSend: "ਭੇਜੋ",
    buttonPreview: "ਪੂਰਵਦਰਸ਼ਨ",
    buttonStopPreview: "ਪੂਰਵਦਰਸ਼ਨ ਰੋਕੋ",
    
    settingsTitle: "ਵੌਇਸ ਅਤੇ ਭਾਸ਼ਾ ਸੈਟਿੰਗਾਂ",
    labelInputLanguage: "ਮੈਂ ਬੋਲਦਾ ਹਾਂ",
    inputLanguageDesc: "(ਜਿਹੜੀ ਭਾਸ਼ਾ ਵਿੱਚ ਤੁਸੀਂ ਸਿਨੀਜੇਨ ਨਾਲ ਗੱਲ ਕਰਦੇ ਹੋ)",
    labelReplyLanguage: "ਜਵਾਬ ਦੀ ਭਾਸ਼ਾ",
    replyLanguageDesc: "(ਟੈਕਸਟ ਜਵਾਬਾਂ ਦੀ ਭਾਸ਼ਾ)",
    labelSpeakingVoice: "ਬੋਲਣ ਵਾਲੀ ਆਵਾਜ਼",
    speakingVoiceDesc: "(ਟੈਕਸਟ-ਟੂ-ਸਪੀਚ ਆਵਾਜ਼)",
    showAllVoices: "ਸਾਰੇ ਡਿਵਾਈਸ ਆਵਾਜ਼ਾਂ ਦਿਖਾਓ",
    
    errorMicDenied: "ਮਾਈਕ੍ਰੋਫੋਨ ਐਕਸੈਸ ਇਨਕਾਰ ਕੀਤੀ ਗਈ। ਵੌਇਸ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਲਈ ਇਜਾਜ਼ਤ ਦਿਓ।",
    errorNotSupported: "ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਵੌਇਸ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਸਮਰਥਿਤ ਨਹੀਂ ਹਨ। ਕਿਰਪਾ ਕਰਕੇ Chrome ਜਾਂ Edge ਅਜ਼ਮਾਓ।",
    errorLanguageNotSupported: "ਸਪੀਚ ਰਿਕਗਨੀਸ਼ਨ ਇਸ ਡਿਵਾਈਸ 'ਤੇ ਸਮਰਥਿਤ ਨਹੀਂ ਹੈ। English ਅਜ਼ਮਾਓ ਜਾਂ ਟਾਈਪ ਕਰੋ।",
    errorNetwork: "ਨੈੱਟਵਰਕ ਗਲਤੀ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਕਨੈਕਸ਼ਨ ਜਾਂਚੋ।",
    errorGeneric: "ਸਪੀਚ ਰਿਕਗਨੀਸ਼ਨ ਗਲਤੀ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
    errorMicCheck: "ਮਾਈਕ੍ਰੋਫੋਨ ਐਕਸੈਸ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਇਜਾਜ਼ਤਾਂ ਜਾਂਚੋ।",
    
    noVoiceAvailable: "ਇਸ ਡਿਵਾਈਸ 'ਤੇ {lang} ਲਈ ਕੋਈ ਬੋਲਣ ਵਾਲੀ ਆਵਾਜ਼ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।",
    textOnlyMode: "ਟੈਕਸਟ ਜਵਾਬ ਅਜੇ ਵੀ ਕੰਮ ਕਰਨਗੇ।",
    
    buttonReviewBrief: "Review brief",
    buttonRetry: "Retry",
    buttonStopSpeaking: "Stop speaking",
    buttonInterrupt: "Interrupt & speak",
    labelConversationLanguage: "Conversation language",
    conversationLanguageDesc: "(primary language for your conversation)",
    advancedSettings: "Advanced settings",
    micCheckTitle: "Microphone Check",
    micCheckClose: "Close",
    micCheckAudioLevel: "Audio level",
    micCheckSpeak: "Speak to test your microphone",
    titleEnableSpokenReplies: "Enable spoken replies",
    titleDisableSpokenReplies: "Disable spoken replies",
    ariaReviewBrief: "Review campaign brief",
    ariaStopVoice: "Stop voice assistant",
    ariaStopSpeaking: "Stop speaking",
    ariaInterrupt: "Interrupt and speak",
  },
};

/**
 * Get translations for a language code
 * Falls back to English if language not found
 */
export function getTranslations(languageCode: string): VoiceTranslations {
  const langPrefix = languageCode.split("-")[0];
  return VOICE_TRANSLATIONS[langPrefix] || VOICE_TRANSLATIONS["en"];
}

/**
 * Get a single translated string with language name interpolation
 */
export function getTranslation(
  languageCode: string,
  key: keyof VoiceTranslations,
  langName?: string
): string {
  const t = getTranslations(languageCode);
  let text = t[key];
  
  // Handle interpolation for {lang} placeholder
  if (langName && text.includes("{lang}")) {
    text = text.replace("{lang}", langName);
  }
  
  return text;
}
