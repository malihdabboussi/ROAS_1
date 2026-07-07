-- GoHighLevel integrations schema
-- Adds integration catalog + per-user OAuth tokens + lead mapping to GHL contact IDs

CREATE TABLE IF NOT EXISTS integrations_available (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  auth_type TEXT NOT NULL DEFAULT 'oauth2',
  is_available BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id TEXT NOT NULL REFERENCES integrations_available(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'disconnected')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, integration_id)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_provider ON user_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_user_integrations_status ON user_integrations(status);

ALTER TABLE integrations_available ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'integrations_available'
      AND policyname = 'Integrations catalog is readable'
  ) THEN
    CREATE POLICY "Integrations catalog is readable"
      ON integrations_available
      FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'user_integrations'
      AND policyname = 'Users can manage own integrations'
  ) THEN
    CREATE POLICY "Users can manage own integrations"
      ON user_integrations
      FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_updated_at_integrations_available'
  ) THEN
    CREATE TRIGGER set_updated_at_integrations_available
      BEFORE UPDATE ON integrations_available
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_updated_at_user_integrations'
  ) THEN
    CREATE TRIGGER set_updated_at_user_integrations
      BEFORE UPDATE ON user_integrations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

INSERT INTO integrations_available (
  id,
  provider,
  name,
  description,
  auth_type,
  is_available,
  metadata
)
VALUES (
  'gohighlevel',
  'gohighlevel',
  'GoHighLevel',
  'Connect your GoHighLevel account for OAuth-based sending and CRM sync.',
  'oauth2',
  true,
  jsonb_build_object(
    'scopes', jsonb_build_array(
      'contacts.readonly',
      'contacts.write',
      'conversations.readonly',
      'conversations.write',
      'conversations/message.readonly',
      'conversations/message.write',
      'conversations/reports.readonly',
      'conversations/livechat.write'
    )
  )
)
ON CONFLICT (id) DO UPDATE
SET
  provider = EXCLUDED.provider,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  auth_type = EXCLUDED.auth_type,
  is_available = EXCLUDED.is_available,
  metadata = EXCLUDED.metadata,
  updated_at = now();

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_ghl_contact_id ON leads(ghl_contact_id);
