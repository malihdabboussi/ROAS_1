-- Domain restructure: remove 'shared' domain, introduce 'operations' and 'management'.
-- 1. Backfill agent capability_domain: shared -> operations (managed agents only).
-- 2. Backfill system agent capability_domain: shared -> management (vibey, hr, brain_scholar/atlas).
-- 3. Upgrade CFO template level from employee to c_level.
-- 4. Backfill existing CFO agents to c_level.
-- 5. Rename MCP server domain 'shared' -> 'universal'.
-- 6. Update agent_employee_templates CFO level.

-- 1. Managed agents: shared -> operations
UPDATE agents_registry
SET config = jsonb_set(config, '{capability_domain}', '"operations"')
WHERE config->>'capability_domain' = 'shared'
  AND config->>'capability_profile' = 'managed_domain';

-- 2. System agents: shared -> management
UPDATE agents_registry
SET config = jsonb_set(config, '{capability_domain}', '"management"')
WHERE config->>'capability_domain' = 'shared'
  AND config->>'capability_profile' IN ('vibey_ceo', 'system_hr', 'system_brain');

-- 3. Catch-all for any remaining shared domain
UPDATE agents_registry
SET config = jsonb_set(config, '{capability_domain}', '"operations"')
WHERE config->>'capability_domain' = 'shared';

-- 4. Upgrade CFO template level
UPDATE agent_employee_templates
SET level = 'c_level'
WHERE role_key = 'cfo'
  AND level = 'employee';

-- 5. Upgrade existing CFO agents to c_level
UPDATE agents_registry
SET level = 'c_level'
WHERE agent_key IN (
  SELECT ar.agent_key
  FROM agents_registry ar
  WHERE lower(ar.role) LIKE '%financial%'
     OR lower(ar.role) LIKE '%cfo%'
     OR ar.agent_key = 'cfo'
     OR ar.agent_key = 'orion'
)
AND level = 'employee';

-- 6. MCP servers: shared -> universal
UPDATE project_mcp_servers
SET domain = 'universal'
WHERE domain = 'shared';

-- 7. Update handle_new_user trigger to use management domain for vibey
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url, onboarding_animation_seen)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture'
    ),
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_profiles (id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO brains (owner_id, name, is_default)
  VALUES (NEW.id, 'My Brain', TRUE);

  INSERT INTO agents_registry (user_id, agent_key, name, role, skills, status, level, config, user_brain_access)
  VALUES (
    NEW.id,
    'vibey',
    'Vibey',
    'CMO',
    '[]'::jsonb,
    'idle',
    'system',
    '{"archetype": "ceo", "capability_profile": "vibey_ceo", "capability_domain": "management", "model_id": "auto"}'::jsonb,
    true
  )
  ;

  RETURN NEW;
END;
$$;
