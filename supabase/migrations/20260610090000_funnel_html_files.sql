-- HTML-first funnel page bundles.
-- Text source lives in funnel_files. Binary uploads stay in media_assets/media
-- and are mapped into a funnel bundle through funnel_assets.
-- Scope model: funnel_files rows with funnel_page_id are page-scoped (entry index.html
-- plus page CSS/JS); rows with funnel_page_id IS NULL are funnel-shared files
-- (convention: shared/ path prefix — shared/styles.css, shared/nav.html, shared/footer.html).
-- The public funnels app reads these server-side via the service role client
-- (same access path as funnel_pages today), so no anon SELECT policy is required.

BEGIN;

CREATE TABLE IF NOT EXISTS public.funnel_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  funnel_page_id UUID NULL REFERENCES public.funnel_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'text/html',
  role TEXT NOT NULL DEFAULT 'source',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT funnel_files_path_not_empty CHECK (length(trim(path)) > 0),
  CONSTRAINT funnel_files_path_relative CHECK (
    path !~ '(^/|^[A-Za-z]:|\\\\|(^|/)\.\.(/|$))'
  ),
  CONSTRAINT funnel_files_role_check CHECK (
    role = ANY (ARRAY['entry'::text, 'source'::text, 'style'::text, 'script'::text, 'manifest'::text])
  ),
  CONSTRAINT funnel_files_size_non_negative CHECK (size_bytes >= 0)
);

-- Page-scoped files are unique per page; shared files are unique per funnel.
CREATE UNIQUE INDEX IF NOT EXISTS funnel_files_page_path_idx
  ON public.funnel_files (funnel_page_id, path)
  WHERE funnel_page_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS funnel_files_shared_path_idx
  ON public.funnel_files (funnel_id, path)
  WHERE funnel_page_id IS NULL;

CREATE INDEX IF NOT EXISTS funnel_files_funnel_id_idx
  ON public.funnel_files (funnel_id);

CREATE INDEX IF NOT EXISTS funnel_files_funnel_page_id_idx
  ON public.funnel_files (funnel_page_id);

CREATE INDEX IF NOT EXISTS funnel_files_user_id_idx
  ON public.funnel_files (user_id);

CREATE TABLE IF NOT EXISTS public.funnel_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'asset',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT funnel_assets_path_not_empty CHECK (length(trim(path)) > 0),
  CONSTRAINT funnel_assets_path_relative CHECK (
    path !~ '(^/|^[A-Za-z]:|\\\\|(^|/)\.\.(/|$))'
  ),
  CONSTRAINT funnel_assets_role_check CHECK (
    role = ANY (ARRAY['asset'::text, 'image'::text, 'font'::text, 'video'::text])
  ),
  CONSTRAINT funnel_assets_size_non_negative CHECK (size_bytes >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS funnel_assets_funnel_path_idx
  ON public.funnel_assets (funnel_id, path);

CREATE INDEX IF NOT EXISTS funnel_assets_funnel_id_idx
  ON public.funnel_assets (funnel_id);

CREATE INDEX IF NOT EXISTS funnel_assets_media_asset_id_idx
  ON public.funnel_assets (media_asset_id);

CREATE INDEX IF NOT EXISTS funnel_assets_user_id_idx
  ON public.funnel_assets (user_id);

-- Per-page source mode: 'tsx' = legacy single-component generated_html,
-- 'html_bundle' = funnel_files bundle with index.html entry.
ALTER TABLE public.funnel_pages
  ADD COLUMN IF NOT EXISTS source_mode TEXT NOT NULL DEFAULT 'tsx';

DO $$
BEGIN
  ALTER TABLE public.funnel_pages
    ADD CONSTRAINT funnel_pages_source_mode_check
    CHECK (source_mode = ANY (ARRAY['tsx'::text, 'html_bundle'::text]));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.funnel_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS funnel_files_parent_select ON public.funnel_files;
CREATE POLICY funnel_files_parent_select
  ON public.funnel_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_files.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'view'))
        )
    )
  );

DROP POLICY IF EXISTS funnel_files_parent_insert ON public.funnel_files;
CREATE POLICY funnel_files_parent_insert
  ON public.funnel_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_files.funnel_id
        AND f.user_id = funnel_files.user_id
        AND f.org_id IS NOT DISTINCT FROM funnel_files.org_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
    AND (
      funnel_files.funnel_page_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.funnel_pages fp
        WHERE fp.id = funnel_files.funnel_page_id
          AND fp.funnel_id = funnel_files.funnel_id
      )
    )
  );

DROP POLICY IF EXISTS funnel_files_parent_update ON public.funnel_files;
CREATE POLICY funnel_files_parent_update
  ON public.funnel_files
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_files.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_files.funnel_id
        AND f.user_id = funnel_files.user_id
        AND f.org_id IS NOT DISTINCT FROM funnel_files.org_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
    AND (
      funnel_files.funnel_page_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.funnel_pages fp
        WHERE fp.id = funnel_files.funnel_page_id
          AND fp.funnel_id = funnel_files.funnel_id
      )
    )
  );

DROP POLICY IF EXISTS funnel_files_parent_delete ON public.funnel_files;
CREATE POLICY funnel_files_parent_delete
  ON public.funnel_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_files.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
  );

DROP POLICY IF EXISTS funnel_assets_parent_select ON public.funnel_assets;
CREATE POLICY funnel_assets_parent_select
  ON public.funnel_assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_assets.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'view'))
        )
    )
  );

DROP POLICY IF EXISTS funnel_assets_parent_insert ON public.funnel_assets;
CREATE POLICY funnel_assets_parent_insert
  ON public.funnel_assets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_assets.funnel_id
        AND f.user_id = funnel_assets.user_id
        AND f.org_id IS NOT DISTINCT FROM funnel_assets.org_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.media_assets ma
      WHERE ma.id = funnel_assets.media_asset_id
    )
  );

DROP POLICY IF EXISTS funnel_assets_parent_update ON public.funnel_assets;
CREATE POLICY funnel_assets_parent_update
  ON public.funnel_assets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_assets.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_assets.funnel_id
        AND f.user_id = funnel_assets.user_id
        AND f.org_id IS NOT DISTINCT FROM funnel_assets.org_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.media_assets ma
      WHERE ma.id = funnel_assets.media_asset_id
    )
  );

DROP POLICY IF EXISTS funnel_assets_parent_delete ON public.funnel_assets;
CREATE POLICY funnel_assets_parent_delete
  ON public.funnel_assets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_assets.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.org_id IS NOT NULL AND is_org_member(f.org_id))
          OR (f.campaign_id IS NOT NULL AND has_team_campaign_access(f.campaign_id, 'edit'))
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_files TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_assets TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS set_updated_at_funnel_files ON public.funnel_files;
CREATE TRIGGER set_updated_at_funnel_files
  BEFORE UPDATE ON public.funnel_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_funnel_assets ON public.funnel_assets;
CREATE TRIGGER set_updated_at_funnel_assets
  BEFORE UPDATE ON public.funnel_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.funnel_files;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.funnel_assets;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

COMMIT;
