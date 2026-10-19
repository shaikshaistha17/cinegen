-- ============================================================================
-- CineGen Database Schema
-- PostgreSQL schema for AI Creator Marketplace
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Users Table
-- Core authentication and user management
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('brand', 'creator', 'guest')),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- Creator Profiles Table
-- Stores all creator profile data, portfolio, and stats
-- ============================================================================
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  handle VARCHAR(100) UNIQUE NOT NULL,
  avatar_url TEXT,
  cover_url TEXT,
  headline TEXT NOT NULL,
  bio TEXT NOT NULL,
  location VARCHAR(255),
  hourly_rate_usd INTEGER NOT NULL,
  availability VARCHAR(20) NOT NULL CHECK (availability IN ('Available', 'Booked', 'Limited')),
  specializations TEXT[] NOT NULL,
  skills TEXT[] NOT NULL,
  verified_tools JSONB NOT NULL DEFAULT '[]',
  languages TEXT[] NOT NULL,
  stats JSONB NOT NULL DEFAULT '{"projectsCompleted": 0, "avgRating": 0, "repeatClientRate": 0, "responseTime": ""}',
  verification JSONB NOT NULL DEFAULT '{"toolsVerified": false, "workflowVerified": false, "pastWorkVerified": false, "badge": "Unverified"}',
  portfolio JSONB NOT NULL DEFAULT '[]',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_creator_profiles_user_id ON creator_profiles(user_id);
CREATE INDEX idx_creator_profiles_handle ON creator_profiles(handle);
CREATE INDEX idx_creator_profiles_availability ON creator_profiles(availability);
CREATE INDEX idx_creator_profiles_hourly_rate ON creator_profiles(hourly_rate_usd);

-- ============================================================================
-- Brand Profiles Table
-- Stores brand/company information
-- ============================================================================
CREATE TABLE IF NOT EXISTS brand_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  industry VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_brand_profiles_user_id ON brand_profiles(user_id);

-- ============================================================================
-- Briefs Table
-- Campaign briefs created by brands
-- ============================================================================
CREATE TABLE IF NOT EXISTS briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  campaign_title VARCHAR(255) NOT NULL,
  objective TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  style TEXT NOT NULL,
  aspect_ratios TEXT[] NOT NULL,
  duration_seconds INTEGER,
  resolution VARCHAR(20),
  quantity INTEGER NOT NULL,
  tools_preferred TEXT[] NOT NULL,
  reference_links TEXT[] DEFAULT '{}',
  budget_min INTEGER NOT NULL,
  budget_max INTEGER NOT NULL,
  deadline DATE NOT NULL,
  commercial_use JSONB NOT NULL,
  negative_keywords TEXT[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Open', 'In Review', 'Hired', 'Delivered')),
  generated_by_ai BOOLEAN DEFAULT FALSE,
  raw_idea TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_briefs_brand_id ON briefs(brand_id);
CREATE INDEX idx_briefs_status ON briefs(status);
CREATE INDEX idx_briefs_content_type ON briefs(content_type);
CREATE INDEX idx_briefs_deadline ON briefs(deadline);

-- ============================================================================
-- Proposals Table
-- Creator proposals submitted to briefs
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  price INTEGER NOT NULL,
  timeline_days INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Shortlisted', 'Accepted', 'Rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_proposals_brief_id ON proposals(brief_id);
CREATE INDEX idx_proposals_creator_id ON proposals(creator_id);
CREATE INDEX idx_proposals_status ON proposals(status);

-- ============================================================================
-- Messages Table
-- Direct messaging between brands and creators
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_read_at ON messages(read_at);

-- ============================================================================
-- Reviews Table
-- Brand reviews of creator work
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reviews_creator_id ON reviews(creator_id);
CREATE INDEX idx_reviews_brand_id ON reviews(brand_id);
CREATE INDEX idx_reviews_brief_id ON reviews(brief_id);

-- ============================================================================
-- Verifications Table
-- Creator verification requests and admin reviews
-- ============================================================================
CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('tools', 'workflow', 'past_work')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  evidence_url TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_verifications_creator_id ON verifications(creator_id);
CREATE INDEX idx_verifications_status ON verifications(status);
CREATE INDEX idx_verifications_type ON verifications(verification_type);

-- ============================================================================
-- Update Triggers
-- Automatically update updated_at timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_profiles_updated_at BEFORE UPDATE ON creator_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_profiles_updated_at BEFORE UPDATE ON brand_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_briefs_updated_at BEFORE UPDATE ON briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
