-- Vault: encrypted credential storage for API keys, tokens, passwords
-- Used by integrations that don't support OAuth (e.g. Fireflies, custom APIs)
-- and later by agents to take actions on platforms on behalf of users.

CREATE TABLE IF NOT EXISTS vault_secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  label TEXT NOT NULL,
  secret_type TEXT NOT NULL DEFAULT 'api_key' CHECK (secret_type IN ('api_key', 'token', 'password', 'oauth_token', 'custom')),
  encrypted_value TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, label)
);

CREATE INDEX IF NOT EXISTS idx_vault_secrets_user_id ON vault_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_secrets_provider ON vault_secrets(provider);

ALTER TABLE vault_secrets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vault_secrets' AND policyname = 'Users can manage own vault secrets'
  ) THEN
    CREATE POLICY "Users can manage own vault secrets"
      ON vault_secrets FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_vault_secrets'
  ) THEN
    CREATE TRIGGER set_updated_at_vault_secrets
      BEFORE UPDATE ON vault_secrets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- Fireflies integration catalog entry

INSERT INTO integrations_available (
  id, provider, name, description, auth_type, is_available, metadata
)
VALUES (
  'fireflies',
  'fireflies',
  'Fireflies',
  'Connect Fireflies AI to sync meeting transcripts, summaries, and action items.',
  'api_key',
  true,
  jsonb_build_object('scopes', jsonb_build_array('transcripts', 'users', 'upload_audio'))
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
