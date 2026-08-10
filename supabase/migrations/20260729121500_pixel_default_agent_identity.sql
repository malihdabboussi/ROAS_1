-- Rename default CEO display/self-identity from Vibey → Pixel.
-- Internal agent_key remains 'vibey'.

-- 1) Signup seed name
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

  INSERT INTO agents_registry (user_id, agent_key, name, role, skills, status, level, config)
  VALUES (
    NEW.id,
    'vibey',
    'Pixel',
    'CMO',
    '[]'::jsonb,
    'idle',
    'system',
    '{"archetype": "ceo", "capability_profile": "vibey_ceo", "capability_domain": "management", "model_id": "auto"}'::jsonb
  );

  RETURN NEW;
END;
$$;

-- 2) Existing registry display names still on legacy defaults
UPDATE agents_registry
SET
  name = 'Pixel',
  updated_at = now()
WHERE agent_key = 'vibey'
  AND (
    lower(trim(name)) IN ('vibey', 'roas', 'pixel')
    OR lower(trim(split_part(name, '·', 1))) IN ('vibey', 'roas', 'pixel')
    OR lower(trim(split_part(name, '|', 1))) IN ('vibey', 'roas', 'pixel')
    OR lower(trim(split_part(name, '-', 1))) IN ('vibey', 'roas', 'pixel')
  )
  AND name IS DISTINCT FROM 'Pixel';

-- 3) System identity files (self-intro source for OpenClaw)
UPDATE agent_definitions
SET
  content = replace(content, 'Vibey', 'Pixel'),
  updated_at = now()
WHERE agent_key = 'vibey'
  AND file_name IN ('SOUL.md', 'IDENTITY.md', 'ROLE.md', 'TOOLS.md', 'AGENTS.md')
  AND content ILIKE '%Vibey%';

-- Keep skill path references intact if a prior replace touched them (defensive).
UPDATE agent_definitions
SET content = replace(content, 'skills/Pixel-api/', 'skills/vibey-api/')
WHERE agent_key = 'vibey'
  AND file_name = 'TOOLS.md'
  AND content LIKE '%skills/Pixel-api/%';

-- 4) Onboarding discovery skill product phrasing
UPDATE agent_skills
SET
  description = replace(description, 'Vibey', 'Pixel'),
  markdown_content = replace(markdown_content, 'Vibey', 'Pixel'),
  updated_at = now()
WHERE skill_key = 'onboarding-discovery'
  AND agent_key = 'vibey'
  AND (
    description ILIKE '%Vibey%'
    OR markdown_content ILIKE '%Vibey%'
  );

-- 5) Employee template card metadata for the default CEO
UPDATE agent_employee_templates
SET
  default_name = 'Pixel',
  name_pool = '["Pixel"]'::jsonb
WHERE role_key = 'vibey';
