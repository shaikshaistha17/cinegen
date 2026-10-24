-- ============================================================================
-- CineGen Payment System Migration
-- Stripe payment integration with escrow workflow and milestone releases
-- ============================================================================

-- ============================================================================
-- Payment Intents Table
-- Tracks Stripe PaymentIntents for milestone payments with escrow
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  amount INTEGER NOT NULL, -- Amount in smallest currency unit (INR paise)
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  milestone_number INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded')
  ),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_payment_intents_agreement_id ON payment_intents(agreement_id);
CREATE INDEX idx_payment_intents_brand_id ON payment_intents(brand_id);
CREATE INDEX idx_payment_intents_creator_id ON payment_intents(creator_id);
CREATE INDEX idx_payment_intents_stripe_id ON payment_intents(stripe_payment_intent_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on payment_intents
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

-- Brand can read their own payment intents
CREATE POLICY "Brands can read their payment intents"
  ON payment_intents FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM brand_profiles WHERE user_id = auth.uid()
    )
  );

-- Creator can read their own payment intents
CREATE POLICY "Creators can read their payment intents"
  ON payment_intents FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Brand can insert payment intents for their agreements
CREATE POLICY "Brands can create payment intents"
  ON payment_intents FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM brand_profiles WHERE user_id = auth.uid()
    )
  );

-- Only system (via service role) can update payment status
-- This is enforced by webhook handler using service role key

-- ============================================================================
-- Update Trigger
-- ============================================================================
CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE ON payment_intents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE payment_intents IS 'Tracks Stripe PaymentIntents for milestone payments with escrow workflow';
COMMENT ON COLUMN payment_intents.amount IS 'Amount in smallest currency unit (e.g., INR paise: 100000 = ₹1000)';
COMMENT ON COLUMN payment_intents.milestone_number IS 'Which milestone this payment is for (1-based index)';
COMMENT ON COLUMN payment_intents.metadata IS 'Additional payment metadata including released status and timestamps';
