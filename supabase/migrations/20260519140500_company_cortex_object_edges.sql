CREATE TABLE IF NOT EXISTS public.company_cortex_object_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brain_id uuid NOT NULL REFERENCES public.ns_brains(id) ON DELETE CASCADE,
  source_object_id uuid NOT NULL REFERENCES public.company_cortex_objects(id) ON DELETE CASCADE,
  target_object_id uuid NOT NULL REFERENCES public.company_cortex_objects(id) ON DELETE CASCADE,
  relation_type text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.5,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (relation_type IN (
    'supports',
    'contradicts',
    'contains',
    'enforces',
    'derived_from',
    'refines'
  )),
  CHECK (confidence >= 0 AND confidence <= 1),
  CHECK (source_object_id <> target_object_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_cortex_object_edges_unique_relation
  ON public.company_cortex_object_edges (source_object_id, target_object_id, relation_type);

CREATE INDEX IF NOT EXISTS idx_company_cortex_object_edges_brain_source
  ON public.company_cortex_object_edges (brain_id, source_object_id);

CREATE INDEX IF NOT EXISTS idx_company_cortex_object_edges_brain_target
  ON public.company_cortex_object_edges (brain_id, target_object_id);

ALTER TABLE public.company_cortex_object_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_cortex_object_edges_org_read ON public.company_cortex_object_edges;
CREATE POLICY company_cortex_object_edges_org_read ON public.company_cortex_object_edges
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS company_cortex_object_edges_org_admin_write ON public.company_cortex_object_edges;
CREATE POLICY company_cortex_object_edges_org_admin_write ON public.company_cortex_object_edges
  FOR ALL TO authenticated
  USING (public.is_org_admin_or_owner(org_id))
  WITH CHECK (public.is_org_admin_or_owner(org_id));

DROP POLICY IF EXISTS company_cortex_object_edges_service_all ON public.company_cortex_object_edges;
CREATE POLICY company_cortex_object_edges_service_all ON public.company_cortex_object_edges
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS set_updated_at_company_cortex_object_edges ON public.company_cortex_object_edges;
CREATE TRIGGER set_updated_at_company_cortex_object_edges
  BEFORE UPDATE ON public.company_cortex_object_edges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
