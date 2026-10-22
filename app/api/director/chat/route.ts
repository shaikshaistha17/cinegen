import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import type { ConversationMessage, DirectorResponse, CampaignDraft } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user's name for personalization
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();
    
    const displayName = userData?.name || '';
    
    const body = await req.json();
    const { message, conversationId, replyLanguage, inputSource }: {
      message: string;
      conversationId?: string | null;
      replyLanguage?: string;
      inputSource?: 'voice' | 'text';
    } = body;

    // Validate inputs
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    
    // Rate limit: 20 requests per minute per user
    const rateCheck = checkRateLimit(user.id, 'director-chat', 20, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: "Too many requests. Please slow down a bit.", 
          retryAfterMs: rateCheck.retryAfterMs 
        },
        { status: 429 }
      );
    }
    
    // Get or create conversation
    let activeConversationId = conversationId;
    
    if (!activeConversationId) {
      // Create new conversation with title derived from first message
      const conversationTitle = message.length > 50 
        ? message.substring(0, 47) + '...' 
        : message;
      
      const { data: newConv, error: convError } = await supabase
        .from('director_conversations')
        .insert({
          user_id: user.id,
          title: conversationTitle,
          is_active: true
        })
        .select('id')
        .single();
      
      if (convError) {
        console.error('[Director Chat] Failed to create conversation:', convError);
        return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
      }
      
      activeConversationId = newConv.id;
    } else {
      // Verify conversation exists and user owns it (RLS check)
      const { data: existingConv, error: convError } = await supabase
        .from('director_conversations')
        .select('id')
        .eq('id', activeConversationId)
        .single();
      
      if (convError) {
        console.error('[Director Chat] Conversation not found:', convError);
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    }
    
    // Save user message to database
    const { error: userMsgError } = await supabase
      .from('director_messages')
      .insert({
        conversation_id: activeConversationId,
        role: 'user',
        content: message.trim(),
        input_source: inputSource || null,
        status: 'delivered'
      });
    
    if (userMsgError) {
      console.error('[Director Chat] Failed to save user message:', userMsgError);
      // Continue processing despite save failure
    }
    
    // Load conversation history from database (last 20 messages)
    const { data: historyMessages } = await supabase
      .from('director_messages')
      .select('role, content, created_at')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    const conversationHistory: ConversationMessage[] = (historyMessages || [])
      .reverse()
      .map(m => ({ 
        role: m.role as 'user' | 'assistant', 
        text: m.content, 
        timestamp: Date.parse(m.created_at) 
      }));

    // Generate response using Gemini
    const response = await generateConversationalResponse(
      message,
      conversationHistory,
      displayName,
      replyLanguage || 'en-US',
      req.headers.get('x-mock-failure') as '503' | 'success' | '503-503-success' | '503-persistent' | undefined
    );
    
    // Save assistant response to database
    if (!response.error) {
      const { error: assistantMsgError } = await supabase
        .from('director_messages')
        .insert({
          conversation_id: activeConversationId,
          role: 'assistant',
          content: response.reply,
          status: 'delivered'
        });
      
      if (assistantMsgError) {
        console.error('[Director Chat] Failed to save assistant message:', assistantMsgError);
        // Continue and return response despite save failure
      }
    }

    return NextResponse.json({
      ...response,
      conversationId: activeConversationId
    });
  } catch (err) {
    console.error('Director chat API error:', err);
    
    // Return honest error fallback
    return NextResponse.json({
      reply: "I'm having trouble connecting to my AI service right now. You can try typing mode, browse our creator discovery, or come back in a moment.",
      action: "none",
      error: true
    });
  }
}

