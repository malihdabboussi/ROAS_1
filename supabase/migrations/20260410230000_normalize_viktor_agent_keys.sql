-- Normalize suffixed Viktor/widget_builder agent keys back to canonical 'viktor'.
-- Fixes: RBAC hardcoded key matching only recognizes 'viktor' and 'widget_builder'.
-- When ensureUniqueAgentKey produced 'viktor_2', the agent lost system_builder permissions.

-- Step 1: For each scope (user_id or org_id), if both 'viktor' AND 'viktor_N' exist,
--         delete the suffixed duplicate (the canonical 'viktor' takes precedence).
DELETE FROM public.agents_registry
WHERE agent_key ~ '^(viktor|widget_builder)_[0-9]+$'
  AND EXISTS (
    SELECT 1 FROM public.agents_registry AS canonical
    WHERE canonical.agent_key = 'viktor'
      AND (
        (canonical.org_id IS NOT NULL AND canonical.org_id = agents_registry.org_id AND canonical.user_id IS NULL AND agents_registry.user_id IS NULL)
        OR
        (canonical.org_id IS NULL AND canonical.user_id IS NOT NULL AND canonical.user_id = agents_registry.user_id AND agents_registry.org_id IS NULL)
      )
  );

-- Step 2: Rename remaining suffixed keys to 'viktor' (scopes that had no canonical row).
UPDATE public.agents_registry
SET agent_key = 'viktor'
WHERE agent_key ~ '^(viktor|widget_builder)_[0-9]+$';

-- Step 3: Ensure ALL viktor rows have system_builder profile and system level.
UPDATE public.agents_registry
SET level = 'system',
    config = COALESCE(config, '{}'::jsonb)
      || jsonb_build_object(
        'capability_profile', 'system_builder',
        'capability_domain', 'developer'
      )
WHERE agent_key IN ('viktor', 'widget_builder')
  AND (level != 'system'
    OR config->>'capability_profile' IS DISTINCT FROM 'system_builder');

-- Step 4: Also normalize suffixed atlas keys the same way.
DELETE FROM public.agents_registry
WHERE agent_key ~ '^atlas_[0-9]+$'
  AND EXISTS (
    SELECT 1 FROM public.agents_registry AS canonical
    WHERE canonical.agent_key = 'atlas'
      AND (
        (canonical.org_id IS NOT NULL AND canonical.org_id = agents_registry.org_id AND canonical.user_id IS NULL AND agents_registry.user_id IS NULL)
        OR
        (canonical.org_id IS NULL AND canonical.user_id IS NOT NULL AND canonical.user_id = agents_registry.user_id AND agents_registry.org_id IS NULL)
      )
  );

UPDATE public.agents_registry
SET agent_key = 'atlas'
WHERE agent_key ~ '^atlas_[0-9]+$';

-- Step 5: Ensure ALL atlas rows have system_brain profile and system level.
UPDATE public.agents_registry
SET level = 'system',
    config = COALESCE(config, '{}'::jsonb)
      || jsonb_build_object(
        'capability_profile', 'system_brain',
        'capability_domain', 'management'
      )
WHERE agent_key = 'atlas'
  AND (level != 'system'
    OR config->>'capability_profile' IS DISTINCT FROM 'system_brain');
