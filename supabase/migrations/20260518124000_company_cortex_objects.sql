CREATE TABLE IF NOT EXISTS public.company_cortex_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brain_id uuid NOT NULL REFERENCES public.ns_brains(id) ON DELETE CASCADE,
  object_type text NOT NULL,
  title text NOT NULL,
  truth text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  confidence numeric NOT NULL DEFAULT 0.5,
  source_signal_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  retrieval_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (object_type IN (
    'belief',
    'perspective',
    'tension',
    'standard',
    'move',
    'anti_pattern',
    'protocol',
    'decision',
    'retrieval_rule'
  )),
  CHECK (status IN ('emerging', 'active', 'challenged', 'transforming', 'retired')),
  CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_company_cortex_objects_brain_type_status
  ON public.company_cortex_objects (brain_id, object_type, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_cortex_objects_org_status
  ON public.company_cortex_objects (org_id, status, updated_at DESC);

ALTER TABLE public.company_cortex_objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_cortex_objects_org_read ON public.company_cortex_objects;
CREATE POLICY company_cortex_objects_org_read ON public.company_cortex_objects
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS company_cortex_objects_org_admin_write ON public.company_cortex_objects;
CREATE POLICY company_cortex_objects_org_admin_write ON public.company_cortex_objects
  FOR ALL TO authenticated
  USING (public.is_org_admin_or_owner(org_id))
  WITH CHECK (public.is_org_admin_or_owner(org_id));

DROP POLICY IF EXISTS company_cortex_objects_service_all ON public.company_cortex_objects;
CREATE POLICY company_cortex_objects_service_all ON public.company_cortex_objects
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS set_updated_at_company_cortex_objects ON public.company_cortex_objects;
CREATE TRIGGER set_updated_at_company_cortex_objects
  BEFORE UPDATE ON public.company_cortex_objects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
