-- ============================================================================
-- Migration 014: Consolidated Schema Baseline
-- Complete database schema consolidating migrations 001-013
-- This serves as the baseline for fresh installations
-- ============================================================================
-- Supersedes: 001_add_missing_fields, 002_delivery_workflow, 
-- 004_agreements_and_deliveries, 005_add_agreement_to_reviews,
-- 005_deliveries_storage_bucket, 006_admin_and_demo_security_safe,
-- 007_director_conversations, 008_convert_currency_to_inr,
-- 009_decision_rooms, 010_notifications_system, 011_payment_system,
-- 012_email_preferences, 013_otp_storage
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Core Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Users Table (with email preferences from migration 012)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('brand', 'creator', 'guest', 'admin')),
  name VARCHAR(255) NOT NULL,
  is_demo BOOLEAN DEFAULT FALSE,
  email_preferences JSONB DEFAULT '{
    "proposal_submitted": true,
    "proposal_accepted": true,
    "payment_received": true,
    "delivery_uploaded": true,
    "review_submitted": true,
    "message_received": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_demo ON users(is_demo);
CREATE INDEX idx_users_email_preferences ON users USING GIN (email_preferences);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Creator Profiles (INR currency from migration 008)
-- ============================================================================
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  handle VARCHAR(100) UNIQUE NOT NULL,
  avatar_url TEXT,
  cover_url TEXT,
  headline TEXT NOT NULL,
  bio TEXT NOT NULL,
  location VARCHAR(255),
  hourly_rate_inr INTEGER NOT NULL,
  availability VARCHAR(20) NOT NULL CHECK (availability IN ('Available', 'Booked', 'Limited')),
  specializations TEXT[] NOT NULL,
  skills TEXT[] NOT NULL,
  verified_tools JSONB NOT NULL DEFAULT '[]',
  languages TEXT[] NOT NULL,
  stats JSONB NOT NULL DEFAULT '{"projectsCompleted": 0, "avgRating": 0, "repeatClientRate": 0, "responseTime": ""}',
  verification JSONB NOT NULL DEFAULT '{"toolsVerified": false, "workflowVerified": false, "pastWorkVerified": false, "badge": "Unverified"}',
  portfolio JSONB NOT NULL DEFAULT '[]',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_creator_profiles_user_id ON creator_profiles(user_id);
CREATE INDEX idx_creator_profiles_handle ON creator_profiles(handle);
CREATE INDEX idx_creator_profiles_availability ON creator_profiles(availability);
CREATE INDEX idx_creator_profiles_hourly_rate ON creator_profiles(hourly_rate_inr);

CREATE TRIGGER update_creator_profiles_updated_at BEFORE UPDATE ON creator_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Brand Profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS brand_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  industry VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_brand_profiles_user_id ON brand_profiles(user_id);

