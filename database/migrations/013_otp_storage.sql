-- ============================================================================
-- Migration 013: Persistent OTP Storage
-- Replaces in-memory Map with database-backed OTP verification
-- Enables OTP persistence across server restarts and horizontal scaling
-- ============================================================================

-- Create OTP verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookup and cleanup queries
CREATE INDEX IF NOT EXISTS idx_otp_verifications_email_expires ON otp_verifications(email, expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at ON otp_verifications(expires_at);

-- Enable Row Level Security
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: No direct user access (service role only)
-- OTPs are managed exclusively by API routes using service role key
CREATE POLICY "Service role only access"
  ON otp_verifications
  FOR ALL
  USING (false);

-- Add comment explaining purpose
COMMENT ON TABLE otp_verifications IS 'Persistent OTP storage for email verification and password reset. Managed by service role only.';
COMMENT ON COLUMN otp_verifications.expires_at IS 'OTP expires 15 minutes after creation';
COMMENT ON COLUMN otp_verifications.used_at IS 'Timestamp when OTP was successfully verified. Prevents reuse.';

-- ============================================================================
-- Cleanup Function
-- Delete expired OTPs older than 1 hour (keeps 45 min buffer for auditing)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_verifications 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_otps IS 'Delete expired OTPs older than 1 hour. Schedule with pg_cron or run manually.';

-- Note: To schedule automatic cleanup with pg_cron (requires pg_cron extension):
-- SELECT cron.schedule('cleanup-expired-otps', '0 * * * *', 'SELECT cleanup_expired_otps()');
-- This runs every hour. Enable pg_cron in Supabase dashboard if needed.
