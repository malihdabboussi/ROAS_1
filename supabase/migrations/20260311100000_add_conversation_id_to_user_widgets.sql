-- Link each widget to its build conversation for persistent chat history
ALTER TABLE user_widgets
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_widgets_conversation_id ON user_widgets(conversation_id)
  WHERE conversation_id IS NOT NULL;
