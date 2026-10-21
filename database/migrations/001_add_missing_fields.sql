-- Migration to add missing fields to existing tables
-- Run this in Supabase SQL Editor if fields are missing

-- Add missing fields to creator_services if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='creator_services' AND column_name='category') THEN
        ALTER TABLE creator_services ADD COLUMN category VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='creator_services' AND column_name='revisions_included') THEN
        ALTER TABLE creator_services ADD COLUMN revisions_included INTEGER DEFAULT 2;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='creator_services' AND column_name='commercial_terms') THEN
        ALTER TABLE creator_services ADD COLUMN commercial_terms TEXT;
    END IF;
END $$;

-- Add unique constraint to prevent duplicate proposals from same creator to same brief
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_creator_brief_proposal') THEN
        ALTER TABLE proposals ADD CONSTRAINT unique_creator_brief_proposal 
        UNIQUE (brief_id, creator_id);
    END IF;
END $$;

-- Add check constraint to ensure only one accepted proposal per brief
-- This will be enforced in application logic, but we can add a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_briefs_one_accepted_proposal
ON proposals (brief_id)
WHERE status = 'Accepted';

-- Ensure updated_at triggers exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_creator_services_updated_at') THEN
        CREATE TRIGGER update_creator_services_updated_at 
        BEFORE UPDATE ON creator_services
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
