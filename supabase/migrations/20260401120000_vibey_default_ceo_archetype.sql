-- New users: Vibey seeds with CEO archetype + vibey_ceo (skill sync + capability align with onboarding target).
-- Existing: backfill null/missing archetype on all Vibey rows (user + org scope).

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
    '{"archetype": "ceo", "capability_profile": "vibey_ceo", "capability_domain": "shared", "model_id": "auto"}'::jsonb,
    true
  )
  ;

  RETURN NEW;
END;
$$;

UPDATE public.agents_registry
SET config = COALESCE(config, '{}'::jsonb)
  || jsonb_build_object(
    'archetype', 'ceo',
    'capability_profile', 'vibey_ceo'
  )
WHERE agent_key = 'vibey'
  AND (
    config IS NULL
    OR NOT (config ? 'archetype')
    OR NULLIF(btrim(config->>'archetype'), '') IS NULL
    OR lower(btrim(config->>'archetype')) = 'null'
  );
