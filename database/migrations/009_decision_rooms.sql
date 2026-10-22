-- Decision Rooms: Connected workspace for idea → directions → evidence → delivery review
-- Migration 009

CREATE TABLE IF NOT EXISTS decision_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_text TEXT,
  requirements JSONB DEFAULT '{}',
  selected_direction JSONB,
  selected_creator_id UUID REFERENCES creator_profiles(id),
  linked_brief_id UUID REFERENCES briefs(id),
  stage_progress JSONB DEFAULT '{"idea": false, "directions": false, "evidence": false, "review": false, "passport": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_decision_rooms_user ON decision_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_decision_rooms_linked_brief ON decision_rooms(linked_brief_id);
CREATE INDEX IF NOT EXISTS idx_decision_rooms_created_at ON decision_rooms(created_at DESC);

-- Enable Row Level Security
ALTER TABLE decision_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own decision rooms
CREATE POLICY "Users can view own decision rooms"
  ON decision_rooms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own decision rooms"
  ON decision_rooms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decision rooms"
  ON decision_rooms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decision rooms"
  ON decision_rooms FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_decision_rooms_updated_at
  BEFORE UPDATE ON decision_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
