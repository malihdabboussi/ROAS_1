CREATE TABLE IF NOT EXISTS public.user_object_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

CREATE TABLE IF NOT EXISTS public.user_object_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  object_type_id UUID NOT NULL REFERENCES public.user_object_types(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_agent TEXT,
  campaign_id UUID,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_object_types_user_slug
  ON public.user_object_types (user_id, slug);

CREATE INDEX IF NOT EXISTS idx_user_object_records_user_type_updated
  ON public.user_object_records (user_id, object_type_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_object_records_campaign
  ON public.user_object_records (campaign_id)
  WHERE campaign_id IS NOT NULL;

ALTER TABLE public.user_object_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_object_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_object_types' AND policyname = 'user_object_types_select_own'
  ) THEN
    CREATE POLICY user_object_types_select_own
      ON public.user_object_types
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_object_types' AND policyname = 'user_object_types_insert_own'
  ) THEN
    CREATE POLICY user_object_types_insert_own
      ON public.user_object_types
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_object_types' AND policyname = 'user_object_types_update_own'
  ) THEN
    CREATE POLICY user_object_types_update_own
      ON public.user_object_types
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_object_records' AND policyname = 'user_object_records_select_own'
  ) THEN
    CREATE POLICY user_object_records_select_own
      ON public.user_object_records
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_object_records' AND policyname = 'user_object_records_insert_own'
  ) THEN
    CREATE POLICY user_object_records_insert_own
      ON public.user_object_records
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_object_records' AND policyname = 'user_object_records_update_own'
  ) THEN
    CREATE POLICY user_object_records_update_own
      ON public.user_object_records
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_updated_at_user_object_types ON public.user_object_types;
CREATE TRIGGER set_updated_at_user_object_types
  BEFORE UPDATE ON public.user_object_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_user_object_records ON public.user_object_records;
CREATE TRIGGER set_updated_at_user_object_records
  BEFORE UPDATE ON public.user_object_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
