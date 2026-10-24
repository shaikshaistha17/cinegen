# Migration 016: Fix Users RLS Infinite Recursion

## Problem
During build, the following error was encountered:
```
infinite recursion detected in policy for relation "users"
```

## Root Cause
The RLS policy "Admins can read all users" (from migration 006) queries the `users` table within its own RLS check, creating infinite recursion:

```sql
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users admin_check  -- ❌ Querying users from users policy
      WHERE admin_check.id = auth.uid() AND admin_check.role = 'admin'
    )
  );
```

## Solution
Drop the problematic policy. Admin access should be handled via service role key in API routes, which bypasses RLS entirely.

## How to Apply
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `016_fix_users_rls_infinite_recursion.sql`
3. Verify by running a health check query: `SELECT * FROM users LIMIT 1;`

## Impact
- ✅ Fixes build-time errors
- ✅ Admin functionality unchanged (API routes use service role)
- ✅ No user-facing changes
- ⚠️ Admin users can no longer directly query all users via client-side Supabase client (they must use API routes)
