CREATE TABLE IF NOT EXISTS vb_message_timeline_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Monotonic sequence for deterministic ordering (global, but used per message).
  seq bigint GENERATED ALWAYS AS IDENTITY,

  user_id uuid NOT NULL REFERENCES auth.users(id),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,

  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS vb_message_timeline_events_seq_uq
  ON vb_message_timeline_events(seq);

CREATE INDEX IF NOT EXISTS vb_message_timeline_events_message_seq_idx
  ON vb_message_timeline_events(message_id, seq);

CREATE INDEX IF NOT EXISTS vb_message_timeline_events_conversation_seq_idx
  ON vb_message_timeline_events(conversation_id, seq);

CREATE INDEX IF NOT EXISTS vb_message_timeline_events_user_created_at_idx
  ON vb_message_timeline_events(user_id, created_at DESC);

ALTER TABLE vb_message_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own message timeline events"
  ON vb_message_timeline_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own message timeline events"
  ON vb_message_timeline_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
;
