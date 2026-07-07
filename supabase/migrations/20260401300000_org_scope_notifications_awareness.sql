-- Phase 1a: Add org_id to agent_signals
ALTER TABLE public.agent_signals
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
CREATE INDEX IF NOT EXISTS idx_agent_signals_org
  ON public.agent_signals(org_id) WHERE org_id IS NOT NULL;

-- Phase 1b: Personal-row RLS policies (org_id IS NULL)
-- user_notifications
CREATE POLICY "Owner can read personal user_notifications"
  ON public.user_notifications FOR SELECT TO public
  USING (org_id IS NULL AND user_id = auth.uid());
CREATE POLICY "Owner can write personal user_notifications"
  ON public.user_notifications FOR ALL TO public
  USING (org_id IS NULL AND user_id = auth.uid());

-- agent_awareness_points
CREATE POLICY "Owner can read personal agent_awareness_points"
  ON public.agent_awareness_points FOR SELECT TO public
  USING (org_id IS NULL AND user_id = auth.uid());
CREATE POLICY "Owner can write personal agent_awareness_points"
  ON public.agent_awareness_points FOR ALL TO public
  USING (org_id IS NULL AND user_id = auth.uid());

-- agent_awareness_sessions
CREATE POLICY "Owner can read personal agent_awareness_sessions"
  ON public.agent_awareness_sessions FOR SELECT TO public
  USING (org_id IS NULL AND user_id = auth.uid());
CREATE POLICY "Owner can write personal agent_awareness_sessions"
  ON public.agent_awareness_sessions FOR ALL TO public
  USING (org_id IS NULL AND user_id = auth.uid());

-- agent_signals (enable RLS + personal + org policies)
ALTER TABLE public.agent_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can read personal agent_signals"
  ON public.agent_signals FOR SELECT TO public
  USING (org_id IS NULL AND user_id = auth.uid());
CREATE POLICY "Owner can write personal agent_signals"
  ON public.agent_signals FOR ALL TO public
  USING (org_id IS NULL AND user_id = auth.uid());
CREATE POLICY "Org members can read org agent_signals"
  ON public.agent_signals FOR SELECT TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));
CREATE POLICY "Org members can write org agent_signals"
  ON public.agent_signals FOR ALL TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));

-- Org-member RLS for agent_awareness_sessions (was missing)
CREATE POLICY "Org members can read org agent_awareness_sessions"
  ON public.agent_awareness_sessions FOR SELECT TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));
CREATE POLICY "Org members can write org agent_awareness_sessions"
  ON public.agent_awareness_sessions FOR ALL TO public
  USING ((org_id IS NOT NULL) AND is_org_member(org_id));

-- Phase 1c: Backfill existing rows
UPDATE public.user_notifications un
  SET org_id = m.org_id
  FROM public.missions m
  WHERE un.mission_id = m.id
    AND un.org_id IS NULL
    AND m.org_id IS NOT NULL;

UPDATE public.agent_awareness_points ap
  SET org_id = ar.org_id
  FROM public.agents_registry ar
  WHERE ap.agent_key = ar.agent_key
    AND ap.user_id = ar.user_id
    AND ap.org_id IS NULL
    AND ar.org_id IS NOT NULL;
