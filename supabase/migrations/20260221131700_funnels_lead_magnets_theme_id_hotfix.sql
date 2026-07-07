-- funnels.theme_id
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS theme_id uuid NULL;
CREATE INDEX IF NOT EXISTS idx_funnels_theme_id ON public.funnels(theme_id);

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
    ALTER TABLE public.funnels DROP CONSTRAINT IF EXISTS funnels_theme_id_fkey;
    EXECUTE format(
      'ALTER TABLE public.funnels ADD CONSTRAINT funnels_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.%I(id) ON DELETE SET NULL',
      theme_table
    );
  END IF;
END $$;

-- lead_magnets.theme_id: normalize TEXT -> UUID
DO $$
DECLARE
  current_type text;
  theme_table text;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'lead_magnets' AND column_name = 'theme_id';

  IF current_type IS NOT NULL AND current_type <> 'uuid' THEN
    UPDATE public.lead_magnets
    SET theme_id = NULL
    WHERE theme_id IS NOT NULL
      AND theme_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    ALTER TABLE public.lead_magnets
      ALTER COLUMN theme_id TYPE uuid
      USING NULLIF(theme_id::text, '')::uuid;
  END IF;

  IF to_regclass('public.branding_themes') IS NOT NULL THEN
    theme_table := 'branding_themes';
  ELSIF to_regclass('public.themes') IS NOT NULL THEN
    theme_table := 'themes';
  ELSE
    theme_table := NULL;
  END IF;

  IF theme_table IS NOT NULL THEN
    ALTER TABLE public.lead_magnets DROP CONSTRAINT IF EXISTS lead_magnets_theme_id_fkey;
    EXECUTE format(
      'ALTER TABLE public.lead_magnets ADD CONSTRAINT lead_magnets_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.%I(id) ON DELETE SET NULL',
      theme_table
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_magnets_theme_id ON public.lead_magnets(theme_id);

NOTIFY pgrst, 'reload schema';;
