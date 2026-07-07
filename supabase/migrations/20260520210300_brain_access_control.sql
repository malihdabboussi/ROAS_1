-- Brain access control: explicit user/org/team shares and hard train rules.

ALTER TABLE public.ns_brains
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

UPDATE public.ns_brains b
SET created_by = COALESCE(b.created_by, a.created_by, b.owner_id)
FROM public.agents_registry a
WHERE b.scope = 'agent'
  AND b.agent_id = a.agent_key
  AND (
    (b.org_id IS NOT NULL AND a.org_id = b.org_id)
    OR (b.org_id IS NULL AND a.user_id = b.owner_id)
  );

UPDATE public.ns_brains b
SET owner_id = owner_row.user_id,
    created_by = COALESCE(b.created_by, owner_row.user_id)
FROM (
  SELECT DISTINCT ON (org_id) org_id, user_id
  FROM public.org_members
  WHERE status = 'active' AND role = 'owner'
  ORDER BY org_id, created_at ASC
) owner_row
WHERE b.org_id = owner_row.org_id
  AND b.scope IN ('customer', 'company');

UPDATE public.ns_brains
SET created_by = COALESCE(created_by, owner_id)
WHERE created_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_ns_brains_created_by
  ON public.ns_brains (created_by)
  WHERE created_by IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.brain_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES public.ns_brains(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('user', 'org', 'team')),
  entity_id uuid NOT NULL,
  level text NOT NULL DEFAULT 'query' CHECK (level IN ('view', 'query', 'train')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brain_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_brain_shares_brain
  ON public.brain_shares (brain_id);
CREATE INDEX IF NOT EXISTS idx_brain_shares_org
  ON public.brain_shares (org_id)
  WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brain_shares_entity
  ON public.brain_shares (entity_type, entity_id);

INSERT INTO public.brain_shares (brain_id, org_id, entity_type, entity_id, level, created_by, created_at)
SELECT brain_id,
       org_id,
       'org',
       org_id,
       CASE WHEN permission = 'view' THEN 'view' ELSE 'query' END,
       shared_by,
       created_at
FROM public.org_brain_sharing
ON CONFLICT (brain_id, entity_type, entity_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.brain_share_level_weight(p_level text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_level
    WHEN 'train' THEN 3
    WHEN 'query' THEN 2
    WHEN 'view' THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_brain(
  p_brain_id uuid,
  p_min_level text DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brain record;
  v_role text;
  v_required integer := public.brain_share_level_weight(p_min_level);
  v_baseline integer := 0;
  v_share integer := 0;
  v_effective integer := 0;
  v_can_hard_train boolean := false;
BEGIN
  IF (SELECT auth.role()) = 'service_role' THEN
    RETURN true;
  END IF;

  SELECT id, owner_id, org_id, scope, agent_id, created_by
  INTO v_brain
  FROM public.ns_brains
  WHERE id = p_brain_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_brain.org_id IS NULL THEN
    IF v_brain.owner_id = (SELECT auth.uid()) THEN
      v_baseline := 3;
      v_can_hard_train := true;
    END IF;
  ELSE
    SELECT role
    INTO v_role
    FROM public.org_members
    WHERE org_id = v_brain.org_id
      AND user_id = (SELECT auth.uid())
      AND status = 'active'
    LIMIT 1;

    IF v_role IS NULL OR v_role = 'viewer' THEN
      RETURN false;
    END IF;

    IF v_role IN ('owner', 'admin') THEN
      v_baseline := 3;
      v_can_hard_train := true;
    ELSIF v_brain.scope = 'agent' THEN
      IF v_brain.created_by = (SELECT auth.uid()) OR v_brain.owner_id = (SELECT auth.uid()) THEN
        v_baseline := 3;
        v_can_hard_train := true;
      ELSE
        v_baseline := 2;
      END IF;
    ELSIF v_brain.scope IN ('customer', 'company') THEN
      v_baseline := 2;
    ELSIF v_brain.scope = 'user' THEN
      IF v_brain.owner_id = (SELECT auth.uid()) THEN
        v_baseline := 3;
        v_can_hard_train := true;
      END IF;
    ELSE
      v_baseline := 2;
    END IF;
  END IF;

  SELECT COALESCE(MAX(public.brain_share_level_weight(bs.level)), 0)
  INTO v_share
  FROM public.brain_shares bs
  LEFT JOIN public.agent_team_members tm
    ON bs.entity_type = 'team'
   AND tm.team_id = bs.entity_id
   AND tm.user_id = (SELECT auth.uid())
  WHERE bs.brain_id = p_brain_id
    AND (
      (bs.entity_type = 'user' AND bs.entity_id = (SELECT auth.uid()))
      OR (bs.entity_type = 'org' AND v_brain.org_id IS NOT NULL AND bs.entity_id = v_brain.org_id)
      OR (bs.entity_type = 'team' AND tm.user_id IS NOT NULL)
    );

  v_effective := GREATEST(v_baseline, v_share);

  IF v_required >= 3 AND NOT v_can_hard_train THEN
    RETURN false;
  END IF;

  RETURN v_effective >= v_required;
END;
$$;

ALTER TABLE public.brain_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_shares_read ON public.brain_shares;
CREATE POLICY brain_shares_read
  ON public.brain_shares FOR SELECT TO authenticated
  USING (public.can_access_brain(brain_id, 'view'));

DROP POLICY IF EXISTS brain_shares_manage ON public.brain_shares;
CREATE POLICY brain_shares_manage
  ON public.brain_shares FOR ALL TO authenticated
  USING (public.can_access_brain(brain_id, 'train'))
  WITH CHECK (public.can_access_brain(brain_id, 'train'));

DROP POLICY IF EXISTS brain_shares_service_all ON public.brain_shares;
CREATE POLICY brain_shares_service_all
  ON public.brain_shares FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "ns_brains_own" ON public.ns_brains;
DROP POLICY IF EXISTS "Org members can read org brains" ON public.ns_brains;
DROP POLICY IF EXISTS "Org members can write org brains" ON public.ns_brains;
DROP POLICY IF EXISTS ns_brains_access_select ON public.ns_brains;
DROP POLICY IF EXISTS ns_brains_owner_insert ON public.ns_brains;
DROP POLICY IF EXISTS ns_brains_train_update ON public.ns_brains;
DROP POLICY IF EXISTS ns_brains_train_delete ON public.ns_brains;

CREATE POLICY ns_brains_access_select
  ON public.ns_brains FOR SELECT TO authenticated
  USING (public.can_access_brain(id, 'view'));

CREATE POLICY ns_brains_owner_insert
  ON public.ns_brains FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND (
      org_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.org_members om
        WHERE om.org_id = ns_brains.org_id
          AND om.user_id = (SELECT auth.uid())
          AND om.status = 'active'
          AND om.role <> 'viewer'
      )
    )
  );

CREATE POLICY ns_brains_train_update
  ON public.ns_brains FOR UPDATE TO authenticated
  USING (public.can_access_brain(id, 'train'))
  WITH CHECK (public.can_access_brain(id, 'train'));

CREATE POLICY ns_brains_train_delete
  ON public.ns_brains FOR DELETE TO authenticated
  USING (public.can_access_brain(id, 'train'));

DROP POLICY IF EXISTS ns_brains_service_all ON public.ns_brains;
CREATE POLICY ns_brains_service_all
  ON public.ns_brains FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "ns_memories_own" ON public.ns_memories;
DROP POLICY IF EXISTS org_ns_memories_all ON public.ns_memories;
DROP POLICY IF EXISTS ns_memories_access_select ON public.ns_memories;
DROP POLICY IF EXISTS ns_memories_train_insert ON public.ns_memories;
DROP POLICY IF EXISTS ns_memories_train_update ON public.ns_memories;
DROP POLICY IF EXISTS ns_memories_train_delete ON public.ns_memories;
CREATE POLICY ns_memories_access_select ON public.ns_memories FOR SELECT TO authenticated USING (public.can_access_brain(brain_id, 'view'));
CREATE POLICY ns_memories_train_insert ON public.ns_memories FOR INSERT TO authenticated WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_memories_train_update ON public.ns_memories FOR UPDATE TO authenticated USING (public.can_access_brain(brain_id, 'train')) WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_memories_train_delete ON public.ns_memories FOR DELETE TO authenticated USING (public.can_access_brain(brain_id, 'train'));

DROP POLICY IF EXISTS "ns_snapshots_own" ON public.ns_snapshots;
DROP POLICY IF EXISTS org_ns_snapshots_all ON public.ns_snapshots;
DROP POLICY IF EXISTS ns_snapshots_access_select ON public.ns_snapshots;
DROP POLICY IF EXISTS ns_snapshots_train_insert ON public.ns_snapshots;
DROP POLICY IF EXISTS ns_snapshots_train_update ON public.ns_snapshots;
DROP POLICY IF EXISTS ns_snapshots_train_delete ON public.ns_snapshots;
CREATE POLICY ns_snapshots_access_select ON public.ns_snapshots FOR SELECT TO authenticated USING (public.can_access_brain(brain_id, 'view'));
CREATE POLICY ns_snapshots_train_insert ON public.ns_snapshots FOR INSERT TO authenticated WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_snapshots_train_update ON public.ns_snapshots FOR UPDATE TO authenticated USING (public.can_access_brain(brain_id, 'train')) WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_snapshots_train_delete ON public.ns_snapshots FOR DELETE TO authenticated USING (public.can_access_brain(brain_id, 'train'));

DROP POLICY IF EXISTS "ns_sk_sources_own" ON public.ns_sk_sources;
DROP POLICY IF EXISTS org_ns_sk_sources_all ON public.ns_sk_sources;
DROP POLICY IF EXISTS ns_sk_sources_access_select ON public.ns_sk_sources;
DROP POLICY IF EXISTS ns_sk_sources_train_insert ON public.ns_sk_sources;
DROP POLICY IF EXISTS ns_sk_sources_train_update ON public.ns_sk_sources;
DROP POLICY IF EXISTS ns_sk_sources_train_delete ON public.ns_sk_sources;
CREATE POLICY ns_sk_sources_access_select ON public.ns_sk_sources FOR SELECT TO authenticated USING (public.can_access_brain(brain_id, 'view'));
CREATE POLICY ns_sk_sources_train_insert ON public.ns_sk_sources FOR INSERT TO authenticated WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_sk_sources_train_update ON public.ns_sk_sources FOR UPDATE TO authenticated USING (public.can_access_brain(brain_id, 'train')) WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_sk_sources_train_delete ON public.ns_sk_sources FOR DELETE TO authenticated USING (public.can_access_brain(brain_id, 'train'));

DROP POLICY IF EXISTS "ns_sk_entries_own" ON public.ns_sk_entries;
DROP POLICY IF EXISTS org_ns_sk_entries_all ON public.ns_sk_entries;
DROP POLICY IF EXISTS ns_sk_entries_access_select ON public.ns_sk_entries;
DROP POLICY IF EXISTS ns_sk_entries_train_insert ON public.ns_sk_entries;
DROP POLICY IF EXISTS ns_sk_entries_train_update ON public.ns_sk_entries;
DROP POLICY IF EXISTS ns_sk_entries_train_delete ON public.ns_sk_entries;
CREATE POLICY ns_sk_entries_access_select ON public.ns_sk_entries FOR SELECT TO authenticated USING (public.can_access_brain(brain_id, 'view'));
CREATE POLICY ns_sk_entries_train_insert ON public.ns_sk_entries FOR INSERT TO authenticated WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_sk_entries_train_update ON public.ns_sk_entries FOR UPDATE TO authenticated USING (public.can_access_brain(brain_id, 'train')) WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_sk_entries_train_delete ON public.ns_sk_entries FOR DELETE TO authenticated USING (public.can_access_brain(brain_id, 'train'));

DROP POLICY IF EXISTS "ns_sk_gaps_own" ON public.ns_sk_gaps;
DROP POLICY IF EXISTS org_ns_sk_gaps_all ON public.ns_sk_gaps;
DROP POLICY IF EXISTS ns_sk_gaps_access_select ON public.ns_sk_gaps;
DROP POLICY IF EXISTS ns_sk_gaps_train_insert ON public.ns_sk_gaps;
DROP POLICY IF EXISTS ns_sk_gaps_train_update ON public.ns_sk_gaps;
DROP POLICY IF EXISTS ns_sk_gaps_train_delete ON public.ns_sk_gaps;
CREATE POLICY ns_sk_gaps_access_select ON public.ns_sk_gaps FOR SELECT TO authenticated USING (public.can_access_brain(brain_id, 'view'));
CREATE POLICY ns_sk_gaps_train_insert ON public.ns_sk_gaps FOR INSERT TO authenticated WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_sk_gaps_train_update ON public.ns_sk_gaps FOR UPDATE TO authenticated USING (public.can_access_brain(brain_id, 'train')) WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_sk_gaps_train_delete ON public.ns_sk_gaps FOR DELETE TO authenticated USING (public.can_access_brain(brain_id, 'train'));

DROP POLICY IF EXISTS "ns_sk_curriculum_own" ON public.ns_sk_curriculum;
DROP POLICY IF EXISTS org_ns_sk_curriculum_all ON public.ns_sk_curriculum;
DROP POLICY IF EXISTS ns_sk_curriculum_access_select ON public.ns_sk_curriculum;
DROP POLICY IF EXISTS ns_sk_curriculum_train_insert ON public.ns_sk_curriculum;
DROP POLICY IF EXISTS ns_sk_curriculum_train_update ON public.ns_sk_curriculum;
DROP POLICY IF EXISTS ns_sk_curriculum_train_delete ON public.ns_sk_curriculum;
CREATE POLICY ns_sk_curriculum_access_select ON public.ns_sk_curriculum FOR SELECT TO authenticated USING (public.can_access_brain(brain_id, 'view'));
CREATE POLICY ns_sk_curriculum_train_insert ON public.ns_sk_curriculum FOR INSERT TO authenticated WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_sk_curriculum_train_update ON public.ns_sk_curriculum FOR UPDATE TO authenticated USING (public.can_access_brain(brain_id, 'train')) WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_sk_curriculum_train_delete ON public.ns_sk_curriculum FOR DELETE TO authenticated USING (public.can_access_brain(brain_id, 'train'));

DROP POLICY IF EXISTS "ns_content_hashes_own" ON public.ns_content_hashes;
DROP POLICY IF EXISTS org_ns_content_hashes_all ON public.ns_content_hashes;
DROP POLICY IF EXISTS ns_content_hashes_access_select ON public.ns_content_hashes;
DROP POLICY IF EXISTS ns_content_hashes_train_insert ON public.ns_content_hashes;
DROP POLICY IF EXISTS ns_content_hashes_train_update ON public.ns_content_hashes;
DROP POLICY IF EXISTS ns_content_hashes_train_delete ON public.ns_content_hashes;
CREATE POLICY ns_content_hashes_access_select ON public.ns_content_hashes FOR SELECT TO authenticated USING (public.can_access_brain(brain_id, 'view'));
CREATE POLICY ns_content_hashes_train_insert ON public.ns_content_hashes FOR INSERT TO authenticated WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_content_hashes_train_update ON public.ns_content_hashes FOR UPDATE TO authenticated USING (public.can_access_brain(brain_id, 'train')) WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_content_hashes_train_delete ON public.ns_content_hashes FOR DELETE TO authenticated USING (public.can_access_brain(brain_id, 'train'));

DROP POLICY IF EXISTS "ns_mem_sessions_own" ON public.ns_memory_sessions;
DROP POLICY IF EXISTS org_ns_memory_sessions_all ON public.ns_memory_sessions;
DROP POLICY IF EXISTS ns_memory_sessions_access_select ON public.ns_memory_sessions;
DROP POLICY IF EXISTS ns_memory_sessions_train_insert ON public.ns_memory_sessions;
DROP POLICY IF EXISTS ns_memory_sessions_train_update ON public.ns_memory_sessions;
DROP POLICY IF EXISTS ns_memory_sessions_train_delete ON public.ns_memory_sessions;
CREATE POLICY ns_memory_sessions_access_select ON public.ns_memory_sessions FOR SELECT TO authenticated USING (public.can_access_brain(brain_id, 'view'));
CREATE POLICY ns_memory_sessions_train_insert ON public.ns_memory_sessions FOR INSERT TO authenticated WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_memory_sessions_train_update ON public.ns_memory_sessions FOR UPDATE TO authenticated USING (public.can_access_brain(brain_id, 'train')) WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_memory_sessions_train_delete ON public.ns_memory_sessions FOR DELETE TO authenticated USING (public.can_access_brain(brain_id, 'train'));

DROP POLICY IF EXISTS "ns_sk_evolution_own" ON public.ns_sk_evolution;
DROP POLICY IF EXISTS org_ns_sk_evolution_all ON public.ns_sk_evolution;
DROP POLICY IF EXISTS ns_sk_evolution_access_select ON public.ns_sk_evolution;
DROP POLICY IF EXISTS ns_sk_evolution_train_insert ON public.ns_sk_evolution;
DROP POLICY IF EXISTS ns_sk_evolution_train_update ON public.ns_sk_evolution;
DROP POLICY IF EXISTS ns_sk_evolution_train_delete ON public.ns_sk_evolution;
CREATE POLICY ns_sk_evolution_access_select ON public.ns_sk_evolution FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_sk_entries e WHERE e.id = ns_sk_evolution.entry_id AND public.can_access_brain(e.brain_id, 'view'))
);
CREATE POLICY ns_sk_evolution_train_insert ON public.ns_sk_evolution FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.ns_sk_entries e WHERE e.id = ns_sk_evolution.entry_id AND public.can_access_brain(e.brain_id, 'train'))
);
CREATE POLICY ns_sk_evolution_train_update ON public.ns_sk_evolution FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_sk_entries e WHERE e.id = ns_sk_evolution.entry_id AND public.can_access_brain(e.brain_id, 'train'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.ns_sk_entries e WHERE e.id = ns_sk_evolution.entry_id AND public.can_access_brain(e.brain_id, 'train'))
);
CREATE POLICY ns_sk_evolution_train_delete ON public.ns_sk_evolution FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_sk_entries e WHERE e.id = ns_sk_evolution.entry_id AND public.can_access_brain(e.brain_id, 'train'))
);

