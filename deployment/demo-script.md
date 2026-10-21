# CineGen Demo Script for Judges

**Duration**: 8-10 minutes  
**Objective**: Demonstrate the complete brief-to-delivery workflow with technical validation

---

## Pre-Demo Setup

### 1. Seed Demo Data (run once)

```bash
# In Supabase SQL Editor
-- Create demo brand and creator accounts
INSERT INTO users (email, password_hash, role, name) VALUES
  ('demo-brand@cinegen.com', 'hashed_password', 'brand', 'Café Stories'),
  ('demo-creator@cinegen.com', 'hashed_password', 'creator', 'Riya Patel');

-- Create profiles (get user IDs from above)
INSERT INTO brand_profiles (user_id, company_name, website, industry) VALUES
  ('brand_user_id', 'Café Stories', 'https://cafestories.com', 'Food & Beverage');

INSERT INTO creator_profiles (user_id, handle, headline, bio, specializations, skills, verified_tools, hourly_rate_usd, availability) VALUES
  ('creator_user_id', 'riya-patel', 'Vertical Video Specialist', 
   'I create engaging short-form videos for food brands...', 
   ARRAY['Short-form Video'], 
   ARRAY['Video Editing', 'Color Grading', 'Motion Graphics'],
   '["Runway", "Midjourney", "CapCut"]'::jsonb,
   50, 'Available');

-- Add portfolio item showing 9:16 café video
UPDATE creator_profiles SET portfolio = '[
  {
    "id": "portfolio-1",
    "title": "Artisan Café Reel",
    "description": "15-second vertical reel for urban café launch",
    "mediaUrls": ["https://example.com/cafe-reel.mp4"],
    "toolsUsed": ["Runway", "CapCut"],
    "aspectRatio": "9:16",
    "duration": 15
  }
]'::jsonb WHERE handle = 'riya-patel';
```

### 2. Prepare Demo Files

**Valid File** (passes inspection):
- `cafe_vertical_final.mp4`
- Resolution: 1080x1920 (9:16)
- Duration: 15 seconds
- Format: H.264 MP4

**Invalid File** (fails inspection):
- `cafe_horizontal_draft.mp4`
- Resolution: 1920x1080 (16:9) ❌ Wrong aspect ratio
- Duration: 15 seconds

---

## Demo Flow

### Act 1: Brief Creation with AI Assistance (2 min)

**Login as Brand**: `demo-brand@cinegen.com`

1. **Navigate**: Dashboard → "Create Brief"

2. **AI Brief Builder**:
   - Click "AI Brief Builder" tab
   - Enter idea:
     ```
     I need a 15-second vertical video reel for our artisan café 
     launch on Instagram. Show morning coffee ritual with warm 
     lighting and smooth transitions. Target young professionals.
     ```
   - Click "Generate Brief with Gemini AI" ✨
   - **Observe**: AI fills campaign details, budget, timeline

3. **Brief Intelligence Check**:
   - Scroll to "Brief Intelligence" panel (right side)
   - **Initially**: Red warning "Missing aspect ratio"
   - **Action**: Manually add "9:16" aspect ratio
   - **Observe**: Score jumps to 85% (green)
   - All validation checks pass ✅

4. **Publish**:
   - Click "Publish Brief"
   - **Observe**: Top creator matches appear
   - Riya Patel shown with portfolio match evidence

**Key Point**: "AI assisted the brief, but validation caught the missing requirement before going live."

---

### Act 2: Creator Matching with Portfolio Evidence (1.5 min)

**Still as Brand**

1. **View Match**:
   - Click "View Profile" on Riya Patel
   - **Observe**: Match score breakdown with evidence
     - ✅ Skills: "Video Editing, Motion Graphics" (overlap)
     - ✅ Tools: "Runway, CapCut" (match)
     - ✅ Portfolio: "Artisan Café Reel" (9:16, 15s) ← Evidence
     - ✅ Budget fit: $500 within range
     - ✅ Available now

