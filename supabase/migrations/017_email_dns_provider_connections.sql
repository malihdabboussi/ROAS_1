-- Email DNS Provider Connections
-- Stores per-user OAuth credentials for DNS automation

CREATE TABLE IF NOT EXISTS email_dns_provider_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('cloudflare')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_email_dns_provider_connections_user_id
  ON email_dns_provider_connections(user_id);

ALTER TABLE email_dns_provider_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dns provider connections"
  ON email_dns_provider_connections
  FOR ALL USING (auth.uid() = user_id);

