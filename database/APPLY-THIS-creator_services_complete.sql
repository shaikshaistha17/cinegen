-- ============================================================================
-- Creator Services Complete Migration
-- RUN THIS IN SUPABASE SQL EDITOR (All-in-one script)
-- ============================================================================

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS creator_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skills TEXT[] NOT NULL,
  price_range TEXT NOT NULL CHECK (price_range IN ('$500-$1k', '$1k-$3k', '$3k-$5k', '$5k-$10k', '$10k+')),
  delivery_time TEXT NOT NULL,
  portfolio_items JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable Row Level Security (MUST come before policies)
ALTER TABLE creator_services ENABLE ROW LEVEL SECURITY;

-- Step 3: Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_creator_services_creator_id ON creator_services(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_services_is_active ON creator_services(is_active);
CREATE INDEX IF NOT EXISTS idx_creator_services_created_at ON creator_services(created_at);

-- Step 4: Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_creator_services_updated_at 
  BEFORE UPDATE ON creator_services
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Add RLS Policies

-- Policy 1: Public can read ACTIVE services (for marketplace browse)
CREATE POLICY "Public can read active creator services"
ON creator_services
FOR SELECT
USING (is_active = true);

-- Policy 2: Creators can read ALL their own services (active + inactive)
CREATE POLICY "Creators can read their own services"
ON creator_services
FOR SELECT
USING (
  creator_id IN (
    SELECT id FROM creator_profiles WHERE user_id = auth.uid()
  )
);

-- Policy 3: Creators can insert their own services
CREATE POLICY "Creators can insert their own services"
ON creator_services
FOR INSERT
WITH CHECK (
  creator_id IN (
    SELECT id FROM creator_profiles WHERE user_id = auth.uid()
  )
);

-- Policy 4: Creators can update their own services
CREATE POLICY "Creators can update their own services"
ON creator_services
FOR UPDATE
USING (
  creator_id IN (
    SELECT id FROM creator_profiles WHERE user_id = auth.uid()
  )
);

-- Policy 5: Creators can delete their own services
CREATE POLICY "Creators can delete their own services"
ON creator_services
FOR DELETE
USING (
  creator_id IN (
    SELECT id FROM creator_profiles WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- VERIFICATION QUERIES (Run these after to check it worked)
-- ============================================================================

-- Check table exists
-- SELECT * FROM creator_services LIMIT 1;

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'creator_services';

-- Check policies exist
-- SELECT policyname FROM pg_policies WHERE tablename = 'creator_services';

-- Check indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename = 'creator_services';
