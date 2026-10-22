-- ============================================================================
-- Migration 008: Convert Currency from USD to INR
-- Date: 2025-01-XX
-- Description: Standardize all CineGen monetary values to Indian Rupees (INR)
-- ============================================================================

-- IMPORTANT: This migration is for LOCAL DEVELOPMENT ONLY
-- Do NOT run on production without manual review of existing data

BEGIN;

-- ============================================================================
-- STEP 1: Rename creator_profiles.hourly_rate_usd → hourly_rate_inr
-- ============================================================================

-- Rename the column
ALTER TABLE creator_profiles 
  RENAME COLUMN hourly_rate_usd TO hourly_rate_inr;

-- Update column comment
COMMENT ON COLUMN creator_profiles.hourly_rate_inr IS 'Hourly rate in Indian Rupees (INR). Stored as integer (no paise).';

-- The index will automatically be renamed, but let's verify it exists
-- (The index idx_creator_profiles_hourly_rate is already updated in schema.sql)

-- ============================================================================
-- STEP 2: Update creator_services.price_range CHECK constraint
-- ============================================================================

-- Drop old constraint
ALTER TABLE creator_services 
  DROP CONSTRAINT IF EXISTS creator_services_price_range_check;

-- Add new constraint with INR ranges
ALTER TABLE creator_services 
  ADD CONSTRAINT creator_services_price_range_check 
  CHECK (price_range IN ('₹50k-₹1L', '₹1L-₹2.5L', '₹2.5L-₹4L', '₹4L-₹8L', '₹8L+'));

-- ============================================================================
-- STEP 3: Add comments to budget and price fields
-- ============================================================================

COMMENT ON COLUMN briefs.budget_min IS 'Budget minimum in Indian Rupees (INR)';
COMMENT ON COLUMN briefs.budget_max IS 'Budget maximum in Indian Rupees (INR)';
COMMENT ON COLUMN proposals.price IS 'Proposal price in Indian Rupees (INR)';

-- ============================================================================
-- STEP 4: Data Migration for Demo Records
-- ============================================================================

-- NOTE: The seed script (lib/seed/creators.ts) has been updated with new INR rates.
-- When re-seeding the database, it will populate with correct INR values.
-- 
-- For existing demo data, if needed, you would convert rates manually here.
-- However, since this is demo data with fictional pricing, we recommend:
-- 1. Dropping and re-seeding the database with updated seed script
-- 2. OR manually updating specific records if needed
--
-- Example conversion (COMMENTED OUT - only use if needed):
-- UPDATE creator_profiles SET hourly_rate_inr = 8000 WHERE id = 'creator-001'; -- was $95
-- UPDATE creator_profiles SET hourly_rate_inr = 6500 WHERE id = 'creator-002'; -- was $75
-- etc.

-- ============================================================================
-- STEP 5: Update agreements table default currency
-- ============================================================================

-- The agreements table already has a currency field, but let's set a default
-- for new agreements (existing agreements preserve their original currency)
ALTER TABLE agreements 
  ALTER COLUMN currency SET DEFAULT 'INR';

COMMENT ON COLUMN agreements.currency IS 'Currency code (INR for new agreements). Historical agreements may have other currencies.';
COMMENT ON COLUMN agreements.price IS 'Agreement price in the specified currency (stored as integer).';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- These queries help verify the migration succeeded:
-- (COMMENTED OUT - uncomment to run verification)

-- Verify column rename
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'creator_profiles' AND column_name = 'hourly_rate_inr';

-- Verify creator_services constraint
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'creator_services_price_range_check';

-- Check for any suspiciously low rates (likely unconverted USD)
-- SELECT id, name, hourly_rate_inr FROM creator_profiles WHERE hourly_rate_inr < 2000;

COMMIT;

-- ============================================================================
-- ROLLBACK PROCEDURE (if needed)
-- ============================================================================

-- To revert this migration:
/*
BEGIN;

ALTER TABLE creator_profiles RENAME COLUMN hourly_rate_inr TO hourly_rate_usd;
ALTER TABLE creator_services DROP CONSTRAINT creator_services_price_range_check;
ALTER TABLE creator_services ADD CONSTRAINT creator_services_price_range_check 
  CHECK (price_range IN ('$500-$1k', '$1k-$3k', '$3k-$5k', '$5k-$10k', '$10k+'));
ALTER TABLE agreements ALTER COLUMN currency SET DEFAULT 'USD';

COMMIT;
*/
