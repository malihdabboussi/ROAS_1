ALTER TABLE public.user_addons
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_user_addons_org ON public.user_addons (org_id);
