"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Volume2, VolumeX, Square, Keyboard,
  Loader2, AlertCircle, CheckCircle2, Sparkles, Send, User
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAuth } from "@/lib/auth-context";
import type { ConversationMessage, CampaignDraft, DirectorAction } from "@/types";

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
  
  // State
  const [state, setState] = useState<AssistantState>("off");
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
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
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isProcessingRef = useRef(false);
  const wakeWordDetectedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timingRef = useRef<TimingMetrics>({});
  const errorRetryCountRef = useRef(0);
  
  // Check browser support
  const [isSupported, setIsSupported] = useState(false);
  
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition && 'speechSynthesis' in window);
  }, []);
  
  // Load voices and handle voice selection
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Try to restore saved voice from localStorage
      const savedVoiceName = localStorage.getItem('cinegen_voice');
      if (savedVoiceName && voices.length > 0) {
        const voice = voices.find(v => v.name === savedVoiceName);
        if (voice) setSelectedVoice(voice);
      } else if (voices.length > 0) {
        // Default to first English voice
        const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        setSelectedVoice(englishVoice);
      }
    };
    
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);
  
  // Save selected voice to localStorage
  useEffect(() => {
    if (selectedVoice) {
      localStorage.setItem('cinegen_voice', selectedVoice.name);
    }
  }, [selectedVoice]);
  
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
    
    timingRef.current.ttsStartTime = performance.now();
    
    // Log timing: response ready to TTS start
    if (timingRef.current.responseReadyTime) {
      const delta = timingRef.current.ttsStartTime - timingRef.current.responseReadyTime;
      console.log(`[Timing] Response ready → TTS start: ${delta.toFixed(0)}ms`);
    }
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const phoneticText = getPhoneticText(text);
    const utterance = new SpeechSynthesisUtterance(phoneticText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Use selected voice if available
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.onstart = () => {
      setState("speaking");
      // Pause recognition during speech
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Already stopped
        }
      }
    };
    
    utterance.onend = () => {
      // Resume listening if still in active session and not in typing mode
      if (state !== "off" && !isProcessingRef.current && !typingMode) {
        setState("awaiting_wake");
        startRecognition();
      } else if (typingMode) {
        setState("off");
      }
    };
    
    utterance.onerror = () => {
      if (state !== "off" && !typingMode) {
        setState("awaiting_wake");
        startRecognition();
      } else if (typingMode) {
        setState("off");
      }
    };
    
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isMuted, state, typingMode, selectedVoice]);
  
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
  
  // Process campaign idea or message or message
  const processCampaignIdea = useCallback(async (idea: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setState("processing");
    
    timingRef.current.requestStartTime = performance.now();
    
    // Log timing: command end to request start
    if (timingRef.current.commandEndTime) {
      const delta = timingRef.current.requestStartTime - timingRef.current.commandEndTime;
      console.log(`[Timing] Command end → Request start: ${delta.toFixed(0)}ms`);
    }
    
    // Add user message to both message lists
    const userMessage: ConversationMessage = {
      role: "user",
      text: idea,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setConversationHistory(prev => {
      const updated = [...prev, userMessage];
      // Bound to last 20 messages
      return updated.slice(-20);
    });
    
    try {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      const response = await fetch("/api/director/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: idea,
          sessionId,
          conversationHistory: conversationHistory
        }),
        signal: abortControllerRef.current.signal
      });
      
      timingRef.current.responseReadyTime = performance.now();
      
      // Log timing: request start to response ready
      if (timingRef.current.requestStartTime) {
        const delta = timingRef.current.responseReadyTime - timingRef.current.requestStartTime;
        console.log(`[Timing] Request start → Response ready: ${delta.toFixed(0)}ms`);
      }
      
      if (!response.ok) {
        throw new Error("Failed to generate response");
      }
      
      const data = await response.json();
      
      // Add assistant response to conversation
      const assistantMessage: ConversationMessage = {
        role: "assistant",
        text: data.reply,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setConversationHistory(prev => {
        const updated = [...prev, assistantMessage];
        return updated.slice(-20);
      });
      
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
      
      // Speak the response
      speak(data.reply);
      errorRetryCountRef.current = 0; // Reset error counter on success
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[Request] Aborted previous request');
        return; // Don't show error for intentionally cancelled requests
      }
      
      const errorText = "I encountered an error. Would you like to try again?";
      setErrorMessage(errorText);
      setState("error");
      const errorMsg: ConversationMessage = {
        role: "assistant",
        text: errorText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
      speak(errorText);
    } finally {
      isProcessingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [speak, sessionId, conversationHistory]);
  
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
    recognition.lang = "en-US";
    
    recognition.onstart = () => {
      if (!timingRef.current.recognitionReadyTime) {
        timingRef.current.recognitionReadyTime = performance.now();
        
        // Log timing: enable click to recognition ready
        if (timingRef.current.enableClickTime) {
          const delta = timingRef.current.recognitionReadyTime - timingRef.current.enableClickTime;
          console.log(`[Timing] Enable click → Recognition ready: ${delta.toFixed(0)}ms`);
        }
      }
    };
    
    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }
      
      const currentText = (finalTranscript + interimTranscript).trim();
      const currentTextLower = currentText.toLowerCase();
      
      // Show interim transcription for feedback
      setTranscript(currentText);
      
      // Check for wake word
      if (state === "awaiting_wake" && !wakeWordDetectedRef.current) {
        if (isWakePhrase(currentTextLower)) {
          wakeWordDetectedRef.current = true;
          timingRef.current.wakeDetectedTime = performance.now();
          
          setState("listening");
          
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
            // Process the command
            timingRef.current.commandEndTime = performance.now();
            processCampaignIdea(commandAfterWake);
          } else {
            // No command, just greet with first message (empty history)
            setTranscript("");
            processCampaignIdea("Hello");
          }
        }
      }
      
      // Process campaign idea when listening
      if (state === "listening" && finalTranscript.trim() && !isProcessingRef.current) {
        const cleanIdea = finalTranscript.trim();
        
        // Handle simple local commands without API call
        const lowerIdea = cleanIdea.toLowerCase();
        if (lowerIdea === 'stop' || lowerIdea === 'cancel' || lowerIdea === 'quit') {
          handleStop();
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
      console.error("Speech recognition error:", event.error);
      
      if (event.error === "not-allowed") {
        setErrorMessage("Microphone access denied. Please grant permission to use voice.");
        setState("error");
        errorRetryCountRef.current = 999; // Don't retry permission errors
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
        setErrorMessage("Network error. Please check your connection.");
        setState("error");
      } else {
        // Other errors - retry once then stop
        if (errorRetryCountRef.current < 1 && recognitionRef.current) {
          errorRetryCountRef.current++;
          setTimeout(() => {
            if (recognitionRef.current) {
              startRecognition();
            }
          }, 500);
        } else {
          setErrorMessage("Speech recognition error. Please try again.");
          setState("error");
        }
      }
    };
    
    recognition.onend = () => {
      // Auto-restart if still in active session and not processing
      if (state !== "off" && state !== "processing" && !isProcessingRef.current && errorRetryCountRef.current < 3) {
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
  }, [state, speak, processCampaignIdea]);
  
  // Enable voice button handler
  const handleEnableVoice = useCallback(async () => {
    if (!isSupported) {
      setErrorMessage("Voice features are not supported in this browser. Please try Chrome or Edge.");
      setState("error");
      return;
    }
    
    timingRef.current = { enableClickTime: performance.now() };
    
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setState("awaiting_wake");
      wakeWordDetectedRef.current = false;
      setErrorMessage("");
      errorRetryCountRef.current = 0;
      setTypingMode(false); // Disable typing mode when enabling voice
      startRecognition();
      
      const welcomeText = 'Voice assistant enabled. Say "Hey CineGen" to start.';
      const welcomeMsg: ConversationMessage = {
        role: "assistant",
        text: welcomeText,
        timestamp: Date.now()
      };
      setMessages([welcomeMsg]);
      speak(welcomeText);
      
    } catch (error: any) {
      setErrorMessage("Microphone access denied. Please grant permission to use voice features.");
      setState("error");
    }
  }, [isSupported, startRecognition, speak]);
  
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
    
    setState("off");
    setTranscript("");
    setTypingMode(false);
    wakeWordDetectedRef.current = false;
    isProcessingRef.current = false;
    errorRetryCountRef.current = 0;
    setErrorMessage("");
    timingRef.current = {};
    // Don't clear messages/history/draft on stop - user might want to resume
  }, []);
  
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
        text: "Type your campaign idea or question below. Press Enter to send, Shift+Enter for a new line.",
        timestamp: Date.now()
      };
      setMessages([welcomeMsg]);
    }
  }, [messages.length]);
  
  // Send typed message
  const handleSendTyped = useCallback(() => {
    const trimmed = typedInput.trim();
    if (!trimmed || isProcessingRef.current) return;
    
    processCampaignIdea(trimmed);
    setTypedInput("");
  }, [typedInput, processCampaignIdea]);
  
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
    };
  }, []);
  
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
    off: "Off",
    awaiting_wake: 'Say "Hey CineGen"',
    listening: "Listening...",
    processing: "Thinking...",
    speaking: "Speaking...",
    error: "Error"
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
            {typingMode ? "Type your idea." : "Your idea. Say it out loud."}
          </p>
          
          {/* Supporting text */}
          <p className="text-center text-sm text-muted-foreground/90 mb-6">
            Describe your campaign. Shape your brief.
          </p>
          
          {/* Voice Preview (shown when off and not in typing mode) */}
          {state === "off" && !typingMode && availableVoices.length > 0 && (
            <div className="mb-4 p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold text-violet-300">Voice Preview</span>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedVoice?.name || ''}
                  onChange={(e) => {
                    const voice = availableVoices.find(v => v.name === e.target.value);
                    if (voice) setSelectedVoice(voice);
                  }}
                  className="flex-1 text-xs px-2 py-1 bg-background/50 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-violet-400"
                  aria-label="Select voice"
                >
                  {availableVoices.map(voice => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleVoicePreview}
                  className="px-3 py-1 text-xs bg-violet-600 text-white rounded hover:bg-violet-500 transition-all focus-visible:ring-2 focus-visible:ring-violet-400"
                  aria-label="Test voice pronunciation"
                >
                  Test
                </button>
              </div>
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
                className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{errorMessage}</p>
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
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Budget Min</label>
                      <input
                        type="number"
                        value={campaignDraft.budgetMin || ''}
                        onChange={(e) => setCampaignDraft(prev => ({ ...prev, budgetMin: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-background/50 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Budget Max</label>
                      <input
                        type="number"
                        value={campaignDraft.budgetMax || ''}
                        onChange={(e) => setCampaignDraft(prev => ({ ...prev, budgetMax: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-background/50 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
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
                  placeholder="Describe your campaign idea... (Enter to send, Shift+Enter for new line)"
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
                  Send
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
                  Enable voice
                </button>
                
                <button
                  onClick={handleTypeInstead}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 glass border border-white/10 text-foreground rounded-xl font-medium hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Switch to typing mode"
                >
                  <Keyboard className="w-4 h-4" />
                  Type instead
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
                Use voice instead
              </button>
            ) : (
              <div className="space-y-2">
                {/* Stop speaking / Interrupt button (when speaking) */}
                {state === "speaking" && (
                  <button
                    onClick={() => {
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                      setState("awaiting_wake");
                      startRecognition();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600/20 border border-amber-500/30 text-amber-300 rounded-xl font-semibold hover:bg-amber-600/30 transition-all focus-visible:ring-2 focus-visible:ring-amber-400"
                    aria-label="Stop speaking"
                  >
                    <Square className="w-4 h-4" />
                    Stop speaking
                  </button>
                )}
                
                {/* Interrupt and speak button */}
                {state === "speaking" && (
                  <button
                    onClick={() => {
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                      }
                      setState("listening");
                      wakeWordDetectedRef.current = true;
                      startRecognition();
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
                      Review brief
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
          
          {/* Browser support notice */}
          {!isSupported && state === "off" && !typingMode && (
            <p className="text-xs text-center text-muted-foreground mt-4">
              Voice features require Chrome or Edge. <button onClick={handleTypeInstead} className="text-cyan-400 hover:underline">Type instead</button>
            </p>
          )}
          
          {/* Privacy notice */}
          {state === "off" && isSupported && !typingMode && (
            <p className="text-xs text-center text-muted-foreground/70 mt-4">
              Voice recognition processes audio through your browser&apos;s speech service. No audio is stored.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
