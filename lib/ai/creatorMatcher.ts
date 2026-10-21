import { Brief, CreatorProfile, PortfolioItem } from "@/types";

export type MatchFactor = { 
  factor: string; 
  points: number; 
  maxPoints: number; 
  explanation: string 
};

export type PortfolioMatch = { 
  id: string; 
  title: string; 
  mediaUrl: string; 
  thumbnailUrl: string; 
  relevance: string 
};

export type CreatorMatch = {
  creatorId: string;
  score: number; // 0-100
  factors: MatchFactor[];
  reasons: string[]; // human-readable summary per factor
  matchedPortfolioItems: PortfolioMatch[];
  mismatches: string[];
  missingEvidence: string[];
  aiNote?: string; // labeled AI contribution, only if AI configured and validated
  aiLabeled: boolean;
};

function scoreSkillsOverlap(brief: Brief, creator: CreatorProfile): MatchFactor {
  const briefTools = brief.toolsPreferred || [];
  if (briefTools.length === 0) {
    return {
      factor: 'Skills Overlap',
      points: 40,
      maxPoints: 40,
      explanation: 'No specific tools required — full score',
    };
  }

  const creatorSkills = creator.skills || [];
  const matched = briefTools.filter(tool => creatorSkills.includes(tool));
  const points = Math.round((matched.length / briefTools.length) * 40);

  return {
    factor: 'Skills Overlap',
    points,
    maxPoints: 40,
    explanation: `Matched ${matched.length} of ${briefTools.length} required tools: ${matched.join(', ') || 'none'}`,
  };
}

function scoreToolsVerified(brief: Brief, creator: CreatorProfile): MatchFactor {
  const briefTools = brief.toolsPreferred || [];
  if (briefTools.length === 0) {
    return {
      factor: 'Verified Tools',
      points: 30,
      maxPoints: 30,
      explanation: 'No specific tools required — full score',
    };
  }

  const verifiedToolNames = (creator.verifiedTools || []).map(vt => vt.name);
  const matched = briefTools.filter(tool => verifiedToolNames.includes(tool));
  const points = Math.round((matched.length / briefTools.length) * 30);

  return {
    factor: 'Verified Tools',
    points,
    maxPoints: 30,
    explanation: `${matched.length} verified tools matching brief: ${matched.join(', ') || 'none'}`,
  };
}

function scoreBudgetFit(brief: Brief, creator: CreatorProfile): { factor: MatchFactor; mismatch?: string } {
  const hourlyRate = creator.hourlyRateUsd || 0;
  const estimatedCost = hourlyRate * 40; // assume 40h project
  const budgetMin = brief.budgetMin || 0;
  const budgetMax = brief.budgetMax || 0;

  if (budgetMax === 0) {
    return {
      factor: {
        factor: 'Budget Fit',
        points: 20,
        maxPoints: 20,
        explanation: 'No budget specified — full score',
      },
    };
  }

  let points = 0;
  let mismatch: string | undefined;

  if (estimatedCost >= budgetMin && estimatedCost <= budgetMax) {
    points = 20;
  } else if (estimatedCost <= budgetMax * 1.2) {
    points = 10;
  } else if (estimatedCost > budgetMax * 1.5) {
    points = 0;
    mismatch = `Estimated cost ~$${estimatedCost.toFixed(0)} exceeds budget max $${budgetMax}`;
  }

  return {
    factor: {
      factor: 'Budget Fit',
      points,
      maxPoints: 20,
      explanation: `Estimated cost $${estimatedCost.toFixed(0)} (assuming 40h at $${hourlyRate}/h) vs budget $${budgetMin}–$${budgetMax}`,
    },
    mismatch,
  };
}

function scoreAvailability(creator: CreatorProfile): { factor: MatchFactor; missingEvidence?: string } {
  const availability = creator.availability;
  let points = 0;
  let missingEvidence: string | undefined;

  if (availability === 'Available') {
    points = 10;
  } else if (availability === 'Limited') {
    points = 5;
  } else if (availability === 'Booked') {
    points = 0;
  } else {
    points = 0;
    missingEvidence = 'Availability unknown';
  }

  return {
    factor: {
      factor: 'Availability',
      points,
      maxPoints: 10,
      explanation: availability ? `Status: ${availability}` : 'Availability not specified',
    },
    missingEvidence,
  };
}

