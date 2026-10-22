/**
 * Decision Room Service
 * 
 * Business logic and helper functions for the Decision Room feature.
 * Handles validation, defaults, and requirement extraction.
 */

import type { DecisionRoom, CreativeDirection, RequirementStatus } from '@/types';

// ─── Requirement Field Definitions ────────────────────────────────────────

export const REQUIREMENT_FIELDS = {
  product: { label: 'Product/Subject', required: true },
  goal: { label: 'Goal/Objective', required: true },
  audience: { label: 'Target Audience', required: false },
  deliverables: { label: 'Deliverables', required: true },
  quantity: { label: 'Quantity', required: true },
  duration: { label: 'Duration (seconds)', required: false },
  aspectRatio: { label: 'Aspect Ratio', required: true },
  platform: { label: 'Intended Platform', required: false },
  style: { label: 'Desired Style', required: false },
  budget: { label: 'Budget (INR)', required: true },
  deadline: { label: 'Deadline', required: true },
  sourceAssets: { label: 'Available Source Assets', required: false },
  revisions: { label: 'Revision Expectations', required: false },
  usage: { label: 'Usage Requirements', required: false },
} as const;

// ─── Validation Functions ─────────────────────────────────────────────────

/**
 * Validate requirements and return issues
 */
export function validateRequirements(requirements: Record<string, any>): string[] {
  const issues: string[] = [];

  // Check required fields
  Object.entries(REQUIREMENT_FIELDS).forEach(([key, field]) => {
    if (field.required && !requirements[key]) {
      issues.push(`Missing ${field.label.toLowerCase()}`);
    }
  });

  // Validate budget format
  if (requirements.budget) {
    const budget = requirements.budget;
    if (typeof budget === 'string' && !budget.match(/^\d+(-\d+)?$/)) {
      issues.push('Budget should be in format: "15000" or "15000-25000"');
    }
  }

  // Validate deadline
  if (requirements.deadline) {
    const deadline = new Date(requirements.deadline);
    const now = new Date();
    if (deadline < now) {
      issues.push('Deadline is in the past');
    }
  }

  // Check for contradictory aspect ratio and dimensions
  if (requirements.aspectRatio && requirements.resolution) {
    const aspectRatio = requirements.aspectRatio;
    const resolution = requirements.resolution;
    if (aspectRatio === '16:9' && resolution.includes('1080x1920')) {
      issues.push('Aspect ratio 16:9 conflicts with vertical resolution 1080x1920');
    }
    if (aspectRatio === '9:16' && resolution.includes('1920x1080')) {
      issues.push('Aspect ratio 9:16 conflicts with horizontal resolution 1920x1080');
    }
  }

  // Flag ambiguous terms
  const ambiguousTerms = ['viral', 'premium', 'high-quality', 'professional', 'engaging'];
  const ideaText = JSON.stringify(requirements).toLowerCase();
  ambiguousTerms.forEach(term => {
    if (ideaText.includes(term)) {
      issues.push(`Clarify what "${term}" means for your project`);
    }
  });

  return issues;
}

/**
 * Check if requirements are complete enough to proceed
 */
export function areRequirementsComplete(requirements: Record<string, any>): boolean {
  const requiredFields = Object.entries(REQUIREMENT_FIELDS)
    .filter(([, field]) => field.required)
    .map(([key]) => key);

  return requiredFields.every(field => requirements[field]);
}

/**
 * Extract structured requirements from idea text
 * This is a simple parser - AI extraction would be more robust
 */
