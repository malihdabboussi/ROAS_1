BEGIN;

ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_space_item_id UUID REFERENCES public.space_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mission_visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (mission_visibility IN ('private', 'space', 'shared', 'campaign'));

CREATE INDEX IF NOT EXISTS idx_missions_space_updated
  ON public.missions(space_id, updated_at DESC)
  WHERE space_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_missions_visibility
  ON public.missions(mission_visibility);

CREATE TABLE IF NOT EXISTS public.mission_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'org')),
  entity_id UUID NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('view', 'comment', 'edit', 'admin')),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mission_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_mission_shares_mission_id
  ON public.mission_shares(mission_id);

CREATE INDEX IF NOT EXISTS idx_mission_shares_entity
  ON public.mission_shares(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_mission_shares_org_id
  ON public.mission_shares(org_id);

ALTER TABLE public.mission_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read mission shares" ON public.mission_shares;
CREATE POLICY "Users can read mission shares"
  ON public.mission_shares FOR SELECT TO public
  USING (
    auth.uid() = created_by
    OR (entity_type = 'user' AND entity_id = auth.uid())
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );

DROP POLICY IF EXISTS "Users can insert mission shares" ON public.mission_shares;
CREATE POLICY "Users can insert mission shares"
  ON public.mission_shares FOR INSERT TO public
  WITH CHECK (
    auth.uid() = created_by
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );

DROP POLICY IF EXISTS "Users can update mission shares" ON public.mission_shares;
CREATE POLICY "Users can update mission shares"
  ON public.mission_shares FOR UPDATE TO public
  USING (
    auth.uid() = created_by
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  )
  WITH CHECK (
    auth.uid() = created_by
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );

DROP POLICY IF EXISTS "Users can delete mission shares" ON public.mission_shares;
CREATE POLICY "Users can delete mission shares"
  ON public.mission_shares FOR DELETE TO public
  USING (
    auth.uid() = created_by
    OR (org_id IS NOT NULL AND is_org_member(org_id))
  );

DROP POLICY IF EXISTS "Org members can read org missions" ON public.missions;
DROP POLICY IF EXISTS "Org members can write org missions" ON public.missions;
DROP POLICY IF EXISTS org_missions_view ON public.missions;
DROP POLICY IF EXISTS "Org members can read org missions_logs" ON public.missions_logs;
DROP POLICY IF EXISTS "Org members can write org missions_logs" ON public.missions_logs;
DROP POLICY IF EXISTS "Org members can read org missions_plans" ON public.missions_plans;
DROP POLICY IF EXISTS "Org members can write org missions_plans" ON public.missions_plans;
DROP POLICY IF EXISTS "Org members can read org mission_subtasks" ON public.mission_subtasks;
DROP POLICY IF EXISTS "Org members can write org mission_subtasks" ON public.mission_subtasks;
DROP POLICY IF EXISTS "Org members can read org mission_deliverables" ON public.mission_deliverables;
DROP POLICY IF EXISTS "Org members can write org mission_deliverables" ON public.mission_deliverables;

CREATE POLICY "Users can read explicitly shared missions"
  ON public.missions FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.mission_shares ms
      WHERE ms.mission_id = missions.id
        AND (
          (ms.entity_type = 'user' AND ms.entity_id = auth.uid())
          OR (
            ms.entity_type = 'org'
            AND missions.org_id IS NOT NULL
            AND ms.entity_id = missions.org_id
            AND is_org_member(missions.org_id)
          )
        )
    )
  );

CREATE POLICY "Users can read space visible missions"
  ON public.missions FOR SELECT TO public
  USING (
    mission_visibility = 'space'
    AND space_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.spaces s
      WHERE s.id = missions.space_id
        AND (
          s.user_id = auth.uid()
          OR (
            s.visibility = 'team'
            AND s.org_id IS NOT NULL
            AND is_org_member(s.org_id)
          )
          OR EXISTS (
            SELECT 1
            FROM public.space_shares ss
            WHERE ss.space_id = s.id
              AND (
                (ss.entity_type = 'user' AND ss.entity_id = auth.uid())
                OR (
                  ss.entity_type = 'org'
                  AND s.org_id IS NOT NULL
                  AND ss.entity_id = s.org_id
                  AND is_org_member(s.org_id)
                )
              )
          )
        )
    )
  );

CREATE POLICY "Users can read campaign visible missions"
  ON public.missions FOR SELECT TO public
  USING (
    mission_visibility = 'campaign'
    AND campaign_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.campaigns c
      JOIN public.org_members om ON om.org_id = c.org_id
      WHERE c.id = missions.campaign_id
        AND c.org_id IS NOT NULL
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

COMMIT;
