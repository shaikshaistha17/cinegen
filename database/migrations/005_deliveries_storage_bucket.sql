-- ============================================================================
-- CineGen Database Migration 005
-- Private Deliveries Storage Bucket with RLS
-- ============================================================================

-- Note: This SQL must be run in Supabase SQL Editor with Storage enabled
-- Storage buckets and policies require Supabase-specific extensions

-- Create private deliveries bucket
-- Run this via Supabase Dashboard > Storage > Create Bucket
-- Bucket name: deliveries
-- Public: false (private, requires authentication)

-- RLS Policies for deliveries bucket:
-- Only agreement participants can upload/download delivery files

-- Policy: Creators can upload to their own agreement folders
-- CREATE POLICY "Creators can upload deliveries"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'deliveries' 
--   AND auth.uid() IN (
--     SELECT cp.user_id 
--     FROM agreements a
--     JOIN creator_profiles cp ON cp.id = a.creator_id
--     WHERE a.id::text = split_part(name, '/', 2)
--   )
-- );

-- Policy: Participants can download deliveries
-- CREATE POLICY "Participants can download deliveries"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'deliveries'
--   AND auth.uid() IN (
--     SELECT cp.user_id 
--     FROM agreements a
--     JOIN creator_profiles cp ON cp.id = a.creator_id
--     WHERE a.id::text = split_part(name, '/', 2)
--     UNION
--     SELECT bp.user_id
--     FROM agreements a
--     JOIN brand_profiles bp ON bp.id = a.brand_id
--     WHERE a.id::text = split_part(name, '/', 2)
--   )
-- );

-- MANUAL SETUP REQUIRED:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "Create Bucket"
-- 3. Name: deliveries
-- 4. Public: OFF (private bucket)
-- 5. Go to Policies tab
-- 6. Add custom policies for upload (INSERT) and download (SELECT) as shown above
-- 7. Test with actual uploads to verify RLS enforcement
