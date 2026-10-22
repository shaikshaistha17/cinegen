-- ============================================================================
-- Migration 007: CineGen Director Conversations
-- Persistent conversation storage for CineGen Director AI assistant
-- ============================================================================

-- ============================================================================
-- director_conversations Table
-- Stores conversation metadata (one row per conversation thread)
-- ============================================================================
CREATE TABLE IF NOT EXISTS director_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_director_conversations_user_id ON director_conversations(user_id);
CREATE INDEX idx_director_conversations_user_active ON director_conversations(user_id, is_active);
CREATE INDEX idx_director_conversations_last_message ON director_conversations(user_id, last_message_at DESC);

COMMENT ON TABLE director_conversations IS 'Conversation threads between users and CineGen Director AI assistant';
COMMENT ON COLUMN director_conversations.title IS 'Conversation title derived from first user message (max 255 chars)';
COMMENT ON COLUMN director_conversations.is_active IS 'Active conversation shown by default; false for deleted/archived';
COMMENT ON COLUMN director_conversations.last_message_at IS 'Timestamp of most recent message, for sorting conversation list';

-- ============================================================================
-- director_messages Table
-- Stores individual messages within conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS director_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES director_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  input_source VARCHAR(20) CHECK (input_source IN ('voice', 'text')),
  status VARCHAR(20) DEFAULT 'delivered' CHECK (status IN ('sending', 'delivered', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_director_messages_conversation ON director_messages(conversation_id, created_at);
CREATE INDEX idx_director_messages_conversation_role ON director_messages(conversation_id, role);

COMMENT ON TABLE director_messages IS 'Individual messages in Director conversations (user and assistant messages)';
COMMENT ON COLUMN director_messages.role IS 'Message sender: "user" (human) or "assistant" (CineGen Director AI)';
COMMENT ON COLUMN director_messages.input_source IS 'How user message was input: "voice" or "text". NULL for assistant messages.';
COMMENT ON COLUMN director_messages.status IS 'Message delivery status: "sending", "delivered", "error"';

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- Enforce ownership: users can only access their own conversations
-- ============================================================================

ALTER TABLE director_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE director_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can read their own conversations
CREATE POLICY "Users can read own director conversations"
ON director_conversations FOR SELECT
USING (auth.uid() = user_id);

-- Conversations: Users can create their own conversations
CREATE POLICY "Users can create own director conversations"
ON director_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Conversations: Users can update their own conversations
CREATE POLICY "Users can update own director conversations"
ON director_conversations FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Conversations: Users can soft-delete their own conversations
CREATE POLICY "Users can delete own director conversations"
ON director_conversations FOR DELETE
USING (auth.uid() = user_id);

-- Messages: Users can read messages in their own conversations
CREATE POLICY "Users can read own director messages"
ON director_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
);

-- Messages: Users can insert messages in their own conversations
CREATE POLICY "Users can insert messages in own director conversations"
ON director_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
);

-- Messages: Users can update message status in their own conversations
CREATE POLICY "Users can update own director messages"
ON director_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM director_conversations
    WHERE director_conversations.id = director_messages.conversation_id
    AND director_conversations.user_id = auth.uid()
  )
);

-- ============================================================================
-- Update Triggers
-- Automatically update updated_at and last_message_at timestamps
-- ============================================================================

CREATE TRIGGER update_director_conversations_updated_at 
BEFORE UPDATE ON director_conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update conversation's last_message_at when a message is inserted
CREATE OR REPLACE FUNCTION update_director_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE director_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_last_message
AFTER INSERT ON director_messages
FOR EACH ROW EXECUTE FUNCTION update_director_conversation_last_message();

COMMENT ON FUNCTION update_director_conversation_last_message IS 'Updates conversation last_message_at when new message is inserted';
