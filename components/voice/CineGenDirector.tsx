"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Volume2, VolumeX, Square, Keyboard,
  Loader2, AlertCircle, CheckCircle2, Sparkles, Send, User, Settings, ChevronDown, ChevronUp
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAuth } from "@/lib/auth-context";
import type { ConversationMessage, CampaignDraft, DirectorAction } from "@/types";
import {
  SUPPORTED_LANGUAGES,
  getPreviewSentence,
  filterVoicesByLanguage,
  formatVoiceDisplay,
  serializeVoice,
  findVoiceByIdentity,
  getLanguageName,
  getDefaultVoiceForLanguage,
  type VoiceIdentity
} from "@/lib/voice/languages";
import { getTranslations } from "@/lib/voice/translations";

type AssistantState = 
  | "off"           // Not started
  | "awaiting_wake" // Listening for "Hey CineGen"
  | "listening"     // Actively capturing user input
  | "processing"    // Generating brief
  | "speaking"      // Playing response
  | "error";        // Error state

interface TimingMetrics {
  enableClickTime?: number;
  recognitionReadyTime?: number;
  wakeDetectedTime?: number;
  ackStartTime?: number;
  commandEndTime?: number;
  requestStartTime?: number;
  responseReadyTime?: number;
  ttsStartTime?: number;
}