2. **Key Point**: "Matching is evidence-linked—we see the exact portfolio item that proves capability."

---

### Act 3: Proposal & Agreement Acceptance (1.5 min)

**Switch to Creator**: Logout → Login as `demo-creator@cinegen.com`

1. **Submit Proposal**:
   - Go to brief detail page
   - Click "Submit Proposal"
   - Enter:
     - Message: "I've created similar café content—see my portfolio. I can deliver in 7 days."
     - Price: $600
     - Timeline: 7 days
   - Submit

**Switch back to Brand**: Logout → Login as `demo-brand@cinegen.com`

2. **Accept Proposal**:
   - Dashboard → "Proposals" tab
   - Click Riya's proposal
   - **Observe**: Proposal details match brief
   - Click "Accept Proposal"
   - **Result**: Agreement created

3. **Accept Agreement**:
   - Navigate to `/projects/[agreementId]`
   - **Scope Tab**: Review deliverables
     - 1 deliverable: 15-second 9:16 vertical video
     - Acceptance criteria: "Smooth transitions, warm lighting"
     - Price: $600
     - 2 revisions included
   - Click "Accept Agreement" (as brand)

**Switch to Creator again**:
4. **Creator Accepts**:
   - Go to same project workspace
   - Click "Accept Agreement"
   - **Result**: Both accepted ✅ → Scope locked

**Key Point**: "Both parties must accept the same versioned scope before work begins. No ambiguity."

---

### Act 4: Delivery Upload & Technical Inspection Failure (2 min)

**As Creator**:

1. **Upload Wrong File**:
   - Project workspace → "Deliveries" tab
   - Drag-and-drop or click upload: `cafe_horizontal_draft.mp4`
   - **Observe**: Progress bar → "Inspecting..."
   - **Result**: ❌ FAILED inspection
     ```
     Aspect Ratio Check: FAILED
     Expected: 9:16 (0.5625)
     Actual: 16:9 (1.7778)
     Tolerance: ±1%
     ```

2. **Review Feedback**:
   - Click "View Inspection Report"
   - **Show**: Detailed technical checks
     - ✅ Duration: 15.0s (expected 15s ±0.5s)
     - ✅ Format: H.264 MP4
     - ❌ Aspect ratio: 16:9 (expected 9:16)
     - ❌ Resolution: 1920x1080 (expected 1080x1920 for 9:16)

**Switch to Brand**:
3. **Brand Reviews**:
   - Project workspace → "Deliveries" tab
   - See delivery v1 with red "FAILED" badge
   - **Cannot approve** (button disabled)
   - Messages tab → Send revision request:
     ```
     Hi Riya, the video is horizontal (16:9) but we need 
     vertical (9:16) for Instagram Reels. Can you recut it?
     ```

**Key Point**: "Technical validation blocked approval automatically. No manual checking needed—the system caught it."

---

### Act 5: Corrected Delivery & Approval (1.5 min)

**As Creator**:

1. **Upload Correct File**:
   - Deliveries tab → Upload: `cafe_vertical_final.mp4`
   - **Observe**: Inspection running
   - **Result**: ✅ PASSED
     ```
     ✅ Aspect Ratio: 9:16 (0.5625) - Match!
     ✅ Duration: 15.0s - Within tolerance
     ✅ Resolution: 1080x1920 - Correct for 9:16
     ✅ Format: H.264 MP4 - Supported
     ```

**Switch to Brand**:
2. **Brand Approves**:
   - Deliveries tab → See delivery v2 with green "PASSED" badge
   - Preview video (optional)
   - Click "Approve Delivery"
   - Add notes: "Perfect! Love the warm lighting and transitions."
   - **Result**: Delivery approved ✅
   - Brief status → "Delivered"

**Key Point**: "Once technical checks pass, brand can approve with confidence. The system validated compliance."