CREATE TRIGGER update_brand_profiles_updated_at BEFORE UPDATE ON brand_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Briefs (INR currency from migration 008)
-- ============================================================================
CREATE TABLE IF NOT EXISTS briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  campaign_title VARCHAR(255) NOT NULL,
  objective TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  style TEXT NOT NULL,
  aspect_ratios TEXT[] NOT NULL,
  duration_seconds INTEGER,
  resolution VARCHAR(20),
  quantity INTEGER NOT NULL,
  tools_preferred TEXT[] NOT NULL,
  reference_links TEXT[] DEFAULT '{}',
  budget_min INTEGER NOT NULL,
  budget_max INTEGER NOT NULL,
  deadline DATE NOT NULL,
  commercial_use JSONB NOT NULL,
  negative_keywords TEXT[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Open', 'In Review', 'Hired', 'Delivered')),
  generated_by_ai BOOLEAN DEFAULT FALSE,
  raw_idea TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_briefs_brand_id ON briefs(brand_id);
CREATE INDEX idx_briefs_status ON briefs(status);
CREATE INDEX idx_briefs_content_type ON briefs(content_type);
CREATE INDEX idx_briefs_deadline ON briefs(deadline);

CREATE TRIGGER update_briefs_updated_at BEFORE UPDATE ON briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Proposals
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  price INTEGER NOT NULL,
  timeline_days INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Shortlisted', 'Accepted', 'Rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_proposals_brief_id ON proposals(brief_id);
CREATE INDEX idx_proposals_creator_id ON proposals(creator_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_brief_status ON proposals(brief_id, status);

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Agreements (INR currency from migration 008)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  deliverables JSONB NOT NULL,
  price INTEGER NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  milestones JSONB NOT NULL,
  included_revisions INTEGER NOT NULL,
  usage_requirements JSONB NOT NULL,
  creator_accepted_at TIMESTAMP WITH TIME ZONE,
  brand_accepted_at TIMESTAMP WITH TIME ZONE,
  both_accepted BOOLEAN GENERATED ALWAYS AS (
    creator_accepted_at IS NOT NULL AND brand_accepted_at IS NOT NULL
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(proposal_id, version)
);

CREATE INDEX idx_agreements_brief_id ON agreements(brief_id);
CREATE INDEX idx_agreements_proposal_id ON agreements(proposal_id);
CREATE INDEX idx_agreements_creator_id ON agreements(creator_id);
CREATE INDEX idx_agreements_brand_id ON agreements(brand_id);
CREATE INDEX idx_agreements_both_accepted ON agreements(both_accepted);

CREATE TRIGGER update_agreements_updated_at BEFORE UPDATE ON agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Deliveries
-- ============================================================================
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  inspection_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    inspection_status IN ('pending', 'pass', 'fail', 'unsupported', 'error')
  ),
  inspection_results JSONB,
  inspected_at TIMESTAMP WITH TIME ZONE,
  brand_approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agreement_id, version)
);

CREATE INDEX idx_deliveries_agreement_id ON deliveries(agreement_id);
CREATE INDEX idx_deliveries_creator_id ON deliveries(creator_id);
CREATE INDEX idx_deliveries_inspection_status ON deliveries(inspection_status);
CREATE INDEX idx_deliveries_agreement_version ON deliveries(agreement_id, version);

-- ============================================================================
-- Project Messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (
    message_type IN ('comment', 'revision_request', 'scope_change_request')
  ),
  content TEXT NOT NULL,
  delivery_version INTEGER,
  video_timestamp_seconds NUMERIC,
  proposed_changes JSONB,
  change_accepted_by_creator BOOLEAN DEFAULT FALSE,
  change_accepted_by_brand BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_project_messages_agreement_id ON project_messages(agreement_id);
CREATE INDEX idx_project_messages_sender_id ON project_messages(sender_id);
CREATE INDEX idx_project_messages_message_type ON project_messages(message_type);

-- ============================================================================
-- Scope Changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS scope_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES project_messages(id) ON DELETE CASCADE,
  previous_version INTEGER NOT NULL,
  new_version INTEGER NOT NULL,
  changes_summary TEXT NOT NULL,
  price_delta INTEGER,
  deadline_delta_days INTEGER,
  creator_accepted_at TIMESTAMP WITH TIME ZONE,
  brand_accepted_at TIMESTAMP WITH TIME ZONE,
  both_accepted BOOLEAN GENERATED ALWAYS AS (
    creator_accepted_at IS NOT NULL AND brand_accepted_at IS NOT NULL
  ) STORED,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scope_changes_agreement_id ON scope_changes(agreement_id);
CREATE INDEX idx_scope_changes_message_id ON scope_changes(message_id);
CREATE INDEX idx_scope_changes_both_accepted ON scope_changes(both_accepted);

-- ============================================================================
-- Messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_read_at ON messages(read_at);

