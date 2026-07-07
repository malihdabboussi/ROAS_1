-- Contact CRM: field-change audit rows for activity timeline (mirrors task field_change pattern)

CREATE TABLE IF NOT EXISTS public.contact_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  event_type TEXT NOT NULL DEFAULT 'field_change' CHECK (event_type IN ('field_change')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_activity_contact_created
  ON public.contact_activity(contact_id, created_at ASC);

ALTER TABLE public.contact_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read contact activity in their org or personal"
  ON public.contact_activity FOR SELECT
  USING (
    (org_id IS NOT NULL AND org_id IN (SELECT om.org_id FROM public.org_members om WHERE om.user_id = auth.uid()))
    OR
    (org_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert contact activity in their org or personal"
  ON public.contact_activity FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (org_id IS NOT NULL AND org_id IN (SELECT om.org_id FROM public.org_members om WHERE om.user_id = auth.uid()))
      OR
      (org_id IS NULL)
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_activity;