async function generateConversationalResponse(
  message: string,
  history: ConversationMessage[],
  displayName: string,
  replyLanguage: string,
  mockFailureMode?: '503' | 'success' | '503-503-success' | '503-persistent' // Injectable mock for testing
): Promise<DirectorResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const isNonEnglish = !replyLanguage.startsWith('en-');
  
  // If no API key, return configuration error
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    return {
      reply: isNonEnglish 
        ? "AI సేవ కాన్ఫిగర్ చేయబడలేదు. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి." 
        : "AI service not configured. Please try again later.",
      action: "none",
      error: true
    };
  }

  // Map language codes to natural language names
  const languageNames: Record<string, string> = {
    "en-US": "English",
    "en-IN": "English",
    "en-GB": "English",
    "te-IN": "Telugu",
    "hi-IN": "Hindi",
    "ta-IN": "Tamil",
    "kn-IN": "Kannada",
    "ml-IN": "Malayalam",
    "mr-IN": "Marathi",
    "bn-IN": "Bengali",
    "gu-IN": "Gujarati",
    "pa-IN": "Punjabi",
  };
  
  const languageName = languageNames[replyLanguage] || "English";

  // Build system prompt
  const greeting = displayName 
    ? `Hey ${displayName}! Welcome to CineGen. What would you like to do?`
    : "Hey! Welcome to CineGen. What would you like to do?";

  const systemPrompt = `You are the CineGen Director, a friendly creative assistant helping users with CineGen, an AI content marketplace connecting brands with creators.

CRITICAL LANGUAGE INSTRUCTION:

${isNonEnglish ? `
You MUST respond ENTIRELY in ${languageName} using native script. Do NOT use English.

Examples of CORRECT responses:

Telugu (te-IN): "నమస్కారం! నేను మీకు ఎలా సహాయం చేయగలను?"
Hindi (hi-IN): "नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?"
Marathi (mr-IN): "नमस्कार! मी तुम्हाला कशी मदत करू शकतो?"
Tamil (ta-IN): "வணக்கம்! நான் உங்களுக்கு எப்படி உதவ முடியும்?"
Kannada (kn-IN): "ನಮಸ್ಕಾರ! ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ?"
Malayalam (ml-IN): "നമസ്കാരം! ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കും?"
Bengali (bn-IN): "নমস্কার! আমি আপনাকে কীভাবে সাহায্য করতে পারি?"
Gujarati (gu-IN): "નમસ્તે! હું તમને કેવી રીતે મદદ કરી શકું?"
Punjabi (pa-IN): "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?"

