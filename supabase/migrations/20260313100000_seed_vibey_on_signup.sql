-- Seed a system-level Vibey agent for every new user on signup.
-- Previously handle_new_user created profiles, user_profiles, brains, agent_configs
-- but no agents — leaving new users without their Vibey until they onboarded to Manage.

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

  INSERT INTO agent_configs (user_id)
  VALUES (NEW.id);

  INSERT INTO agents_registry (user_id, agent_key, name, role, skills, status, level, config, user_brain_access)
  VALUES (
    NEW.id,
    'vibey',
    'Vibey',
    'CMO',
    '[]'::jsonb,
    'idle',
    'system',
    '{"archetype": null, "capability_profile": "vibey_closed", "capability_domain": "shared", "model_id": "auto"}'::jsonb,
    true
  )
  ;

  RETURN NEW;
END;
$$;

-- Backfill: create Vibey for users who signed up but have no agents at all
INSERT INTO agents_registry (user_id, agent_key, name, role, skills, status, level, config, user_brain_access)
SELECT
  u.id,
  'vibey',
  'Vibey',
  'CMO',
  '[]'::jsonb,
  'idle',
  'system',
  '{"archetype": null, "capability_profile": "vibey_closed", "capability_domain": "shared", "model_id": "auto"}'::jsonb,
  true
FROM auth.users u
LEFT JOIN agents_registry ar ON ar.user_id = u.id AND ar.agent_key = 'vibey'
WHERE ar.id IS NULL;