DROP POLICY IF EXISTS "ns_mem_conn_own" ON public.ns_memory_connections;
DROP POLICY IF EXISTS org_ns_memory_connections_all ON public.ns_memory_connections;
DROP POLICY IF EXISTS ns_memory_connections_access_select ON public.ns_memory_connections;
DROP POLICY IF EXISTS ns_memory_connections_train_insert ON public.ns_memory_connections;
DROP POLICY IF EXISTS ns_memory_connections_train_update ON public.ns_memory_connections;
DROP POLICY IF EXISTS ns_memory_connections_train_delete ON public.ns_memory_connections;
CREATE POLICY ns_memory_connections_access_select ON public.ns_memory_connections FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_memory_connections.source_memory_id AND public.can_access_brain(m.brain_id, 'view'))
);
CREATE POLICY ns_memory_connections_train_insert ON public.ns_memory_connections FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_memory_connections.source_memory_id AND public.can_access_brain(m.brain_id, 'train'))
);
CREATE POLICY ns_memory_connections_train_update ON public.ns_memory_connections FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_memory_connections.source_memory_id AND public.can_access_brain(m.brain_id, 'train'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_memory_connections.source_memory_id AND public.can_access_brain(m.brain_id, 'train'))
);
CREATE POLICY ns_memory_connections_train_delete ON public.ns_memory_connections FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_memory_connections.source_memory_id AND public.can_access_brain(m.brain_id, 'train'))
);

