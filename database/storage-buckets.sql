-- ============================================================================
-- CineGen Supabase Storage Buckets Configuration
-- Execute these commands in Supabase Dashboard > Storage
-- Or use Supabase CLI: supabase storage create
-- ============================================================================

-- ============================================================================
-- Avatars Bucket
-- User profile pictures and creator avatars
-- ============================================================================

-- Create bucket (via SQL or Dashboard)
-- Bucket name: avatars
-- Public: true
-- File size limit: 2MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- Storage Policy: Public Read
CREATE POLICY "Public read access for avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Storage Policy: Authenticated Upload
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    (octet_length(decode(encode(content, 'escape'), 'base64')) < 2097152) -- 2MB limit
  );

-- Storage Policy: Users can update their own avatars
CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage Policy: Users can delete their own avatars
CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Portfolios Bucket
-- Creator portfolio images and videos
-- ============================================================================

-- Create bucket (via SQL or Dashboard)
-- Bucket name: portfolios
-- Public: true
-- File size limit: 10MB
-- Allowed MIME types: image/*, video/mp4, video/webm

-- Storage Policy: Public Read
CREATE POLICY "Public read access for portfolios"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'portfolios');

-- Storage Policy: Authenticated Creators Upload
CREATE POLICY "Creators can upload portfolio items"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'portfolios' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    (octet_length(decode(encode(content, 'escape'), 'base64')) < 10485760) AND -- 10MB limit
    EXISTS (
      SELECT 1 FROM creator_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Storage Policy: Creators can update their own portfolio items
CREATE POLICY "Creators can update their own portfolio items"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'portfolios' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM creator_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Storage Policy: Creators can delete their own portfolio items
CREATE POLICY "Creators can delete their own portfolio items"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'portfolios' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM creator_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Manual Creation via Supabase Dashboard (Alternative)
-- ============================================================================
-- If executing via Dashboard:
-- 
-- 1. Go to Storage section
-- 2. Click "New bucket"
-- 3. Create "avatars" bucket:
--    - Name: avatars
--    - Public: Yes
--    - File size limit: 2MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
-- 
-- 4. Create "portfolios" bucket:
--    - Name: portfolios
--    - Public: Yes
--    - File size limit: 10MB
--    - Allowed MIME types: image/*, video/mp4, video/webm
-- 
-- 5. Then execute the policies above in SQL Editor
