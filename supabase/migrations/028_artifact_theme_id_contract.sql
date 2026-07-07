-- Phase 1: Theme contract hardening for artifact tables.
-- Adds canonical UUID theme_id columns + FK constraints + indexes.
-- Keeps nullable semantics so campaigns without themes continue to work.

-- funnels.theme_id
ALTER TABLE public.funnels
ADD COLUMN IF NOT EXISTS theme_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'funnels_theme_id_fkey'
      AND conrelid = 'public.funnels'::regclass
  ) THEN
    ALTER TABLE public.funnels
      ADD CONSTRAINT funnels_theme_id_fkey
      FOREIGN KEY (theme_id) REFERENCES public.themes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_funnels_theme_id ON public.funnels(theme_id);

-- ads.theme_id
ALTER TABLE public.ads
ADD COLUMN IF NOT EXISTS theme_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ads_theme_id_fkey'
      AND conrelid = 'public.ads'::regclass
  ) THEN
    ALTER TABLE public.ads
      ADD CONSTRAINT ads_theme_id_fkey
      FOREIGN KEY (theme_id) REFERENCES public.themes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ads_theme_id ON public.ads(theme_id);

-- lead_magnets.theme_id: normalize from TEXT (legacy) to UUID when needed.
DO $$
DECLARE
  current_type TEXT;
BEGIN
  SELECT data_type
  INTO current_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'lead_magnets'
    AND column_name = 'theme_id';

  IF current_type IS NULL THEN
    ALTER TABLE public.lead_magnets
      ADD COLUMN theme_id UUID NULL;
  ELSIF current_type <> 'uuid' THEN
    ALTER TABLE public.lead_magnets
      ALTER COLUMN theme_id TYPE UUID
      USING (
        CASE
          WHEN theme_id IS NULL THEN NULL
          WHEN btrim(theme_id) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN theme_id::uuid
          ELSE NULL
        END
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lead_magnets_theme_id_fkey'
      AND conrelid = 'public.lead_magnets'::regclass
  ) THEN
    ALTER TABLE public.lead_magnets
      ADD CONSTRAINT lead_magnets_theme_id_fkey
      FOREIGN KEY (theme_id) REFERENCES public.themes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_magnets_theme_id ON public.lead_magnets(theme_id);
-- Phase 1: Canonical artifact theme_id contract
-- Adds/normalizes theme_id on funnels, ads, lead_magnets and applies FK + indexes.

DO $$
DECLARE
  theme_table text;
  lead_magnet_theme_type text;
BEGIN
  IF to_regclass('public.branding_themes') IS NOT NULL THEN
    theme_table := 'branding_themes';
  ELSIF to_regclass('public.themes') IS NOT NULL THEN
    theme_table := 'themes';
  ELSE
    theme_table := NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'funnels' AND column_name = 'theme_id'
  ) THEN
    ALTER TABLE public.funnels ADD COLUMN theme_id uuid NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ads' AND column_name = 'theme_id'
  ) THEN
    ALTER TABLE public.ads ADD COLUMN theme_id uuid NULL;
  END IF;

  SELECT data_type
  INTO lead_magnet_theme_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'lead_magnets' AND column_name = 'theme_id';

  IF lead_magnet_theme_type IS NOT NULL AND lead_magnet_theme_type <> 'uuid' THEN
    UPDATE public.lead_magnets
    SET theme_id = NULL
    WHERE theme_id IS NOT NULL
      AND theme_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    ALTER TABLE public.lead_magnets
      ALTER COLUMN theme_id TYPE uuid
      USING NULLIF(theme_id::text, '')::uuid;
  END IF;

  CREATE INDEX IF NOT EXISTS idx_funnels_theme_id ON public.funnels(theme_id);
  CREATE INDEX IF NOT EXISTS idx_ads_theme_id ON public.ads(theme_id);
  CREATE INDEX IF NOT EXISTS idx_lead_magnets_theme_id ON public.lead_magnets(theme_id);

  IF theme_table IS NOT NULL THEN
    ALTER TABLE public.funnels DROP CONSTRAINT IF EXISTS funnels_theme_id_fkey;
    ALTER TABLE public.ads DROP CONSTRAINT IF EXISTS ads_theme_id_fkey;
    ALTER TABLE public.lead_magnets DROP CONSTRAINT IF EXISTS lead_magnets_theme_id_fkey;

    EXECUTE format(
      'ALTER TABLE public.funnels ADD CONSTRAINT funnels_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.%I(id) ON DELETE SET NULL',
      theme_table
    );
    EXECUTE format(
      'ALTER TABLE public.ads ADD CONSTRAINT ads_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.%I(id) ON DELETE SET NULL',
      theme_table
    );
    EXECUTE format(
      'ALTER TABLE public.lead_magnets ADD CONSTRAINT lead_magnets_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.%I(id) ON DELETE SET NULL',
      theme_table
    );
  END IF;
END $$;

