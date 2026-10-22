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

export type BriefStatus = "Draft" | "Open" | "In Review" | "Hired" | "In Production" | "Delivered";

export type AgreementStatus = "draft" | "pending_creator" | "pending_brand" | "active" | "completed";

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

export type PriceRange = '₹50k-₹1L' | '₹1L-₹2.5L' | '₹2.5L-₹4L' | '₹4L-₹8L' | '₹8L+';

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
  /** Hourly rate in Indian Rupees (INR). Stored as integer (no paise). */
  hourlyRate: number;
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
  /** Budget minimum in Indian Rupees (INR). Stored as integer. */
  budgetMin: number;
  /** Budget maximum in Indian Rupees (INR). Stored as integer. */
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
  /** Proposal price in Indian Rupees (INR). Stored as integer. */
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
  /** Hourly rate filter minimum in Indian Rupees (INR) */
  hourlyRateMin: number;
  /** Hourly rate filter maximum in Indian Rupees (INR) */
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

// ─── Media Inspection Types ───────────────────────────────────────────────

export interface InspectionCheck {
  requirement: string;
  actual: string;
  expected: string;
  passed: boolean;
}

export interface InspectionResult {
  status: 'pass' | 'fail' | 'unsupported' | 'error';
  checks: InspectionCheck[];
  metadata: Record<string, any>;
  message?: string;
}

// ─── Agreement & Delivery Types ───────────────────────────────────────────

export interface Agreement {
  id: string;
  briefId: string;
  proposalId: string;
  creatorId: string;
  brandId: string;
  version: number;
  deliverables: {
    contentType: string;
    aspectRatios: string[];
    durationSeconds?: number;
    resolution?: string;
    quantity: number;
  };
  /** Agreement price in Indian Rupees (INR). Stored as integer. */
  price: number;
  /** Currency code (should be "INR" for new agreements) */
  currency: string;
  milestones: {
    timelineDays: number;
  };
  includedRevisions: number;
  usageRequirements: any;
  creatorAcceptedAt: string | null;
  brandAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Delivery {
  id: string;
  agreementId: string;
  creatorId: string;
  version: number;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  inspectionStatus: 'pass' | 'fail' | 'unsupported' | 'error';
  inspectionResults: InspectionResult;
  inspectedAt: string;
  brandApprovedAt: string | null;
  approvalNotes: string | null;
  createdAt: string;
}

export interface ProjectMessage {
  id: string;
  agreementId: string;
  senderId: string;
  senderName?: string;
  senderRole?: UserRole;
  messageType: 'comment' | 'revision_request' | 'scope_change_request';
  content: string;
  deliveryVersion?: number;
  videoTimestampSeconds?: number;
  proposedChanges?: any;
  changeAcceptedByCreator: string | null;
  changeAcceptedByBrand: string | null;
  createdAt: string;
}

export interface ScopeChange {
  id: string;
  agreementId: string;
  messageId: string;
  previousVersion: number;
  newVersion: number;
  changesSummary: string;
  priceDelta?: number;
  deadlineDeltaDays?: number;
  creatorAcceptedAt: string | null;
  brandAcceptedAt: string | null;
  bothAccepted: boolean;
  appliedAt: string | null;
  createdAt: string;
}

export interface PassportEvent {
  type: string;
  timestamp: string;
  data: any;
}

export interface ProductionPassport {
  agreement: Agreement;
  brief: Brief;
  proposal: Proposal;
  deliveries: Delivery[];
  messages: ProjectMessage[];
  scopeChanges: ScopeChange[];
  history: PassportEvent[];
  review?: any;
}

export interface Review {
  id: string;
  briefId: string;
  agreementId?: string;
  creatorId: string;
  brandId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

// ─── Conversational AI Types ───────────────────────────────────────────

export interface ConversationMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

// Strict allowlist of supported actions
// NEVER execute: arbitrary URLs, model-generated code, actions outside this list
export type DirectorAction = "open_discovery" | "prepare_brief" | "clear_draft" | "none";

export interface CampaignDraft extends Partial<Brief> {
  userStated?: string[];
  assistantSuggestions?: string[];
  unansweredQuestions?: string[];
  originalCurrency?: string; // e.g., "INR 15000-20000" for display transparency
}

export interface DirectorResponse {
  reply: string;
  action?: DirectorAction;
  campaignDraft?: CampaignDraft;
  error?: boolean;
  retryAfterMs?: number; // Exposed retry timing for UI
}
