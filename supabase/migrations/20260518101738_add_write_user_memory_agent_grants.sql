-- Add regular user-memory access to existing action-domain teams.
-- Specialized brain operations stay with Atlas/system brain contracts.

INSERT INTO public.agent_team_grants (team_id, capability_kind, capability_id, mode)
SELECT id, 'action_domain', 'write_user_memory', 'allow'
FROM public.agent_teams
ON CONFLICT (team_id, capability_kind, capability_id) DO NOTHING;

DELETE FROM public.agent_team_grants g
USING public.agent_teams t
WHERE t.id = g.team_id
  AND g.capability_kind = 'action_domain'
  AND g.capability_id = 'write_brain'
  AND COALESCE(t.name, '') NOT ILIKE '%brain%'
  AND COALESCE(t.name, '') NOT ILIKE '%atlas%'
  AND COALESCE(t.name, '') NOT ILIKE '%management%';
