-- ============================================================================
-- CineGen Row Level Security (RLS) Policies
-- Security policies for multi-tenant data access control
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Users Table Policies
-- ============================================================================

-- Users can read their own user record
CREATE POLICY "Users can read their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Brands can read creator user records (for contact info, etc.)
CREATE POLICY "Brands can read creator user records"
  ON users FOR SELECT
  USING (
    role = 'creator' AND 
    EXISTS (
      SELECT 1 FROM brand_profiles 
      WHERE brand_profiles.user_id = auth.uid()
    )
  );

-- Users can update their own record
CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- Creator Profiles Policies
-- ============================================================================

-- Public read access to all creator profiles (marketplace discovery)
CREATE POLICY "Public read access to creator profiles"
  ON creator_profiles FOR SELECT
  TO public
  USING (true);

-- Creators can update their own profile
CREATE POLICY "Creators can update their own profile"
  ON creator_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Creators can insert their own profile (registration)
CREATE POLICY "Creators can insert their own profile"
  ON creator_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Brand Profiles Policies
-- ============================================================================

-- Public read access (creators need context about brands)
CREATE POLICY "Public read access to brand profiles"
  ON brand_profiles FOR SELECT
  TO public
  USING (true);

-- Brands can update their own profile
CREATE POLICY "Brands can update their own profile"
  ON brand_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Brands can insert their own profile (registration)
CREATE POLICY "Brands can insert their own profile"
  ON brand_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Briefs Policies
-- ============================================================================

-- Public can read Open briefs (marketplace discovery)
CREATE POLICY "Public can read open briefs"
  ON briefs FOR SELECT
  TO public
  USING (status = 'Open');

-- Authenticated creators can read all Open briefs
CREATE POLICY "Creators can read open briefs"
  ON briefs FOR SELECT
  TO authenticated
  USING (
    status = 'Open' AND 
    EXISTS (
      SELECT 1 FROM creator_profiles 
      WHERE creator_profiles.user_id = auth.uid()
    )
  );

-- Brands can read all their own briefs (any status)
CREATE POLICY "Brands can read their own briefs"
  ON briefs FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM brand_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Brands can insert their own briefs
CREATE POLICY "Brands can create briefs"
  ON briefs FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM brand_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Brands can update their own briefs
CREATE POLICY "Brands can update their own briefs"
  ON briefs FOR UPDATE
  USING (
    brand_id IN (
      SELECT id FROM brand_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Brands can delete their own briefs
CREATE POLICY "Brands can delete their own briefs"
  ON briefs FOR DELETE
  USING (
    brand_id IN (
      SELECT id FROM brand_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Proposals Policies
-- ============================================================================

-- Creators can read their own proposals
CREATE POLICY "Creators can read their own proposals"
  ON proposals FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Brands can read all proposals for their own briefs
CREATE POLICY "Brands can read proposals for their briefs"
  ON proposals FOR SELECT
  USING (
    brief_id IN (
      SELECT id FROM briefs 
      WHERE brand_id IN (
        SELECT id FROM brand_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Creators can insert proposals for their own profile
CREATE POLICY "Creators can submit proposals"
  ON proposals FOR INSERT
  WITH CHECK (
    creator_id IN (
      SELECT id FROM creator_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Creators can update their own proposals (when status is Pending)
CREATE POLICY "Creators can update their own pending proposals"
  ON proposals FOR UPDATE
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles 
      WHERE user_id = auth.uid()
    ) AND status = 'Pending'
  );

-- Brands can update proposal status for their briefs
CREATE POLICY "Brands can update proposal status"
  ON proposals FOR UPDATE
  USING (
    brief_id IN (
      SELECT id FROM briefs 
      WHERE brand_id IN (
        SELECT id FROM brand_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Messages Policies
-- ============================================================================

-- Users can read messages where they are sender or recipient
CREATE POLICY "Users can read their own messages"
  ON messages FOR SELECT
  USING (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid()
  );

-- Users can send messages (as sender)
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Users can update read status on messages sent to them
CREATE POLICY "Users can mark messages as read"
  ON messages FOR UPDATE
  USING (recipient_id = auth.uid());

-- ============================================================================
-- Reviews Policies
-- ============================================================================

-- Public read access to all reviews (transparency)
CREATE POLICY "Public can read all reviews"
  ON reviews FOR SELECT
  TO public
  USING (true);

-- Brands can create reviews for briefs they own (once per engagement)
CREATE POLICY "Brands can create reviews for their engagements"
  ON reviews FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM brand_profiles 
      WHERE user_id = auth.uid()
    ) AND
    brief_id IN (
      SELECT id FROM briefs 
      WHERE brand_id IN (
        SELECT id FROM brand_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Verifications Policies
-- ============================================================================

-- Creators can read their own verification requests
CREATE POLICY "Creators can read their own verifications"
  ON verifications FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Creators can create verification requests
CREATE POLICY "Creators can submit verification requests"
  ON verifications FOR INSERT
  WITH CHECK (
    creator_id IN (
      SELECT id FROM creator_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Only service role can update verification status and admin notes
-- (This is enforced by using service role client in admin functions)
-- No UPDATE policy = only service role can update
