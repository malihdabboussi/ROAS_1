-- Fix handle_new_user() trigger
-- Migration 20260214210819_user_roles.sql accidentally replaced this function
-- to only create user_profiles, dropping profiles + brains + agent_configs creation.
-- This caused new signups to have no profile row, breaking onboarding and machine provisioning.

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

  RETURN NEW;
END;
$$;

-- Backfill: create profiles for users who signed up while trigger was broken
INSERT INTO profiles (id, email, full_name, avatar_url, onboarding_animation_seen)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(COALESCE(u.email, ''), '@', 1)
  ),
  COALESCE(
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  ),
  TRUE
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Backfill: create brains for users missing them
INSERT INTO brains (owner_id, name, is_default)
SELECT u.id, 'My Brain', TRUE
FROM auth.users u
LEFT JOIN brains b ON u.id = b.owner_id
WHERE b.id IS NULL;

-- Backfill: create agent_configs for users missing them
INSERT INTO agent_configs (user_id)
SELECT u.id
FROM auth.users u
LEFT JOIN agent_configs ac ON u.id = ac.user_id
WHERE ac.id IS NULL;

-- Skip onboarding for all existing users
UPDATE profiles SET onboarding_animation_seen = TRUE WHERE onboarding_animation_seen IS DISTINCT FROM TRUE;