export function extractRequirements(ideaText: string): Record<string, any> {
  const requirements: Record<string, any> = {};

  // Extract budget (INR patterns)
  const budgetMatch = ideaText.match(/(?:₹|INR|Rs\.?)\s*(\d+(?:,\d+)*(?:k|K)?)\s*(?:-|to)?\s*(?:₹|INR|Rs\.?)?\s*(\d+(?:,\d+)*(?:k|K)?)?/i);
  if (budgetMatch) {
    const min = parseCurrency(budgetMatch[1]);
    const max = budgetMatch[2] ? parseCurrency(budgetMatch[2]) : min;
    requirements.budget = max > min ? `${min}-${max}` : `${min}`;
  }

  // Extract duration
  const durationMatch = ideaText.match(/(\d+)\s*(?:second|sec|s)\b/i);
  if (durationMatch) {
    requirements.duration = parseInt(durationMatch[1]);
  }

  // Extract aspect ratio
  const aspectRatioMatch = ideaText.match(/\b(16:9|9:16|1:1|4:5|2\.39:1)\b/i);
  if (aspectRatioMatch) {
    requirements.aspectRatio = aspectRatioMatch[1];
  }

  // Extract platform
  const platforms = ['instagram', 'youtube', 'tiktok', 'facebook', 'twitter', 'linkedin'];
  platforms.forEach(platform => {
    if (ideaText.toLowerCase().includes(platform)) {
      requirements.platform = platform.charAt(0).toUpperCase() + platform.slice(1);
    }
  });

  // Extract deadline
  const deadlineMatch = ideaText.match(/(?:deadline|by|before)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  if (deadlineMatch) {
    requirements.deadline = deadlineMatch[1];
  }

  return requirements;
}

/**
 * Parse currency string to integer (handles k/K suffix)
 */
function parseCurrency(str: string): number {
  const cleaned = str.replace(/,/g, '');
  if (cleaned.match(/k$/i)) {
    return parseInt(cleaned) * 1000;
  }
  return parseInt(cleaned);
}

// ─── Creative Direction Helpers ───────────────────────────────────────────

/**
 * Validate budget allocation sums correctly
 */
export function validateBudgetAllocation(allocation: { pre: number; production: number; post: number }): boolean {
  const sum = allocation.pre + allocation.production + allocation.post;
  return Math.abs(sum - 100) < 0.01; // Allow for floating point precision
}

/**
 * Generate default creative directions based on requirements
 */
export function generateDefaultDirections(requirements: Record<string, any>): CreativeDirection[] {
  const budget = typeof requirements.budget === 'string' 
    ? parseInt(requirements.budget.split('-')[0]) 
    : requirements.budget || 15000;

  const practical: CreativeDirection = {
    type: 'practical',
    title: 'Focused & Efficient',
    concept: 'Straightforward execution with available resources',
    opening: 'Strong product reveal',
    main_moment: 'Key features highlighted',
    ending: 'Clear call-to-action',
    deliverables: requirements.deliverables ? [requirements.deliverables] : ['1x video'],
    required_assets: ['Product images', 'Brand guidelines'],
    required_skills: ['Video editing', 'Motion graphics'],
    assumptions: ['Product assets are available', 'Brand guidelines provided'],
    questions: ['What specific features should we highlight?'],
    budget_allocation: {
      pre: 20,
      production: 50,
      post: 30,
      disclaimer: 'Planning estimate—not a creator quote.'
    }
  };

  const ambitious: CreativeDirection = {
    type: 'ambitious',
    title: 'Creative Complexity',
    concept: 'More elaborate concept with higher production value',
    opening: 'Cinematic establishing sequence',
    main_moment: 'Story-driven product integration',
    ending: 'Memorable brand moment',
    deliverables: requirements.deliverables ? [requirements.deliverables] : ['1x hero video', '3x cutdowns'],
    required_assets: ['High-res product', 'Location access or 3D models'],
    required_skills: ['AI video generation', 'Color grading', 'Sound design'],
    assumptions: ['Extended timeline available', 'Additional assets can be sourced'],
    questions: ['Is there flexibility on timeline?', 'Can we source additional talent?'],
    budget_allocation: {
      pre: 30,
      production: 40,
      post: 30,
      disclaimer: 'Planning estimate—not a creator quote.'
    }
  };

  const experimental: CreativeDirection = {
    type: 'experimental',
    title: 'Unconventional Approach',
    concept: 'Unique creative risk with potential high impact',
    opening: 'Unexpected visual hook',
    main_moment: 'Abstract or stylized product showcase',
    ending: 'Provocative brand statement',
    deliverables: requirements.deliverables ? [requirements.deliverables] : ['1x experimental video'],
    required_assets: ['Product reference', 'Creative brief freedom'],
    required_skills: ['AI art generation', 'Experimental editing', 'VFX'],
    assumptions: ['Brand is open to unconventional concepts', 'Revision rounds are available'],
    questions: ['How much creative freedom is acceptable?', 'Are there brand restrictions?'],
    budget_allocation: {
      pre: 35,
      production: 35,
      post: 30,
      disclaimer: 'Planning estimate—not a creator quote.'
    }
  };

  return [practical, ambitious, experimental];
}

// ─── Stage Progress Management ────────────────────────────────────────────

/**
 * Calculate stage completion status
 */
export function calculateStageProgress(room: DecisionRoom): DecisionRoom['stage_progress'] {
  return {
    idea: !!room.idea_text && Object.keys(room.requirements).length > 0,
    directions: !!room.selected_direction,
    evidence: !!room.selected_creator_id,
    review: !!room.linked_brief_id,
    passport: false // Only true if agreement is complete
  };
}

/**
 * Get current active stage based on progress
 */
export function getCurrentStage(progress: DecisionRoom['stage_progress']): string {
  if (!progress.idea) return 'idea';
  if (!progress.directions) return 'directions';
  if (!progress.evidence) return 'evidence';
  if (!progress.review) return 'review';
  return 'passport';
}

// ─── Default Values ───────────────────────────────────────────────────────

export const DEFAULT_STAGE_PROGRESS: DecisionRoom['stage_progress'] = {
  idea: false,
  directions: false,
  evidence: false,
  review: false,
  passport: false
};

export const DEFAULT_REQUIREMENTS: Record<string, any> = {
  deliverables: 'Video',
  quantity: 1,
  aspectRatio: '16:9',
  budget: '',
  deadline: '',
};
