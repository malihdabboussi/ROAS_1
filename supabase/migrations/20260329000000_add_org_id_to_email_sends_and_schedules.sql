-- Add org_id to email_sends and email_single_schedules for org-scoped email logs
ALTER TABLE public.email_sends ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.email_single_schedules ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_email_sends_org ON public.email_sends(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_single_schedules_org ON public.email_single_schedules(org_id) WHERE org_id IS NOT NULL;
