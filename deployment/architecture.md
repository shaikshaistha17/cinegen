# CineGen Architecture & Data Model

## System Overview

CineGen is an AI creator marketplace built on Next.js 14 with Supabase (PostgreSQL + Storage + Auth). The platform handles the complete lifecycle from brief creation → creator matching → agreement → delivery → approval.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **UI**: Tailwind CSS, Radix UI, Framer Motion
- **Backend**: Next.js API Routes (serverless)
- **Database**: Supabase PostgreSQL with RLS
- **Storage**: Supabase Storage (private buckets)
- **Auth**: Supabase Auth (email/password + JWT)
- **Media Inspection**: sharp (images), ffprobe (videos)
- **AI**: Google Gemini (optional, for brief drafting)

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  - Pages: /briefs, /creators, /projects/[id]            │
│  - Components: Workspace tabs, upload, approval          │
│  - Hooks: useSession, useBriefs, useProposals            │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────┴──────────────────────────────────┐
│              API Routes (Next.js Serverless)             │
│  - /api/briefs, /api/proposals, /api/agreements          │
│  - /api/deliveries, /api/project-messages                │
│  - Auth middleware + ownership checks                    │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┴────────────┬──────────────────┐
         │                          │                  │
┌────────┴─────────┐   ┌───────────┴────────┐  ┌──────┴──────┐
│   Supabase       │   │  Supabase Storage  │  │   Media     │
│   PostgreSQL     │   │  (Private buckets) │  │  Inspector  │
│   + RLS          │   │  - deliveries/     │  │  sharp      │
│   9 tables       │   │  Max 500MB/file    │  │  ffprobe    │
└──────────────────┘   └────────────────────┘  └─────────────┘
```

## Data Model

### Core Entities

```
users (auth)
├─ creator_profiles (portfolio, skills, verification)
└─ brand_profiles (company info)

briefs (campaign requirements)
└─ proposals (creator bids)
    └─ agreements (versioned scope) ⭐
        ├─ deliveries (files + inspection) ⭐
        ├─ project_messages (feedback) ⭐
        └─ scope_changes (approved changes) ⭐

creator_services (marketplace listings)
messages (direct messaging)
reviews (post-delivery ratings)
verifications (admin approval)
```

⭐ = Added in Part 4

### Key Relationships

```sql
-- Brief → Proposal → Agreement (1:N:1)
brief ─┬─> proposal_1 ──> agreement (accepted)
       ├─> proposal_2 (rejected)
       └─> proposal_3 (pending)

-- Agreement → Deliveries (1:N, versioned)
agreement ─┬─> delivery v1 (failed inspection)
           ├─> delivery v2 (passed, approved)
           └─> delivery v3 (revision)

-- Agreement → Messages (1:N)
agreement ─┬─> message (general comment)
           ├─> message (revision request, delivery_version=1)
           └─> message (scope change proposal)
```

## Part 4 Data Model Details

### 1. Agreements (Versioned Scope)

```typescript
type Agreement = {
  id: UUID;
  brief_id: UUID;
  proposal_id: UUID;
  creator_id: UUID;
  brand_id: UUID;
  version: number;  // Immutable once accepted
  
  // Snapshot of agreed scope
  deliverables: {
    description: string;
    acceptance_criteria: string;
    format: string;  // "mp4", "png", etc.
    aspect_ratio?: string;  // "9:16", "16:9"
    duration_seconds?: number;
    resolution?: string;  // "1080p", "4K"
  }[];
  
  price: number;
  currency: string;
  milestones: {
    name: string;
    deadline: Date;
    amount: number;
  }[];
  
  included_revisions: number;
  usage_requirements: {
    license_tier: string;
    regions: string[];
    duration_months: number;
    exclusivity: boolean;
  };
  
  // Both parties must accept
  creator_accepted_at?: Date;
  brand_accepted_at?: Date;
  both_accepted: boolean;  // GENERATED column
};
```

**Key Rules**:
- ✅ Once `both_accepted = true`, scope is immutable
- ✅ New versions created only via scope_changes table
- ✅ Deliveries can only be uploaded after both_accepted
- ✅ Brief edits don't affect accepted agreements

### 2. Deliveries (File Uploads + Inspection)

```typescript
type Delivery = {
  id: UUID;
  agreement_id: UUID;
  creator_id: UUID;
  version: number;  // Auto-increment per agreement
  
  // File metadata
  file_path: string;  // "deliveries/{agreement_id}/{version}_{timestamp}_{filename}"
  file_name: string;
  file_size_bytes: number;
  mime_type: string;  // Actual MIME from file, not extension
  
  // Inspection results
  inspection_status: 'pending' | 'pass' | 'fail' | 'unsupported' | 'error';
  inspection_results: {
    metadata: {
      width?: number;
      height?: number;
      aspect_ratio?: string;
      duration_seconds?: number;
      format?: string;
      codec?: string;
    };
    checks: {
      requirement: string;  // "Aspect ratio", "Duration", "Resolution"
      expected: string;
      actual: string;
      passed: boolean;
      tolerance?: string;  // "±1%", "±0.5s"
    }[];
  };
  inspected_at?: Date;
  
  // Approval
  brand_approved_at?: Date;
  approval_notes?: string;
};
```

**Inspection Logic**:
```
1. Upload → Store in private bucket
2. Extract metadata:
   - Images: sharp (dimensions, aspect ratio)
   - Videos: ffprobe (dimensions, duration, codec, fps)