-- ============================================================================
-- Reviews (with agreement_id from migration 005)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES agreements(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reviews_creator_id ON reviews(creator_id);
CREATE INDEX idx_reviews_brand_id ON reviews(brand_id);
CREATE INDEX idx_reviews_brief_id ON reviews(brief_id);
CREATE INDEX idx_reviews_agreement_id ON reviews(agreement_id);

-- ============================================================================
-- Verifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('tools', 'workflow', 'past_work')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  evidence_url TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_verifications_creator_id ON verifications(creator_id);
CREATE INDEX idx_verifications_status ON verifications(status);
CREATE INDEX idx_verifications_type ON verifications(verification_type);

-- ============================================================================
-- Director Conversations (from migration 007)
-- ============================================================================
CREATE TABLE IF NOT EXISTS director_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_director_conversations_user_id ON director_conversations(user_id);
CREATE INDEX idx_director_conversations_user_active ON director_conversations(user_id, is_active);
CREATE INDEX idx_director_conversations_last_message ON director_conversations(user_id, last_message_at DESC);

CREATE TRIGGER update_director_conversations_updated_at 
BEFORE UPDATE ON director_conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Director Messages (from migration 007)
-- ============================================================================
CREATE TABLE IF NOT EXISTS director_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES director_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  input_source VARCHAR(20) CHECK (input_source IN ('voice', 'text')),
  status VARCHAR(20) DEFAULT 'delivered' CHECK (status IN ('sending', 'delivered', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_director_messages_conversation ON director_messages(conversation_id, created_at);
CREATE INDEX idx_director_messages_conversation_role ON director_messages(conversation_id, role);

-- Trigger to update conversation's last_message_at
CREATE OR REPLACE FUNCTION update_director_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE director_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_last_message
AFTER INSERT ON director_messages
FOR EACH ROW EXECUTE FUNCTION update_director_conversation_last_message();

-- ============================================================================
-- Decision Rooms (from migration 009)
-- ============================================================================
CREATE TABLE IF NOT EXISTS decision_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_text TEXT,
  requirements JSONB DEFAULT '{}',
  selected_direction JSONB,
  selected_creator_id UUID REFERENCES creator_profiles(id),
  linked_brief_id UUID REFERENCES briefs(id),
  stage_progress JSONB DEFAULT '{"idea": false, "directions": false, "evidence": false, "review": false, "passport": false}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_decision_rooms_user ON decision_rooms(user_id);
CREATE INDEX idx_decision_rooms_linked_brief ON decision_rooms(linked_brief_id);
CREATE INDEX idx_decision_rooms_created_at ON decision_rooms(created_at DESC);

CREATE TRIGGER update_decision_rooms_updated_at
  BEFORE UPDATE ON decision_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Notifications (from migration 010)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- Payment Intents (from migration 011)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  milestone_number INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded')
  ),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_intents_agreement_id ON payment_intents(agreement_id);
CREATE INDEX idx_payment_intents_brand_id ON payment_intents(brand_id);
CREATE INDEX idx_payment_intents_creator_id ON payment_intents(creator_id);
CREATE INDEX idx_payment_intents_stripe_id ON payment_intents(stripe_payment_intent_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);

CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE ON payment_intents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- OTP Verifications (from migration 013)
-- ============================================================================
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_otp_verifications_email_expires ON otp_verifications(email, expires_at);
CREATE INDEX idx_otp_verifications_expires_at ON otp_verifications(expires_at);

-- Cleanup function for expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_verifications 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Row Level Security - Enable on all tables
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies: OTP Verifications (Service role only)
-- ============================================================================
CREATE POLICY "Service role only access"
  ON otp_verifications FOR ALL
  USING (false);

-- ============================================================================
-- RLS Policies: Notifications
-- ============================================================================
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- RLS Policies: Payment Intents
-- ============================================================================
CREATE POLICY "Brands can read their payment intents"
  ON payment_intents FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM brand_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can read their payment intents"
  ON payment_intents FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can create payment intents"
  ON payment_intents FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM brand_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS Policies: Decision Rooms
-- ============================================================================
CREATE POLICY "Users can view own decision rooms"
  ON decision_rooms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own decision rooms"
  ON decision_rooms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decision rooms"
  ON decision_rooms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decision rooms"
  ON decision_rooms FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS Policies: Director Conversations
-- ============================================================================
CREATE POLICY "Users can read own director conversations"
ON director_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own director conversations"
ON director_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own director conversations"
ON director_conversations FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own director conversations"
ON director_conversations FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- RLS Policies: Director Messages
-- ============================================================================
CREATE POLICY "Users can read own director messages"
ON director_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages in own director conversations"
ON director_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own director messages"
ON director_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
);

-- ============================================================================
-- RLS Policies: Agreements
-- ============================================================================
CREATE POLICY "Participants can read agreements"
  ON agreements FOR SELECT
  TO authenticated
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    ) OR
    brand_id IN (
      SELECT id FROM brand_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can accept agreements"
  ON agreements FOR UPDATE
  TO authenticated
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can accept agreements"
  ON agreements FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM brand_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT id FROM brand_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS Policies: Deliveries
-- ============================================================================
CREATE POLICY "Creators can upload deliveries"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM agreements 
      WHERE id = agreement_id AND creator_id = deliveries.creator_id
    )
  );

