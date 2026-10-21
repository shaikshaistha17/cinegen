import { generateFallbackBrief } from "@/lib/briefFallback";

type DraftResult = {
  brief: Record<string, unknown>;
  source: 'gemini' | 'fallback' | 'deterministic';
  aiLabeled: boolean;
  preservedIdea: string;
};

function validateGeminiOutput(parsed: any): boolean {
  // Must have required fields with non-empty values
  if (!parsed.campaignTitle || typeof parsed.campaignTitle !== 'string' || parsed.campaignTitle.trim().length === 0) return false;
  if (!parsed.objective || typeof parsed.objective !== 'string' || parsed.objective.trim().length === 0) return false;
  if (!parsed.contentType || typeof parsed.contentType !== 'string' || parsed.contentType.trim().length === 0) return false;
  return true;
}

async function callGeminiWithTimeout(idea: string, timeoutMs: number): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No API key');

  const systemPrompt = `You are a creative brief generator for an AI content marketplace called CineGen.
Given a plain-language campaign idea, extract and return ONLY a valid JSON object (no markdown, no code fences, no explanation) with these exact fields:
{
  "campaignTitle": string,
  "objective": string,
  "contentType": one of ["Short-form Video","Long-form Video","Animation","Motion Graphics","Image Campaign","Social Media Pack","Brand Film"],
  "style": string (describe the visual style in 1-2 sentences),
  "aspectRatios": array of one or more of ["16:9","9:16","1:1","4:5","2.39:1"],
  "durationSeconds": number or null (null for image campaigns),
  "resolution": one of ["1080p","4K","8K"],
  "quantity": number,
  "toolsPreferred": array of tools from ["Midjourney","Runway","Kling","Veo","Sora","Pika","Luma","Flux","ComfyUI","Stable Diffusion","ElevenLabs","Suno","HeyGen","Topaz","Higgsfield"],
  "budgetMin": number (USD),
  "budgetMax": number (USD),
  "deadline": ISO date string (30 days from today),
  "commercialUse": {
    "licenseTier": one of ["Full Buyout","Commercial 1yr","Editorial Only","Royalty-Free","Limited"],
    "modelIndemnityRequired": boolean,
    "workflowHandoffRequired": boolean,
    "usageRegions": array of strings,
    "usageDurationMonths": number,
    "exclusivity": boolean
  },
  "negativeKeywords": array of strings
}

Be specific and creative. Infer the best options from the idea. Today's date: ${new Date().toISOString().split("T")[0]}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `${systemPrompt}\n\nCampaign idea: ${idea}` }] }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Strip code fences if present
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function draftBrief(idea: string): Promise<DraftResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  // If no API key, use deterministic fallback
  if (!apiKey) {
    const fallback = generateFallbackBrief(idea);
    return {
      brief: fallback,
      source: 'deterministic',
      aiLabeled: false,
      preservedIdea: idea,
    };
  }

  // Try Gemini with timeout and retry
  let lastError: any = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const parsed = await callGeminiWithTimeout(idea, 10000);
      
      // Validate output
      if (validateGeminiOutput(parsed)) {
        return {
          brief: { ...parsed, generatedByAI: true, rawIdea: idea },
          source: 'gemini',
          aiLabeled: true,
          preservedIdea: idea,
        };
      } else {
        console.warn(`Gemini validation failed on attempt ${attempt}`);
        lastError = new Error('Invalid Gemini output');
      }
    } catch (err) {
      console.warn(`Gemini attempt ${attempt} failed:`, err);
      lastError = err;
    }
  }

  // All attempts failed, use fallback
  console.log('Gemini failed after retries, using fallback');
  const fallback = generateFallbackBrief(idea);
  return {
    brief: fallback,
    source: 'fallback',
    aiLabeled: false,
    preservedIdea: idea,
  };
}
