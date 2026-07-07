ALTER TABLE public.agent_overrides
  DROP CONSTRAINT IF EXISTS agent_overrides_capability_kind_check;

ALTER TABLE public.agent_overrides
  ADD CONSTRAINT agent_overrides_capability_kind_check
  CHECK (
    capability_kind = ANY (
      ARRAY[
        'integration'::text,
        'brain_domain'::text,
        'brain_access'::text,
        'campaign_context'::text,
        'space_context'::text,
        'channel'::text,
        'mission_type'::text,
        'skill'::text,
        'action_domain'::text
      ]
    )
  );

ALTER TABLE public.agent_team_grants
  DROP CONSTRAINT IF EXISTS agent_team_grants_capability_kind_check;

ALTER TABLE public.agent_team_grants
  ADD CONSTRAINT agent_team_grants_capability_kind_check
  CHECK (
    capability_kind = ANY (
      ARRAY[
        'integration'::text,
        'brain_domain'::text,
        'brain_access'::text,
        'campaign_context'::text,
        'space_context'::text,
        'channel'::text,
        'mission_type'::text,
        'skill'::text,
        'action_domain'::text
      ]
    )
  );

INSERT INTO public.agent_team_grants (team_id, capability_kind, capability_id, mode)
SELECT DISTINCT team_id, 'space_context', '*', 'allow'
FROM public.agent_team_grants
WHERE capability_kind = 'action_domain'
  AND capability_id = 'read_space_context'
ON CONFLICT (team_id, capability_kind, capability_id) DO NOTHING;
