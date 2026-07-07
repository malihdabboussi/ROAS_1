BEGIN;

CREATE TABLE IF NOT EXISTS public.space_webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  public_token TEXT NOT NULL UNIQUE CHECK (char_length(public_token) BETWEEN 32 AND 160),
  vault_secret_label TEXT NOT NULL CHECK (char_length(vault_secret_label) BETWEEN 1 AND 240),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  field_mappings JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(field_mappings) = 'array'),
  sample_payload JSONB,
  last_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.space_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES public.space_webhook_endpoints(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  idempotency_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  fields JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(fields) = 'object'),
  query JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(query) = 'object'),
  headers_summary JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(headers_summary) = 'object'),
  matched_automation_ids JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(matched_automation_ids) = 'array'),
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'queued', 'processed', 'duplicate', 'ignored', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS space_webhook_events_endpoint_idempotency_unique
  ON public.space_webhook_events(endpoint_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS space_webhook_endpoints_creator_label_unique
  ON public.space_webhook_endpoints(created_by, vault_secret_label);

CREATE INDEX IF NOT EXISTS space_webhook_endpoints_space_status_idx
  ON public.space_webhook_endpoints(space_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS space_webhook_endpoints_org_idx
  ON public.space_webhook_endpoints(org_id, updated_at DESC)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS space_webhook_events_endpoint_created_idx
  ON public.space_webhook_events(endpoint_id, created_at DESC);

CREATE INDEX IF NOT EXISTS space_webhook_events_space_created_idx
  ON public.space_webhook_events(space_id, created_at DESC);

CREATE INDEX IF NOT EXISTS space_automations_webhook_endpoint_idx
  ON public.space_automations(space_id, ((trigger ->> 'webhook_endpoint_id')))
  WHERE enabled = true
    AND is_draft = false
    AND trigger ->> 'type' = 'webhook_received';

ALTER TABLE public.space_webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY space_webhook_endpoints_select ON public.space_webhook_endpoints
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY space_webhook_endpoints_write ON public.space_webhook_endpoints
  FOR ALL TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY space_webhook_events_select ON public.space_webhook_events
  FOR SELECT TO authenticated
  USING (
    (org_id IS NOT NULL AND public.is_org_member(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.space_webhook_endpoints swe
      WHERE swe.id = endpoint_id AND swe.created_by = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY space_webhook_events_write ON public.space_webhook_events
  FOR ALL TO authenticated
  USING (
    (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.space_webhook_endpoints swe
      WHERE swe.id = endpoint_id AND swe.created_by = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  )
  WITH CHECK (
    (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.space_webhook_endpoints swe
      WHERE swe.id = endpoint_id AND swe.created_by = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

DROP TRIGGER IF EXISTS set_space_webhook_endpoints_updated_at ON public.space_webhook_endpoints;
CREATE TRIGGER set_space_webhook_endpoints_updated_at
  BEFORE UPDATE ON public.space_webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
