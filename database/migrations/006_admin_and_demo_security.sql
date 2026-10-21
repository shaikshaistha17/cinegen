-- ============================================================================
-- Migration: Admin Role and Demo Account Isolation
-- Adds admin role support and demo account isolation with RLS enforcement
-- ============================================================================

-- Step 1: Update users table to support 'admin' role and 'is_demo' flag
-- ============================================================================

-- Add is_demo column (defaults to false for existing users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

-- Update role constraint to include 'admin'
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('brand', 'creator', 'guest', 'admin'));

-- Create index for admin role queries
CREATE INDEX IF NOT EXISTS idx_users_role_admin ON users(role) WHERE role = 'admin';
CREATE INDEX IF NOT EXISTS idx_users_is_demo ON users(is_demo) WHERE is_demo = true;

-- Step 2: Mark existing demo accounts
-- ============================================================================

UPDATE users 
SET is_demo = true 
WHERE email LIKE '%@cinegen.demo';

-- Step 3: Add RLS policies for admin access
-- ============================================================================

-- Admins can read all users (for admin panel)
DROP POLICY IF EXISTS "Admins can read all users" ON users;
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users admin_check
      WHERE admin_check.id = auth.uid() 
      AND admin_check.role = 'admin'
    )
  );

-- Admins can read all verifications
DROP POLICY IF EXISTS "Admins can read all verifications" ON verifications;
CREATE POLICY "Admins can read all verifications"
  ON verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users admin_check
      WHERE admin_check.id = auth.uid() 
      AND admin_check.role = 'admin'
    )
  );

-- Admins can update verifications (approve/reject)
DROP POLICY IF EXISTS "Admins can update verifications" ON verifications;
CREATE POLICY "Admins can update verifications"
  ON verifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users admin_check
      WHERE admin_check.id = auth.uid() 
      AND admin_check.role = 'admin'
    )
  );

-- Step 4: Prevent users from modifying their own role or is_demo flag
-- ============================================================================

-- Users cannot change their role or is_demo status
DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent role changes
    role = (SELECT role FROM users WHERE id = auth.uid()) AND
    -- Prevent is_demo flag changes
    is_demo = (SELECT is_demo FROM users WHERE id = auth.uid())
  );

-- Step 5: Demo account isolation
-- ============================================================================

-- Demo users can only see demo data in creator_profiles
DROP POLICY IF EXISTS "Demo isolation for creator profiles" ON creator_profiles;
CREATE POLICY "Demo isolation for creator profiles"
  ON creator_profiles FOR SELECT
  USING (
    -- If user is demo, they can only see demo creator profiles
    NOT EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_demo = true
    )
    OR
    -- Demo user can see demo creators
    user_id IN (
      SELECT id FROM users WHERE is_demo = true
    )
  );

-- Demo users can only see demo data in brand_profiles  
DROP POLICY IF EXISTS "Demo isolation for brand profiles" ON brand_profiles;
CREATE POLICY "Demo isolation for brand profiles"
  ON brand_profiles FOR SELECT
  USING (
    -- If user is demo, they can only see demo brand profiles
    NOT EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_demo = true
    )
    OR
    -- Demo user can see demo brands
    user_id IN (
      SELECT id FROM users WHERE is_demo = true
    )
  );

-- Demo users can only see demo briefs
DROP POLICY IF EXISTS "Public can read open briefs" ON briefs;
DROP POLICY IF EXISTS "Creators can read open briefs" ON briefs;
DROP POLICY IF EXISTS "Brands can read their own briefs" ON briefs;

CREATE POLICY "Users can read appropriate briefs"
  ON briefs FOR SELECT
  USING (
    -- Demo users can only see demo briefs
    (
      NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_demo = true)
      OR
      brand_id IN (
        SELECT bp.id FROM brand_profiles bp
        JOIN users u ON u.id = bp.user_id
        WHERE u.is_demo = true
      )
    )
    AND
    (
      -- Open briefs are visible to all
      status = 'Open'
      OR
      -- Or user owns the brief
      brand_id IN (
        SELECT id FROM brand_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Demo users can only see demo proposals
DROP POLICY IF EXISTS "Creators can read their own proposals" ON proposals;
DROP POLICY IF EXISTS "Brands can read proposals for their briefs" ON proposals;

CREATE POLICY "Users can read appropriate proposals"
  ON proposals FOR SELECT
  USING (
    -- Demo isolation check
    (
      NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_demo = true)
      OR
      (
        creator_id IN (
          SELECT cp.id FROM creator_profiles cp
          JOIN users u ON u.id = cp.user_id
          WHERE u.is_demo = true
        )
        AND
        brief_id IN (
          SELECT b.id FROM briefs b
          JOIN brand_profiles bp ON bp.id = b.brand_id
          JOIN users u ON u.id = bp.user_id
          WHERE u.is_demo = true
        )
      )
    )
    AND
    (
      -- User created the proposal
      creator_id IN (
        SELECT id FROM creator_profiles WHERE user_id = auth.uid()
      )
      OR
      -- User owns the brief
      brief_id IN (
        SELECT id FROM briefs 
        WHERE brand_id IN (
          SELECT id FROM brand_profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Demo users can only message other demo users
DROP POLICY IF EXISTS "Users can read their own messages" ON messages;
CREATE POLICY "Users can read their own messages"
  ON messages FOR SELECT
  USING (
    (sender_id = auth.uid() OR recipient_id = auth.uid())
    AND
    -- Demo isolation: demo users can only see messages between demo users
    (
      NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_demo = true)
      OR
      (
        sender_id IN (SELECT id FROM users WHERE is_demo = true)
        AND
        recipient_id IN (SELECT id FROM users WHERE is_demo = true)
      )
    )
  );

-- Demo users can only send messages to other demo users
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND
    -- Demo isolation: demo users can only message demo users
    (
      NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_demo = true)
      OR
      recipient_id IN (SELECT id FROM users WHERE is_demo = true)
    )
  );

-- Step 6: Storage bucket policies (if using Supabase Storage RLS)
-- ============================================================================
-- Note: Storage bucket RLS must be configured in Supabase dashboard
-- Demo users should only access files in paths like: demo/{user_id}/*
-- Regular users access: {user_id}/*

-- ============================================================================
-- IMPORTANT: Manual Steps Required After Running This Migration
-- ============================================================================
-- 
-- 1. Create an admin user manually in Supabase dashboard:
--    UPDATE users SET role = 'admin', is_demo = false 
--    WHERE email = 'your-admin@email.com';
--
-- 2. Configure Storage bucket policies in Supabase Dashboard:
--    - Bucket: deliveries
--    - Policy: Demo isolation based on user.is_demo flag
--
-- 3. Test with demo accounts to verify isolation works
--
-- 4. NEVER expose the service role key to client code
--
-- ============================================================================

COMMENT ON COLUMN users.is_demo IS 'Flag indicating if this is a shared demo account (restricted permissions)';
COMMENT ON COLUMN users.role IS 'User role: brand, creator, guest, or admin';
