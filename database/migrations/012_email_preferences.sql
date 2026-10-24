-- ============================================================================
-- Migration 012: Email Preferences System
-- Adds email notification preferences to users table
-- ============================================================================

-- Add email_preferences column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_preferences JSONB DEFAULT '{
  "proposal_submitted": true,
  "proposal_accepted": true,
  "payment_received": true,
  "delivery_uploaded": true,
  "review_submitted": true,
  "message_received": true
}'::jsonb;

-- Add index for faster email preferences lookups
CREATE INDEX IF NOT EXISTS idx_users_email_preferences ON users USING GIN (email_preferences);

-- Update existing users to have default email preferences
UPDATE users
SET email_preferences = '{
  "proposal_submitted": true,
  "proposal_accepted": true,
  "payment_received": true,
  "delivery_uploaded": true,
  "review_submitted": true,
  "message_received": true
}'::jsonb
WHERE email_preferences IS NULL;
