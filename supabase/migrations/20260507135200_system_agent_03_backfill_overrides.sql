-- Phase 4: Translate any per-user/per-org `is_enabled=false` clones for
-- system agents into `agent_overrides` deny rows so no user loses a toggle
-- they explicitly set when we delete the clones in Phase 6.

INSERT INTO public.agent_overrides (
  agent_key,
  user_id,
  org_id,
  capability_kind,
  capability_id,
  mode,
  created_at
)
SELECT DISTINCT ON (s.agent_key, s.skill_key, s.user_id, s.org_id)
  s.agent_key,
  s.user_id,
  s.org_id,
  'skill'::text       AS capability_kind,
  s.skill_key         AS capability_id,
  'deny'::text        AS mode,
  s.updated_at        AS created_at
FROM public.agent_skills s
JOIN public.agents_registry r
  ON r.agent_key = s.agent_key AND r.is_system = true
WHERE s.is_enabled = false
  AND (s.user_id IS NOT NULL OR s.org_id IS NOT NULL)
ON CONFLICT DO NOTHING;
