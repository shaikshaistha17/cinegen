import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import type { ConversationMessage, DirectorResponse, CampaignDraft } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId, conversationHistory, replyLanguage }: {
      message: string;
      sessionId: string;
      conversationHistory: ConversationMessage[];
      replyLanguage?: string;
    } = body;

    // Validate inputs
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // Extract userId and display name from session
    let userId = 'anonymous';
    let displayName = '';
    try {
      const sessionCookie = req.cookies.get('cinegen_session')?.value;
      if (sessionCookie) {
        const session = JSON.parse(sessionCookie);
        userId = session.userId || 'anonymous';
        displayName = session.name || '';
      }
    } catch (e) {
      // Use anonymous if parsing fails
    }

    // Rate limit: 20 requests per minute per user
    const rateCheck = checkRateLimit(userId, 'director-chat', 20, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: "Too many requests. Please slow down a bit.", 
          retryAfterMs: rateCheck.retryAfterMs 
        },
        { status: 429 }
      );
    }

    // Bound conversation history to last 20 messages
    const boundedHistory = (conversationHistory || []).slice(-20);

    // Generate response using Gemini
    const response = await generateConversationalResponse(
      message,
      boundedHistory,
      displayName,
      replyLanguage || 'en-US'
    );

    return NextResponse.json(response);
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
  replyLanguage: string
): Promise<DirectorResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // If no API key, return honest fallback
  if (!apiKey) {
    return {
      reply: "I'm having trouble connecting to my AI service right now. You can try browsing our creator discovery or come back in a moment.",
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

  const systemPrompt = `You are the CineGen Director, a friendly creative companion helping users create campaign briefs for an AI content marketplace.

PERSONALITY:
- Warm, concise, and conversational (1-3 sentences per response)
- Natural and supportive, like a creative partner
- Ask ONE clarification at a time, not multiple questions
- Don't force every conversation into a campaign brief

LANGUAGE:
- Respond in ${languageName}. Use natural, conversational ${languageName}.
- Keep the tone warm and professional regardless of language.

CONVERSATION MODES:
1. Casual conversation: If user says "How are you?" or similar, respond naturally. Don't push campaign creation.
2. Creative brainstorming: Help explore ideas, suggest approaches, inspire
3. Campaign briefing: When user is ready, extract campaign details
4. Follow-up corrections: When user says "change X to Y" or "make it Z instead", modify ONLY the mentioned field and preserve everything else

ACTIONS:
You can suggest these actions:
- "open_discovery": Open the creator discovery page
- "prepare_brief": User is ready to turn conversation into a brief
- "clear_draft": Clear the current campaign draft
- "none": Just conversational response

CAMPAIGN EXTRACTION:
When user explicitly says they want to "turn this into a brief" or is clearly ready to create a campaign, extract details into a campaignDraft with these fields:
- campaignTitle, objective, contentType, style, aspectRatios, durationSeconds, resolution, quantity, toolsPreferred, budgetMin, budgetMax, deadline, commercialUse, negativeKeywords
- Include "userStated" array: things the user explicitly mentioned
- Include "assistantSuggestions" array: things you inferred
- Include "unansweredQuestions" array: critical missing details

CURRENCY HANDLING (CRITICAL):
- All budgets MUST be in USD
- If user mentions INR/rupees, convert to USD using rate ~83 INR = 1 USD
- Set "originalCurrency" field to preserve transparency, e.g., "INR ₹15,000-20,000"
- Examples:
  * "15000 rupees" → budgetMin: 180, originalCurrency: "INR ₹15,000"
  * "20 thousand rupees" → budgetMin: 240, originalCurrency: "INR ₹20,000"
  * "$500" → budgetMin: 500, originalCurrency: null (already USD)
- Round converted amounts to nearest 10 USD for readability

IMPORTANT:
- First message with empty history: respond with greeting
- Never invent missing information
- When correcting, change ONLY the mentioned field
- Confirm before clearing a draft

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

${isFirstMessage ? `Respond with the personalized greeting: "${greeting}"` : 'Respond as the CineGen Director.'}

Return ONLY valid JSON (no markdown, no code fences) with this structure:
{
  "reply": "your response text",
  "action": "none" | "open_discovery" | "prepare_brief" | "clear_draft",
  "campaignDraft": null or {
    "campaignTitle": string,
    "objective": string,
    "contentType": "Short-form Video" | "Long-form Video" | "Animation" | "Motion Graphics" | "Image Campaign" | "Social Media Pack" | "Brand Film",
    "style": string,
    "aspectRatios": ["16:9" | "9:16" | "1:1" | "4:5" | "2.39:1"],
    "durationSeconds": number or null,
    "resolution": "1080p" | "4K" | "8K",
    "quantity": number,
    "toolsPreferred": array of tools,
    "budgetMin": number (in USD),
    "budgetMax": number (in USD),
    "originalCurrency": string or null (e.g., "INR ₹15,000-20,000" if user mentioned INR),
    "deadline": ISO date string,
    "commercialUse": {...},
    "negativeKeywords": string[],
    "userStated": string[],
    "assistantSuggestions": string[],
    "unansweredQuestions": string[]
  }
}`;

  // Call Gemini with timeout and retries
  let lastError: any = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
        throw new Error(`Gemini API error: ${res.status}`);
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
      console.warn(`Gemini attempt ${attempt} failed:`, err);
      lastError = err;
      
      // Wait a bit before retry
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  // All retries failed, return honest fallback
  console.error('Gemini failed after all retries:', lastError);
  return {
    reply: "I'm having trouble connecting to my AI service right now. You can try typing mode, browse our creator discovery, or come back in a moment.",
    action: "none",
    error: true
  };
}
