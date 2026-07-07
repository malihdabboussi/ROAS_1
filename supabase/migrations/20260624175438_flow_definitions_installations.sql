BEGIN;

CREATE TABLE IF NOT EXISTS public.flow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'archived')),
  current_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flow_definition_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_definition_id UUID NOT NULL REFERENCES public.flow_definitions(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (flow_definition_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.flow_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_definition_id UUID NOT NULL REFERENCES public.flow_definitions(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES public.space_automations(id) ON DELETE SET NULL,
  version_id UUID REFERENCES public.flow_definition_versions(id) ON DELETE SET NULL,
  installed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  validation_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (validation_status IN ('unknown', 'healthy', 'needs_setup', 'invalid')),
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  field_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (flow_definition_id, space_id)
);

ALTER TABLE public.flow_definitions
  ADD CONSTRAINT flow_definitions_current_version_id_fkey
  FOREIGN KEY (current_version_id)
  REFERENCES public.flow_definition_versions(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS flow_installations_automation_id_unique
  ON public.flow_installations(automation_id)
  WHERE automation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS flow_definitions_org_idx
  ON public.flow_definitions(org_id, updated_at DESC)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS flow_definition_versions_definition_idx
  ON public.flow_definition_versions(flow_definition_id, version_number DESC);

CREATE INDEX IF NOT EXISTS flow_installations_definition_idx
  ON public.flow_installations(flow_definition_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS flow_installations_space_idx
  ON public.flow_installations(space_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS flow_installations_org_idx
  ON public.flow_installations(org_id, updated_at DESC)
  WHERE org_id IS NOT NULL;

ALTER TABLE public.space_automations
  ADD COLUMN IF NOT EXISTS flow_definition_id UUID REFERENCES public.flow_definitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS flow_installation_id UUID REFERENCES public.flow_installations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS flow_version_id UUID REFERENCES public.flow_definition_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS space_automations_flow_definition_idx
  ON public.space_automations(flow_definition_id)
  WHERE flow_definition_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS space_automations_flow_installation_idx
  ON public.space_automations(flow_installation_id)
  WHERE flow_installation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ensure_flow_installation_for_space_automation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_definition_id UUID;
  v_version_id UUID;
  v_installation_id UUID;
BEGIN
  IF NEW.flow_installation_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NEW.org_id, s.org_id)
  INTO v_org_id
  FROM public.spaces s
  WHERE s.id = NEW.space_id;

  v_definition_id := NEW.flow_definition_id;
  v_version_id := NEW.flow_version_id;

  IF v_definition_id IS NULL THEN
    v_definition_id := gen_random_uuid();
    v_version_id := gen_random_uuid();

    INSERT INTO public.flow_definitions (
      id,
      org_id,
      created_by,
      name,
      description,
      trigger,
      actions,
      status,
      created_at,
      updated_at
    )
    VALUES (
      v_definition_id,
      v_org_id,
      NEW.created_by,
      NEW.name,
      NEW.description,
      NEW.trigger,
      NEW.actions,
      CASE WHEN NEW.is_draft THEN 'draft' ELSE 'active' END,
      NEW.created_at,
      NEW.updated_at
    );

    INSERT INTO public.flow_definition_versions (
      id,
      flow_definition_id,
      org_id,
      created_by,
      version_number,
      snapshot,
      change_note,
      created_at
    )
    VALUES (
      v_version_id,
      v_definition_id,
      v_org_id,
      NEW.created_by,
      1,
      jsonb_build_object(
        'name', NEW.name,
        'description', NEW.description,
        'trigger', NEW.trigger,
        'actions', NEW.actions
      ),
      'Created from Space automation',
      NEW.created_at
    );

    UPDATE public.flow_definitions
    SET current_version_id = v_version_id
    WHERE id = v_definition_id;
  ELSIF v_version_id IS NULL THEN
    SELECT current_version_id
    INTO v_version_id
    FROM public.flow_definitions
    WHERE id = v_definition_id;
  END IF;

  INSERT INTO public.flow_installations (
    flow_definition_id,
    org_id,
    space_id,
    automation_id,
    version_id,
    installed_by,
    enabled,
    validation_status,
    created_at,
    updated_at
  )
  VALUES (
    v_definition_id,
    v_org_id,
    NEW.space_id,
    NEW.id,
    v_version_id,
    NEW.created_by,
    NEW.enabled,
    'unknown',
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (flow_definition_id, space_id)
  DO UPDATE SET
    automation_id = EXCLUDED.automation_id,
    version_id = COALESCE(EXCLUDED.version_id, flow_installations.version_id),
    enabled = EXCLUDED.enabled,
    updated_at = EXCLUDED.updated_at
  RETURNING id INTO v_installation_id;

  UPDATE public.space_automations
  SET
    flow_definition_id = v_definition_id,
    flow_installation_id = v_installation_id,
    flow_version_id = v_version_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_flow_installation_for_space_automation()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_flow_installation_for_space_automation()
  TO authenticated;

DROP TRIGGER IF EXISTS ensure_flow_installation_after_insert ON public.space_automations;
CREATE TRIGGER ensure_flow_installation_after_insert
  AFTER INSERT ON public.space_automations
  FOR EACH ROW EXECUTE FUNCTION public.ensure_flow_installation_for_space_automation();

ALTER TABLE public.flow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_definition_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY flow_definitions_select ON public.flow_definitions
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY flow_definitions_write ON public.flow_definitions
  FOR ALL TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY flow_definition_versions_select ON public.flow_definition_versions
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY flow_definition_versions_write ON public.flow_definition_versions
  FOR ALL TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY flow_installations_select ON public.flow_installations
  FOR SELECT TO authenticated
  USING (
    installed_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE POLICY flow_installations_write ON public.flow_installations
  FOR ALL TO authenticated
  USING (
    installed_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  )
  WITH CHECK (
    installed_by = (SELECT auth.uid())
    OR (org_id IS NOT NULL AND public.is_org_admin_or_owner(org_id))
    OR (org_id IS NOT NULL AND public.has_space_write_access(space_id, org_id))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
    )
  );

CREATE TRIGGER set_flow_definitions_updated_at
  BEFORE UPDATE ON public.flow_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_flow_installations_updated_at
  BEFORE UPDATE ON public.flow_installations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TEMP TABLE flow_installation_backfill_map ON COMMIT DROP AS
  SELECT
    sa.id AS automation_id,
    sa.space_id,
    sa.created_by,
    sa.name,
    sa.description,
    sa.trigger,
    sa.actions,
    sa.enabled,
    sa.is_draft,
    sa.created_at,
    sa.updated_at,
    COALESCE(sa.org_id, s.org_id) AS resolved_org_id,
    gen_random_uuid() AS definition_id,
    gen_random_uuid() AS version_id,
    gen_random_uuid() AS installation_id
  FROM public.space_automations sa
  JOIN public.spaces s ON s.id = sa.space_id
  WHERE sa.flow_definition_id IS NULL;

INSERT INTO public.flow_definitions (
  id,
  org_id,
  created_by,
  name,
  description,
  trigger,
  actions,
  status,
  created_at,
  updated_at
)
SELECT
  definition_id,
  resolved_org_id,
  created_by,
  name,
  description,
  trigger,
  actions,
  CASE WHEN is_draft THEN 'draft' ELSE 'active' END,
  created_at,
  updated_at
FROM flow_installation_backfill_map;

INSERT INTO public.flow_definition_versions (
  id,
  flow_definition_id,
  org_id,
  created_by,
  version_number,
  snapshot,
  change_note,
  created_at
)
SELECT
  version_id,
  definition_id,
  resolved_org_id,
  created_by,
  1,
  jsonb_build_object(
    'name', name,
    'description', description,
    'trigger', trigger,
    'actions', actions
  ),
  'Backfilled from existing Space automation',
  created_at
FROM flow_installation_backfill_map;

UPDATE public.flow_definitions fd
SET current_version_id = source.version_id
FROM flow_installation_backfill_map source
WHERE fd.id = source.definition_id;

INSERT INTO public.flow_installations (
  id,
  flow_definition_id,
  org_id,
  space_id,
  automation_id,
  version_id,
  installed_by,
  enabled,
  validation_status,
  created_at,
  updated_at
)
SELECT
  installation_id,
  definition_id,
  resolved_org_id,
  space_id,
  automation_id,
  version_id,
  created_by,
  enabled,
  'unknown',
  created_at,
  updated_at
FROM flow_installation_backfill_map;

UPDATE public.space_automations sa
SET
  flow_definition_id = source.definition_id,
  flow_installation_id = source.installation_id,
  flow_version_id = source.version_id
FROM flow_installation_backfill_map source
WHERE sa.id = source.automation_id;

COMMIT;