Use ONLY native ${languageName} script. English is forbidden unless replyLanguage starts with "en-".
` : `
You are responding in English. Use natural, conversational English.
`}

YOUR ROLE & PERSONALITY:
- Conversational creative partner, not a salesperson or form-filler
- Warm, helpful, concise (1-3 sentences unless explaining something complex)
- Answer the user's ACTUAL question directly
- Handle casual chat, general questions, creative brainstorming, and campaign planning
- Use conversation history for context and follow-ups
- Ask ONE short clarification when truly ambiguous
- Stay friendly without forcing every reply toward campaign creation

WHAT YOU CAN DO:
1. **Casual conversation**: Answer greetings, small talk, general questions naturally
2. **Explain CineGen**: Describe the marketplace, how it works, creator discovery
3. **Creative brainstorming**: Help develop video ideas, suggest approaches, inspire
4. **Campaign planning**: When user wants to create a brief, extract campaign details
5. **Follow-ups & refinements**: Modify previous suggestions based on new requests
6. **Navigation help**: Suggest opening discovery, brief builder when relevant

CONVERSATION EXAMPLES (guide behavior, NOT exact-match templates):

User: "Hi" or "Hello" → Greet warmly${displayName ? ` using name "${displayName}"` : ''}, ask how you can help
User: "What are you doing?" → Explain you're CineGen Director, here to help with campaigns
User: "I'm nervous about my presentation" → Acknowledge feeling, offer encouragement
User: "Explain that more simply" → Rephrase previous answer in simpler terms
User: "Help me think of a video idea" → Ask about their goal/audience, brainstorm
User: "Make the second idea cheaper" → Refer to conversation, suggest cost-saving approaches
User: "Can we speak in Telugu?" → Confirm language change (entire response in Telugu)
User: "What's CineGen?" → Explain: marketplace connecting brands with AI content creators
User: "Show me creators" → Suggest action: "open_discovery"
User: "Create a brief for this" → Extract campaign details from conversation

ACTIONS YOU CAN RETURN:
- "open_discovery": ONLY when user explicitly requests to browse/view/see creators or discovery page
- "prepare_brief": User ready to turn conversation into a formal brief
- "none": (default) Just conversational response

CRITICAL RULES:
- **Answer the actual question asked** - don't deflect to campaign creation
- **Use conversation history** - reference previous messages for context
- **Admit uncertainty** - say "I'm not sure" rather than invent information
- **Never invent**: CineGen creators, prices, availability, completed actions
- **Don't create briefs from casual chat** unless explicitly requested
- **Be honest about limitations** - you're an assistant, not omniscient
- **Validate navigation** - only suggest routes that exist: /discovery, /creators, /briefs/new
- **First message greeting**${displayName ? `: "Hey ${displayName}! Welcome to CineGen. What would you like to do?"` : `: "Hey! Welcome to CineGen. What would you like to do?"`}
- **NEVER navigate for informational questions** - "What's the top campaign?" should be ANSWERED, not trigger navigation
- **Navigation only on explicit request** - User must say "show me", "open", "browse", "view", "go to" or similar action words

CAMPAIGN EXTRACTION (only when user explicitly wants to create a brief):
Extract into campaignDraft with fields: campaignTitle, objective, contentType, style, aspectRatios, durationSeconds, resolution, quantity, toolsPreferred, budgetMin, budgetMax, originalCurrency, deadline, commercialUse, negativeKeywords, userStated[], assistantSuggestions[], unansweredQuestions[]

Currency handling: Extract budgets in the currency user provides. Store in INR (budgetMin/budgetMax fields). If user mentions USD or dollars, convert to INR at ~83:1 rate and note in originalCurrency field. If user mentions INR/rupees/₹, store as-is. When discussing budgets in voice replies, say "rupees" in English, "రూపాయలు" in Telugu, "रुपये" in Hindi.

Today's date: ${new Date().toISOString().split("T")[0]}`;

  // Build conversation context
  let conversationContext = '';
  if (history.length > 0) {
    conversationContext = '\n\nConversation so far:\n' + 
      history.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`).join('\n');
  }

  // Check if this is first message (greeting scenario)
  const isFirstMessage = history.length === 0;

  // Build prompt
  const fullPrompt = `${systemPrompt}${conversationContext}

User: ${message}

${isFirstMessage ? `This is the first message. Respond with the greeting.` : 'Respond naturally as the CineGen Director. Use conversation history for context.'}

Return ONLY valid JSON (no markdown, no code fences):
{
  "reply": "your response text in ${languageName}",
  "action": "none" | "open_discovery" | "prepare_brief",
  "campaignDraft": null or { campaign fields }
}`;

  // Call Gemini with bounded retry logic
  let lastError: any = null;
  let retryAfterMs: number | null = null;
  const maxAttempts = mockFailureMode === '503-503-success' ? 3 : 2; // Allow 3 attempts for test pattern
  const overallTimeout = 15000; // 15s total request timeout
  const startTime = Date.now();
  let mockAttemptCount = 0; // Track attempts for mock testing

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Check overall timeout
    if (Date.now() - startTime > overallTimeout) {
      console.error('[Gemini] Overall timeout exceeded');
      break;
    }

    try {
      // Injectable mock failures for testing (STRICTLY LOCAL DEVELOPMENT ONLY)
      if (mockFailureMode && process.env.NODE_ENV !== 'production') {
        mockAttemptCount++;
        console.log(`[Gemini Mock] Attempt ${mockAttemptCount} with mode: ${mockFailureMode}`);
        
        if (mockFailureMode === '503') {
          throw new Error('Gemini API error: 503');
        } else if (mockFailureMode === '503-503-success') {
          if (mockAttemptCount <= 2) {
            console.log(`[Gemini Mock] Simulating 503 for attempt ${mockAttemptCount}`);
            throw new Error('Gemini API error: 503');
          } else {
            console.log(`[Gemini Mock] Simulating success for attempt ${mockAttemptCount}`);
            // Fall through to success response
          }
        } else if (mockFailureMode === '503-persistent') {
          console.log(`[Gemini Mock] Simulating persistent 503`);
          throw new Error('Gemini API error: 503');
        } else if (mockFailureMode === 'success') {
          console.log(`[Gemini Mock] Simulating immediate success`);
          // Fall through to success response
        }
        
        // Mock success response
        if (mockFailureMode === 'success' || mockFailureMode === '503-503-success') {
          await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
          return {
            reply: `Mock successful response (attempt ${mockAttemptCount})`,
            action: "none",
            error: false
          };
        }
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: fullPrompt }] }
            ],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorBody = await res.text();
        const status = res.status;
        
        // Check for Retry-After header
        const retryAfterHeader = res.headers.get('Retry-After');
        if (retryAfterHeader) {
          const retrySeconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(retrySeconds)) {
            retryAfterMs = retrySeconds * 1000;
          }
        }
        
        // Log sanitized error for debugging
        let errorCategory = 'unknown';
        if (errorBody.includes('API key not valid') || errorBody.includes('PERMISSION_DENIED')) {
          errorCategory = 'authentication';
        } else if (errorBody.includes('RESOURCE_EXHAUSTED') || errorBody.includes('quota')) {
          errorCategory = 'quota';
        } else if (errorBody.includes('NOT_FOUND') || errorBody.includes('not available')) {
          errorCategory = 'model_not_found';
        } else if (status === 503 || errorBody.includes('UNAVAILABLE')) {
          errorCategory = 'service_unavailable';
        }
        
        console.error(`[Gemini] ${status} ${errorCategory}:`, errorBody.substring(0, 200));
        
        // Don't retry permanent errors
        if (errorCategory === 'authentication' || errorCategory === 'model_not_found') {
          throw new Error(`PERMANENT:${errorCategory}`);
        }
        
        throw new Error(`Gemini API error: ${status}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      // Strip code fences if present
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Validate response has reply
      if (!parsed.reply || typeof parsed.reply !== 'string') {
        throw new Error('Invalid response: missing reply field');
      }

      return {
        reply: parsed.reply,
        action: parsed.action || "none",
        campaignDraft: parsed.campaignDraft || undefined,
        error: false
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini] Attempt ${attempt} failed:`, errorMsg);
      lastError = err;
      
      // Don't retry permanent errors
      if (errorMsg.startsWith('PERMANENT:')) {
        break;
      }
      
      // Wait before retry with exponential backoff + jitter for 503 errors
      if (attempt < maxAttempts) {
        let delayMs: number;
        
        if (retryAfterMs) {
          // Respect Retry-After header - do NOT shorten it
          delayMs = retryAfterMs;
        } else {
          // Exponential backoff with jitter: 1s, 2s
          const baseDelay = 1000 * attempt;
          const jitter = Math.random() * 500; // 0-500ms jitter
          delayMs = baseDelay + jitter;
        }
        
        // Check if retry delay exceeds remaining request budget
        const elapsed = Date.now() - startTime;
        const remaining = overallTimeout - elapsed;
        
        if (delayMs > remaining) {
          console.log(`[Gemini] Retry-After ${delayMs}ms exceeds remaining budget ${remaining}ms - ending gracefully`);
          // Return error with retry timing for UI
          return {
            reply: isNonEnglish 
              ? "AI సేవ తాత్కాలికంగా బిజీగా ఉంది. దయచేసి కొద్ది సమయం తర్వాత మళ్లీ ప్రయత్నించండి."
              : "The AI service is temporarily busy. Please try again shortly.",
            action: "none",
            error: true,
            retryAfterMs: delayMs
          };
        }
        
        console.log(`[Gemini] Retrying in ${delayMs}ms...`);
        
        // Interruptible delay - check for overall timeout abort
        const delayStart = Date.now();
        while (Date.now() - delayStart < delayMs) {
          // Check if overall timeout exceeded during backoff
          if (Date.now() - startTime > overallTimeout) {
            console.log('[Gemini] Overall timeout during backoff - aborting retry');
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
        }
      }
    }
  }

  // All retries failed, return structured error with accurate message
  const errorMsg = lastError instanceof Error ? lastError.message : String(lastError);
  console.error('[Gemini] Failed after retries:', errorMsg);
  
  // Return accurate error message without retryAfterMs (already handled in loop if needed)
  return {
    reply: isNonEnglish 
      ? "AI సేవ తాత్కాలికంగా బిజీగా ఉంది. దయచేసి కొద్ది సమయం తర్వాత మళ్లీ ప్రయత్నించండి."
      : "The AI service is temporarily busy. Please try again shortly.",
    action: "none",
    error: true
  };
}
