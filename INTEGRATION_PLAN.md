# Kampus.VC Selective Integration Plan

## Overview
This document outlines the integration of notification, payment, and rights review features from the reference repository (deekshitha875/cinegen) into our production repository (shaikshaistha17/cinegen) while preserving all existing features.

**Status:** Ready for implementation  
**Branch:** `feature/notifications-payments-rights-review`  
**Database:** Isolated test database (will not affect production)

---

## 🎯 Integration Goals

### What We're Adding:
1. **Database-backed notification system** (replace localStorage)
2. **Stripe milestone payments** (INR, test mode, server-verified)
3. **Evidence-based rights review** (replace mock copyright scan)

### What We're Preserving:
- ✅ Existing Supabase auth flow
- ✅ Director chat (voice/text, conversation history)
- ✅ Decision Room (5-stage brand journey)
- ✅ Marketplace (briefs, proposals, agreements)
- ✅ Delivery workflow (agreements, deliveries, project messages)
- ✅ All RLS policies and database security

---

## 📊 Reference Repository Analysis

### Findings from `/tmp/cinegen-reference`:

#### 1. **Notifications** (`lib/notifications.ts`, `app/notifications/page.tsx`)
- ❌ **Reject:** localStorage-based storage (not persistent, not scalable)
- ✅ **Adopt:** Type system, UI patterns, notification metadata (emoji, colors)
- ✅ **Adapt:** Rebuild with Supabase database backend

**What's Good:**
- Clear type definitions (`NotificationType`, `AppNotification`)
- Real-time updates via CustomEvent + storage event
- Icon/color configuration per notification type
- Mark read/unread, remove individual notifications

