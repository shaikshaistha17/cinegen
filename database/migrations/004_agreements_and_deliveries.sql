-- ============================================================================
-- CineGen Database Migration 004
-- Agreements, Deliveries, and Project Messages
-- ============================================================================

-- ============================================================================
-- Agreements Table
-- Versioned scope agreements between creators and brands
-- ============================================================================
CREATE TABLE IF NOT EXISTS agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Scope details (immutable once both parties accept)
  deliverables JSONB NOT NULL,
  price INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  milestones JSONB NOT NULL,
  included_revisions INTEGER NOT NULL DEFAULT 2,
  usage_requirements JSONB NOT NULL,
  
  -- Acceptance tracking
  creator_accepted_at TIMESTAMP WITH TIME ZONE,
  brand_accepted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure only one agreement per proposal
  UNIQUE(proposal_id)
);

CREATE INDEX idx_agreements_brief_id ON agreements(brief_id);
CREATE INDEX idx_agreements_proposal_id ON agreements(proposal_id);
CREATE INDEX idx_agreements_creator_id ON agreements(creator_id);
CREATE INDEX idx_agreements_brand_id ON agreements(brand_id);
CREATE INDEX idx_agreements_both_accepted ON agreements(creator_accepted_at, brand_accepted_at);

-- ============================================================================
-- Deliveries Table
-- File uploads with automated inspection results
-- ============================================================================
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  
  -- Version tracking
  version INTEGER NOT NULL,
  
  -- File details
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  
  -- Inspection results
  inspection_status VARCHAR(20) NOT NULL CHECK (inspection_status IN ('pass', 'fail', 'unsupported', 'error')),
  inspection_results JSONB NOT NULL,
  inspected_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Approval tracking
  brand_approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure version uniqueness per agreement
  UNIQUE(agreement_id, version)
);

CREATE INDEX idx_deliveries_agreement_id ON deliveries(agreement_id);
CREATE INDEX idx_deliveries_creator_id ON deliveries(creator_id);
CREATE INDEX idx_deliveries_version ON deliveries(version);
CREATE INDEX idx_deliveries_inspection_status ON deliveries(inspection_status);

-- ============================================================================
-- Project Messages Table
-- Private messages within project context with delivery-specific feedback
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Message classification
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('text', 'feedback', 'scope_change')),
  content TEXT NOT NULL,
  
  -- Delivery-specific feedback
  delivery_version INTEGER,
  video_timestamp_seconds DECIMAL(10,2),
  
  -- Scope change proposal
  proposed_changes JSONB,
  change_accepted_by_creator TIMESTAMP WITH TIME ZONE,
  change_accepted_by_brand TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_project_messages_agreement_id ON project_messages(agreement_id);
CREATE INDEX idx_project_messages_sender_id ON project_messages(sender_id);
CREATE INDEX idx_project_messages_type ON project_messages(message_type);
CREATE INDEX idx_project_messages_delivery_version ON project_messages(delivery_version);

-- ============================================================================
-- Update Triggers
-- ============================================================================
CREATE TRIGGER update_agreements_updated_at BEFORE UPDATE ON agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Brief Status Update
-- Add new status for production phase
-- ============================================================================
-- Note: This alters the CHECK constraint to add 'In Production'
-- The existing check is: CHECK (status IN ('Draft', 'Open', 'In Review', 'Hired', 'Delivered'))
-- We need to add 'In Production' between 'Hired' and 'Delivered'

ALTER TABLE briefs DROP CONSTRAINT IF EXISTS briefs_status_check;
ALTER TABLE briefs ADD CONSTRAINT briefs_status_check 
  CHECK (status IN ('Draft', 'Open', 'In Review', 'Hired', 'In Production', 'Delivered'));
