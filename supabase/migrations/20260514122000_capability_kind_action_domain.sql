-- Extend agent policy capability kinds to support action-domain grants.
-- Existing kinds stay valid; invalid kinds remain rejected by CHECK constraints.

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
        'channel'::text,
        'mission_type'::text,
        'skill'::text,
        'action_domain'::text
      ]
    )
  );
