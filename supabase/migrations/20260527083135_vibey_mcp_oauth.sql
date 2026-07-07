CREATE TABLE IF NOT EXISTS public.mcp_oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_uri TEXT,
  logo_uri TEXT,
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  grant_types TEXT[] NOT NULL DEFAULT ARRAY['authorization_code', 'refresh_token'],
  response_types TEXT[] NOT NULL DEFAULT ARRAY['code'],
  token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none'
    CHECK (token_endpoint_auth_method IN ('none', 'client_secret_basic', 'client_secret_post')),
  client_secret_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_first_party BOOLEAN NOT NULL DEFAULT false,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_clients_enabled
  ON public.mcp_oauth_clients(is_enabled);

CREATE TABLE IF NOT EXISTS public.mcp_oauth_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  org_role TEXT CHECK (org_role IN ('owner', 'admin', 'creator', 'editor', 'viewer')),
  scopes TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (client_id, user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_consents_user
  ON public.mcp_oauth_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_consents_org
  ON public.mcp_oauth_consents(org_id) WHERE org_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.mcp_oauth_authorization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  request_signature TEXT NOT NULL,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  resource TEXT NOT NULL,
  scope TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  state TEXT,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL CHECK (code_challenge_method = 'S256'),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_authorize_requests_request_id
  ON public.mcp_oauth_authorization_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_authorize_requests_client
  ON public.mcp_oauth_authorization_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_authorize_requests_expires
  ON public.mcp_oauth_authorization_requests(expires_at);

CREATE TABLE IF NOT EXISTS public.mcp_oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  consent_id UUID NOT NULL REFERENCES public.mcp_oauth_consents(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL CHECK (code_challenge_method = 'S256'),
  scopes TEXT[] NOT NULL,
  resource TEXT NOT NULL,
  state TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_codes_client
  ON public.mcp_oauth_authorization_codes(client_id);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_codes_user
  ON public.mcp_oauth_authorization_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_codes_expires
  ON public.mcp_oauth_authorization_codes(expires_at);

CREATE TABLE IF NOT EXISTS public.mcp_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token_hash TEXT UNIQUE NOT NULL,
  refresh_token_hash TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  consent_id UUID NOT NULL REFERENCES public.mcp_oauth_consents(id) ON DELETE CASCADE,
  supabase_refresh_vault_secret_id UUID REFERENCES public.vault_secrets(id) ON DELETE SET NULL,
  scopes TEXT[] NOT NULL,
  resource TEXT NOT NULL,
  access_expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_access_hash
  ON public.mcp_oauth_tokens(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_refresh_hash
  ON public.mcp_oauth_tokens(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_user
  ON public.mcp_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_org
  ON public.mcp_oauth_tokens(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_active
  ON public.mcp_oauth_tokens(access_expires_at, revoked_at);

ALTER TABLE public.mcp_oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_oauth_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_oauth_authorization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_oauth_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "MCP clients are visible when enabled" ON public.mcp_oauth_clients;
CREATE POLICY "MCP clients are visible when enabled"
  ON public.mcp_oauth_clients FOR SELECT
  TO authenticated
  USING (is_enabled = true);

DROP POLICY IF EXISTS "Users can read own MCP consents" ON public.mcp_oauth_consents;
CREATE POLICY "Users can read own MCP consents"
  ON public.mcp_oauth_consents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can revoke own MCP consents" ON public.mcp_oauth_consents;
CREATE POLICY "Users can revoke own MCP consents"
  ON public.mcp_oauth_consents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

INSERT INTO public.mcp_oauth_clients (
  client_id,
  client_name,
  client_uri,
  redirect_uris,
  token_endpoint_auth_method,
  is_first_party,
  is_enabled,
  metadata
)
VALUES (
  'vibey-local-dev',
  'Vibey Local MCP Dev Client',
  'http://localhost:3000',
  ARRAY['http://localhost:3000/oauth/callback', 'http://localhost:6274/oauth/callback'],
  'none',
  true,
  true,
  jsonb_build_object('seeded_by', '20260527083135_vibey_mcp_oauth')
)
ON CONFLICT (client_id) DO UPDATE
SET
  client_name = EXCLUDED.client_name,
  client_uri = EXCLUDED.client_uri,
  redirect_uris = EXCLUDED.redirect_uris,
  token_endpoint_auth_method = EXCLUDED.token_endpoint_auth_method,
  is_first_party = EXCLUDED.is_first_party,
  is_enabled = EXCLUDED.is_enabled,
  metadata = EXCLUDED.metadata,
  updated_at = now();
