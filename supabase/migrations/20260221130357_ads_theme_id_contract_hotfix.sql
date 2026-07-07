ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS theme_id uuid NULL;
CREATE INDEX IF NOT EXISTS idx_ads_theme_id ON public.ads(theme_id);

DO $$
DECLARE
  theme_table text;
BEGIN
  IF to_regclass('public.branding_themes') IS NOT NULL THEN
    theme_table := 'branding_themes';
  ELSIF to_regclass('public.themes') IS NOT NULL THEN
    theme_table := 'themes';
  ELSE
    theme_table := NULL;
  END IF;

  IF theme_table IS NOT NULL THEN
    ALTER TABLE public.ads DROP CONSTRAINT IF EXISTS ads_theme_id_fkey;
    EXECUTE format(
      'ALTER TABLE public.ads ADD CONSTRAINT ads_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.%I(id) ON DELETE SET NULL',
      theme_table
    );
  END IF;
END $$;;
