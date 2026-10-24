-- ============================================================================
-- Migration 015: Index Optimization
-- Add composite indexes for common query patterns to improve performance
-- ============================================================================

-- ============================================================================
-- Proposals: Composite index for filtering by brief and status
-- Common query: List proposals for a brief filtered by status
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_proposals_brief_status ON proposals(brief_id, status);

-- ============================================================================
-- Deliveries: Composite index for agreement and version
-- Common query: Fetch deliveries for an agreement ordered by version
-- Already exists in migration 002, verify existence
-- ============================================================================
-- CREATE INDEX IF NOT EXISTS idx_deliveries_agreement_version ON deliveries(agreement_id, version);
-- (Already created in 014_consolidated_schema)

-- ============================================================================
-- Director Messages: Composite index for conversation and timestamp
-- Common query: Fetch messages for a conversation ordered by created_at
-- Already exists in migration 007, verify existence
-- ============================================================================
-- CREATE INDEX IF NOT EXISTS idx_director_messages_conversation ON director_messages(conversation_id, created_at);
-- (Already created in 014_consolidated_schema)

-- ============================================================================
-- Notifications: Composite index for user and read status
-- Common query: Fetch unread notifications for a user
-- Already exists in migration 010, verify existence
-- ============================================================================
-- CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at);
-- (Already created in 014_consolidated_schema)

-- ============================================================================
-- Reviews: Index for agreement_id lookups
-- Common query: Fetch reviews for a specific agreement
-- Added for agreement_id which was missing dedicated index
-- ============================================================================
-- CREATE INDEX IF NOT EXISTS idx_reviews_agreement_id ON reviews(agreement_id);
-- (Already created in 014_consolidated_schema)

-- ============================================================================
-- Messages: Composite index for conversation queries
-- Common query: Fetch all messages in a conversation ordered by time
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);

-- ============================================================================
-- Payment Intents: Composite index for agreement status queries
-- Common query: Find payment status for an agreement's milestone
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payment_intents_agreement_milestone ON payment_intents(agreement_id, milestone_number);

-- ============================================================================
-- Briefs: Composite index for brand's active briefs
-- Common query: List brand's briefs filtered by status
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_briefs_brand_status ON briefs(brand_id, status);

-- ============================================================================
-- Creator Profiles: Index for search by specializations
-- Common query: Search creators by specialization (array contains operation)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_creator_profiles_specializations ON creator_profiles USING GIN (specializations);

-- ============================================================================
-- Creator Profiles: Index for search by skills
-- Common query: Search creators by skills (array contains operation)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_creator_profiles_skills ON creator_profiles USING GIN (skills);

-- ============================================================================
-- Verifications: Composite index for creator verification lookup
-- Common query: Get all verifications for a creator by type
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_verifications_creator_type ON verifications(creator_id, verification_type);

-- ============================================================================
-- Scope Changes: Index for applied scope changes
-- Common query: Find applied scope changes for an agreement
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_scope_changes_agreement_applied ON scope_changes(agreement_id, applied_at);

-- ============================================================================
-- Performance verification queries
-- Use these with EXPLAIN ANALYZE to verify index usage:
-- ============================================================================

-- EXPLAIN ANALYZE SELECT * FROM proposals WHERE brief_id = '...' AND status = 'Pending';
-- Expected: Index Scan using idx_proposals_brief_status

-- EXPLAIN ANALYZE SELECT * FROM messages WHERE conversation_id = '...' ORDER BY created_at DESC LIMIT 50;
-- Expected: Index Scan using idx_messages_conversation_created

-- EXPLAIN ANALYZE SELECT * FROM payment_intents WHERE agreement_id = '...' AND milestone_number = 1;
-- Expected: Index Scan using idx_payment_intents_agreement_milestone

-- EXPLAIN ANALYZE SELECT * FROM briefs WHERE brand_id = '...' AND status = 'Open';
-- Expected: Index Scan using idx_briefs_brand_status

-- EXPLAIN ANALYZE SELECT * FROM creator_profiles WHERE 'Video Editing' = ANY(specializations);
-- Expected: Bitmap Index Scan using idx_creator_profiles_specializations

-- EXPLAIN ANALYZE SELECT * FROM notifications WHERE user_id = '...' AND read_at IS NULL;
-- Expected: Index Scan using idx_notifications_user_read

COMMENT ON INDEX idx_proposals_brief_status IS 'Optimizes queries filtering proposals by brief and status';
COMMENT ON INDEX idx_messages_conversation_created IS 'Optimizes fetching conversation messages in chronological order';
COMMENT ON INDEX idx_payment_intents_agreement_milestone IS 'Optimizes payment intent lookups by agreement and milestone';
COMMENT ON INDEX idx_briefs_brand_status IS 'Optimizes brand brief filtering by status';
COMMENT ON INDEX idx_creator_profiles_specializations IS 'Optimizes creator search by specializations (GIN index for array ops)';
COMMENT ON INDEX idx_creator_profiles_skills IS 'Optimizes creator search by skills (GIN index for array ops)';
COMMENT ON INDEX idx_verifications_creator_type IS 'Optimizes verification lookups by creator and type';
COMMENT ON INDEX idx_scope_changes_agreement_applied IS 'Optimizes finding applied scope changes';
