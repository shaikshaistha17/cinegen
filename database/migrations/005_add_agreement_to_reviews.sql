-- ============================================================================
-- CineGen Database Migration 005
-- Add agreement_id to reviews table
-- ============================================================================

-- Add agreement_id column to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS agreement_id UUID REFERENCES agreements(id) ON DELETE CASCADE;

-- Create index for agreement_id
CREATE INDEX IF NOT EXISTS idx_reviews_agreement_id ON reviews(agreement_id);

-- Add unique constraint to prevent duplicate reviews per agreement
-- Drop existing constraint if it exists, then add new one
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_agreement_unique;
ALTER TABLE reviews ADD CONSTRAINT reviews_agreement_unique UNIQUE(agreement_id);
