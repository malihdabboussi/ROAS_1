UPDATE agents_registry
SET config = COALESCE(config, '{}'::jsonb)
  || jsonb_build_object(
    'capability_profile',
    CASE
      WHEN agent_key = 'vibey' THEN 'vibey_closed'
      WHEN agent_key = 'hr' OR level = 'system' THEN 'system_hr'
      ELSE 'managed_domain'
    END
  )
WHERE COALESCE(config->>'capability_profile', '') = '';

UPDATE agents_registry
SET config = COALESCE(config, '{}'::jsonb)
  || jsonb_build_object(
    'capability_domain',
    CASE
      WHEN agent_key IN ('copywriter', 'designer', 'media_producer', 'brand_manager')
        OR LOWER(COALESCE(role, '')) ~ '(copywriter|designer|creative|brand|media|marketing|social)'
        THEN 'marketing'
      WHEN agent_key IN ('analyst', 'cfo')
        OR LOWER(COALESCE(role, '')) ~ '(analyst|finance|data|performance)'
        THEN 'analyst'
      WHEN agent_key IN ('developer', 'automation_integrations_engineer', 'qa_engineer')
        OR LOWER(COALESCE(role, '')) ~ '(developer|engineer|automation|integrations|qa|reliability|full-stack|full stack)'
        THEN 'developer'
      ELSE 'shared'
    END
  )
WHERE COALESCE(config->>'capability_domain', '') = '';
