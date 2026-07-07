BEGIN;

CREATE TABLE IF NOT EXISTS public.space_drive_folder_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google_drive',
  drive_folder_id TEXT NOT NULL,
  drive_id TEXT,
  drive_folder_name TEXT NOT NULL,
  root_space_item_id UUID REFERENCES public.space_items(id) ON DELETE SET NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sync_status TEXT NOT NULL DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
  last_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,
  next_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_interval_seconds INTEGER NOT NULL DEFAULT 600 CHECK (sync_interval_seconds >= 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT space_drive_folder_mappings_provider_check CHECK (provider IN ('google_drive')),
  CONSTRAINT space_drive_folder_mappings_space_provider_folder_unique UNIQUE (space_id, provider, drive_folder_id)
);

CREATE INDEX IF NOT EXISTS idx_space_drive_folder_mappings_space_id
  ON public.space_drive_folder_mappings (space_id);

CREATE INDEX IF NOT EXISTS idx_space_drive_folder_mappings_user_id
  ON public.space_drive_folder_mappings (user_id);

CREATE INDEX IF NOT EXISTS idx_space_drive_folder_mappings_next_sync_due
  ON public.space_drive_folder_mappings (next_sync_at)
  WHERE enabled = true AND sync_status = 'idle';

CREATE INDEX IF NOT EXISTS idx_space_drive_folder_mappings_mapping_lookup
  ON public.space_drive_folder_mappings (provider, drive_folder_id);

ALTER TABLE public.space_drive_folder_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own drive folder mappings" ON public.space_drive_folder_mappings;
CREATE POLICY "Users can read own drive folder mappings"
  ON public.space_drive_folder_mappings FOR SELECT TO public
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Org members can read team drive folder mappings" ON public.space_drive_folder_mappings;
CREATE POLICY "Org members can read team drive folder mappings"
  ON public.space_drive_folder_mappings FOR SELECT TO public
  USING (
    org_id IS NOT NULL
    AND is_org_member(org_id)
    AND EXISTS (
      SELECT 1
      FROM public.spaces s
      WHERE s.id = public.space_drive_folder_mappings.space_id
        AND s.visibility = 'team'
    )
  );

DROP POLICY IF EXISTS "Users can insert own drive folder mappings" ON public.space_drive_folder_mappings;
CREATE POLICY "Users can insert own drive folder mappings"
  ON public.space_drive_folder_mappings FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own drive folder mappings" ON public.space_drive_folder_mappings;
CREATE POLICY "Users can update own drive folder mappings"
  ON public.space_drive_folder_mappings FOR UPDATE TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own drive folder mappings" ON public.space_drive_folder_mappings;
CREATE POLICY "Users can delete own drive folder mappings"
  ON public.space_drive_folder_mappings FOR DELETE TO public
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_space_drive_folder_mappings_updated_at ON public.space_drive_folder_mappings;
CREATE TRIGGER set_space_drive_folder_mappings_updated_at
  BEFORE UPDATE ON public.space_drive_folder_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
        AND n.nspname = 'public'
        AND c.relname = 'space_drive_folder_mappings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.space_drive_folder_mappings;
    END IF;
  END IF;
END
$$;

COMMIT;
