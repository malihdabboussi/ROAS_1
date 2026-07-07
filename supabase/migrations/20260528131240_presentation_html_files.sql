-- HTML-first presentation bundles.
-- Text source lives in presentation_files. Binary uploads stay in media_assets/media
-- and are mapped into a presentation bundle through presentation_assets.

BEGIN;

CREATE TABLE IF NOT EXISTS public.presentation_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'text/html',
  role TEXT NOT NULL DEFAULT 'source',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT presentation_files_path_not_empty CHECK (length(trim(path)) > 0),
  CONSTRAINT presentation_files_path_relative CHECK (
    path !~ '(^/|^[A-Za-z]:|\\\\|(^|/)\.\.(/|$))'
  ),
  CONSTRAINT presentation_files_role_check CHECK (
    role = ANY (ARRAY['entry'::text, 'source'::text, 'style'::text, 'script'::text, 'manifest'::text])
  ),
  CONSTRAINT presentation_files_size_non_negative CHECK (size_bytes >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS presentation_files_presentation_path_idx
  ON public.presentation_files (presentation_id, path);

CREATE INDEX IF NOT EXISTS presentation_files_presentation_id_idx
  ON public.presentation_files (presentation_id);

CREATE INDEX IF NOT EXISTS presentation_files_user_id_idx
  ON public.presentation_files (user_id);

CREATE TABLE IF NOT EXISTS public.presentation_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'asset',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT presentation_assets_path_not_empty CHECK (length(trim(path)) > 0),
  CONSTRAINT presentation_assets_path_relative CHECK (
    path !~ '(^/|^[A-Za-z]:|\\\\|(^|/)\.\.(/|$))'
  ),
  CONSTRAINT presentation_assets_role_check CHECK (
    role = ANY (ARRAY['asset'::text, 'image'::text, 'font'::text, 'video'::text])
  ),
  CONSTRAINT presentation_assets_size_non_negative CHECK (size_bytes >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS presentation_assets_presentation_path_idx
  ON public.presentation_assets (presentation_id, path);

CREATE INDEX IF NOT EXISTS presentation_assets_presentation_id_idx
  ON public.presentation_assets (presentation_id);

CREATE INDEX IF NOT EXISTS presentation_assets_media_asset_id_idx
  ON public.presentation_assets (media_asset_id);

CREATE INDEX IF NOT EXISTS presentation_assets_user_id_idx
  ON public.presentation_assets (user_id);

ALTER TABLE public.presentation_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS presentation_files_parent_select ON public.presentation_files;
CREATE POLICY presentation_files_parent_select
  ON public.presentation_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_files.presentation_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'view'))
        )
    )
  );

DROP POLICY IF EXISTS presentation_files_parent_insert ON public.presentation_files;
CREATE POLICY presentation_files_parent_insert
  ON public.presentation_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_files.presentation_id
        AND p.user_id = presentation_files.user_id
        AND p.org_id IS NOT DISTINCT FROM presentation_files.org_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'edit'))
        )
    )
  );

DROP POLICY IF EXISTS presentation_files_parent_update ON public.presentation_files;
CREATE POLICY presentation_files_parent_update
  ON public.presentation_files
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_files.presentation_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'edit'))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_files.presentation_id
        AND p.user_id = presentation_files.user_id
        AND p.org_id IS NOT DISTINCT FROM presentation_files.org_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'edit'))
        )
    )
  );

DROP POLICY IF EXISTS presentation_files_parent_delete ON public.presentation_files;
CREATE POLICY presentation_files_parent_delete
  ON public.presentation_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_files.presentation_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'edit'))
        )
    )
  );

DROP POLICY IF EXISTS presentation_assets_parent_select ON public.presentation_assets;
CREATE POLICY presentation_assets_parent_select
  ON public.presentation_assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_assets.presentation_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'view'))
        )
    )
  );

DROP POLICY IF EXISTS presentation_assets_parent_insert ON public.presentation_assets;
CREATE POLICY presentation_assets_parent_insert
  ON public.presentation_assets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_assets.presentation_id
        AND p.user_id = presentation_assets.user_id
        AND p.org_id IS NOT DISTINCT FROM presentation_assets.org_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'edit'))
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.media_assets ma
      WHERE ma.id = presentation_assets.media_asset_id
    )
  );

DROP POLICY IF EXISTS presentation_assets_parent_update ON public.presentation_assets;
CREATE POLICY presentation_assets_parent_update
  ON public.presentation_assets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_assets.presentation_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'edit'))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_assets.presentation_id
        AND p.user_id = presentation_assets.user_id
        AND p.org_id IS NOT DISTINCT FROM presentation_assets.org_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'edit'))
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.media_assets ma
      WHERE ma.id = presentation_assets.media_asset_id
    )
  );

DROP POLICY IF EXISTS presentation_assets_parent_delete ON public.presentation_assets;
CREATE POLICY presentation_assets_parent_delete
  ON public.presentation_assets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.presentations p
      WHERE p.id = presentation_assets.presentation_id
        AND (
          p.user_id = auth.uid()
          OR (p.org_id IS NOT NULL AND is_org_member(p.org_id))
          OR (p.campaign_id IS NOT NULL AND has_team_campaign_access(p.campaign_id, 'edit'))
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.presentation_files TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presentation_assets TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS set_updated_at_presentation_files ON public.presentation_files;
CREATE TRIGGER set_updated_at_presentation_files
  BEFORE UPDATE ON public.presentation_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_presentation_assets ON public.presentation_assets;
CREATE TRIGGER set_updated_at_presentation_assets
  BEFORE UPDATE ON public.presentation_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.presentation_files;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.presentation_assets;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

COMMIT;