DROP POLICY IF EXISTS "ns_mem_versions_own" ON public.ns_memory_versions;
DROP POLICY IF EXISTS org_ns_memory_versions_all ON public.ns_memory_versions;
DROP POLICY IF EXISTS ns_memory_versions_access_select ON public.ns_memory_versions;
DROP POLICY IF EXISTS ns_memory_versions_train_insert ON public.ns_memory_versions;
DROP POLICY IF EXISTS ns_memory_versions_train_update ON public.ns_memory_versions;
DROP POLICY IF EXISTS ns_memory_versions_train_delete ON public.ns_memory_versions;
CREATE POLICY ns_memory_versions_access_select ON public.ns_memory_versions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_memory_versions.memory_id AND public.can_access_brain(m.brain_id, 'view'))
);
CREATE POLICY ns_memory_versions_train_insert ON public.ns_memory_versions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_memory_versions.memory_id AND public.can_access_brain(m.brain_id, 'train'))
);
CREATE POLICY ns_memory_versions_train_update ON public.ns_memory_versions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_memory_versions.memory_id AND public.can_access_brain(m.brain_id, 'train'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_memory_versions.memory_id AND public.can_access_brain(m.brain_id, 'train'))
);
CREATE POLICY ns_memory_versions_train_delete ON public.ns_memory_versions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_memory_versions.memory_id AND public.can_access_brain(m.brain_id, 'train'))
);