3. Compare with agreement.deliverables:
   - Aspect ratio: ±1% tolerance (e.g., 16:9 = 1.777 ±0.018)
   - Duration: ±0.5s tolerance
   - Resolution: Exact match
4. Set inspection_status:
   - pass: All checks passed
   - fail: One or more checks failed
   - unsupported: No inspector available (e.g., ffprobe missing)
   - error: Inspection crashed
5. Brand can approve if:
   - inspection_status = 'pass', OR
   - inspection_status = 'fail' + override_reason provided
```

**Never**:
- ❌ Infer format from filename extension
- ❌ Trust user-entered metadata
- ❌ Return 'pass' for unsupported files
- ❌ Allow approval of 'fail' without override

### 3. Project Messages (Feedback)

```typescript
type ProjectMessage = {
  id: UUID;
  agreement_id: UUID;
  sender_id: UUID;
  message_type: 'comment' | 'revision_request' | 'scope_change_request';
  
  content: string;
  delivery_version?: number;  // Attach to specific delivery
  video_timestamp_seconds?: number;  // For video comments
  
  // Scope change proposal (only if message_type = 'scope_change_request')
  proposed_changes?: {
    deliverables?: any[];
    price_change?: number;
    deadline_change?: Date;
  };
  change_accepted_by_creator?: boolean;
  change_accepted_by_brand?: boolean;
};
```

**Message Types**:
1. **comment**: General discussion
2. **revision_request**: "Fix the lighting in delivery v2 at 0:05"
3. **scope_change_request**: "Add 16:9 version, +$500, +7 days"

### 4. Scope Changes (Agreement Versioning)

```typescript
type ScopeChange = {
  id: UUID;
  agreement_id: UUID;
  message_id: UUID;
  previous_version: number;
  new_version: number;
  
  changes_summary: string;
  price_delta: number;
  deadline_delta_days: number;
  
  creator_accepted_at?: Date;
  brand_accepted_at?: Date;
  both_accepted: boolean;
  applied_at?: Date;
};
```

**Flow**:
1. Party A sends scope_change_request message
2. System creates scope_changes row
3. Party B reviews and accepts/rejects
4. If both accept → create new agreement version
5. Old version remains immutable

## Authentication & Authorization

### Supabase Auth
- Email/password signup
- JWT tokens in httpOnly cookies
- Session stored in Supabase `auth.users`

### Row Level Security (RLS)

**Principle**: Participant-only access

```sql
-- Example: agreements table
CREATE POLICY "Participants can read agreements"
ON agreements FOR SELECT
TO authenticated
USING (
  creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
  OR
  brand_id IN (SELECT id FROM brand_profiles WHERE user_id = auth.uid())
);
```

**Applied to**:
- ✅ agreements
- ✅ deliveries
- ✅ project_messages
- ✅ scope_changes
- ✅ Storage bucket (path-based policies)

### API Ownership Checks

Every mutation endpoint:
```typescript
// 1. Get authenticated user
const { data: { user } } = await supabase.auth.getUser();
if (!user) return 401;

// 2. Verify ownership
const { data: agreement } = await supabase
  .from('agreements')
  .select('creator_id, brand_id')
  .eq('id', agreementId)
  .single();

const isParticipant = 
  agreement.creator_id === userCreatorId ||
  agreement.brand_id === userBrandId;

