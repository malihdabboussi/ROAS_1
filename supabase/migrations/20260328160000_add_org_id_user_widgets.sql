-- Widget library: scope rows to org when present (nullable = personal)
ALTER TABLE public.user_widgets ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.user_widget_folders ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_user_widgets_org ON public.user_widgets(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_widget_folders_org ON public.user_widget_folders(org_id) WHERE org_id IS NOT NULL;
