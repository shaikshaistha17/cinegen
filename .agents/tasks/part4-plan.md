# Implementation Plan: Part 4 - Delivery Workflow

## Overview
Implement CineGen's distinctive brief-to-approved-delivery workflow with versioned agreements, private delivery uploads with technical inspection, feedback system, approval workflow, and Production Passport history view.

**Worktree:** `/Users/shaisthashaik/Desktop/Cinegen/cinegen`

**Current State:**
- Parts 1-3 complete: Auth, profiles, briefs, proposals, matching, brief intelligence
- Database: PostgreSQL with Supabase (9 tables, RLS policies applied)
- Build: Passes with 0 errors (some prerender warnings acceptable)
- No automated tests (manual verification required)
- sharp NOT installed yet (needed for image inspection)
- ffprobe NOT available (graceful fallback required for video inspection)

**Dependencies Available:**
- Next.js 14.2.35, React 18, TypeScript 5
- Supabase 2.118.0, bcryptjs, zod
- Radix UI components, Framer Motion, Tailwind CSS
- No test framework installed

---

## Implementation Plan

### Feature 1: Database Schema for Delivery Workflow

**What:** Create migration adding 4 new tables (agreements, deliveries, project_messages, scope_changes) with constraints, indexes, RLS policies, and private Supabase Storage bucket for deliveries.

**Files:**
- `database/migrations/002_delivery_workflow.sql` (CREATE)

