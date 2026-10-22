-- ============================================================================
-- Creator Services Table
-- Services/packages offered by creators (e.g., "30-second AI product video")
-- ============================================================================

CREATE TABLE IF NOT EXISTS creator_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skills TEXT[] NOT NULL,
  price_range TEXT NOT NULL CHECK (price_range IN ('₹50k-₹1L', '₹1L-₹2.5L', '₹2.5L-₹4L', '₹4L-₹8L', '₹8L+')),
  delivery_time TEXT NOT NULL,
  portfolio_items JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_creator_services_creator_id ON creator_services(creator_id);
CREATE INDEX idx_creator_services_is_active ON creator_services(is_active);
CREATE INDEX idx_creator_services_created_at ON creator_services(created_at);

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER update_creator_services_updated_at 
  BEFORE UPDATE ON creator_services
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
