-- Backfill capability_profile in agents_registry.config for strict RBAC.
-- Fail-closed enforcement expects every agent to resolve to a known profile.

UPDATE agents_registry
SET config = COALESCE(config, '{}'::jsonb)
  || jsonb_build_object(
    'capability_profile',
    CASE
      WHEN agent_key = 'vibey' THEN 'vibey_closed'
      WHEN agent_key = 'hr' OR level = 'system' THEN 'system_hr'
      WHEN level = 'c_level' THEN 'managed_c_level'
      WHEN level = 'manager' THEN 'managed_manager'
      ELSE 'managed_employee'
    END
  )
WHERE COALESCE(config->>'capability_profile', '') = '';
