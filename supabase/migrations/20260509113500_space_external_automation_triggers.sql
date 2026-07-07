CREATE TABLE IF NOT EXISTS space_external_automation_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  trigger_slug TEXT NOT NULL CHECK (trigger_slug IN ('GMAIL_NEW_GMAIL_MESSAGE', 'OUTLOOK_MESSAGE_TRIGGER')),
  connected_account_id TEXT NOT NULL,
  composio_trigger_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'error')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (space_id, automation_id),
  UNIQUE (composio_trigger_id)
);

CREATE INDEX IF NOT EXISTS idx_space_external_automation_triggers_lookup
  ON space_external_automation_triggers(composio_trigger_id)
  WHERE composio_trigger_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_space_external_automation_triggers_account
  ON space_external_automation_triggers(provider, connected_account_id, trigger_slug);

CREATE INDEX IF NOT EXISTS idx_space_external_automation_triggers_space
  ON space_external_automation_triggers(space_id);

ALTER TABLE space_external_automation_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own external automation triggers"
  ON space_external_automation_triggers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can view external automation triggers"
  ON space_external_automation_triggers FOR SELECT
  USING (org_id IN (
    SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own external automation triggers"
  ON space_external_automation_triggers FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() = created_by);

CREATE POLICY "Users can update their own external automation triggers"
  ON space_external_automation_triggers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own external automation triggers"
  ON space_external_automation_triggers FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS space_external_automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  composio_event_id TEXT NOT NULL UNIQUE,
  external_trigger_id UUID REFERENCES space_external_automation_triggers(id) ON DELETE SET NULL,
  composio_trigger_id TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  trigger_slug TEXT NOT NULL,
  connected_account_id TEXT,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  automation_id UUID,
  item_id UUID REFERENCES space_items(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id UUID,
  payload_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'duplicate', 'ignored', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_space_external_automation_events_trigger
  ON space_external_automation_events(composio_trigger_id);

CREATE INDEX IF NOT EXISTS idx_space_external_automation_events_space
  ON space_external_automation_events(space_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_space_external_automation_events_status
  ON space_external_automation_events(status, created_at DESC);

ALTER TABLE space_external_automation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own external automation events"
  ON space_external_automation_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can view external automation events"
  ON space_external_automation_events FOR SELECT
  USING (org_id IN (
    SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
  ));
