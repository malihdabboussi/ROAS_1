-- Anthropic Claude admin subscription integration.
-- Visible connection state lives in user_integrations; setup tokens live encrypted in vault_secrets.

INSERT INTO public.integrations_available (
  id,
  provider,
  name,
  description,
  auth_type,
  is_available,
  metadata
)
VALUES (
  'anthropic_claude',
  'anthropic',
  'Claude Subscription',
  'Admin-only Claude subscription connection for OpenClaw runtime requests.',
  'setup_token',
  true,
  jsonb_build_object(
    'admin_only', true,
    'token_storage', 'vault_secrets',
    'token_type', 'setup_token',
    'runtime_provider', 'anthropic',
    'vault_secret_label', 'setup-token:default',
    'provider_model_prefix', 'anthropic-subscription',
    'models', jsonb_build_array(
      'anthropic-subscription/claude-opus-4-6',
      'anthropic-subscription/claude-opus-4-7',
      'anthropic-subscription/claude-opus-4-8',
      'anthropic-subscription/claude-sonnet-4-6',
      'anthropic-subscription/claude-haiku-4-5'
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

DROP POLICY IF EXISTS "Users manage personal integrations" ON public.user_integrations;
CREATE POLICY "Users manage personal integrations"
  ON public.user_integrations
  AS PERMISSIVE FOR ALL TO public
  USING (
    ((SELECT auth.uid()) = user_id)
    AND org_id IS NULL
    AND scope_mode = 'personal'::text
    AND integration_id NOT IN ('openai_codex', 'anthropic_claude')
  )
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    AND org_id IS NULL
    AND scope_mode = 'personal'::text
    AND integration_id NOT IN ('openai_codex', 'anthropic_claude')
  );

DROP POLICY IF EXISTS "Users manage org personal integrations" ON public.user_integrations;
CREATE POLICY "Users manage org personal integrations"
  ON public.user_integrations
  AS PERMISSIVE FOR ALL TO public
  USING (
    org_id IS NOT NULL
    AND scope_mode = 'personal'::text
    AND ((SELECT auth.uid()) = user_id)
    AND public.is_org_member(org_id)
    AND integration_id NOT IN ('openai_codex', 'anthropic_claude')
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND scope_mode = 'personal'::text
    AND ((SELECT auth.uid()) = user_id)
    AND public.is_org_member(org_id)
    AND integration_id NOT IN ('openai_codex', 'anthropic_claude')
  );

DROP POLICY IF EXISTS "Org admins manage org shared integrations" ON public.user_integrations;
CREATE POLICY "Org admins manage org shared integrations"
  ON public.user_integrations
  AS PERMISSIVE FOR ALL TO public
  USING (
    org_id IS NOT NULL
    AND scope_mode = 'org_shared'::text
    AND public.is_org_admin_or_owner(org_id)
    AND integration_id NOT IN ('openai_codex', 'anthropic_claude')
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND scope_mode = 'org_shared'::text
    AND public.is_org_admin_or_owner(org_id)
    AND integration_id NOT IN ('openai_codex', 'anthropic_claude')
  );

DROP POLICY IF EXISTS "Org members read org integrations" ON public.user_integrations;
CREATE POLICY "Org members read org integrations"
  ON public.user_integrations
  AS PERMISSIVE FOR SELECT TO public
  USING (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND integration_id NOT IN ('openai_codex', 'anthropic_claude')
  );

DROP POLICY IF EXISTS "Org members can write org integrations" ON public.user_integrations;
CREATE POLICY "Org members can write org integrations"
  ON public.user_integrations
  AS PERMISSIVE FOR ALL TO public
  USING (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND integration_id NOT IN ('openai_codex', 'anthropic_claude')
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND integration_id NOT IN ('openai_codex', 'anthropic_claude')
  );

DROP POLICY IF EXISTS "Platform admins manage Anthropic Claude integrations"
  ON public.user_integrations;
CREATE POLICY "Platform admins manage Anthropic Claude integrations"
  ON public.user_integrations
  AS PERMISSIVE FOR ALL TO public
  USING (
    integration_id = 'anthropic_claude'
    AND org_id IS NULL
    AND scope_mode = 'personal'::text
    AND public.is_admin()
  )
  WITH CHECK (
    integration_id = 'anthropic_claude'
    AND org_id IS NULL
    AND scope_mode = 'personal'::text
    AND public.is_admin()
  );