function matchPortfolioItems(brief: Brief, creator: CreatorProfile): PortfolioMatch[] {
  const portfolio = creator.portfolio || [];
  const briefTools = brief.toolsPreferred || [];
  const matches: PortfolioMatch[] = [];

  for (const item of portfolio) {
    let relevance = '';
    
    // Match by content type
    if (item.contentType === brief.contentType) {
      relevance = `Same content type: ${item.contentType}`;
    }
    
    // Match by tools
    const toolsMatch = item.toolsUsed?.some(tool => briefTools.includes(tool));
    if (toolsMatch && !relevance) {
      const matchedTools = item.toolsUsed?.filter(tool => briefTools.includes(tool)) || [];
      relevance = `Uses required tools: ${matchedTools.join(', ')}`;
    }

    if (relevance) {
      matches.push({
        id: item.id,
        title: item.title,
        mediaUrl: item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl,
        relevance,
      });
    }
  }

  return matches;
}

async function getAIQualitativeNote(brief: Brief, creator: CreatorProfile): Promise<string | undefined> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return undefined;

  try {
    // Prepare compact data
    const briefSummary = {
      contentType: brief.contentType,
      style: brief.style,
      toolsPreferred: brief.toolsPreferred,
    };

    const creatorSummary = {
      handle: creator.handle,
      specializations: creator.specializations,
      skills: creator.skills.slice(0, 3),
      portfolioSummary: creator.portfolio.slice(0, 3).map(p => ({
        title: p.title,
        contentType: p.contentType,
      })),
    };

    const prompt = `You are evaluating a creator for a brand brief. Provide a brief qualitative assessment (max 100 words) about how well this creator fits.

Brief: ${JSON.stringify(briefSummary)}
Creator: ${JSON.stringify(creatorSummary)}

Return only the assessment text, no JSON.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 200,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Validate response is a string and under 500 chars
    if (typeof text === 'string' && text.length > 0 && text.length < 500) {
      return `[AI assessment] ${text.trim()}`;
    }
    return undefined;
  } catch (err) {
    console.warn('AI qualitative note failed:', err);
    return undefined;
  }
}

export async function matchCreators(brief: Brief, creators: CreatorProfile[]): Promise<CreatorMatch[]> {
  const matches: CreatorMatch[] = [];

  for (const creator of creators) {
    const factors: MatchFactor[] = [];
    const reasons: string[] = [];
    const mismatches: string[] = [];
    const missingEvidence: string[] = [];

    // Score each factor
    const skillsResult = scoreSkillsOverlap(brief, creator);
    factors.push(skillsResult);
    reasons.push(`Skills: ${skillsResult.points}/${skillsResult.maxPoints} pts — ${skillsResult.explanation}`);

    const toolsResult = scoreToolsVerified(brief, creator);
    factors.push(toolsResult);
    reasons.push(`Tools: ${toolsResult.points}/${toolsResult.maxPoints} pts — ${toolsResult.explanation}`);

    const budgetResult = scoreBudgetFit(brief, creator);
    factors.push(budgetResult.factor);
    reasons.push(`Budget: ${budgetResult.factor.points}/${budgetResult.factor.maxPoints} pts — ${budgetResult.factor.explanation}`);
    if (budgetResult.mismatch) {
      mismatches.push(budgetResult.mismatch);
    }

    const availabilityResult = scoreAvailability(creator);
    factors.push(availabilityResult.factor);
    reasons.push(`Availability: ${availabilityResult.factor.points}/${availabilityResult.factor.maxPoints} pts — ${availabilityResult.factor.explanation}`);
    if (availabilityResult.missingEvidence) {
      missingEvidence.push(availabilityResult.missingEvidence);
    }

    // Calculate total score
    const totalPoints = factors.reduce((sum, f) => sum + f.points, 0);
    const maxPoints = factors.reduce((sum, f) => sum + f.maxPoints, 0);
    const score = Math.round((totalPoints / maxPoints) * 100);

    // Match portfolio items
    const matchedPortfolioItems = matchPortfolioItems(brief, creator);

    // Optional AI note
    let aiNote: string | undefined;
    let aiLabeled = false;
    try {
      aiNote = await getAIQualitativeNote(brief, creator);
      aiLabeled = !!aiNote;
    } catch (e) {
      // AI failed, continue without it
    }

    matches.push({
      creatorId: creator.id,
      score,
      factors,
      reasons,
      matchedPortfolioItems,
      mismatches,
      missingEvidence,
      aiNote,
      aiLabeled,
    });
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}
