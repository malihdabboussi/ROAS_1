-- team_roster: canonical queryable roster unioning agents (agents_registry) and humans
-- (org_members JOIN profiles). Single source of truth for the planner prompt AND the
-- Team tab UI. `is_ready` gates assignment eligibility — if it drifts, both the UI
-- badge and the planner filter drift together.

CREATE OR REPLACE VIEW public.team_roster
WITH (security_invoker = true)
AS
SELECT
  ar.id::text AS participant_id,
  'agent'::text AS kind,
  ar.org_id,
  NULL::uuid AS user_id,
  ar.agent_key,
  ar.name AS display_name,
  ar.image_url AS avatar_url,
  ar.role AS role_label,
  COALESCE(
    CASE
      WHEN ar.specialty IS NOT NULL AND ar.specialty <> ''
      THEN ARRAY[ar.specialty]
      ELSE '{}'::text[]
    END,
    '{}'::text[]
  ) AS specialties,
  true AS accepts_assignments,
  NULL::text AS timezone,
  NULL::jsonb AS working_hours,
  NULL::timestamptz AS out_of_office_until,
  (
    SELECT count(*)::int FROM public.mission_subtasks ms
    WHERE ms.assigned_agent_key = ar.agent_key
      AND ms.status IN ('pending','in_progress','revision','blocked')
      AND ms.org_id IS NOT DISTINCT FROM ar.org_id
  ) AS current_load,
  true AS is_ready,
  ar.level AS agent_level,
  NULL::text AS org_role,
  NULL::text AS email,
  ar.created_at,
  ar.updated_at
FROM public.agents_registry ar
WHERE ar.org_id IS NOT NULL

UNION ALL

SELECT
  om.user_id::text AS participant_id,
  'human'::text AS kind,
  om.org_id,
  om.user_id AS user_id,
  NULL::text AS agent_key,
  COALESCE(p.full_name, p.email, 'Teammate') AS display_name,
  p.avatar_url,
  p.functional_role AS role_label,
  COALESCE(p.specialties, '{}'::text[]) AS specialties,
  COALESCE(p.accepts_agent_assignments, true) AS accepts_assignments,
  p.timezone,
  p.working_hours,
  p.out_of_office_until,
  (
    SELECT count(*)::int FROM public.mission_subtasks ms
    WHERE ms.assignee_type = 'human'
      AND ms.assigned_user_id = om.user_id
      AND ms.status IN ('awaiting_human','pending','revision','blocked')
      AND ms.org_id = om.org_id
  )
  +
  (
    SELECT count(*)::int FROM public.list_items li
    WHERE li.assignee_type = 'human'
      AND li.assignee_id = om.user_id::text
      AND li.status IN ('todo','in_progress','in_review')
      AND li.org_id = om.org_id
  ) AS current_load,
  (
    p.functional_role IS NOT NULL
    AND p.functional_role <> ''
    AND COALESCE(array_length(p.specialties, 1), 0) >= 1
    AND COALESCE(p.accepts_agent_assignments, true) = true
  ) AS is_ready,
  NULL::text AS agent_level,
  om.role AS org_role,
  p.email,
  om.created_at,
  p.updated_at
FROM public.org_members om
LEFT JOIN public.profiles p ON p.id = om.user_id
WHERE om.status = 'active';

COMMENT ON VIEW public.team_roster IS 'Unified roster of agents + humans for the planner prompt and Team tab UI. security_invoker=true means RLS on underlying agents_registry / org_members / profiles applies.';

GRANT SELECT ON public.team_roster TO authenticated, anon, service_role;
