-- ============================================================
-- 1. ADD org_id TO MISSION SUB-TABLES (missed in 20260327100001)
-- ============================================================

ALTER TABLE public.missions_logs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.missions_plans ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.mission_subtasks ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.mission_deliverables ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.mission_outbox ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.campaign_agents ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.agent_awareness_points ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.agent_awareness_sessions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_missions_logs_org ON public.missions_logs(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mission_subtasks_org ON public.mission_subtasks(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mission_outbox_org ON public.mission_outbox(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_agents_org ON public.campaign_agents(org_id) WHERE org_id IS NOT NULL;

-- ============================================================
-- 2. FIX org_members RLS infinite recursion (42P17)
--    "Members can read co-members" queries org_members inside
--    an RLS check on org_members itself.
--    Fix: use a SECURITY DEFINER function to bypass RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_active_org_member_of(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
$$;

DROP POLICY IF EXISTS "Members can read co-members" ON public.org_members;
DROP POLICY IF EXISTS "Members can read co-members in same org" ON public.org_members;

CREATE POLICY "Members can read co-members in same org"
  ON public.org_members FOR SELECT
  USING (public.is_active_org_member_of(org_id));

-- Owner needs INSERT/UPDATE/DELETE on org_members for creation + management
CREATE POLICY "Org owner can add members"
  ON public.org_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = org_members.org_id
        AND organizations.owner_id = auth.uid()
        AND organizations.status = 'active'
    )
  );

CREATE POLICY "Org owner can update members"
  ON public.org_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = org_members.org_id
        AND organizations.owner_id = auth.uid()
        AND organizations.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = org_members.org_id
        AND organizations.owner_id = auth.uid()
        AND organizations.status = 'active'
    )
  );

CREATE POLICY "Org owner can delete members"
  ON public.org_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = org_members.org_id
        AND organizations.owner_id = auth.uid()
        AND organizations.status = 'active'
    )
  );
