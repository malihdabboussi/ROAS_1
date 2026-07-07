-- Durable undo/redo history for HTML-first funnel bundles.
-- V1 records page-scoped and funnel-shared source files only.

BEGIN;

CREATE TABLE IF NOT EXISTS public.funnel_change_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  funnel_page_id UUID NULL REFERENCES public.funnel_pages(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'studio',
  action TEXT NOT NULL,
  label TEXT NULL,
  status TEXT NOT NULL DEFAULT 'applied',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  undone_at TIMESTAMPTZ NULL,
  superseded_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT funnel_change_sets_source_check CHECK (
    source = ANY (ARRAY['studio'::text, 'agent'::text])
  ),
  CONSTRAINT funnel_change_sets_status_check CHECK (
    status = ANY (ARRAY['applied'::text, 'undone'::text, 'superseded'::text])
  ),
  CONSTRAINT funnel_change_sets_action_not_empty CHECK (length(trim(action)) > 0)
);

CREATE TABLE IF NOT EXISTS public.funnel_change_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_set_id UUID NOT NULL REFERENCES public.funnel_change_sets(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  funnel_page_id UUID NULL REFERENCES public.funnel_pages(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NULL,
  path TEXT NULL,
  operation TEXT NOT NULL,
  before_snapshot JSONB NULL,
  after_snapshot JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT funnel_change_items_entity_type_check CHECK (
    entity_type = ANY (ARRAY['funnel_file'::text, 'funnel_page'::text])
  ),
  CONSTRAINT funnel_change_items_operation_check CHECK (
    operation = ANY (ARRAY['insert'::text, 'update'::text, 'delete'::text])
  )
);

CREATE INDEX IF NOT EXISTS funnel_change_sets_scope_idx
  ON public.funnel_change_sets (funnel_id, funnel_page_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS funnel_change_sets_user_id_idx
  ON public.funnel_change_sets (user_id);

CREATE INDEX IF NOT EXISTS funnel_change_items_change_set_id_idx
  ON public.funnel_change_items (change_set_id);

CREATE INDEX IF NOT EXISTS funnel_change_items_scope_idx
  ON public.funnel_change_items (funnel_id, funnel_page_id, path);

ALTER TABLE public.funnel_change_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_change_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS funnel_change_sets_parent_select ON public.funnel_change_sets;
CREATE POLICY funnel_change_sets_parent_select
  ON public.funnel_change_sets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_change_sets.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'view'))
        )
    )
  );

DROP POLICY IF EXISTS funnel_change_sets_parent_insert ON public.funnel_change_sets;
CREATE POLICY funnel_change_sets_parent_insert
  ON public.funnel_change_sets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_change_sets.funnel_id
        AND f.user_id = funnel_change_sets.user_id
        AND f.org_id IS NOT DISTINCT FROM funnel_change_sets.org_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
    AND (
      funnel_change_sets.funnel_page_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.funnel_pages fp
        WHERE fp.id = funnel_change_sets.funnel_page_id
          AND fp.funnel_id = funnel_change_sets.funnel_id
      )
    )
  );

DROP POLICY IF EXISTS funnel_change_sets_parent_update ON public.funnel_change_sets;
CREATE POLICY funnel_change_sets_parent_update
  ON public.funnel_change_sets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_change_sets.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_change_sets.funnel_id
        AND f.user_id = funnel_change_sets.user_id
        AND f.org_id IS NOT DISTINCT FROM funnel_change_sets.org_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
  );

DROP POLICY IF EXISTS funnel_change_sets_parent_delete ON public.funnel_change_sets;
CREATE POLICY funnel_change_sets_parent_delete
  ON public.funnel_change_sets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_change_sets.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
  );

DROP POLICY IF EXISTS funnel_change_items_parent_select ON public.funnel_change_items;
CREATE POLICY funnel_change_items_parent_select
  ON public.funnel_change_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnel_change_sets cs
      JOIN public.funnels f ON f.id = cs.funnel_id
      WHERE cs.id = funnel_change_items.change_set_id
        AND f.id = funnel_change_items.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'view'))
        )
    )
  );

DROP POLICY IF EXISTS funnel_change_items_parent_insert ON public.funnel_change_items;
CREATE POLICY funnel_change_items_parent_insert
  ON public.funnel_change_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.funnel_change_sets cs
      JOIN public.funnels f ON f.id = cs.funnel_id
      WHERE cs.id = funnel_change_items.change_set_id
        AND f.id = funnel_change_items.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
  );

DROP POLICY IF EXISTS funnel_change_items_parent_update ON public.funnel_change_items;
CREATE POLICY funnel_change_items_parent_update
  ON public.funnel_change_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnel_change_sets cs
      JOIN public.funnels f ON f.id = cs.funnel_id
      WHERE cs.id = funnel_change_items.change_set_id
        AND f.id = funnel_change_items.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.funnel_change_sets cs
      JOIN public.funnels f ON f.id = cs.funnel_id
      WHERE cs.id = funnel_change_items.change_set_id
        AND f.id = funnel_change_items.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
  );

DROP POLICY IF EXISTS funnel_change_items_parent_delete ON public.funnel_change_items;
CREATE POLICY funnel_change_items_parent_delete
  ON public.funnel_change_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnel_change_sets cs
      JOIN public.funnels f ON f.id = cs.funnel_id
      WHERE cs.id = funnel_change_items.change_set_id
        AND f.id = funnel_change_items.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_change_sets TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_change_items TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS set_updated_at_funnel_change_sets ON public.funnel_change_sets;
CREATE TRIGGER set_updated_at_funnel_change_sets
  BEFORE UPDATE ON public.funnel_change_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