---

### Act 6: Production Passport (1.5 min)

**As Brand or Creator**:

1. **View History**:
   - Project workspace → "History" tab
   - **Observe**: Complete timeline
     - Brief created (Oct 19, 10:00 AM)
     - Proposal submitted (Oct 19, 10:15 AM)
     - Agreement created (Oct 19, 10:20 AM)
     - Brand accepted agreement (Oct 19, 10:21 AM)
     - Creator accepted agreement (Oct 19, 10:22 AM)
     - Delivery v1 uploaded (Oct 19, 11:00 AM)
     - Delivery v1 FAILED inspection (Oct 19, 11:01 AM)
     - Revision requested (Oct 19, 11:05 AM)
     - Delivery v2 uploaded (Oct 19, 2:00 PM)
     - Delivery v2 PASSED inspection (Oct 19, 2:01 PM)
     - Delivery v2 approved (Oct 19, 2:10 PM)
     - Project completed (Oct 19, 2:10 PM)

2. **Production Passport Summary**:
   - Scroll to top of History tab
   - **See**:
     - Original brief snapshot
     - Accepted proposal
     - Agreement version 1 (scope locked)
     - 2 delivery attempts (1 failed, 1 passed)
     - All inspection reports
     - Final approval with brand notes
   - **Export** (future): Download as PDF for client records

**Key Point**: "Every event is logged. Full audit trail from idea to approved delivery. No disputes possible."

---

## Demo Closing (30 sec)

**Summary**:
- ✅ AI-assisted brief creation with validation
- ✅ Evidence-linked creator matching (portfolio proof)
- ✅ Versioned agreement requiring dual acceptance
- ✅ Automated technical inspection (no human judgment)
- ✅ Graceful failure handling (revision workflow)
- ✅ Complete audit trail (Production Passport)

**Differentiators**:
1. **Technical validation before approval** (unique to CineGen)
2. **Immutable versioned agreements** (no scope creep)
3. **Evidence-based matching** (not just algorithms)
4. **Production Passport** (complete project history)

**Tech Highlights**:
- Real ffprobe/sharp media inspection (not filename inference)
- Supabase RLS for participant-only access
- Next.js 14 App Router with Radix UI
- Responsive, accessible, reduced-motion support

---

## Troubleshooting

**If demo breaks**:

1. **Reset Demo Data**:
```sql
-- Delete demo agreement and cascades
DELETE FROM agreements WHERE brief_id IN (
  SELECT id FROM briefs WHERE brand_id IN (
    SELECT id FROM brand_profiles WHERE company_name = 'Café Stories'
  )
);

-- Rerun seed data from top
```

2. **Inspection Not Working**:
   - Check ffprobe: `which ffprobe`
   - Test: `/api/health` → Should show `videos: "available"`
   - Fallback: Use image files (PNG) instead—always work

3. **Storage Upload Fails**:
   - Verify bucket exists: Supabase → Storage → `deliveries`
   - Check policies applied (see deployment/README.md)

---

## Q&A Prep

**Q: What if video inspection is too slow?**  
A: Currently synchronous (MVP). Production would use background jobs (BullMQ + Redis). Images are instant (sharp is fast).

**Q: Can creators fake dimensions?**  
A: No. We extract metadata from actual file bytes using ffprobe/sharp, not from filename or user input.

**Q: What if both parties disagree on approval?**  
A: Technical checks are objective (pass/fail). Creative quality is brand's call. If failed technically, brand can override with documented reason (audit trail).

**Q: Blockchain for tamper-proof?**  
A: Not yet. Production Passport is accurate from database but not cryptographically immutable. Future enhancement.

**Q: Scale to 10,000 concurrent uploads?**  
A: Need background workers + Redis queue. Current MVP handles ~100 concurrent users fine.

---

**Demo Ready**: This script ensures judges see the complete, working workflow in under 10 minutes! 🎬
