import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import type { CreativeDirection } from "@/types";

// POST: Generate 3 creative directions via Gemini
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const roomId = params.id;
    
    // Get decision room (RLS will enforce user ownership)
    const { data: room, error: fetchError } = await supabase
      .from('decision_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (fetchError || !room) {
      return NextResponse.json({ error: "Decision room not found" }, { status: 404 });
    }
    
    const requirements = room.requirements || {};
    const ideaText = room.idea_text || '';
    
    // Try to generate via Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
      // Return fallback presets
      return NextResponse.json({ 
        directions: getFallbackPresets(requirements),
        fallback: true 
      });
    }
    
    try {
      const directions = await generateDirectionsWithGemini(apiKey, ideaText, requirements);
      return NextResponse.json({ directions, fallback: false });
    } catch (geminiError: any) {
      console.error('[Directions] Gemini error:', geminiError.message);
      
      // Return fallback presets on error
      return NextResponse.json({ 
        directions: getFallbackPresets(requirements),
        fallback: true 
      });
    }
  } catch (err) {
    console.error('[Directions] Error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function generateDirectionsWithGemini(
  apiKey: string,
  ideaText: string,
  requirements: any
): Promise<CreativeDirection[]> {
  const prompt = `You are a creative director helping generate 3 distinct video content approaches.

User's idea: ${ideaText || 'Not specified'}

Requirements:
${JSON.stringify(requirements, null, 2)}

Generate exactly 3 creative directions:
1. PRACTICAL: Tightly scoped, focused on available assets, minimal risk
2. AMBITIOUS: More creative complexity, requires specific skills/assets
3. EXPERIMENTAL: Unusual concept, higher risk but unique outcome

For each direction, provide:
- type: "practical" | "ambitious" | "experimental"
- title: Short catchy title (max 5 words)
- concept: Brief description (2-3 sentences)
- opening: How it starts (1 sentence)
- main_moment: Key visual or moment (1 sentence)
- ending: How it concludes (1 sentence)
- deliverables: Array of specific deliverable types
- required_assets: Array of needed source materials
- required_skills: Array of creator skills needed
- assumptions: Array of assumptions made
- questions: Array of unconfirmed details
- budget_allocation: { pre: number, production: number, post: number, disclaimer: string } (if budget specified in requirements)

Return ONLY valid JSON array of 3 directions, no markdown, no explanation.`;

  const maxRetries = 2;
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: prompt }] }
            ],
            generationConfig: {
              temperature: 0.9,
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
            },
          }),
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const status = res.status;
        if (status === 503 && attempt < maxRetries) {
          // Retry on 503
          const delay = 1000 * attempt;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`Gemini API error: ${status}`);
      }
      
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      
      // Strip code fences if present
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      
      // Validate response is array of 3 directions
      if (!Array.isArray(parsed) || parsed.length !== 3) {
        throw new Error('Invalid response: expected array of 3 directions');
      }
      
      // Validate each direction has required fields
      for (const dir of parsed) {
        if (!dir.type || !dir.title || !dir.concept) {
          throw new Error('Invalid direction: missing required fields');
        }
      }
      
      return parsed;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = 1000 * attempt + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

function getFallbackPresets(requirements: any): CreativeDirection[] {
  const budget = requirements.budget || 15000;
  
  return [
    {
      type: 'practical',
      title: 'Clean Product Focus',
      concept: 'Straightforward product showcase with simple transitions. Focuses on key features without elaborate setups.',
      opening: 'Product appears with clean background',
      main_moment: 'Close-up of key product detail',
      ending: 'Brand logo and call-to-action',
      deliverables: ['1 video (16:9)', '1 video (9:16)'],
      required_assets: ['Product images', 'Brand logo'],
      required_skills: ['Video editing', 'Motion graphics'],
      assumptions: ['Product images are high quality', 'Simple background works for brand'],
      questions: ['What specific product features to highlight?', 'Preferred background color?'],
      budget_allocation: {
        pre: Math.floor(budget * 0.2),
        production: Math.floor(budget * 0.3),
        post: Math.floor(budget * 0.5),
        disclaimer: 'Planning estimate—not a creator quote'
      }
    },
    {
      type: 'ambitious',
      title: 'Dynamic Lifestyle Story',
      concept: 'Product integrated into lifestyle scenario with dynamic camera moves and music. Shows product in context of use.',
      opening: 'Person in environment, product enters scene',
      main_moment: 'Product solves a problem or enhances moment',
      ending: 'Satisfied user, product close-up, brand message',
      deliverables: ['1 video (16:9)', '1 video (9:16)', '3 image stills'],
      required_assets: ['Product', 'Location or set', 'Model/talent', 'Props'],
      required_skills: ['Cinematography', 'Direction', 'Color grading', 'Sound design'],
      assumptions: ['Talent available in budget', 'Location accessible', 'Product available for shoot'],
      questions: ['Specific use case to show?', 'Talent demographic?', 'Indoor or outdoor?'],
      budget_allocation: {
        pre: Math.floor(budget * 0.25),
        production: Math.floor(budget * 0.45),
        post: Math.floor(budget * 0.3),
        disclaimer: 'Planning estimate—not a creator quote'
      }
    },
    {
      type: 'experimental',
      title: 'AI-Enhanced Visual Poem',
      concept: 'Surreal, artistic interpretation using AI generation and compositing. Product becomes part of imaginative world.',
      opening: 'Abstract AI-generated environment emerges',
      main_moment: 'Product transforms or interacts with surreal elements',
      ending: 'Reality blends with imagination, brand message',
      deliverables: ['1 hero video (16:9)', '1 social cut (9:16)', '5 frame grabs'],
      required_assets: ['Product reference images', 'Brand guidelines'],
      required_skills: ['AI tools (Midjourney/Runway)', 'Compositing', 'Advanced editing', 'Creative direction'],
      assumptions: ['Brand open to experimental approach', 'Timeline allows for iteration', 'AI tools available'],
      questions: ['Brand comfort with abstract visuals?', 'Specific emotions to evoke?', 'Reference examples?'],
      budget_allocation: {
        pre: Math.floor(budget * 0.3),
        production: Math.floor(budget * 0.3),
        post: Math.floor(budget * 0.4),
        disclaimer: 'Planning estimate—not a creator quote'
      }
    }
  ];
}
