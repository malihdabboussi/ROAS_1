-- Satellite rows (logs, plans, subtasks, deliverables) often had org_id NULL while
-- parent missions had org_id set. Org-member SELECT policies require satellite.org_id,
-- so collaborators saw the mission but RLS returned zero child rows.

UPDATE public.missions_logs l
SET org_id = m.org_id
FROM public.missions m
WHERE l.mission_id = m.id
  AND m.org_id IS NOT NULL
  AND l.org_id IS DISTINCT FROM m.org_id;

UPDATE public.missions_plans p
SET org_id = m.org_id
FROM public.missions m
WHERE p.mission_id = m.id
  AND m.org_id IS NOT NULL
  AND p.org_id IS DISTINCT FROM m.org_id;

UPDATE public.mission_subtasks s
SET org_id = m.org_id
FROM public.missions m
WHERE s.mission_id = m.id
  AND m.org_id IS NOT NULL
  AND s.org_id IS DISTINCT FROM m.org_id;

UPDATE public.mission_deliverables d
SET org_id = m.org_id
FROM public.missions m
WHERE d.mission_id = m.id
  AND m.org_id IS NOT NULL
  AND d.org_id IS DISTINCT FROM m.org_id;

UPDATE public.mission_outbox o
SET org_id = m.org_id
FROM public.missions m
WHERE o.mission_id = m.id
  AND m.org_id IS NOT NULL
  AND o.org_id IS DISTINCT FROM m.org_id;

-- Defense in depth: allow org members to read satellite rows when the parent mission
-- is in their org, even if a future insert omits satellite.org_id.

DROP POLICY IF EXISTS "Org members read missions_logs via parent mission" ON public.missions_logs;
CREATE POLICY "Org members read missions_logs via parent mission"
  ON public.missions_logs FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.missions m
      WHERE m.id = missions_logs.mission_id
        AND m.org_id IS NOT NULL
        AND is_org_member(m.org_id)
    )
  );

DROP POLICY IF EXISTS "Org members read missions_plans via parent mission" ON public.missions_plans;
CREATE POLICY "Org members read missions_plans via parent mission"
  ON public.missions_plans FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.missions m
      WHERE m.id = missions_plans.mission_id
        AND m.org_id IS NOT NULL
        AND is_org_member(m.org_id)
    )
  );

DROP POLICY IF EXISTS "Org members read mission_subtasks via parent mission" ON public.mission_subtasks;
CREATE POLICY "Org members read mission_subtasks via parent mission"
  ON public.mission_subtasks FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.missions m
      WHERE m.id = mission_subtasks.mission_id
        AND m.org_id IS NOT NULL
        AND is_org_member(m.org_id)
    )
  );

DROP POLICY IF EXISTS "Org members read mission_deliverables via parent mission" ON public.mission_deliverables;
CREATE POLICY "Org members read mission_deliverables via parent mission"
  ON public.mission_deliverables FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.missions m
      WHERE m.id = mission_deliverables.mission_id
        AND m.org_id IS NOT NULL
        AND is_org_member(m.org_id)
    )
  );
