-- Drop dead agent_configs table.
-- No backend reads from it. The only consumer was a dead frontend component
-- (AgentDefaultsPageContent.tsx) that was never mounted.
-- The handle_new_user() trigger inserted a row on signup but the data was never consumed.

-- 1. Remove the INSERT from handle_new_user()
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
    '{"archetype": null, "capability_profile": "vibey_closed", "capability_domain": "shared", "model_id": "auto"}'::jsonb,
    true
  )
  ;

  RETURN NEW;
END;
$$;

-- 2. Drop the table (cascades RLS policies, triggers, indexes)
DROP TABLE IF EXISTS agent_configs CASCADE;
