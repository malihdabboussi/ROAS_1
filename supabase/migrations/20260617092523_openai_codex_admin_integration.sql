-- OpenAI Codex admin subscription integration.
-- Visible connection state lives in user_integrations; OAuth tokens live encrypted in vault_secrets.

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
  'openai_codex',
  'openai-codex',
  'OpenAI Codex',
  'Admin-only ChatGPT Plus/Pro Codex subscription connection for OpenClaw runtime requests.',
  'oauth2_manual',
  true,
  jsonb_build_object(
    'admin_only', true,
    'token_storage', 'vault_secrets',
    'provider_model_prefix', 'openai-codex',
    'models', jsonb_build_array(
      'openai-codex/gpt-5.3-codex',
      'openai-codex/gpt-5.5',
      'openai-codex/gpt-5.5-codex'
    ),
    'scopes', jsonb_build_array('openid', 'profile', 'email', 'offline_access')
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
    AND integration_id <> 'openai_codex'
  )
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    AND org_id IS NULL
    AND scope_mode = 'personal'::text
    AND integration_id <> 'openai_codex'
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
    AND integration_id <> 'openai_codex'
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND scope_mode = 'personal'::text
    AND ((SELECT auth.uid()) = user_id)
    AND public.is_org_member(org_id)
    AND integration_id <> 'openai_codex'
  );

DROP POLICY IF EXISTS "Org admins manage org shared integrations" ON public.user_integrations;
CREATE POLICY "Org admins manage org shared integrations"
  ON public.user_integrations
  AS PERMISSIVE FOR ALL TO public
  USING (
    org_id IS NOT NULL
    AND scope_mode = 'org_shared'::text
    AND public.is_org_admin_or_owner(org_id)
    AND integration_id <> 'openai_codex'
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND scope_mode = 'org_shared'::text
    AND public.is_org_admin_or_owner(org_id)
    AND integration_id <> 'openai_codex'
  );

DROP POLICY IF EXISTS "Org members read org integrations" ON public.user_integrations;
CREATE POLICY "Org members read org integrations"
  ON public.user_integrations
  AS PERMISSIVE FOR SELECT TO public
  USING (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND integration_id <> 'openai_codex'
  );

DROP POLICY IF EXISTS "Org members can write org integrations" ON public.user_integrations;
CREATE POLICY "Org members can write org integrations"
  ON public.user_integrations
  AS PERMISSIVE FOR ALL TO public
  USING (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND integration_id <> 'openai_codex'
  )
  WITH CHECK (
    org_id IS NOT NULL
    AND public.is_org_member(org_id)
    AND integration_id <> 'openai_codex'
  );

DROP POLICY IF EXISTS "Platform admins manage OpenAI Codex integrations" ON public.user_integrations;
CREATE POLICY "Platform admins manage OpenAI Codex integrations"
  ON public.user_integrations
  AS PERMISSIVE FOR ALL TO public
  USING (
    integration_id = 'openai_codex'
    AND public.is_admin()
  )
  WITH CHECK (
    integration_id = 'openai_codex'
    AND public.is_admin()
  );
