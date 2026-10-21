-- ============================================================================
-- Migration: Admin Role and Demo Account Isolation (SAFE/IDEMPOTENT VERSION)
-- Can be run multiple times safely
-- ============================================================================

-- Step 1: Update users table
-- ============================================================================

DO $$ 
BEGIN
  -- Add is_demo column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE users ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Update role constraint to include 'admin'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('brand', 'creator', 'guest', 'admin'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_role_admin ON users(role) WHERE role = 'admin';
CREATE INDEX IF NOT EXISTS idx_users_is_demo ON users(is_demo) WHERE is_demo = true;

-- Mark existing demo accounts
UPDATE users SET is_demo = true WHERE email LIKE '%@cinegen.demo' AND is_demo = false;

-- Step 2: Admin RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can read all users" ON users;
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users admin_check
      WHERE admin_check.id = auth.uid() AND admin_check.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can read all verifications" ON verifications;
CREATE POLICY "Admins can read all verifications"
  ON verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users admin_check
      WHERE admin_check.id = auth.uid() AND admin_check.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update verifications" ON verifications;
CREATE POLICY "Admins can update verifications"
  ON verifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users admin_check
      WHERE admin_check.id = auth.uid() AND admin_check.role = 'admin'
    )
  );

-- Step 3: Prevent role/is_demo self-modification
-- ============================================================================

DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM users WHERE id = auth.uid()) AND
    is_demo = (SELECT is_demo FROM users WHERE id = auth.uid())
  );

-- Step 4: Demo isolation policies
-- ============================================================================

DROP POLICY IF EXISTS "Demo isolation for creator profiles" ON creator_profiles;
CREATE POLICY "Demo isolation for creator profiles"
  ON creator_profiles FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_demo = true
    )
    OR user_id IN (SELECT id FROM users WHERE is_demo = true)
  );

DROP POLICY IF EXISTS "Demo isolation for brand profiles" ON brand_profiles;
CREATE POLICY "Demo isolation for brand profiles"
  ON brand_profiles FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_demo = true
    )
    OR user_id IN (SELECT id FROM users WHERE is_demo = true)
  );

-- Briefs policies (drop old ones first)
DROP POLICY IF EXISTS "Public can read open briefs" ON briefs;
DROP POLICY IF EXISTS "Creators can read open briefs" ON briefs;
DROP POLICY IF EXISTS "Brands can read their own briefs" ON briefs;
DROP POLICY IF EXISTS "Users can read appropriate briefs" ON briefs;

CREATE POLICY "Users can read appropriate briefs"
  ON briefs FOR SELECT
  USING (
    (
      NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_demo = true)
      OR brand_id IN (
        SELECT bp.id FROM brand_profiles bp
        JOIN users u ON u.id = bp.user_id WHERE u.is_demo = true
      )
    )
    AND
    (
      status = 'Open'
      OR brand_id IN (SELECT id FROM brand_profiles WHERE user_id = auth.uid())
    )
  );

-- Proposals policies (drop old ones first)
DROP POLICY IF EXISTS "Creators can read their own proposals" ON proposals;
DROP POLICY IF EXISTS "Brands can read proposals for their briefs" ON proposals;
DROP POLICY IF EXISTS "Users can read appropriate proposals" ON proposals;

CREATE POLICY "Users can read appropriate proposals"
  ON proposals FOR SELECT
  USING (
    (
      NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_demo = true)
      OR (
        creator_id IN (
          SELECT cp.id FROM creator_profiles cp
          JOIN users u ON u.id = cp.user_id WHERE u.is_demo = true
        )
        AND brief_id IN (
          SELECT b.id FROM briefs b
          JOIN brand_profiles bp ON bp.id = b.brand_id
          JOIN users u ON u.id = bp.user_id WHERE u.is_demo = true
        )
      )
    )
    AND
    (
      creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
      OR brief_id IN (
        SELECT id FROM briefs WHERE brand_id IN (
          SELECT id FROM brand_profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Messages policies
DROP POLICY IF EXISTS "Users can read their own messages" ON messages;
CREATE POLICY "Users can read their own messages"
  ON messages FOR SELECT
  USING (
    (sender_id = auth.uid() OR recipient_id = auth.uid())
    AND
    (
      NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_demo = true)
      OR (
        sender_id IN (SELECT id FROM users WHERE is_demo = true)
        AND recipient_id IN (SELECT id FROM users WHERE is_demo = true)
      )
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND
    (
      NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_demo = true)
      OR recipient_id IN (SELECT id FROM users WHERE is_demo = true)
    )
  );

-- Step 5: Add comments
-- ============================================================================

COMMENT ON COLUMN users.is_demo IS 'Flag indicating if this is a shared demo account (restricted permissions)';
COMMENT ON COLUMN users.role IS 'User role: brand, creator, guest, or admin';

-- Step 6: Verification summary
-- ============================================================================

DO $$
DECLARE
  demo_count INTEGER;
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO demo_count FROM users WHERE is_demo = true;
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
  
  RAISE NOTICE '✅ Migration 006 complete!';
  RAISE NOTICE '   Demo accounts marked: %', demo_count;
  RAISE NOTICE '   Admin accounts found: %', admin_count;
  RAISE NOTICE '';
  IF admin_count = 0 THEN
    RAISE NOTICE '⚠️  NEXT STEP: Create an admin account:';
    RAISE NOTICE '   UPDATE users SET role = ''admin'', is_demo = false';
    RAISE NOTICE '   WHERE email = ''your-email@domain.com'';';
  END IF;
END $$;
