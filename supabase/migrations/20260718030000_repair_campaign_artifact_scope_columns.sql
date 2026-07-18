-- Repair columns referenced by artifact actions and indexes but omitted by the
-- original campaign artifact scope migrations.

ALTER TABLE public.funnels
  ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;

ALTER TABLE public.presentations
  ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;

ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_funnels_space_id
  ON public.funnels(space_id) WHERE space_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presentations_space_id
  ON public.presentations(space_id) WHERE space_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ads_org_id
  ON public.ads(org_id) WHERE org_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