**Implementation Notes:**
- `agreements` table: version INTEGER with UNIQUE(proposal_id, version), GENERATED column `both_accepted` computed from both timestamps
- `deliveries` table: UNIQUE(agreement_id, version), CHECK constraint on inspection_status values
- `project_messages` table: CHECK constraint on message_type, support for delivery_version and video_timestamp_seconds
- `scope_changes` table: GENERATED column `both_accepted` similar to agreements
- RLS policies: participant-only access using EXISTS subqueries to check creator/brand ownership via users table
- Storage bucket: INSERT INTO storage.buckets (id, name, public) VALUES ('deliveries', 'deliveries', FALSE)
- Storage policies: creators upload to deliveries/{agreement_id}/*, participants download using path filtering

**Verification:**
```bash
# Apply migration in Supabase SQL Editor
# Then verify:
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' AND table_name IN ('agreements','deliveries','project_messages','scope_changes');
# Expect 4 rows

# Verify RLS enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname='public' AND tablename='agreements';
# Expect rowsecurity=true

# Verify storage bucket
SELECT id, name, public FROM storage.buckets WHERE name='deliveries';
# Expect public=false
```

---

### Feature 2: Media Inspection Library and Agreement/Delivery APIs

**What:** Install sharp for image inspection, create graceful video inspection with ffprobe fallback, implement agreement creation/acceptance APIs, delivery upload with automatic inspection, signed download URLs.

**Files:**
- `lib/mediaInspector.ts` (CREATE)
- `lib/storage.ts` (UPDATE - add Supabase Storage helpers)
- `app/api/agreements/route.ts` (CREATE - POST)
- `app/api/agreements/[id]/route.ts` (CREATE - GET)
- `app/api/agreements/[id]/accept/route.ts` (CREATE - POST)
- `app/api/deliveries/route.ts` (CREATE - POST, GET)
- `app/api/deliveries/[id]/route.ts` (CREATE - GET)
- `types/index.ts` (UPDATE - add Agreement, Delivery, ProjectMessage interfaces)

**Implementation Notes:**
- Run `npm install sharp` first (required dependency)
- `inspectMedia` function: detect format by extension, call inspectImage (sharp) or inspectVideo (ffprobe with try-catch)
- Image inspection: sharp.metadata() for width/height/format, calculate aspect ratio, compare with tolerance ±1%
- Video inspection: attempt dynamic import of fluent-ffmpeg, if fails return {status: 'unsupported', message: 'ffprobe not available'}
- If ffprobe available: ffmpeg.ffprobe() for duration/resolution/fps, compare with tolerances (duration ±0.5s, resolution exact, aspect ratio ±1%)
- Never fake a pass: unsupported formats stay unsupported, errors return status='error'
- Agreement creation: verify proposal.status='Accepted', check no existing agreement for proposal_id, extract deliverables from brief
- Delivery upload: parse FormData, validate file size ≤500MB, upload to storage, save to temp file, run inspection, insert record, delete temp file
- Signed URLs: createSignedUrl() with 3600 second (1 hour) expiry

**Verification:**
```bash
npm run build
# Expect 0 TypeScript errors (prerender warnings OK)

# Test agreement creation
curl -X POST http://localhost:3000/api/agreements \
  -H "Content-Type: application/json" \
  -H "Cookie: cinegen_session=..." \
  -d '{"proposalId":"<valid-accepted-proposal-id>"}'
# Expect 201 with agreement object

# Test media inspection (unit test)
# Create test: 1080x1920 jpg (9:16), call inspectMedia with requirements {aspectRatios: ['9:16']}
# Expect {status: 'pass', checks: [...]}

# Test delivery upload
curl -X POST http://localhost:3000/api/deliveries \
  -H "Cookie: cinegen_session=..." \
  -F "file=@test.mp4" \
  -F "agreementId=<valid-id>"
# Expect 201 with inspection_results
```

---

### Feature 3: Feedback System and Production Passport API

**What:** Implement project messaging (comments, revision requests, scope changes), delivery approval with technical failure override, Production Passport complete history endpoint, review-to-agreement linking.

**Files:**
- `app/api/project-messages/route.ts` (CREATE - POST, GET)
- `app/api/deliveries/[id]/approve/route.ts` (CREATE - POST)
- `app/api/passport/[agreementId]/route.ts` (CREATE - GET)
- `app/api/reviews/route.ts` (UPDATE - add agreement linking and validation)
- `types/index.ts` (UPDATE - add PassportEvent, ProductionPassport types)

**Implementation Notes:**
- POST /api/project-messages: validate messageType enum, if 'scope_change_request' also create scope_changes row
- GET /api/project-messages: join users for sender names, order chronological (ASC)
- POST /api/deliveries/[id]/approve: verify user is brand (not creator), check inspection_status - if 'fail' require overrideReason in body
- When final deliverable approved (version >= quantity), update brief.status='Delivered'
- GET /api/passport/[agreementId]: build history timeline from all related records, sort by timestamp
- History events: brief_created, proposal_accepted, agreement_created, creator_accepted, brand_accepted, delivery_uploaded, message, scope_change, final_approval
- UPDATE /api/reviews POST: validate agreementId provided, check agreement complete, prevent duplicate reviews per agreement

**Verification:**
```bash
# Test comment message
curl -X POST http://localhost:3000/api/project-messages \
  -H "Content-Type: application/json" \
  -H "Cookie: cinegen_session=..." \
  -d '{"agreementId":"<id>","messageType":"comment","content":"Looks great!"}'
# Expect 201

# Test approval of failed delivery (should fail)
curl -X POST http://localhost:3000/api/deliveries/<id>/approve \
  -H "Cookie: cinegen_session=..." \
  -d '{"approvalNotes":"Test"}'
# Expect 400 if inspection_status='fail'

# Test with override
curl -X POST http://localhost:3000/api/deliveries/<id>/approve \
  -H "Cookie: cinegen_session=..." \
  -d '{"overrideReason":"Client approved despite mismatch"}'
# Expect 200

# Test passport
curl http://localhost:3000/api/passport/<agreementId> \
  -H "Cookie: cinegen_session=..."
# Expect full history object with timeline sorted by timestamp
```

---

### Feature 4: Project Workspace UI

**What:** Create /projects/[agreementId] page with 5 tabs (Overview, Scope, Deliveries, Messages, History), responsive layouts, keyboard navigation, reduced-motion support. Implement reusable components for delivery upload, inspection results, approval, and Production Passport timeline.

**Files:**
- `app/projects/[agreementId]/page.tsx` (CREATE)
- `app/projects/[agreementId]/components/OverviewTab.tsx` (CREATE)
- `app/projects/[agreementId]/components/ScopeTab.tsx` (CREATE)
- `app/projects/[agreementId]/components/DeliveriesTab.tsx` (CREATE)
- `app/projects/[agreementId]/components/MessagesTab.tsx` (CREATE)
- `app/projects/[agreementId]/components/HistoryTab.tsx` (CREATE)
- `components/project/DeliveryUpload.tsx` (CREATE)
- `components/project/InspectionResults.tsx` (CREATE)
- `components/project/ApprovalButton.tsx` (CREATE)
- `components/project/ProductionPassport.tsx` (CREATE)
- `components/layout/Navbar.tsx` (UPDATE - add Projects link)

**Implementation Notes:**
- Use Radix UI Tabs for tab navigation (already installed: @radix-ui/react-tabs)
- Overview: status badge, progress bar, next milestone, quick stats, primary action button (Accept/Upload/View)
- Scope: display all agreement fields, acceptance status, Accept button if pending
- DeliveryUpload: drag-and-drop zone, validate client-side (500MB max, allowed extensions), FormData upload, progress bar, inspection results modal
- InspectionResults: status badge with color (pass=green, fail=red, unsupported=yellow, error=red), metadata table, checks array for failures
- ApprovalButton: if inspection_status='fail' require override dialog, otherwise approval notes optional
- Deliveries tab: list all versions DESC, download buttons with signed URLs, approval UI for brand
- Messages tab: input with messageType dropdown, conditional fields (deliveryVersion selector, proposedChanges textarea), chronological message list with sender distinction
- ProductionPassport: vertical timeline with event icons, expandable data, original brief/proposal sections, all deliveries/messages, final approval/review
- History tab: renders ProductionPassport component
- Keyboard navigation: Tab focus, Enter/Space activate, Escape close dialogs, focus indicators (ring-2 ring-purple-500)
- Reduced motion: use existing hooks/useReducedMotion.ts, disable Framer Motion animations when prefers-reduced-motion

**Verification:**
```bash
npm run build
# Expect 0 TypeScript errors

# Browser tests (manual):
# 1. Navigate to /projects/<agreementId> while logged in as creator
# 2. Verify all 5 tabs render, no console errors
# 3. Overview tab: check status badge, click Accept Agreement if pending
# 4. Scope tab: verify all agreement fields displayed
# 5. Deliveries tab: upload test mp4 file, verify progress bar, inspection results modal
# 6. Messages tab: post comment, verify appears in list immediately
# 7. History tab: verify timeline with chronological events
# 8. Keyboard: Tab through elements, Enter activates buttons, Escape closes dialogs
# 9. DevTools: enable prefers-reduced-motion, reload, verify animations disabled
```

---

### Feature 5: Demo Flow, Deployment Docs, and Documentation

**What:** Create seed script for Part 4 demo data, reset script, health check endpoint, complete deployment documentation (build commands, env vars, storage setup, media dependencies), architecture doc, judge demo script. Update KIRO_PROGRESS.md with Part 4 completion summary.

**Files:**
- `scripts/seed-demo-part4.ts` (CREATE)
- `scripts/reset-demo-part4.ts` (CREATE)
- `app/api/health/route.ts` (CREATE)
- `deployment/README.md` (CREATE)
- `deployment/architecture.md` (CREATE)
- `deployment/demo-script.md` (CREATE)
- `PART4_IMPLEMENTATION.md` (CREATE)
- `KIRO_PROGRESS.md` (UPDATE)
- `package.json` (UPDATE - add seed/reset scripts)

**Implementation Notes:**
- Seed script: create demo brand "Demo Brand Café", creator "Demo Creator Vertical", brief for "15-second vertical café video", proposal, agreement with both_accepted=true
- Note: Actual delivery file uploads cannot be seeded (require multipart), document manual demo steps instead
- Reset script: delete only demo data (WHERE created_at > threshold), safety check for localhost, log deleted records
- Health check: SELECT 1 query to verify database, return 200 {status: 'healthy', database: 'connected'} or 503 on failure
- deployment/README.md: build/start commands (Node 18+), all env vars with descriptions, Supabase Storage bucket creation, migration steps, sharp auto-installed, ffprobe optional with fallback behavior
- deployment/architecture.md: ASCII diagram, data model with all relationships, agreement workflow, inspection flow, security model (RLS + storage policies), honest limitations (no ffprobe = unsupported status, no tamper-proofing)
- deployment/demo-script.md: judge access, full Part 4 demo flow (café brief → horizontal fails → vertical passes → approval → passport), test asset procurement (Pexels/Pixabay royalty-free or public/demo/ files)
- PART4_IMPLEMENTATION.md: features summary, API routes table, schema changes, UI components, limitations, external setup
- KIRO_PROGRESS.md Part 4 section: distinguish "Tests actually run" (npm run build, specific API curl requests, database queries, browser UI tests) from "Tests NOT run" (automated e2e tests, actual ffprobe video inspection if unavailable)

**Verification:**
```bash
# Add scripts to package.json
npm run db:seed-demo-part4
# Expect success, no errors

# Test health check
curl http://localhost:3000/api/health
# Expect 200 {status: 'healthy', database: 'connected'}

# Read all deployment docs, verify completeness
cat deployment/README.md
cat deployment/architecture.md
cat deployment/demo-script.md
cat PART4_IMPLEMENTATION.md

# Final build
npm run build
# Expect 0 TypeScript errors

# Verify KIRO_PROGRESS.md updated with Part 4 summary
grep -A 20 "Part 4 Completion" KIRO_PROGRESS.md
```

---

## Verification Summary

After completing all features:

1. **Build Check:** `npm run build` → 0 TypeScript errors (prerender warnings acceptable)
2. **Database Verification:** All 4 tables exist with RLS enabled, storage bucket created
3. **API Tests:** Manual curl/Postman tests for each endpoint with valid/invalid inputs
4. **Media Inspection:** Test with actual image files (pass/fail cases), video graceful fallback
5. **UI Tests:** Browser navigation through all tabs, upload/approve/message flows, keyboard navigation, reduced motion
6. **Documentation:** All deployment docs complete and accurate

**No Automated Tests:** Project has no test framework. All verification is manual with documented steps.

---

## External Setup Required (User Action)

1. **Run Migration:** In Supabase SQL Editor, execute `database/migrations/002_delivery_workflow.sql`
2. **Create Storage Bucket:** Either via dashboard (create 'deliveries' bucket, set private) OR via SQL in migration
3. **Install Dependencies:** `npm install` (includes sharp automatically)
4. **Optional:** Install ffprobe for video inspection (if not available, graceful fallback to 'unsupported' status)

---

## Known Limitations

- Video inspection requires ffprobe (not available in all environments) - graceful fallback returns 'unsupported', never false pass
- No automated tests (manual verification performed and documented)
- No cryptographic tamper-proofing (Production Passport is visual history, not legally binding without signatures)
- File size limit 500MB per delivery
- Signed download URLs expire after 1 hour
- No real-time upload progress (shows after completion)
- No bulk delivery uploads
- No PDF export of Production Passport (visual only)

---

## Success Criteria

✅ All API routes enforce participant-only access with RLS  
✅ Media inspection never fakes a pass for unsupported formats  
✅ Delivery approval requires override reason for failed inspections  
✅ Production Passport shows complete chronological history  
✅ UI is responsive, keyboard accessible, respects reduced motion  
✅ Demo flow demonstrates full workflow (horizontal fail → vertical pass → approval)  
✅ Deployment docs complete with all setup steps  
✅ KIRO_PROGRESS.md distinguishes actual tests run vs not run  
✅ Build passes with 0 errors  