DROP POLICY IF EXISTS "ns_edges_own" ON public.ns_snapshot_edges;
DROP POLICY IF EXISTS org_ns_snapshot_edges_all ON public.ns_snapshot_edges;
DROP POLICY IF EXISTS ns_snapshot_edges_access_select ON public.ns_snapshot_edges;
DROP POLICY IF EXISTS ns_snapshot_edges_train_insert ON public.ns_snapshot_edges;
DROP POLICY IF EXISTS ns_snapshot_edges_train_update ON public.ns_snapshot_edges;
DROP POLICY IF EXISTS ns_snapshot_edges_train_delete ON public.ns_snapshot_edges;
CREATE POLICY ns_snapshot_edges_access_select ON public.ns_snapshot_edges FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_snapshots s WHERE s.id = ns_snapshot_edges.source_id AND public.can_access_brain(s.brain_id, 'view'))
);
CREATE POLICY ns_snapshot_edges_train_insert ON public.ns_snapshot_edges FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.ns_snapshots s WHERE s.id = ns_snapshot_edges.source_id AND public.can_access_brain(s.brain_id, 'train'))
);
CREATE POLICY ns_snapshot_edges_train_update ON public.ns_snapshot_edges FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_snapshots s WHERE s.id = ns_snapshot_edges.source_id AND public.can_access_brain(s.brain_id, 'train'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.ns_snapshots s WHERE s.id = ns_snapshot_edges.source_id AND public.can_access_brain(s.brain_id, 'train'))
);
CREATE POLICY ns_snapshot_edges_train_delete ON public.ns_snapshot_edges FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_snapshots s WHERE s.id = ns_snapshot_edges.source_id AND public.can_access_brain(s.brain_id, 'train'))
);

