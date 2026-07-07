-- Add org_id to email tables that are missing it for proper org scoping
ALTER TABLE public.email_broadcast_schedules ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.broadcast_email_sends ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.email_suppressions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.sequence_email_sends ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.email_pending_sends ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_email_broadcast_schedules_org ON public.email_broadcast_schedules(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcast_email_sends_org ON public.broadcast_email_sends(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_suppressions_org ON public.email_suppressions(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sequence_email_sends_org ON public.sequence_email_sends(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_pending_sends_org ON public.email_pending_sends(org_id) WHERE org_id IS NOT NULL;
