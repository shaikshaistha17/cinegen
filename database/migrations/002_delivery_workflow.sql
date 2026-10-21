-- ============================================================================
-- CineGen Delivery Workflow Migration
-- Versioned agreements, deliveries, project messages, and scope changes
-- ============================================================================

-- ============================================================================
-- Agreements Table
-- Immutable agreement versions requiring both-party acceptance
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
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
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

-- ============================================================================
-- Deliveries Table
-- Private delivery uploads with inspection and approval
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

-- ============================================================================
-- Project Messages Table
-- Comments, revision requests, and scope change requests
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
-- Scope Changes Table
-- Tracks accepted scope modifications to agreements
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
-- Enable RLS on all new tables
-- ============================================================================
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_changes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for Agreements Table
-- ============================================================================

-- Authenticated users can read agreements where they are a participant
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

-- Service role can insert agreements (done via API with validation)
-- No explicit INSERT policy for users = only service role can insert

-- Creators can update their acceptance timestamp
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

-- Brands can update their acceptance timestamp
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
-- RLS Policies for Deliveries Table
-- ============================================================================

-- Creators can insert deliveries for their agreements
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

-- Participants can read deliveries for their agreements
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

-- Brands can update approval status
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
-- RLS Policies for Project Messages Table
-- ============================================================================

-- Participants can insert messages for their agreements
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

-- Participants can read messages for their agreements
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

-- No UPDATE or DELETE policies - messages are immutable

-- ============================================================================
-- RLS Policies for Scope Changes Table
-- ============================================================================

-- Service role can insert scope changes (via API)
-- No explicit INSERT policy for users = only service role can insert

-- Participants can read scope changes
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

-- Creators can update their acceptance
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

-- Brands can update their acceptance
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
-- Supabase Storage: Deliveries Bucket
-- ============================================================================

-- Create private deliveries bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('deliveries', 'deliveries', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Storage Policies for Deliveries Bucket
-- ============================================================================

-- Creators can upload to their agreements
CREATE POLICY "Creators can upload deliveries to storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'deliveries' AND
    (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
    EXISTS (
      SELECT 1 FROM agreements 
      WHERE id::text = (storage.foldername(name))[1] AND
      creator_id IN (
        SELECT id FROM creator_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Participants can read objects from their agreements
CREATE POLICY "Participants can download deliveries from storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'deliveries' AND
    (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
    EXISTS (
      SELECT 1 FROM agreements 
      WHERE id::text = (storage.foldername(name))[1] AND (
        creator_id IN (
          SELECT id FROM creator_profiles WHERE user_id = auth.uid()
        ) OR
        brand_id IN (
          SELECT id FROM brand_profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- No public access to deliveries bucket

-- ============================================================================
-- Update Trigger for Agreements Table
-- ============================================================================
CREATE TRIGGER update_agreements_updated_at BEFORE UPDATE ON agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- End of Migration
-- ============================================================================