DROP POLICY IF EXISTS "ns_er_own" ON public.ns_emotional_responses;
DROP POLICY IF EXISTS org_ns_emotional_responses_all ON public.ns_emotional_responses;
DROP POLICY IF EXISTS ns_emotional_responses_access_select ON public.ns_emotional_responses;
DROP POLICY IF EXISTS ns_emotional_responses_train_insert ON public.ns_emotional_responses;
DROP POLICY IF EXISTS ns_emotional_responses_train_update ON public.ns_emotional_responses;
DROP POLICY IF EXISTS ns_emotional_responses_train_delete ON public.ns_emotional_responses;
CREATE POLICY ns_emotional_responses_access_select ON public.ns_emotional_responses FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_emotional_responses.memory_id AND public.can_access_brain(m.brain_id, 'view'))
);
CREATE POLICY ns_emotional_responses_train_insert ON public.ns_emotional_responses FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_emotional_responses.memory_id AND public.can_access_brain(m.brain_id, 'train'))
);
CREATE POLICY ns_emotional_responses_train_update ON public.ns_emotional_responses FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_emotional_responses.memory_id AND public.can_access_brain(m.brain_id, 'train'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_emotional_responses.memory_id AND public.can_access_brain(m.brain_id, 'train'))
);
CREATE POLICY ns_emotional_responses_train_delete ON public.ns_emotional_responses FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ns_memories m WHERE m.id = ns_emotional_responses.memory_id AND public.can_access_brain(m.brain_id, 'train'))
);

DROP POLICY IF EXISTS "ns_pending_own" ON public.ns_pending_captures;
DROP POLICY IF EXISTS org_ns_pending_captures_all ON public.ns_pending_captures;
DROP POLICY IF EXISTS ns_pending_captures_access_select ON public.ns_pending_captures;
DROP POLICY IF EXISTS ns_pending_captures_train_insert ON public.ns_pending_captures;
DROP POLICY IF EXISTS ns_pending_captures_train_update ON public.ns_pending_captures;
DROP POLICY IF EXISTS ns_pending_captures_train_delete ON public.ns_pending_captures;
CREATE POLICY ns_pending_captures_access_select ON public.ns_pending_captures FOR SELECT TO authenticated USING (public.can_access_brain(brain_id, 'view'));
CREATE POLICY ns_pending_captures_train_insert ON public.ns_pending_captures FOR INSERT TO authenticated WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_pending_captures_train_update ON public.ns_pending_captures FOR UPDATE TO authenticated USING (public.can_access_brain(brain_id, 'train')) WITH CHECK (public.can_access_brain(brain_id, 'train'));
CREATE POLICY ns_pending_captures_train_delete ON public.ns_pending_captures FOR DELETE TO authenticated USING (public.can_access_brain(brain_id, 'train'));
