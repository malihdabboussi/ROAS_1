CREATE TABLE IF NOT EXISTS public.space_drive_push_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id UUID NOT NULL REFERENCES public.space_drive_folder_mappings(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google_drive',
  channel_id TEXT NOT NULL UNIQUE,
  channel_token TEXT NOT NULL,
  resource_id TEXT,
  resource_uri TEXT,
  expiration_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT space_drive_push_channels_provider_check CHECK (provider IN ('google_drive'))
);

CREATE UNIQUE INDEX IF NOT EXISTS space_drive_push_channels_mapping_active_unique
  ON public.space_drive_push_channels (mapping_id)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS space_drive_push_channels_expiration_idx
  ON public.space_drive_push_channels (expiration_at)
  WHERE active = true;

ALTER TABLE public.space_drive_push_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS space_drive_push_channels_select_policy ON public.space_drive_push_channels;
CREATE POLICY space_drive_push_channels_select_policy
  ON public.space_drive_push_channels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.space_drive_folder_mappings m
      WHERE m.id = mapping_id
        AND (
          m.user_id = auth.uid()
          OR m.org_id IN (
            SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS space_drive_push_channels_insert_policy ON public.space_drive_push_channels;
CREATE POLICY space_drive_push_channels_insert_policy
  ON public.space_drive_push_channels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.space_drive_folder_mappings m
      WHERE m.id = mapping_id
        AND (
          m.user_id = auth.uid()
          OR m.org_id IN (
            SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS space_drive_push_channels_update_policy ON public.space_drive_push_channels;
CREATE POLICY space_drive_push_channels_update_policy
  ON public.space_drive_push_channels
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.space_drive_folder_mappings m
      WHERE m.id = mapping_id
        AND (
          m.user_id = auth.uid()
          OR m.org_id IN (
            SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.space_drive_folder_mappings m
      WHERE m.id = mapping_id
        AND (
          m.user_id = auth.uid()
          OR m.org_id IN (
            SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS space_drive_push_channels_delete_policy ON public.space_drive_push_channels;
CREATE POLICY space_drive_push_channels_delete_policy
  ON public.space_drive_push_channels
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.space_drive_folder_mappings m
      WHERE m.id = mapping_id
        AND (
          m.user_id = auth.uid()
          OR m.org_id IN (
            SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
          )
        )
    )
  );

DROP TRIGGER IF EXISTS set_space_drive_push_channels_updated_at ON public.space_drive_push_channels;
CREATE TRIGGER set_space_drive_push_channels_updated_at
  BEFORE UPDATE ON public.space_drive_push_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