**What Needs Change:**
- Replace `storage.read/write` with Supabase queries
- Add RLS policies for per-user notification access
- Server-side notification creation (can't trust client-side pushes)

#### 2. **Payments** (`app/payment/page.tsx`, `app/api/stripe/create-payment-intent/route.ts`)
- ✅ **Adopt:** Stripe PaymentIntent flow, INR currency, demo fallback
- ❌ **Reject:** Client-side card confirmation without Elements (insecure)
- ✅ **Adapt:** Add Stripe Elements, webhook verification, milestone tracking

**What's Good:**
- Amount stored in paise (smallest unit) ✅
- Test mode fallback when `STRIPE_SECRET_KEY` not configured ✅
- PaymentIntent metadata (projectId, creatorName, milestoneTitle) ✅
- Escrow messaging (funds held until delivery) ✅

**What Needs Change:**
- Replace manual card input with Stripe Elements (PCI compliance)
- Add webhook handler for `payment_intent.succeeded` events
- Store payment records in database (not just Stripe metadata)
- Connect to existing `agreements` table and milestone workflow
- Add payment status tracking (pending, completed, failed, refunded)

#### 3. **Copyright Scan** (`app/copyright-scan/page.tsx`)
- ❌ **Reject Entirely:** Mock implementation with hardcoded results
- ✅ **Replace:** Evidence-based rights review connected to delivery workflow

**Why Reject:**
```typescript
const MOCK_RESULT: ScanResult = {
  status: "safe",
  confidence: 98.5,
  matches: [/* hardcoded matches */]
};
// Fake delays with setTimeout, no real scanning
```

**What to Build Instead:**
- Rights review checklist during delivery upload
- Creator attestation: "I confirm all content is original or properly licensed"
- Tool detection from metadata (Runway, Midjourney signatures)
- Simple similarity check against delivery history (not 500M+ databases)
- Evidence collection: generation logs, license documents
- Brand's rights verification step before final approval

---

## 🗄️ Database Schema Changes

### Migration 010: Notifications System

```sql
-- notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'workflow_request', 'brief_invite', 'proposal_submitted',
    'proposal_accepted', 'message', 'payment_received',
    'review', 'match', 'delivery_uploaded', 'delivery_approved'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT NOT NULL,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  from_name TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC);

-- RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  TO service_role
  WITH CHECK (true);
```

### Migration 011: Payments System

```sql
-- payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount_inr INTEGER NOT NULL, -- stored in paise (1 INR = 100 paise)
  platform_fee_inr INTEGER NOT NULL,
  creator_amount_inr INTEGER NOT NULL, -- amount - platform_fee
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'processing', 'succeeded', 'failed', 'refunded'
  )),
  milestone_number INTEGER NOT NULL,
  milestone_title TEXT NOT NULL,
  brand_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  paid_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_agreement_id ON payments(agreement_id);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_brand_id ON payments(brand_id);
CREATE INDEX idx_payments_creator_id ON payments(creator_id);

-- RLS policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    brand_id IN (SELECT id FROM brand_profiles WHERE user_id = auth.uid()) OR
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
  );

-- Only service role can insert/update payments (webhook-driven)
```

### Migration 012: Rights Review

```sql
-- rights_reviews table
CREATE TABLE rights_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  
  -- Creator attestation
  creator_attests_original BOOLEAN NOT NULL,
  creator_attestation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- AI tool disclosure
  ai_tools_used JSONB, -- ["Runway ML", "Midjourney", "ElevenLabs"]
  generation_evidence_urls JSONB, -- Links to generation logs, screenshots
  
  -- License evidence (if using licensed assets)
  licensed_assets JSONB, -- [{name, source, license_type, license_url}]
  
  -- Metadata analysis
  metadata_extracted JSONB,
  tool_signatures_found JSONB, -- Detected from EXIF/metadata
  
  -- Brand verification
  brand_verified BOOLEAN DEFAULT FALSE,
  brand_verified_at TIMESTAMP WITH TIME ZONE,
  brand_verified_by UUID REFERENCES users(id),
  brand_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rights_reviews_delivery_id ON rights_reviews(delivery_id);
CREATE INDEX idx_rights_reviews_creator_id ON rights_reviews(creator_id);

-- RLS policies
ALTER TABLE rights_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read rights reviews"
  ON rights_reviews FOR SELECT
  TO authenticated
  USING (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM deliveries d
      JOIN agreements a ON d.agreement_id = a.id
      WHERE d.id = rights_reviews.delivery_id
      AND a.brand_id IN (SELECT id FROM brand_profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Creators can insert rights reviews"
  ON rights_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Brands can update verification"
  ON rights_reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d
      JOIN agreements a ON d.agreement_id = a.id
      WHERE d.id = rights_reviews.delivery_id
      AND a.brand_id IN (SELECT id FROM brand_profiles WHERE user_id = auth.uid())
    )
  );
```

---

## 🔧 Implementation Plan

### Phase 1: Notifications (2-3 hours)

#### Files to Create:
1. **`database/migrations/010_notifications.sql`**
   - notifications table with RLS
   - Indexes for performance

2. **`lib/notifications.ts`** (database-backed)
   ```typescript
   export async function createNotification(params: {
     userId: string;
     type: NotificationType;
     title: string;
     message: string;
     link: string;
     fromUserId?: string;
     fromName?: string;
   }): Promise<void>
   
   export async function getUserNotifications(userId: string): Promise<Notification[]>
   export async function markAsRead(notificationId: string): Promise<void>
   export async function markAllAsRead(userId: string): Promise<void>
   export async function deleteNotification(notificationId: string): Promise<void>
   export function getUnreadCount(userId: string): Promise<number>
   ```

3. **`app/api/notifications/route.ts`** (GET, PATCH, DELETE)

4. **`app/notifications/page.tsx`** (reuse reference UI, swap to Supabase)

5. **`components/layout/NotificationBell.tsx`** (header icon with badge)

#### Integration Points:
- Brief created → notify matched creators
- Proposal submitted → notify brand
- Proposal accepted → notify creator
- Delivery uploaded → notify brand
- Delivery approved → notify creator
- Payment received → notify creator
- Message sent → notify recipient

#### Testing:
- Create brief, verify notification appears
- Mark as read, verify UI updates
- Delete notification, verify removal
- Check RLS: User A cannot see User B's notifications

---

### Phase 2: Stripe Payments (3-4 hours)

#### Files to Create:
1. **`database/migrations/011_payments.sql`**
   - payments table with RLS
   - Indexes on agreement_id, stripe_payment_intent_id

2. **`lib/stripe.ts`** (server-side Stripe utilities)
   ```typescript
   export async function createPaymentIntent(params: {
     agreementId: string;
     amountInr: number;
     milestoneNumber: number;
     milestoneTitle: string;
   }): Promise<{ clientSecret: string; paymentIntentId: string }>
   
   export async function verifyWebhookSignature(
     payload: string,
     signature: string
   ): Promise<Stripe.Event>
   ```

3. **`app/api/stripe/create-payment-intent/route.ts`**
   - Validate agreement exists and user is authorized brand
   - Create PaymentIntent with amount in paise (multiply by 100)
   - Store payment record with status='pending'
   - Return clientSecret to client

4. **`app/api/stripe/webhook/route.ts`**
   - Verify webhook signature
   - Handle `payment_intent.succeeded` event
   - Update payment status to 'succeeded'
   - Create notification for creator
   - Return 200 OK to Stripe

5. **`app/payment/page.tsx`**
   - Load Stripe.js
   - Use Stripe Elements for card input (not manual fields)
   - Submit to create-payment-intent API
   - Confirm payment with Elements
   - Show success state

6. **`components/payment/StripeElementsForm.tsx`**
   - CardElement from @stripe/react-stripe-js
   - Handle payment confirmation
   - Show processing state

#### Environment Variables:
```bash
# Add to .env.local
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Testing:
- Use Stripe test card: 4242 4242 4242 4242, any future date, any CVC
- Verify payment record created with status='pending'
- Trigger webhook manually (or via Stripe CLI)
- Verify payment status updates to 'succeeded'
- Verify creator receives notification
- Test failure case: card declined (4000 0000 0000 0002)

#### Stripe Webhook Setup:
```bash
# Local testing with Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

### Phase 3: Rights Review (2-3 hours)

#### Files to Create:
1. **`database/migrations/012_rights_review.sql`**
   - rights_reviews table with RLS
   - Link to deliveries table

2. **`lib/rights-review.ts`**
   ```typescript
   export async function createRightsReview(params: {
     deliveryId: string;
     creatorId: string;
     attestsOriginal: boolean;
     aiToolsUsed: string[];
     generationEvidenceUrls: string[];
     licensedAssets: LicensedAsset[];
   }): Promise<RightsReview>
   
   export async function verifyRights(params: {
     rightsReviewId: string;
     brandUserId: string;
     verified: boolean;
     notes: string;
   }): Promise<void>
   ```

3. **`app/api/rights-review/route.ts`** (POST, PATCH)

4. **`app/delivery/[deliveryId]/rights-review/page.tsx`**
   - Creator fills out attestation form during upload
   - AI tools used (multi-select)
   - Upload generation evidence (screenshots, logs)
   - Declare licensed assets if any
   - Submit creates rights_review record

5. **`app/delivery/[deliveryId]/verify-rights/page.tsx`** (brand view)
   - Show creator attestation
   - Display AI tools used
   - Show generation evidence
   - Review licensed assets
   - Brand verifies or rejects with notes

6. **Update `app/api/deliveries/upload/route.ts`**
   - Require rights_review_id before allowing upload
   - Block upload if rights review not completed

#### Integration with Existing Workflow:
```
Creator uploads delivery
  ↓
Creator completes rights review form (NEW)
  ↓
Delivery inspection runs (EXISTING)
  ↓
Brand reviews delivery + rights attestation (UPDATED)
  ↓
Brand approves or rejects
```

#### Testing:
- Upload delivery, complete rights review form
- Verify rights_review record created
- View as brand, verify attestation visible
- Brand verifies rights, check database update
- Attempt upload without rights review, verify blocked

---

## 🚫 What We're NOT Integrating

### From Reference Repo:
1. **localStorage auth** — We use Supabase auth ✅
2. **Mock copyright scanner** — Fake data, no real scanning ❌
3. **localStorage notifications** — Not persistent or scalable ❌
4. **Client-side card input** — PCI non-compliant ❌
5. **Any Git history** — Clean feature branch only ✅

### From deekshitha875/cinegen (reference):
- No auth system changes
- No profile/user management changes
- No marketplace/brief workflow changes
- No UI library changes (both use same stack)
- No deployment config changes

---

## 🔒 Security Considerations

### Notifications:
- ✅ RLS ensures users only see their own notifications
- ✅ Service role creates notifications (prevents fake notifications)
- ✅ No sensitive data in notification messages (use links)

### Payments:
- ✅ Stripe test mode only (sk_test_...)
- ✅ Amount verification server-side before creating PaymentIntent
- ✅ Webhook signature verification (prevents fake payment confirmations)
- ✅ Amounts stored in paise (no floating-point errors)
- ✅ Payment records linked to agreements (audit trail)
- ✅ Only brands can initiate payments for their agreements
- ✅ RLS prevents unauthorized payment viewing

### Rights Review:
- ✅ Creator must attest before upload
- ✅ Brand verification step before final approval
- ✅ Audit trail of who attested what and when
- ✅ RLS ensures only participants can view rights reviews

---

## 📋 Testing Checklist

### Pre-Integration:
- [x] Reference repo cloned to /tmp/cinegen-reference
- [x] Feature branch created: feature/notifications-payments-rights-review
- [x] Integration plan reviewed

### Phase 1 - Notifications:
- [ ] Migration 010 applied successfully
- [ ] notifications table exists with correct schema
- [ ] RLS policies block unauthorized access
- [ ] Create notification via service role succeeds
- [ ] Notification appears on /notifications page
- [ ] Mark as read updates database
- [ ] Delete notification removes record
- [ ] Unread count displays in header
- [ ] Brief creation triggers notification
- [ ] Proposal submission triggers notification

### Phase 2 - Payments:
- [ ] Migration 011 applied successfully
- [ ] payments table exists with correct schema
- [ ] Stripe test keys added to .env.local
- [ ] Payment intent creation succeeds
- [ ] Stripe Elements loads on payment page
- [ ] Test card payment succeeds
- [ ] Payment record created with correct amount (in paise)
- [ ] Webhook signature verification works
- [ ] payment_intent.succeeded updates status
- [ ] Creator receives payment notification
- [ ] Failed payment shows appropriate error

### Phase 3 - Rights Review:
- [ ] Migration 012 applied successfully
- [ ] rights_reviews table exists with correct schema
- [ ] Creator can submit rights attestation
- [ ] AI tools multi-select works
- [ ] Evidence upload succeeds
- [ ] Brand can view attestation
- [ ] Brand verification updates database
- [ ] Upload blocked without rights review
- [ ] RLS prevents unauthorized viewing

### Integration Testing:
- [ ] Full workflow: Brief → Proposal → Agreement → Payment → Delivery → Rights Review → Approval
- [ ] Notifications triggered at each step
- [ ] Payment processed successfully
- [ ] Rights verified before final approval
- [ ] No existing features broken (Director, Decision Room, Marketplace)

### Regression Testing:
- [ ] Login/register still works
- [ ] Director chat history persists
- [ ] Decision Room loads correctly
- [ ] Voice recognition still works
- [ ] Brief creation/viewing works
- [ ] Proposal submission works
- [ ] Agreement acceptance works
- [ ] Delivery upload works

---

## 🚀 Deployment Notes

### Database Migrations:
```sql
-- Run in Supabase SQL Editor in order:
-- 1. 010_notifications.sql
-- 2. 011_payments.sql
-- 3. 012_rights_review.sql
```

### Environment Variables:
```bash
# .env.local (add these)
STRIPE_SECRET_KEY=sk_test_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Stripe Webhook Configuration:
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook signing secret to `.env.local`

### Package Dependencies:
```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

---

## 📝 Success Criteria

Integration is complete when:

1. ✅ Brands receive notifications when creators submit proposals
2. ✅ Creators receive notifications when brands accept proposals
3. ✅ Brands can pay milestones with Stripe test cards (INR currency)
4. ✅ Payment records stored in database with correct amounts
5. ✅ Creators receive payment notifications
6. ✅ Creators attest content originality before delivery upload
7. ✅ Brands verify rights attestation before final approval
8. ✅ All existing features work without regression
9. ✅ All tests pass
10. ✅ Code committed to feature branch (NOT pushed to main/deployed)

---

## 🔄 Next Steps After This Document

1. **Review this plan with user** — confirm approach is correct
2. **Create migrations** — write SQL files
3. **Implement notifications** — lib + API + UI
4. **Implement payments** — Stripe integration + webhook
5. **Implement rights review** — attestation form + verification
6. **Test end-to-end** — full workflow validation
7. **Document for user** — how to apply migrations, set up Stripe
8. **Await user decision** — merge or continue iterating

---

## 📚 Reference Files

### From `/tmp/cinegen-reference`:
- ✅ `lib/notifications.ts` — type system, metadata config
- ✅ `app/notifications/page.tsx` — UI patterns
- ✅ `app/payment/page.tsx` — payment flow structure
- ✅ `app/api/stripe/create-payment-intent/route.ts` — PaymentIntent creation
- ❌ `app/copyright-scan/page.tsx` — REJECTED (mock implementation)

### From Our Repo:
- ✅ `database/migrations/002_delivery_workflow.sql` — schema patterns
- ✅ `database/migrations/008_convert_currency_to_inr.sql` — INR migration
- ✅ `lib/supabase-admin.ts` — service role client
- ✅ Existing agreements, deliveries, project_messages tables

---

**Status:** Ready to implement  
**Estimated Time:** 7-10 hours total development + testing  
**Risk Level:** Low (isolated feature branch, no production impact)  
**Dependencies:** Stripe test account, Supabase database access
