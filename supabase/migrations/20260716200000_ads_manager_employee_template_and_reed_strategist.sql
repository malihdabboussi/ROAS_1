-- Make ads_manager hireable (skills already exist; employee template row was missing).
-- Rename strategist default first name Nate → Reed (partner name conflict).

BEGIN;

INSERT INTO public.agent_employee_templates (
  role_key, template_key, skill_seed_key, default_name, name_pool, role, level, disc_profile,
  tagline, description, responsibilities, skills, core_beliefs, specialty, image_url, is_enabled, sort_order
) VALUES (
  'ads_manager', 'ads_manager', 'ads_manager', 'Blaze',
  '["Blaze","Kai","Nova","Rex","Sloane"]'::jsonb,
  'Meta Ads Manager', 'employee', 'D/C (Dominant / Conscientious)',
  'The Spender With Taste',
  'Owns Meta ads research, creative direction briefs, ad kits, and webinar performance audits for agency client launches.',
  '["Run ad-library market research with receipts","Build ad concepts and copy packages for Meta","Ship ad kits and design-ready creative briefs","Audit webinar funnel + ad performance after launch"]'::jsonb,
  '["roas-market-research","roas-ad-concepts","roas-ad-copy","roas-ad-kit","roas-ad-design","roas-webinar-audit","human-written-copy"]'::jsonb,
  '["Receipts or questions — no naked claims","Creative is a hypothesis, spend is the test","Protect the client budget like it is yours","Ship the kit the designer can build without guessing"]'::jsonb,
  'Meta ads lifecycle, audience targeting, creative testing, budget optimization',
  'https://api.dicebear.com/9.x/shapes/svg?seed=AdsManager',
  true, 17
)
ON CONFLICT (role_key) DO UPDATE SET
  template_key = EXCLUDED.template_key,
  skill_seed_key = EXCLUDED.skill_seed_key,
  default_name = EXCLUDED.default_name,
  name_pool = EXCLUDED.name_pool,
  role = EXCLUDED.role,
  level = EXCLUDED.level,
  disc_profile = EXCLUDED.disc_profile,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  responsibilities = EXCLUDED.responsibilities,
  skills = EXCLUDED.skills,
  core_beliefs = EXCLUDED.core_beliefs,
  specialty = EXCLUDED.specialty,
  image_url = EXCLUDED.image_url,
  is_enabled = EXCLUDED.is_enabled,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

UPDATE public.agent_employee_templates
SET
  default_name = 'Reed',
  name_pool = '["Reed","Aaron","Dylan","Mira"]'::jsonb,
  updated_at = now()
WHERE role_key = 'strategist';

COMMIT;