CREATE POLICY "Participants can read deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agreements 
      WHERE id = agreement_id AND (
        creator_id IN (
          SELECT id FROM creator_profiles WHERE user_id = auth.uid()
        ) OR
        brand_id IN (
          SELECT id FROM brand_profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Brands can approve deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agreements 
      WHERE id = agreement_id AND brand_id IN (
        SELECT id FROM brand_profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agreements 
      WHERE id = agreement_id AND brand_id IN (
        SELECT id FROM brand_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- RLS Policies: Project Messages
-- ============================================================================
CREATE POLICY "Participants can send messages"
  ON project_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM agreements 
      WHERE id = agreement_id AND (
        creator_id IN (
          SELECT id FROM creator_profiles WHERE user_id = auth.uid()
        ) OR
        brand_id IN (
          SELECT id FROM brand_profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Participants can read messages"
  ON project_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agreements 
      WHERE id = agreement_id AND (
        creator_id IN (
          SELECT id FROM creator_profiles WHERE user_id = auth.uid()
        ) OR
        brand_id IN (
          SELECT id FROM brand_profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- ============================================================================
-- RLS Policies: Scope Changes
-- ============================================================================
CREATE POLICY "Participants can read scope changes"
  ON scope_changes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agreements 
      WHERE id = agreement_id AND (
        creator_id IN (
          SELECT id FROM creator_profiles WHERE user_id = auth.uid()
        ) OR
        brand_id IN (
          SELECT id FROM brand_profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Creators can accept scope changes"
  ON scope_changes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agreements 
      WHERE id = agreement_id AND creator_id IN (
        SELECT id FROM creator_profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agreements 
      WHERE id = agreement_id AND creator_id IN (
        SELECT id FROM creator_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Brands can accept scope changes"
  ON scope_changes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agreements 
      WHERE id = agreement_id AND brand_id IN (
        SELECT id FROM brand_profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agreements 
      WHERE id = agreement_id AND brand_id IN (
        SELECT id FROM brand_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Note: Policies for users, creator_profiles, brand_profiles, briefs,
-- proposals, messages, reviews, and verifications should be added based on
-- specific business requirements. This baseline includes the core structure.
-- ============================================================================

-- ============================================================================
-- Comments for Documentation
-- ============================================================================
COMMENT ON TABLE otp_verifications IS 'Persistent OTP storage for email verification. Managed by service role only.';
COMMENT ON TABLE notifications IS 'Database-backed notification system. Supports Realtime subscriptions.';
COMMENT ON TABLE payment_intents IS 'Tracks Stripe PaymentIntents for milestone payments with escrow workflow';
COMMENT ON TABLE director_conversations IS 'Conversation threads between users and CineGen Director AI assistant';
COMMENT ON TABLE director_messages IS 'Individual messages in Director conversations';
COMMENT ON TABLE decision_rooms IS 'Connected workspace for idea → directions → evidence → delivery review';