if (!isParticipant) return 403;
```

## Storage Architecture

### Private Buckets

```
deliveries/  (private, 500MB max)
├─ {agreement_id}/
│  ├─ 1_{timestamp}_cafe_video.mp4
│  ├─ 2_{timestamp}_cafe_video_revised.mp4
│  └─ 3_{timestamp}_cafe_video_final.mp4
```

**Policies**:
- Upload: Creator (agreement participant) only
- Download: Both creator and brand
- Delete: Creator only, before approval
- Public: ❌ Never

## Production Passport

**Concept**: Immutable project history

**Contents**:
```typescript
type ProductionPassport = {
  project_summary: {
    agreement_id: UUID;
    title: string;
    creator: string;
    brand: string;
    status: 'in_progress' | 'delivered' | 'approved';
  };
  
  timeline: Event[];  // Chronological
  
  original_brief: Brief;
  accepted_proposal: Proposal;
  agreement_versions: Agreement[];  // All versions
  
  deliveries: Delivery[];  // All uploads
  inspection_reports: InspectionResult[];
  
  feedback: ProjectMessage[];
  scope_changes: ScopeChange[];
  
  final_approval?: {
    delivery_id: UUID;
    approved_at: Date;
    notes: string;
  };
  
  review?: Review;
};
```

**Events** (timeline):
- Brief created
- Proposal submitted
- Agreement created
- Creator accepted agreement
- Brand accepted agreement
- Delivery v1 uploaded
- Delivery v1 failed inspection
- Revision requested
- Delivery v2 uploaded
- Delivery v2 passed inspection
- Brand approved delivery v2
- Review submitted

**NOT claimed**:
- ❌ "Tamper-proof" (no blockchain/signatures)
- ❌ "Legally binding" (consult lawyer)
- ✅ Accurate historical record from database
- ✅ Single source of truth for project state

## Scalability Considerations

### Current Architecture (MVP)
- Serverless API routes (auto-scale)
- Supabase PostgreSQL (managed, 500 connections)
- Supabase Storage (CDN-backed)
- In-memory rate limiting (per-instance)

### Known Limitations
- **Rate limiting**: In-memory (lost on redeploy)
  - **Fix**: Redis for distributed rate limiting
- **Media inspection**: Synchronous (blocks response)
  - **Fix**: Background jobs (BullMQ + Redis)
- **Large files**: 500MB uploads timeout
  - **Fix**: Direct S3 upload with presigned URLs
- **File storage**: Supabase Storage (single provider)
  - **Fix**: Abstract storage layer, support S3/Cloudflare R2

### Recommended for Production
1. Move media inspection to background worker
2. Add Redis for rate limiting + job queue
3. Implement CDN for delivery downloads
4. Add monitoring (Sentry, DataDog)
5. Database connection pooling (PgBouncer)

## Security Hardening Checklist

- ✅ All API routes verify authentication
- ✅ Ownership checks on all mutations
- ✅ RLS policies on all tables
- ✅ Private storage with path-based policies
- ✅ Actual file MIME type validation
- ✅ File size limits enforced (500MB)
- ✅ Rate limiting on AI endpoints (10/min)
- ✅ SQL injection prevention (Supabase parameterized queries)
- ✅ XSS prevention (React auto-escaping + DOMPurify for user HTML)
- ⚠️ CSRF tokens (consider for state-changing operations)
- ⚠️ Content Security Policy headers
- ⚠️ Rate limiting on all POST endpoints (not just AI)

## Testing Strategy

### Unit Tests (TODO)
- Media inspector tolerances
- Agreement version logic
- Ownership verification helpers

### Integration Tests
- Brief → Proposal → Agreement flow
- Upload → Inspect → Approve flow
- Scope change acceptance flow

### End-to-End Tests
- Demo flow (see demo-script.md)
- Manual browser testing

### Load Tests (TODO)
- Concurrent uploads
- Database connection limits
- Storage throughput

## Monitoring & Observability

### Health Check
`GET /api/health`
- Database connectivity
- Storage availability
- Media inspection capabilities

### Logs to Monitor
- API route errors (500s)
- Upload failures
- Inspection timeouts
- Authentication failures
- Ownership violations (403s)

### Metrics to Track
- Average inspection time
- Upload success rate
- Agreement acceptance rate
- Delivery approval rate
- API response times

## Future Enhancements

1. **Real-time collaboration**: WebSockets for live updates
2. **Video editing**: In-browser trimming, annotations
3. **Smart matching**: ML-based creator recommendations
4. **Escrow payments**: Milestone-based payouts
5. **Contract templates**: Legal-reviewed agreement PDFs
6. **Version diff**: Visual comparison of delivery versions
7. **Mobile apps**: React Native ports
8. **API webhooks**: Notify external systems of events
9. **Multi-party agreements**: Multiple creators per brief
10. **Asset library**: Reuse past deliveries

---

**Last Updated**: October 2026  
**Version**: Part 4 Complete  
**Status**: MVP Ready for Judge Demo
