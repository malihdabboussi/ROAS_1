-- ad_sets was missed in 20260327100001_add_org_id_to_existing_tables.sql
ALTER TABLE public.ad_sets ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_org ON public.ad_sets(org_id) WHERE org_id IS NOT NULL;
NOTIFY pgrst, 'reload schema';
