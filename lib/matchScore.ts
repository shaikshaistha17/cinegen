import { CreatorProfile, Brief, MatchResult } from "@/types";

export function computeMatchScore(creator: CreatorProfile, brief: Brief): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  // 1. Tool overlap (35 pts max)
  const creatorToolNames = creator.verifiedTools.map((t) => t.name);
  const overlap = brief.toolsPreferred.filter((t) => creatorToolNames.includes(t));
  const toolScore =
    brief.toolsPreferred.length > 0
      ? (overlap.length / brief.toolsPreferred.length) * 35
      : 35;
  score += toolScore;
  if (overlap.length > 0) {
    reasons.push(`Uses ${overlap.slice(0, 3).join(", ")} — matches brief tools`);
  }

  // 2. Specialization match (25 pts max)
  if (creator.specializations.includes(brief.contentType)) {
    score += 25;
    reasons.push(`Specializes in ${brief.contentType}`);
  } else {
    // Partial — adjacent specialization
    const adjacent: Record<string, string[]> = {
      "Brand Film": ["Long-form Video", "Short-form Video"],
      "Short-form Video": ["Social Media Pack", "Brand Film"],
      "Animation": ["Motion Graphics", "Short-form Video"],
      "Motion Graphics": ["Animation", "Short-form Video"],
      "Social Media Pack": ["Short-form Video", "Image Campaign"],
      "Image Campaign": ["Brand Film", "Social Media Pack"],
      "Long-form Video": ["Brand Film", "Short-form Video"],
    };
    const adj = adjacent[brief.contentType] ?? [];
    if (creator.specializations.some((s) => adj.includes(s))) {
      score += 12;
      reasons.push(`Works in adjacent content types`);
    }
  }

  // 3. Aspect ratio experience (10 pts max)
  const crAspectRatios = new Set(
    creator.portfolio.flatMap((p) => [p.aspectRatio])
  );
  const arMatch = brief.aspectRatios.filter((ar) => crAspectRatios.has(ar));
  if (arMatch.length > 0) {
    score += 10;
    reasons.push(`Has ${arMatch[0]} portfolio experience`);
  }

  // 4. License tier match (10 pts max)
  const portfolioLicenses = creator.portfolio.map((p) => p.commercialUse.licenseTier);
  if (portfolioLicenses.includes(brief.commercialUse.licenseTier)) {
    score += 10;
    reasons.push(`Offers ${brief.commercialUse.licenseTier} licensing`);
  }

  // 5. Rating bonus (10 pts max)
  const ratingScore = (creator.stats.avgRating / 5) * 10;
  score += ratingScore;
  if (creator.stats.avgRating >= 4.8) {
    reasons.push(`${creator.stats.avgRating}★ top-rated creator`);
  }

  // 6. Availability bonus (5 pts max)
  if (creator.availability === "Available") {
    score += 5;
    reasons.push("Available now");
  } else if (creator.availability === "Limited") {
    score += 2;
  }

  // 7. Verification bonus (5 pts max)
  if (creator.verification.badge === "Studio") {
    score += 5;
    reasons.push("Studio-verified creator");
  } else if (creator.verification.badge === "Verified") {
    score += 3;
  }

  // 8. Budget fit — rate in range check (bonus up to 5)
  const crDailyRate = creator.hourlyRate * 8;
  const estimatedProjectCost = crDailyRate * 5;
  if (estimatedProjectCost >= brief.budgetMin && estimatedProjectCost <= brief.budgetMax) {
    score += 5;
    reasons.push(`Rate fits within budget`);
  }

  return {
    creator,
    score: Math.min(Math.round(score), 100),
    reasons: reasons.slice(0, 3),
  };
}

export function rankCreators(creators: CreatorProfile[], brief: Brief): MatchResult[] {
  return creators
    .map((c) => computeMatchScore(c, brief))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
