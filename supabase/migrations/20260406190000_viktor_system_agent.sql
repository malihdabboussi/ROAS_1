-- Upgrade Viktor to system agent with system_builder capability profile.
-- Viktor is the 4th system agent alongside Vibey (CEO), HR, and Atlas (Brain Scholar).
-- Previously seeded as level='employee' with managed_domain profile.

-- 1. Upgrade existing Viktor rows (user-scoped and org-scoped) to system level.
UPDATE public.agents_registry
SET level = 'system',
    config = COALESCE(config, '{}'::jsonb)
      || jsonb_build_object(
        'capability_profile', 'system_builder',
        'capability_domain', 'developer'
      )
WHERE agent_key IN ('viktor', 'widget_builder')
  AND level != 'system';

-- 2. Update the handle_new_user trigger to seed Viktor as system_builder.
--    (Viktor is hired during onboarding, not in handle_new_user, so no trigger change needed.)
--    The onboarding service resolveCapabilityProfile now returns 'system_builder' for viktor/widget_builder.
