-- Email artifacts: one-off draft emails created by agents and linked to space tasks.

CREATE TABLE IF NOT EXISTS public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft')),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  source_item_id UUID REFERENCES public.space_items(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emails_user ON public.emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_org ON public.emails(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_campaign ON public.emails(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_space ON public.emails(space_id);
CREATE INDEX IF NOT EXISTS idx_emails_source_item ON public.emails(source_item_id) WHERE source_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON public.emails(created_at DESC);

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_emails_all ON public.emails;
CREATE POLICY owner_emails_all ON public.emails FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS org_emails_all ON public.emails;
CREATE POLICY org_emails_all ON public.emails FOR ALL
  USING (org_id IS NOT NULL AND public.is_org_member(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_org_member(org_id));

DROP POLICY IF EXISTS shared_task_emails_select ON public.emails;
CREATE POLICY shared_task_emails_select ON public.emails FOR SELECT
  USING (
    source_item_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.space_items si
      WHERE si.id = public.emails.source_item_id
        AND si.space_id = public.emails.space_id
    )
  );

DROP TRIGGER IF EXISTS set_updated_at_emails ON public.emails;
CREATE TRIGGER set_updated_at_emails
  BEFORE UPDATE ON public.emails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
        AND n.nspname = 'public'
        AND c.relname = 'emails'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;
    END IF;
  END IF;
END
$$;
