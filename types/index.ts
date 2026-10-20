// ─── Enums & Literals ────────────────────────────────────────────────────────

export type UserRole = "brand" | "creator" | "guest" | "admin";

export type VerificationBadge = "Studio" | "Verified" | "Rising" | "Unverified";

export type AvailabilityStatus = "Available" | "Booked" | "Limited";

export type ProficiencyLevel = "Expert" | "Advanced" | "Intermediate" | "Beginner";

export type ContentType =
  | "Short-form Video"
  | "Long-form Video"
  | "Animation"
  | "Motion Graphics"
  | "Image Campaign"
  | "Social Media Pack"
  | "Brand Film";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5" | "2.39:1";

export type LicenseTier =
  | "Full Buyout"
  | "Commercial 1yr"
  | "Editorial Only"
  | "Royalty-Free"
  | "Limited";

export type BriefStatus = "Draft" | "Open" | "In Review" | "Hired" | "Delivered";

export type ProposalStatus = "Pending" | "Shortlisted" | "Accepted" | "Rejected";

export type EngagementStage =
  | "Discovery"
  | "Brief"
  | "Proposals"
  | "Hired"
  | "Delivered";

export type AiTool =
  | "Midjourney"
  | "Runway"
  | "Kling"
  | "Veo"
  | "Sora"
  | "Pika"
  | "Luma"
  | "Flux"
  | "ComfyUI"
  | "Stable Diffusion"
  | "ElevenLabs"
  | "Suno"
  | "HeyGen"
  | "Topaz"
  | "Higgsfield"
  | "DaVinci Resolve"
  | "Adobe Firefly"
  | "Udio";

export type PriceRange = '$500-$1k' | '$1k-$3k' | '$3k-$5k' | '$5k-$10k' | '$10k+';

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface WorkflowStep {
  step: number;
  tool: string;
  prompt?: string;
  note?: string;
}

export interface CommercialUse {
  licenseTier: LicenseTier;
  modelIndemnity: boolean;
  trainingDataClean: boolean;
}

export interface PortfolioItem {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  mediaType: "video" | "image" | "animation" | "series";
  thumbnailUrl: string;
  mediaUrl: string;
  aspectRatio: AspectRatio;
  contentType: ContentType;
  styleTags: string[];
  toolsUsed: AiTool[];
  workflow: WorkflowStep[];
  seedLogged: boolean;
  commercialUse: CommercialUse;
  clientName?: string;
  year: number;
  featured?: boolean;
}

export interface ToolProficiency {
  name: AiTool;
  proficiency: "Expert" | "Advanced" | "Intermediate";
  verified: boolean;
}

export interface VerificationState {
  toolsVerified: boolean;
  workflowVerified: boolean;
  pastWorkVerified: boolean;
  badge: VerificationBadge;
}

export interface CreatorStats {
  projectsCompleted: number;
  avgRating: number;
  repeatClientRate: number;
  responseTime: string;
}

export interface CreatorProfile {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarUrl: string;
  coverUrl: string;
  headline: string;
  bio: string;
  location: string;
  hourlyRateUsd: number;
  availability: AvailabilityStatus;
  specializations: ContentType[];
  skills: string[];
  verifiedTools: ToolProficiency[];
  languages: string[];
  stats: CreatorStats;
  verification: VerificationState;
  portfolio: PortfolioItem[];
  joinedAt: string;
}

export interface BriefCommercialUse {
  licenseTier: LicenseTier;
  modelIndemnityRequired: boolean;
  workflowHandoffRequired: boolean;
  usageRegions: string[];
  usageDurationMonths: number;
  exclusivity: boolean;
}

export interface Brief {
  id: string;
  brandId: string;
  brandName: string;
  campaignTitle: string;
  objective: string;
  contentType: ContentType;
  style: string;
  aspectRatios: AspectRatio[];
  durationSeconds?: number;
  resolution?: string;
  quantity: number;
  toolsPreferred: AiTool[];
  referenceLinks: string[];
  budgetMin: number;
  budgetMax: number;
  deadline: string;
  commercialUse: BriefCommercialUse;
  negativeKeywords: string[];
  status: BriefStatus;
  generatedByAI: boolean;
  rawIdea?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  id: string;
  briefId: string;
  creatorId: string;
  message: string;
  price: number;
  timelineDays: number;
  status: ProposalStatus;
  createdAt: string;
}

export interface Session {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  creatorId?: string;
  brandId?: string;
  loginAt: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface OTPVerification {
  email: string;
  code: string;
  expiresAt: string;
}

export interface Engagement {
  id: string;
  briefId: string;
  creatorId: string;
  brandId: string;
  proposalId: string;
  stage: EngagementStage;
  startedAt: string;
  updatedAt: string;
}

export interface MatchResult {
  creator: CreatorProfile;
  score: number;
  reasons: string[];
}

export interface FilterState {
  search: string;
  tools: AiTool[];
  skills: string[];
  specializations: ContentType[];
  aspectRatios: AspectRatio[];
  licenseTiers: LicenseTier[];
  availabilityStatuses: AvailabilityStatus[];
  hourlyRateMin: number;
  hourlyRateMax: number;
  verifiedOnly: boolean;
  sortBy: "relevance" | "rating" | "rate_asc" | "rate_desc" | "projects";
}

export interface CreatorService {
  id: string;
  creatorId: string;
  creatorName?: string;
  creatorAvatar?: string;
  creatorHandle?: string;
  title: string;
  description: string;
  skills: string[];
  priceRange: PriceRange;
  deliveryTime: string;
  portfolioItems: { url: string; title: string }[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
