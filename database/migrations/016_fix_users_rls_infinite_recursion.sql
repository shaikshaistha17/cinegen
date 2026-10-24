-- ============================================================================
-- Migration 016: Fix Users Table RLS Infinite Recursion
-- ============================================================================
-- Problem: The "Admins can read all users" policy creates infinite recursion
-- by querying the users table within a users table RLS policy.
-- Solution: Drop the problematic policy. Admin access should be handled via
-- service role key in API routes, not RLS policies.
-- ============================================================================

-- Remove the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can read all users" ON users;

-- Note: Admin access to all users should be implemented in API routes
-- using the service role Supabase client, which bypasses RLS.
-- Example:
--   const supabase = createClient(process.env.SUPABASE_SERVICE_ROLE_KEY);
--   const { data: users } = await supabase.from('users').select('*');

COMMENT ON TABLE users IS 'Core user authentication table. Admin access via service role, not RLS.';