export default function CineGenDirector() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const { user } = useAuth();
  const displayName = user?.name || "";
  
  // State
  const [state, setState] = useState<AssistantState>("off");
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [campaignDraft, setCampaignDraft] = useState<CampaignDraft | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [typingMode, setTypingMode] = useState(false);
  const [typedInput, setTypedInput] = useState("");
  const [generatedBrief, setGeneratedBrief] = useState<any>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [showVoicePreview, setShowVoicePreview] = useState(false);
  const [showFullConversation, setShowFullConversation] = useState(false);
  const [showMicCheck, setShowMicCheck] = useState(false);
  const [micCheckStream, setMicCheckStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const micCheckAnimationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // New voice settings state
  const [inputLanguage, setInputLanguage] = useState("en-IN");
  const [replyLanguage, setReplyLanguage] = useState("en-US");
  
  // Get translations based on reply language
  const t = getTranslations(replyLanguage);
  
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showAllVoices, setShowAllVoices] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [recognitionWasActiveBeforePreview, setRecognitionWasActiveBeforePreview] = useState(false);
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isProcessingRef = useRef(false);
  const wakeWordDetectedRef = useRef(false);
  const lastUserMessageRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timingRef = useRef<TimingMetrics>({});
  const errorRetryCountRef = useRef(0);
  const startRecognitionRef = useRef<() => void>(() => {});
  
  // Check browser support
  const [isSupported, setIsSupported] = useState(false);
  
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition && 'speechSynthesis' in window);
  }, []);
  
  // Load settings from localStorage on mount
  useEffect(() => {
    const savedInputLang = localStorage.getItem('cinegen_input_lang');
    const savedReplyLang = localStorage.getItem('cinegen_reply_lang');
    
    if (savedInputLang) setInputLanguage(savedInputLang);
    if (savedReplyLang) setReplyLanguage(savedReplyLang);
  }, []);
  
  // Load latest active conversation on mount
  useEffect(() => {
    if (!user) {
      setLoadingConversation(false);
      return;
    }
    
    async function loadLatestConversation() {
      setLoadingConversation(true);
      try {
        const res = await fetch('/api/director/conversations');
        if (!res.ok) {
          console.error('Failed to load conversations:', await res.text());
          setLoadingConversation(false);
          return;
        }
        
        const data = await res.json();
        const conversations = data.conversations || [];
        
        if (conversations.length > 0) {
          // Load most recent active conversation
          const latest = conversations[0];
          setConversationId(latest.id);
          
          // Load messages
          const msgRes = await fetch(`/api/director/conversations/${latest.id}`);
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            const loadedMessages = (msgData.messages || []).map((m: any) => ({
              role: m.role,
              text: m.content,
              timestamp: Date.parse(m.created_at)
            }));
            setMessages(loadedMessages);
          }
        } else {
          // No conversations yet — will be created on first message
          setConversationId(null);
          setMessages([]);
        }
      } catch (error) {
        console.error('Failed to load conversation:', error);
      } finally {
        setLoadingConversation(false);
      }
    }
    
    loadLatestConversation();
  }, [user]);
  
  // Load voices and handle voice selection
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Try to restore saved voice from localStorage
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
      
      // No saved voice or not found - select default for reply language
      if (voices.length > 0) {
        const defaultVoice = getDefaultVoiceForLanguage(voices, replyLanguage, false);
        if (defaultVoice) {
          setSelectedVoice(defaultVoice);
        } else {
          // Fallback to first English voice if reply language has no voices
          const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
          setSelectedVoice(englishVoice);
        }
      }
    };
    
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [replyLanguage]);
  
  // Save selected voice to localStorage
  useEffect(() => {
    if (selectedVoice) {
      const identity = serializeVoice(selectedVoice);
      localStorage.setItem('cinegen_voice_identity', JSON.stringify(identity));
    }
  }, [selectedVoice]);
  
  // Save language settings to localStorage
  useEffect(() => {
    localStorage.setItem('cinegen_input_lang', inputLanguage);
  }, [inputLanguage]);
  
  useEffect(() => {
    localStorage.setItem('cinegen_reply_lang', replyLanguage);
  }, [replyLanguage]);
  
  // Helper to normalize and check for wake phrase variants
  const isWakePhrase = (text: string): boolean => {
    const normalized = text.toLowerCase()
      .replace(/[.,!?;:-]/g, ' ')  // Remove punctuation
      .replace(/\s+/g, ' ')         // Collapse multiple spaces
      .trim();
    
    // Check for "hey" followed by various CineGen pronunciations
    const wakePatterns = [
      'hey cinegen',
      'hey cine gen',
      'hey cine-gen',
      'hey cin gen',
      'hey sinegen',  // Common mispronunciation
      'hey sine gen'
    ];
    
    return wakePatterns.some(pattern => {
      const patternNormalized = pattern.replace(/-/g, ' ').replace(/\s+/g, ' ');
      return normalized.includes(patternNormalized);
    });
  };
  
  // Helper to replace brand name with phonetic variant for TTS
  const getPhoneticText = (text: string): string => {
    // Replace "CineGen" with phonetic spelling for better pronunciation
    // "Sinny-Jen" approximates "SIH-nee-jen"
    return text
      .replace(/CineGen/g, 'Sinny-Jen')
      .replace(/Cinegen/g, 'Sinny-Jen')
      .replace(/cinegen/g, 'sinny-jen');
  };
  
  // Speak function
  const speak = useCallback((text: string, force = false) => {
    // Skip TTS in typing mode unless explicitly forced
    if ((typingMode && !force) || isMuted || !('speechSynthesis' in window)) return;
    
    // If no voice selected, skip TTS but keep text functional
    if (!selectedVoice) {
      console.log("[Speech] No voice available, text-only mode");
      return;
    }
    
    timingRef.current.ttsStartTime = performance.now();
    
    // Log timing: response ready to TTS start
    if (timingRef.current.responseReadyTime) {
      const delta = timingRef.current.ttsStartTime - timingRef.current.responseReadyTime;
      console.log(`[Timing] Response ready → TTS start: ${delta.toFixed(0)}ms`);
    }
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    // Only use phonetic text for English voices
    const isEnglish = selectedVoice.lang.startsWith('en');
    const textToSpeak = isEnglish ? getPhoneticText(text) : text;
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = selectedVoice.lang;
    utterance.voice = selectedVoice;
    
    utterance.onstart = () => {
      console.log("[Speech] Started");
      // Stop recognition during speech
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Already stopped
        }
      }
      setState((prevState) => {
        console.log(`[State] ${prevState} → speaking (timestamp: ${new Date().toISOString()})`);
        return "speaking";
      });
    };
    
    utterance.onend = () => {
      console.log("[Speech] Ended");
      // Check if assistant is still active before resuming listening
      setState((prevState) => {
        // Don't restart if user stopped the assistant
        if (prevState === "off") {
          console.log("[Speech] Assistant stopped - not restarting listening");
          return "off";
        }
        
        // Resume listening if still in active session and not in typing mode
        if (recognitionRef.current && !typingMode) {
          console.log(`[State] ${prevState} → listening (timestamp: ${new Date().toISOString()})`);
          setTimeout(() => startRecognitionRef.current(), 100);
          return "listening";
        } else if (typingMode) {
          console.log(`[State] ${prevState} → off (timestamp: ${new Date().toISOString()})`);
          return "off";
        }
        
        return prevState;
      });
    };
    
    utterance.onerror = () => {
      console.log("[Speech] Error");
      setState((prevState) => {
        // Don't restart if user stopped
        if (prevState === "off") {
          return "off";
        }
        
        if (recognitionRef.current && !typingMode) {
          console.log(`[State] ${prevState} → listening (timestamp: ${new Date().toISOString()})`);
          setTimeout(() => startRecognitionRef.current(), 100);
          return "listening";
        }
        return prevState;
      });
    };
    
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isMuted, typingMode, selectedVoice]);
  
  // Unified message handler for both voice and text - routes ALL messages to AI backend
  const handleUserMessage = useCallback(async (userText: string, isVoiceInput: boolean = false) => {
    if (!userText || userText.trim().length === 0) return;
    
    const trimmedText = userText.trim();
    
    // Start processing
    isProcessingRef.current = true;
    setState("processing");
    setSavingStatus('saving');
    
    // Add user message to conversation (optimistic UI)
    const userMessage: ConversationMessage = {
      role: "user",
      text: trimmedText,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Store message for potential retry
      lastUserMessageRef.current = trimmedText;
      
      abortControllerRef.current = new AbortController();
      
      const response = await fetch("/api/director/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: trimmedText,
          conversationId,  // Pass existing ID or null for new conversation
          replyLanguage: replyLanguage,
          inputSource: isVoiceInput ? 'voice' : 'text'
        }),
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate response");
      }
      
      const data = await response.json();
      
      // If new conversation, save the ID
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
      
      // Check for error response
      if (data.error) {
        const errorText = data.reply || "The AI service is temporarily busy. Please try again shortly.";
        setErrorMessage(errorText);
        setState("error");
        setSavingStatus('error');
        
        const errorMsg: ConversationMessage = {
          role: "assistant",
          text: errorText,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
        
        // Speak error if not muted
        if (!isMuted || isVoiceInput) {
          speak(errorText);
        }
        return;
      }
      
      // Add assistant response to conversation
      const assistantMessage: ConversationMessage = {
        role: "assistant",
        text: data.reply,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setSavingStatus('saved');
      
      // Reset saved status after 2 seconds
      setTimeout(() => setSavingStatus('idle'), 2000);
      
      // Update campaign draft if present
      if (data.campaignDraft) {
        setCampaignDraft(prev => ({
          ...prev,
          ...data.campaignDraft
        }));
      }
      
      // Execute action if present
      if (data.action && data.action !== "none") {
        executeAction(data.action, data.campaignDraft);
      }
      
      // Speak the response if not muted
      if (!isMuted || isVoiceInput) {
        speak(data.reply);
      }
      
      errorRetryCountRef.current = 0; // Reset error counter on success
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[Request] Aborted previous request');
        return;
      }
      
      const errorText = "I encountered an error. Would you like to try again?";
      setErrorMessage(errorText);
      setState("error");
      setSavingStatus('error');
      const errorMsg: ConversationMessage = {
        role: "assistant",
        text: errorText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
      
      if (!isMuted || isVoiceInput) {
        speak(errorText);
      }
    } finally {
      isProcessingRef.current = false;
      abortControllerRef.current = null;
      
      // Return to appropriate state
      if (isVoiceInput && recognitionRef.current) {
        setState("listening");
      } else {
        setState("off");
      }
    }
  }, [conversationId, replyLanguage, speak, isMuted, router, user]);
  
  // Trigger executeAction after response (called inline in handleUserMessage)
  useEffect(() => {
    // No-op - executeAction called directly in handler
  }, []);
  
  // Execute action with safety checks
  const executeAction = useCallback((action: DirectorAction, payload?: any) => {
    // Action allowlist check
    const allowedActions: DirectorAction[] = ["open_discovery", "prepare_brief", "clear_draft"];
    
    if (!allowedActions.includes(action)) {
      console.warn(`[Security] Action blocked: ${action} not in allowlist`);
      return;
    }
    
    switch (action) {
      case "open_discovery":
        router.push('/creators');
        break;
        
      case "prepare_brief":
        if (campaignDraft) {
          // Store draft in sessionStorage for brief builder
          sessionStorage.setItem("cinegen_voice_draft", JSON.stringify(campaignDraft));
          router.push("/briefs/new?from=voice");
        }
        break;
        
      case "clear_draft":
        // Confirm before clearing if draft has content
        if (campaignDraft && Object.keys(campaignDraft).length > 0) {
          if (confirm("Are you sure? Your draft will be lost.")) {
            setCampaignDraft(null);
          }
        } else {
          setCampaignDraft(null);
        }
        break;
    }
  }, [router, campaignDraft]);
  
  // Process campaign idea or message - delegates to unified handler
  const processCampaignIdea = useCallback(async (idea: string) => {
    if (isProcessingRef.current) return;
    
    timingRef.current.requestStartTime = performance.now();
    
    // Log timing: command end to request start
    if (timingRef.current.commandEndTime) {
      const delta = timingRef.current.requestStartTime - timingRef.current.commandEndTime;
      console.log(`[Timing] Command end → Request start: ${delta.toFixed(0)}ms`);
    }
    
    // Delegate to unified message handler
    await handleUserMessage(idea, true); // true = voice input
  }, [handleUserMessage]);
  
  // Retry last user message
  const retryLastMessage = useCallback(() => {
    if (lastUserMessageRef.current && !isProcessingRef.current) {
      setErrorMessage("");
      const message = lastUserMessageRef.current;
      // Delegate to unified message handler
      handleUserMessage(message, false); // false = not voice input (it's a retry)
    }
  }, [handleUserMessage]);
  
  // Start recognition
  const startRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    // Clean up existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      recognitionRef.current = null;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = inputLanguage;
    
    recognition.onstart = () => {
      console.log("[Recognition] Started");
      if (!timingRef.current.recognitionReadyTime) {
        timingRef.current.recognitionReadyTime = performance.now();
        
        // Log timing: enable click to recognition ready
        if (timingRef.current.enableClickTime) {
          const delta = timingRef.current.recognitionReadyTime - timingRef.current.enableClickTime;
          console.log(`[Timing] Enable click → Recognition ready: ${delta.toFixed(0)}ms`);
        }
      }
    };
    
    recognition.onaudiostart = () => {
      console.log("[Recognition] Audio capture started");
    };
    
    recognition.onspeechstart = () => {
      console.log("[Recognition] Speech detected");
    };
    
    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";
      let hasInterim = false;
      let hasFinal = false;
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
          hasFinal = true;
        } else {
          interimTranscript += transcript;
          hasInterim = true;
        }
      }
      
      console.log(`[Recognition] Result: interim=${hasInterim}, final=${hasFinal}, wake=${wakeWordDetectedRef.current}, processing=${isProcessingRef.current}`);
      
      const currentText = (finalTranscript + interimTranscript).trim();
      const currentTextLower = currentText.toLowerCase();
      
      // Show interim transcription for immediate feedback
      setTranscript(currentText);
      
      // Process finalized speech when ready (wake word not required if already in listening mode)
      if (finalTranscript.trim() && !isProcessingRef.current && wakeWordDetectedRef.current) {
        const cleanIdea = finalTranscript.trim();
        console.log(`[Recognition] Processing finalized speech: "${cleanIdea}"`);
        
        // Handle simple local commands without API call
        const lowerIdea = cleanIdea.toLowerCase();
        if (lowerIdea === 'stop' || lowerIdea === 'cancel' || lowerIdea === 'quit') {
          handleStop();
          return;
        }
        
        // Process real conversation using unified handler
        if (cleanIdea.length > 0) {
          timingRef.current.commandEndTime = performance.now();
          handleUserMessage(cleanIdea, true); // true = voice input
        }
      }
      
      // Also check for wake word in interim/ongoing speech (for wake-word mode if needed later)
      if (!wakeWordDetectedRef.current && isWakePhrase(currentTextLower)) {
        if (isWakePhrase(currentTextLower)) {
          wakeWordDetectedRef.current = true;
          timingRef.current.wakeDetectedTime = performance.now();
          
          setState((prevState) => {
            console.log(`[State] ${prevState} → listening (timestamp: ${new Date().toISOString()})`);
            return "listening";
          });
          
          // Extract command after wake phrase if present in same utterance
          const wakePatterns = ['hey cinegen', 'hey cine gen', 'hey cine-gen', 'hey cin gen', 'hey sinegen', 'hey sine gen'];
          let commandAfterWake = currentText;
          
          for (const pattern of wakePatterns) {
            const regex = new RegExp(pattern.replace(/\s+/g, '\\s+'), 'i');
            if (regex.test(currentTextLower)) {
              commandAfterWake = currentText.replace(regex, '').trim();
              break;
            }
          }
          
          // Log timing: wake detected to acknowledgement
          timingRef.current.ackStartTime = performance.now();
          const delta = timingRef.current.ackStartTime - timingRef.current.wakeDetectedTime;
          console.log(`[Timing] Wake detected → Acknowledgement start: ${delta.toFixed(0)}ms`);
          
          // If there's a command after the wake phrase, process it immediately
          if (commandAfterWake.length > 5) {
            setTranscript(commandAfterWake);
            timingRef.current.commandEndTime = performance.now();
            handleUserMessage(commandAfterWake, true); // Use unified handler
          } else {
            // No command, just greet locally (no AI request needed for wake-only)
            setTranscript("");
            const localGreeting = replyLanguage.startsWith('te') ? "నమస్కారం! మీరు ఏమి చేయాలనుకుంటున్నారు?"
              : replyLanguage.startsWith('hi') ? "नमस्ते! आप क्या करना चाहते हैं?"
              : replyLanguage.startsWith('mr') ? "नमस्कार! तुम्हाला काय करायचे आहे?"
              : "Hello! What would you like to do?";
            
            const greetingMsg: ConversationMessage = {
              role: "assistant",
              text: localGreeting,
              timestamp: Date.now()
            };
            setMessages(prev => [...prev, greetingMsg]);
            
            // Speak the greeting if not muted
            if (!isMuted && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(localGreeting);
              utterance.lang = replyLanguage;
              if (selectedVoice) {
                utterance.voice = selectedVoice;
              }
              utterance.onend = () => {
                setState((prevState) => {
                  console.log(`[State] ${prevState} → listening (timestamp: ${new Date().toISOString()})`);
                  return "listening";
                });
              };
              window.speechSynthesis.speak(utterance);
              setState((prevState) => {
                console.log(`[State] ${prevState} → speaking (timestamp: ${new Date().toISOString()})`);
                return "speaking";
              });
            } else {
              // If muted, go directly to listening state
              setState((prevState) => {
                console.log(`[State] ${prevState} → listening (timestamp: ${new Date().toISOString()})`);
                return "listening";
              });
            }
          }
        }
      }
      
      // Process campaign idea when listening and wake word already detected
      if (wakeWordDetectedRef.current && finalTranscript.trim() && !isProcessingRef.current) {
        const cleanIdea = finalTranscript.trim();
        
        // Handle simple local commands without API call
        const lowerIdea = cleanIdea.toLowerCase();
        if (lowerIdea === 'stop' || lowerIdea === 'cancel' || lowerIdea === 'quit') {
          // Stop inline
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (e) {
              // Already stopped
            }
            recognitionRef.current = null;
          }
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
          }
          setState((prevState) => {
            console.log(`[State] ${prevState} → off (timestamp: ${new Date().toISOString()})`);
            return "off";
          });
          setTranscript("");
          setTypingMode(false);
          wakeWordDetectedRef.current = false;
          isProcessingRef.current = false;
          errorRetryCountRef.current = 0;
          setErrorMessage("");
          timingRef.current = {};
          return;
        }
        if (lowerIdea === 'mute' || lowerIdea === 'be quiet') {
          setIsMuted(true);
          return;
        }
        if (lowerIdea === 'unmute' || lowerIdea === 'speak') {
          setIsMuted(false);
          speak("I'm unmuted now.");
          return;
        }
        
        // Process actual campaign ideas
        if (cleanIdea.length > 10) {
          timingRef.current.commandEndTime = performance.now();
          processCampaignIdea(cleanIdea);
        }
      }
    };
    
    recognition.onerror = (event: any) => {
      console.log(`[Recognition] Error: ${event.error}`);
      
      if (event.error === "not-allowed") {
        setErrorMessage(t.errorMicDenied);
        setState((prevState) => {
          console.log(`[State] ${prevState} → error (timestamp: ${new Date().toISOString()})`);
          return "error";
        });
        errorRetryCountRef.current = 999; // Don't retry permission errors
      } else if (event.error === "language-not-supported") {
        const langName = getLanguageName(inputLanguage);
        setErrorMessage(`${langName} ${t.errorLanguageNotSupported}`);
        setState((prevState) => {
          console.log(`[State] ${prevState} → error (timestamp: ${new Date().toISOString()})`);
          return "error";
        });
        errorRetryCountRef.current = 999; // Don't retry unsupported language
      } else if (event.error === "no-speech") {
        // Silence - just restart if we haven't exceeded retry limit
        if (recognitionRef.current && errorRetryCountRef.current < 3) {
          errorRetryCountRef.current++;
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognition.start();
              } catch (e) {
                // Already started
              }
            }
          }, 100);
        }
      } else if (event.error === "network") {
        setErrorMessage(t.errorNetwork);
        setState((prevState) => {
          console.log(`[State] ${prevState} → error (timestamp: ${new Date().toISOString()})`);
          return "error";
        });
      } else {
        // Other errors - retry once then stop
        if (errorRetryCountRef.current < 1 && recognitionRef.current) {
          errorRetryCountRef.current++;
          setTimeout(() => {
            if (recognitionRef.current) {
              startRecognitionRef.current();
            }
          }, 500);
        } else {
          setErrorMessage(t.errorGeneric);
          setState((prevState) => {
            console.log(`[State] ${prevState} → error (timestamp: ${new Date().toISOString()})`);
            return "error";
          });
        }
      }
    };
    
    recognition.onend = () => {
      console.log("[Recognition] Ended");
      // Auto-restart if recognitionRef still exists, not processing, and not in error state
      if (recognitionRef.current && !isProcessingRef.current && errorRetryCountRef.current < 3) {
        setTimeout(() => {
          if (recognitionRef.current) {
            try {
              recognition.start();
            } catch (e) {
              // Already started or unavailable
            }
          }
        }, 100);
      }
    };
    
    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e: any) {
      if (e.name !== "InvalidStateError") {
        console.error("Failed to start recognition:", e);
      }
    }
  }, [processCampaignIdea, speak, inputLanguage]);
  
  // Update ref to latest function
  useEffect(() => {
    startRecognitionRef.current = startRecognition;
  }, [startRecognition]);
  
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
  
  // Enable voice button handler
  const handleEnableVoice = useCallback(async () => {
    if (!isSupported) {
      setErrorMessage(t.errorNotSupported);
      setState("error");
      return;
    }
    
    timingRef.current = { enableClickTime: performance.now() };
    
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start in listening mode (ready for direct conversation)
      setState((prevState) => {
        console.log(`[State] ${prevState} → listening (direct conversation mode) (timestamp: ${new Date().toISOString()})`);
        return "listening";
      });
      wakeWordDetectedRef.current = true; // Enable direct conversation
      setErrorMessage("");
      errorRetryCountRef.current = 0;
      setTypingMode(false);
      
      // Clear previous messages to start fresh
      setMessages([]);
      
      // Start recognition immediately
      startRecognitionRef.current();
      
    } catch (error: any) {
      setErrorMessage(t.errorMicDenied);
      setState("error");
    }
  }, [isSupported, t]);
  
  // Stop voice session
  const handleStop = useCallback(() => {
    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      recognitionRef.current = null;
    }
    
    // Stop speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear last user message ref to prevent retry, but keep conversation history visible
    lastUserMessageRef.current = null;
    
    setState((prevState) => {
      console.log(`[State] ${prevState} → off (timestamp: ${new Date().toISOString()})`);
      return "off";
    });
    setTranscript("");
    setTypingMode(false);
    wakeWordDetectedRef.current = false;
    isProcessingRef.current = false;
    errorRetryCountRef.current = 0;
    setErrorMessage("");
    timingRef.current = {};
    // Don't clear messages/history/draft on stop - user might want to resume
  }, []);
  
  // Talk now button - bypass wake detection
  const handleTalkNow = useCallback(() => {
    wakeWordDetectedRef.current = true;
    setState((prevState) => {
      console.log(`[State] ${prevState} → listening (timestamp: ${new Date().toISOString()})`);
      return "listening";
    });
    setTranscript("");
    
    // Start recognition if not already running
    if (!recognitionRef.current) {
      startRecognitionRef.current();
    }
  }, []);
  
  // Microphone check
  const handleStartMicCheck = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicCheckStream(stream);
      setShowMicCheck(true);
      
      // Create audio context and analyser
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Animation loop for level meter
      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setMicLevel(average);
          micCheckAnimationRef.current = requestAnimationFrame(updateLevel);
        }
      };
      
      updateLevel();
      
    } catch (error) {
      setErrorMessage(t.errorMicCheck);
    }
  }, [t]);
  
  const handleStopMicCheck = useCallback(() => {
    // Stop animation
    if (micCheckAnimationRef.current) {
      cancelAnimationFrame(micCheckAnimationRef.current);
      micCheckAnimationRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop stream
    if (micCheckStream) {
      micCheckStream.getTracks().forEach(track => track.stop());
      setMicCheckStream(null);
    }
    
    setShowMicCheck(false);
    setMicLevel(0);
    analyserRef.current = null;
  }, [micCheckStream]);
  
  // Type instead button - toggle typing mode
  const handleTypeInstead = useCallback(() => {
    setTypingMode(true);
    
    // Stop voice recognition if active
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }
    
    // Stop any speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    setState("off");
    
    // Add welcome message for typing mode if no messages yet
    if (messages.length === 0) {
      const welcomeMsg: ConversationMessage = {
        role: "assistant",
        text: t.typingWelcome,
        timestamp: Date.now()
      };
      setMessages([welcomeMsg]);
    }
  }, [messages.length, t]);
  
  // Send typed message
  // Send typed message using unified handler
  const handleSendTyped = useCallback(() => {
    const trimmed = typedInput.trim();
    if (!trimmed || isProcessingRef.current) return;
    
    setTypedInput(""); // Clear input
    handleUserMessage(trimmed, false); // false = text input
  }, [typedInput, handleUserMessage]);
  
  // Handle textarea key press
  const handleTypedKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendTyped();
    }
  }, [handleSendTyped]);
  
  // Switch back to voice mode
  const handleUseVoice = useCallback(() => {
    setTypingMode(false);
    setTypedInput("");
  }, []);
  
  // Voice preview test
  const handleVoicePreview = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const testText = getPhoneticText("Hey, welcome to CineGen. I'm ready to help you create your campaign.");
    const utterance = new SpeechSynthesisUtterance(testText);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }, [selectedVoice]);
  
  // Play preview with native-language sample
  const handlePlayPreview = useCallback(() => {
    if (!('speechSynthesis' in window) || !selectedVoice) return;
    
    // Stop any current preview
    window.speechSynthesis.cancel();
    
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
    
    // Get native-language sample
    const sampleText = getPreviewSentence(replyLanguage);
    const utterance = new SpeechSynthesisUtterance(sampleText);
    utterance.lang = replyLanguage;
    utterance.voice = selectedVoice;
    
    setIsPreviewPlaying(true);
    
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
    
    window.speechSynthesis.speak(utterance);
  }, [selectedVoice, replyLanguage, state, recognitionWasActiveBeforePreview]);
  
  // Stop preview
  const handleStopPreview = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    setIsPreviewPlaying(false);
    
    // Restore recognition if it was active before preview
    if (recognitionWasActiveBeforePreview && recognitionRef.current === null) {
      setTimeout(() => {
        startRecognitionRef.current();
      }, 100);
    }
  }, [recognitionWasActiveBeforePreview]);
  
  // Review brief button
  const handleReviewBrief = useCallback(() => {
    if (generatedBrief) {
      // Store brief in sessionStorage for the brief builder to pick up
      sessionStorage.setItem("cinegen_voice_draft", JSON.stringify(generatedBrief));
      router.push("/briefs/new?from=voice");
    }
  }, [generatedBrief, router]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      // Clean up mic check
      if (micCheckAnimationRef.current) {
        cancelAnimationFrame(micCheckAnimationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (micCheckStream) {
        micCheckStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [micCheckStream]);
  
  // Pause when page hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && state !== "off") {
        handleStop();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [state, handleStop]);
  
  // Animation variants
  const orbVariants = {
    off: { scale: 0.8, opacity: 0.3 },
    awaiting_wake: { 
      scale: [0.9, 1, 0.9],
      opacity: [0.5, 0.7, 0.5],
      transition: { duration: 2, repeat: Infinity as number, ease: "easeInOut" as const }
    },
    listening: { 
      scale: [0.95, 1.05, 0.95],
      opacity: [0.7, 1, 0.7],
      transition: { duration: 1.5, repeat: Infinity as number, ease: "easeInOut" as const }
    },
    processing: {
      scale: 1,
      opacity: 0.8,
      rotate: 360,
      transition: { rotate: { duration: 2, repeat: Infinity as number, ease: "linear" as const } }
    },
    speaking: {
      scale: [1, 1.1, 1],
      opacity: [0.8, 1, 0.8],
      transition: { duration: 0.8, repeat: Infinity as number, ease: "easeInOut" as const }
    },
    error: { scale: 0.9, opacity: 0.4 }
  };
  
  const stateLabels = {
    off: t.stateOff,
    awaiting_wake: t.stateAwaitingWake,
    listening: t.stateListening,
    processing: t.stateProcessing,
    speaking: t.stateSpeaking,
    error: t.stateError
  };
  
  const stateColors = {
    off: "text-gray-400",
    awaiting_wake: "text-violet-400",
    listening: "text-cyan-400",
    processing: "text-amber-400",
    speaking: "text-green-400",
    error: "text-red-400"
  };
  
  return (
    <motion.div
      className="relative w-full max-w-lg mx-auto z-20"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      <div className="relative rounded-3xl p-[2px] bg-gradient-to-br from-violet-500/30 via-cyan-500/30 to-violet-500/30 shadow-2xl shadow-violet-500/20">
        <div className="glass rounded-3xl p-8 backdrop-blur-xl bg-[#1a1a2e]/90 border border-white/5">
          
          {/* Animated Orb/Lens */}
          <div className="flex items-center justify-center mb-6">
            <motion.div
              className="relative w-24 h-24"
              variants={prefersReducedMotion ? {} : orbVariants}
              animate={state}
            >
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-violet-500/30" />
              
              {/* Inner orb */}
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-600/40 to-cyan-600/40 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className={`w-10 h-10 ${stateColors[state]}`} />
              </div>
              
              {/* Pulse rings when active */}
              {(state === "awaiting_wake" || state === "listening" || state === "speaking") && !prefersReducedMotion && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-cyan-500/50"
                    animate={{
                      scale: [1, 1.5],
                      opacity: [0.5, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-violet-500/50"
                    animate={{
                      scale: [1, 1.5],
                      opacity: [0.5, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.75
                    }}
                  />
                </>
              )}
            </motion.div>
          </div>
          
          {/* Title */}
          <h3 className="font-display text-2xl font-bold text-center mb-2 bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
            CineGen Director
          </h3>
          
          {/* Headline */}
          <p className="text-center text-lg font-semibold mb-2">
            {typingMode ? t.headlineTyping : t.headlineVoice}
          </p>
          
          {/* Supporting text */}
          <p className="text-center text-sm text-gray-300 mb-6">
            {t.supportingText}
          </p>
          
          {/* Voice & Language Settings (shown when off and not in typing mode) */}
          {state === "off" && !typingMode && availableVoices.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                className="w-full flex items-center justify-between px-4 py-3 bg-violet-500/5 border border-violet-500/20 rounded-lg hover:bg-violet-500/10 transition-all focus-visible:ring-2 focus-visible:ring-violet-400"
                aria-label="Voice and language settings"
                aria-expanded={showSettingsPanel}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-semibold text-violet-300">{t.settingsTitle}</span>
                </div>
                {showSettingsPanel ? (
                  <ChevronUp className="w-4 h-4 text-violet-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-violet-400" />
                )}
              </button>
              
              <AnimatePresence>
                {showSettingsPanel && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 space-y-3"
                  >
                    {/* Section 1: I speak (input language) */}
                    <div className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                      <label className="text-xs font-semibold text-violet-300 block mb-1">
                        {t.labelInputLanguage}
                      </label>
                      <p className="text-xs text-gray-400 mb-2">{t.inputLanguageDesc}</p>
                      <select
                        value={inputLanguage}
                        onChange={(e) => {
                          setInputLanguage(e.target.value);
                          const lang = SUPPORTED_LANGUAGES.find(l => l.code === e.target.value);
                          if (lang) {
                            // Show a brief toast-like message (we'll use a temporary state update)
                            console.log(`Input language changed to ${lang.name}`);
                          }
                        }}
                        className="w-full text-xs px-3 py-2 bg-background/50 border border-white/10 rounded focus:outline-none focus:ring-2 focus:ring-violet-400"
                        aria-label="Select input language"
                      >
                        {SUPPORTED_LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code}>
                            {lang.recognitionSupported ? "🎤 " : ""}{lang.nativeName} · {lang.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Section 2: Reply language */}
                    <div className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                      <label className="text-xs font-semibold text-violet-300 block mb-1">
                        {t.labelReplyLanguage}
                      </label>
                      <p className="text-xs text-gray-400 mb-2">{t.replyLanguageDesc}</p>
                      <select
                        value={replyLanguage}
                        onChange={(e) => {
                          setReplyLanguage(e.target.value);
                          // Auto-select matching voice if current voice doesn't match
                          const newLang = e.target.value;
                          const matchingVoice = getDefaultVoiceForLanguage(availableVoices, newLang, showAllVoices);
                          if (matchingVoice) {
                            setSelectedVoice(matchingVoice);
                          } else {
                            // No voice for this language - clear selection
                            setSelectedVoice(null);
                          }
                        }}
                        className="w-full text-xs px-3 py-2 bg-background/50 border border-white/10 rounded focus:outline-none focus:ring-2 focus:ring-violet-400"
                        aria-label="Select reply language"
                      >
                        {SUPPORTED_LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code}>
                            {lang.nativeName} · {lang.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Section 3: Speaking voice */}
                    <div className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                      <label className="text-xs font-semibold text-violet-300 block mb-1">
                        {t.labelSpeakingVoice}
                      </label>
                      <p className="text-xs text-gray-400 mb-2">{t.speakingVoiceDesc}</p>
                      
                      {(() => {
                        const filteredVoices = filterVoicesByLanguage(availableVoices, replyLanguage, showAllVoices);
                        
                        if (filteredVoices.length === 0) {
                          return (
                            <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded">
                              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs text-amber-300">
                                  {t.noVoiceAvailable.replace("{lang}", getLanguageName(replyLanguage))}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {t.textOnlyMode}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <>
                            <select
                              value={selectedVoice?.name || ''}
                              onChange={(e) => {
                                const voice = filteredVoices.find(v => v.name === e.target.value);
                                if (voice) setSelectedVoice(voice);
                              }}
                              className="w-full text-xs px-3 py-2 bg-background/50 border border-white/10 rounded focus:outline-none focus:ring-2 focus:ring-violet-400 mb-2"
                              aria-label="Select speaking voice"
                            >
                              {filteredVoices.map(voice => (
                                <option key={voice.name} value={voice.name}>
                                  {formatVoiceDisplay(voice)}
                                </option>
                              ))}
                            </select>
                            
                            <div className="flex gap-2 mb-2">
                              {!isPreviewPlaying ? (
                                <button
                                  onClick={handlePlayPreview}
                                  disabled={!selectedVoice}
                                  className="flex-1 px-3 py-1.5 text-xs bg-violet-600 text-white rounded hover:bg-violet-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-violet-400"
                                  aria-label="Preview voice pronunciation"
                                >
                                  {t.buttonPreview}
                                </button>
                              ) : (
                                <button
                                  onClick={handleStopPreview}
                                  className="flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-500 transition-all focus-visible:ring-2 focus-visible:ring-red-400"
                                  aria-label="Stop preview"
                                >
                                  {t.buttonStopPreview}
                                </button>
                              )}
                            </div>
                            
                            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={showAllVoices}
                                onChange={(e) => setShowAllVoices(e.target.checked)}
                                className="rounded border-white/10 bg-background/50 text-violet-600 focus:ring-2 focus:ring-violet-400"
                              />
                              {t.showAllVoices}
                            </label>
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          
          {/* Status */}
          {!typingMode && (
            <div className="flex items-center justify-center gap-2 mb-4 min-h-[24px]">
              <div className={`w-2 h-2 rounded-full ${stateColors[state]} ${state !== "off" && state !== "error" ? "animate-pulse" : ""}`} />
              <span className={`text-sm font-medium ${stateColors[state]}`}>
                {stateLabels[state]}
              </span>
            </div>
          )}
          
          {/* Error message */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-red-300 mb-2">{errorMessage}</p>
                    {state === "error" && (
                      <button
                        onClick={() => {
                          if (lastUserMessageRef.current) {
                            // Retry last message if available (API error)
                            retryLastMessage();
                          } else {
                            // Restart voice recognition (mic error)
                            setErrorMessage("");
                            errorRetryCountRef.current = 0;
                            handleEnableVoice();
                          }
                        }}
                        disabled={!lastUserMessageRef.current} // Disable if no message to retry
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t.buttonRetry}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Transcript */}
          <AnimatePresence>
            {transcript && state === "listening" && !typingMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg"
              >
                <p className="text-xs text-cyan-300 font-mono">{transcript}</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Message history */}
          {messages.length > 0 && (
            <div className="mb-4 space-y-3">
              <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" role="log" aria-live="polite" aria-label="Conversation history">
                {(showFullConversation ? messages : messages.slice(-5)).map((msg, i) => (
                  <div
                    key={msg.timestamp}
                    className={`text-sm p-3 rounded-lg flex gap-2 ${
                      msg.role === "assistant"
                        ? "bg-violet-500/10 text-violet-100 border border-violet-500/20"
                        : "bg-cyan-500/10 text-cyan-100 border border-cyan-500/20"
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {msg.role === "assistant" ? (
                        <Sparkles className="w-4 h-4 text-violet-300" />
                      ) : (
                        <User className="w-4 h-4 text-cyan-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-xs block mb-1 text-gray-300">
                        {msg.role === "assistant" ? "Director" : "You"}
                      </span>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      
                      {/* Retry button for error messages */}
                      {msg.role === "assistant" && msg.text.includes("temporarily busy") && lastUserMessageRef.current && (
                        <button
                          onClick={() => {
                            if (lastUserMessageRef.current) {
                              handleUserMessage(lastUserMessageRef.current, false);
                            }
                          }}
                          disabled={isProcessingRef.current}
                          className="mt-2 text-xs px-3 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-md transition-colors disabled:opacity-50"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {messages.length > 5 && (
                <button
                  onClick={() => setShowFullConversation(!showFullConversation)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {showFullConversation ? "Show last 5" : `Show full conversation (${messages.length} messages)`}
                </button>
              )}
            </div>
          )}
          
          {/* Turn this into a brief button */}
          {!typingMode && messages.filter(m => m.role === "user").length >= 2 && !campaignDraft && (
            <div className="mb-4">
              <button
                onClick={() => processCampaignIdea("Turn this into a brief")}
                disabled={isProcessingRef.current}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-green-400"
              >
                <CheckCircle2 className="w-4 h-4" />
                Turn this into a brief
              </button>
            </div>
          )}
          
          {/* Campaign Draft Card */}
          {campaignDraft && (
            <div className="mb-4 p-4 glass border border-cyan-500/30 rounded-xl space-y-3">
              <h4 className="text-sm font-semibold text-cyan-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Your campaign so far
              </h4>
              
              <div className="space-y-2 text-sm">
                {campaignDraft.campaignTitle && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Campaign Title</label>
                    <input
                      type="text"
                      value={campaignDraft.campaignTitle}
                      onChange={(e) => setCampaignDraft(prev => ({ ...prev, campaignTitle: e.target.value }))}
                      className="w-full px-3 py-2 bg-background/50 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                )}
                
                {campaignDraft.objective && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Objective</label>
                    <textarea
                      value={campaignDraft.objective}
                      onChange={(e) => setCampaignDraft(prev => ({ ...prev, objective: e.target.value }))}
                      className="w-full px-3 py-2 bg-background/50 border border-white/10 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      rows={2}
                    />
                  </div>
                )}
                
                {campaignDraft.contentType && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Content Type</label>
                    <select
                      value={campaignDraft.contentType}
                      onChange={(e) => setCampaignDraft(prev => ({ ...prev, contentType: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-background/50 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    >
                      <option value="Short-form Video">Short-form Video</option>
                      <option value="Long-form Video">Long-form Video</option>
                      <option value="Animation">Animation</option>
                      <option value="Motion Graphics">Motion Graphics</option>
                      <option value="Image Campaign">Image Campaign</option>
                      <option value="Social Media Pack">Social Media Pack</option>
                      <option value="Brand Film">Brand Film</option>
                    </select>
                  </div>
                )}
                
                {campaignDraft.durationSeconds !== undefined && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Duration (seconds)</label>
                    <input
                      type="number"
                      value={campaignDraft.durationSeconds || ''}
                      onChange={(e) => setCampaignDraft(prev => ({ ...prev, durationSeconds: parseInt(e.target.value) || undefined }))}
                      className="w-full px-3 py-2 bg-background/50 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                )}
                
                {(campaignDraft.budgetMin !== undefined || campaignDraft.budgetMax !== undefined) && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Budget (USD)
                      {campaignDraft.originalCurrency && (
                        <span className="ml-1 text-violet-400 font-normal">
                          (converted from {campaignDraft.originalCurrency})
                        </span>
                      )}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input
                          type="number"
                          placeholder="Min"
                          value={campaignDraft.budgetMin || ''}
                          onChange={(e) => setCampaignDraft(prev => ({ ...prev, budgetMin: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 bg-background/50 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Max"
                          value={campaignDraft.budgetMax || ''}
                          onChange={(e) => setCampaignDraft(prev => ({ ...prev, budgetMax: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 bg-background/50 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {campaignDraft.unansweredQuestions && campaignDraft.unansweredQuestions.length > 0 && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Unanswered Questions</label>
                    <ul className="text-xs text-gray-300 list-disc list-inside space-y-1">
                      {campaignDraft.unansweredQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* User-stated vs Assistant Suggestions Separation */}
                {campaignDraft.userStated && campaignDraft.userStated.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-green-400 block mb-1">You said:</label>
                    <ul className="text-xs text-gray-300 list-disc list-inside space-y-1">
                      {campaignDraft.userStated.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {campaignDraft.assistantSuggestions && campaignDraft.assistantSuggestions.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-violet-400 block mb-1">Suggested:</label>
                    <ul className="text-xs text-gray-300 list-disc list-inside space-y-1">
                      {campaignDraft.assistantSuggestions.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => executeAction("prepare_brief")}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-violet-500 hover:to-cyan-500 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  Review in brief builder
                </button>
                <button
                  onClick={() => executeAction("clear_draft")}
                  className="px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-300 rounded-lg font-medium hover:bg-red-600/30 transition-all focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          
          
          {/* Typing Mode Input */}
          {typingMode && (
            <div className="mb-4 space-y-2">
              <div className="relative">
                <textarea
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  onKeyDown={handleTypedKeyDown}
                  placeholder={t.typingWelcome}
                  className="w-full min-h-[100px] px-4 py-3 bg-background/50 border border-white/10 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  disabled={isProcessingRef.current}
                  autoFocus
                  aria-label="Campaign idea input"
                />
                {isProcessingRef.current && (
                  <div className="absolute top-3 right-3">
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSendTyped}
                  disabled={!typedInput.trim() || isProcessingRef.current}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-violet-500 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-400"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                  {t.buttonSend}
                </button>
                {generatedBrief && (
                  <button
                    onClick={handleReviewBrief}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-500 hover:to-emerald-500 transition-all focus-visible:ring-2 focus-visible:ring-green-400"
                    aria-label="Review generated brief"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Review
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Controls */}
          <div className="space-y-3">
            {state === "off" && !typingMode ? (
              <>
                <button
                  onClick={handleEnableVoice}
                  disabled={!isSupported}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-violet-500 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Enable voice assistant"
                >
                  <Mic className="w-4 h-4" />
                  {t.buttonEnable}
                </button>
                
                {!showMicCheck && (
                  <button
                    onClick={handleStartMicCheck}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 glass border border-white/10 text-foreground rounded-xl font-medium hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-violet-400"
                    aria-label="Check microphone"
                  >
                    <Mic className="w-4 h-4" />
                    Check microphone
                  </button>
                )}
                
                <button
                  onClick={handleTypeInstead}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 glass border border-white/10 text-foreground rounded-xl font-medium hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Switch to typing mode"
                >
                  <Keyboard className="w-4 h-4" />
                  {t.buttonTypeInstead}
                </button>
              </>
            ) : typingMode ? (
              <button
                onClick={handleUseVoice}
                disabled={!isSupported}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 glass border border-white/10 text-foreground rounded-xl font-medium hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-violet-400"
                aria-label="Switch to voice mode"
              >
                <Mic className="w-4 h-4" />
                {t.buttonUseVoice}
              </button>
            ) : state === "awaiting_wake" ? (
              <div className="space-y-2">
                {/* Talk now button */}
                <button
                  onClick={handleTalkNow}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400"
                  aria-label="Talk now"
                >
                  <Mic className="w-4 h-4" />
                  {t.buttonTalkNow}
                </button>
                
                {/* Main control bar */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="flex items-center justify-center w-12 h-12 glass border border-white/10 rounded-xl hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400"
                    aria-label={isMuted ? "Enable spoken replies" : "Disable spoken replies"}
                    title={isMuted ? "Enable spoken replies" : "Disable spoken replies"}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  
                  <button
                    onClick={handleTypeInstead}
                    className="flex items-center justify-center w-12 h-12 glass border border-white/10 rounded-xl hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-violet-400"
                    aria-label="Switch to typing"
                    title="Type instead"
                  >
                    <Keyboard className="w-5 h-5" />
                  </button>
                  
                  {campaignDraft && (
                    <button
                      onClick={() => executeAction("prepare_brief")}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-500 hover:to-emerald-500 transition-all focus-visible:ring-2 focus-visible:ring-green-400"
                      aria-label="Review campaign brief"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {t.buttonReviewBrief || "Review brief"}
                    </button>
                  )}
                  
                  <button
                    onClick={handleStop}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600/20 border border-red-500/30 text-red-300 rounded-xl font-semibold hover:bg-red-600/30 transition-all focus-visible:ring-2 focus-visible:ring-red-400"
                    aria-label="Stop voice assistant"
                  >
                    <Square className="w-4 h-4" />
                    {t.buttonStop}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">{/* Stop speaking / Interrupt button (when speaking) */}
                {state === "speaking" && (
                  <button
                    onClick={() => {
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                      // Transition to listening, keep wake detected
                      setState((prevState) => {
                        console.log(`[State] ${prevState} → listening (timestamp: ${new Date().toISOString()})`);
                        return "listening";
                      });
                      startRecognitionRef.current();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600/20 border border-amber-500/30 text-amber-300 rounded-xl font-semibold hover:bg-amber-600/30 transition-all focus-visible:ring-2 focus-visible:ring-amber-400"
                    aria-label="Stop speaking"
                  >
                    <Square className="w-4 h-4" />
                    {t.buttonStopSpeaking || "Stop speaking"}
                  </button>
                )}
                
                {/* Interrupt and speak button */}
                {state === "speaking" && (
                  <button
                    onClick={() => {
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                      // Stop current recognition if running
                      if (recognitionRef.current) {
                        try {
                          recognitionRef.current.stop();
                        } catch (e) {
                          // Already stopped
                        }
                      }
                      setState((prevState) => {
                        console.log(`[State] ${prevState} → listening (timestamp: ${new Date().toISOString()})`);
                        return "listening";
                      });
                      wakeWordDetectedRef.current = true;
                      startRecognitionRef.current();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 rounded-xl font-semibold hover:bg-cyan-600/30 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400"
                    aria-label="Interrupt and speak"
                  >
                    <Mic className="w-4 h-4" />
                    Interrupt and speak
                  </button>
                )}
                
                {/* Main control bar */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="flex items-center justify-center w-12 h-12 glass border border-white/10 rounded-xl hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400"
                    aria-label={isMuted ? "Enable spoken replies" : "Disable spoken replies"}
                    title={isMuted ? "Enable spoken replies" : "Disable spoken replies"}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  
                  <button
                    onClick={handleTypeInstead}
                    className="flex items-center justify-center w-12 h-12 glass border border-white/10 rounded-xl hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-violet-400"
                    aria-label="Switch to typing"
                    title="Type instead"
                  >
                    <Keyboard className="w-5 h-5" />
                  </button>
                  
                  {campaignDraft && (
                    <button
                      onClick={() => executeAction("prepare_brief")}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-500 hover:to-emerald-500 transition-all focus-visible:ring-2 focus-visible:ring-green-400"
                      aria-label="Review campaign brief"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {t.buttonReviewBrief || "Review brief"}
                    </button>
                  )}
                  
                  <button
                    onClick={handleStop}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600/20 border border-red-500/30 text-red-300 rounded-xl font-semibold hover:bg-red-600/30 transition-all focus-visible:ring-2 focus-visible:ring-red-400"
                    aria-label="Stop voice assistant"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Microphone Check UI */}
          <AnimatePresence>
            {showMicCheck && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-violet-300">{t.micCheckTitle || "Microphone Check"}</h4>
                  <button
                    onClick={handleStopMicCheck}
                    className="text-xs px-3 py-1 bg-red-600/20 border border-red-500/30 text-red-300 rounded hover:bg-red-600/30 transition-all"
                  >
                    Stop
                  </button>
                </div>
                
                {/* Audio level meter */}
                <div className="space-y-2">
                  <div className="w-full h-8 bg-background/50 rounded-lg overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-violet-500"
                      style={{ width: `${Math.min(100, (micLevel / 255) * 100)}%` }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  </div>
                  
                  {micLevel > 30 && (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Sound detected
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-400 italic">
                    Note: Detected sound does NOT prove transcription will work
                  </p>
                </div>
                
                {/* Recovery guidance */}
                <div className="text-xs text-gray-300 space-y-1">
                  <p className="font-semibold text-violet-300">Common issues:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>No audio: Check browser mic permissions, select correct device</li>
                    <li>No speech: Network issue or browser doesn't support recognition</li>
                    <li>Unsupported language: Browser may not support selected language</li>
                    <li>Network failure: Check connection</li>
                    <li>Permission denied: Allow microphone in browser settings</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Browser support notice */}
          {!isSupported && state === "off" && !typingMode && (
            <p className="text-xs text-center text-gray-300 mt-4">
              {t.errorNotSupported.split('.')[0]}. <button onClick={handleTypeInstead} className="text-cyan-400 hover:underline">{t.buttonTypeInstead}</button>
            </p>
          )}
          
          {/* Privacy notice */}
          {state === "off" && isSupported && !typingMode && (
            <p className="text-xs text-center text-gray-300 mt-4">
              Voice recognition processes audio through your browser&apos;s speech service. No audio is stored.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
