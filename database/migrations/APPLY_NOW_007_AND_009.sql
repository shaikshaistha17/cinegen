-- ============================================================================
-- COMBINED MIGRATION: Apply 007 and 009 together
-- Safe to run - uses IF NOT EXISTS and DROP IF EXISTS for policies
-- ============================================================================

-- ============================================================================
-- MIGRATION 007: Director Conversations
-- ============================================================================

-- Create director_conversations table
CREATE TABLE IF NOT EXISTS director_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_director_conversations_user_id ON director_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_director_conversations_user_active ON director_conversations(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_director_conversations_last_message ON director_conversations(user_id, last_message_at DESC);

-- Create director_messages table
CREATE TABLE IF NOT EXISTS director_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES director_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  input_source VARCHAR(20) CHECK (input_source IN ('voice', 'text')),
  status VARCHAR(20) DEFAULT 'delivered' CHECK (status IN ('sending', 'delivered', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_director_messages_conversation ON director_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_director_messages_conversation_role ON director_messages(conversation_id, role);

-- Enable RLS on director tables
ALTER TABLE director_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own conversations" ON director_conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON director_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON director_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON director_conversations;
DROP POLICY IF EXISTS "Users can view own messages" ON director_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON director_messages;

-- Create RLS policies for director_conversations
CREATE POLICY "Users can view own conversations"
  ON director_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON director_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON director_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON director_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for director_messages
CREATE POLICY "Users can view own messages"
  ON director_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM director_conversations
      WHERE director_conversations.id = director_messages.conversation_id
      AND director_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own messages"
  ON director_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM director_conversations
      WHERE director_conversations.id = director_messages.conversation_id
      AND director_conversations.user_id = auth.uid()
    )
  );

-- ============================================================================
-- MIGRATION 009: Decision Rooms
-- ============================================================================

-- Create decision_rooms table
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

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own decision rooms" ON decision_rooms;
DROP POLICY IF EXISTS "Users can insert own decision rooms" ON decision_rooms;
DROP POLICY IF EXISTS "Users can update own decision rooms" ON decision_rooms;
DROP POLICY IF EXISTS "Users can delete own decision rooms" ON decision_rooms;

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
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_decision_rooms_updated_at ON decision_rooms;

CREATE TRIGGER update_decision_rooms_updated_at
  BEFORE UPDATE ON decision_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DONE!
-- ============================================================================
