-- Align system theme JSON with app emerald primary (#10b981 scale).
-- Editing 20260212161311_* only applies on empty DBs; this updates rows already seeded in prod/staging.

UPDATE public.branding_themes
SET colors = '{"body":"#5C5C5C","input":"#E7E7E7","border":"#E5E5E5","danger":"#EF4444","heading":"#161616","primary":"#10b981","success":"#34C759","warning":"#FF9500","primaryDark":"#059669","primaryLight":"#34d399","cardBackground":"#FFFFFF","pageBackground":"#FAFAFA","secondaryAccent1":"#00B8D4","secondaryAccent2":"#FF5470"}'::jsonb
WHERE slug = 'vibe-base-light'
  AND is_system = true;

UPDATE public.branding_themes
SET colors = '{"body":"#B8B8B8","input":"#252525","border":"#333333","danger":"#EF4444","heading":"#FFFFFF","primary":"#10b981","success":"#34C759","warning":"#FF9500","primaryDark":"#059669","primaryLight":"#34d399","cardBackground":"#1A1A1A","pageBackground":"#161616","secondaryAccent1":"#0d9488","secondaryAccent2":"#047857"}'::jsonb
WHERE slug = 'vibe-base-dark'
  AND is_system = true;
