-- Repair production drift between the funnel page runtime contract and the
-- legacy funnel_pages table, then restore the HTML bundle storage it requires.

BEGIN;

ALTER TABLE public.funnel_pages
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS generated_html TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS generated_css TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS generation_mode TEXT NOT NULL DEFAULT 'generated',
  ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS org_id UUID NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_mode TEXT NOT NULL DEFAULT 'tsx';

DO $$
BEGIN
  ALTER TABLE public.funnel_pages
    ADD CONSTRAINT funnel_pages_source_mode_check
    CHECK (source_mode = ANY (ARRAY['tsx'::text, 'html_bundle'::text]));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_funnel_pages_org_id
  ON public.funnel_pages (org_id);

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

ALTER TABLE public.funnel_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS funnel_files_campaign_access ON public.funnel_files;
CREATE POLICY funnel_files_campaign_access
  ON public.funnel_files FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.funnels f
      WHERE f.id = funnel_files.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.campaign_id IS NOT NULL AND public.has_org_campaign_access(f.campaign_id, 'view'))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.funnels f
      WHERE f.id = funnel_files.funnel_id
        AND f.user_id = funnel_files.user_id
        AND f.org_id IS NOT DISTINCT FROM funnel_files.org_id
        AND (
          f.user_id = auth.uid()
          OR (f.campaign_id IS NOT NULL AND public.has_org_campaign_access(f.campaign_id, 'edit'))
        )
    )
    AND (
      funnel_files.funnel_page_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.funnel_pages fp
        WHERE fp.id = funnel_files.funnel_page_id
          AND fp.funnel_id = funnel_files.funnel_id
      )
    )
  );

DROP POLICY IF EXISTS funnel_assets_campaign_access ON public.funnel_assets;
CREATE POLICY funnel_assets_campaign_access
  ON public.funnel_assets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.funnels f
      WHERE f.id = funnel_assets.funnel_id
        AND (
          f.user_id = auth.uid()
          OR (f.campaign_id IS NOT NULL AND public.has_org_campaign_access(f.campaign_id, 'view'))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.funnels f
      WHERE f.id = funnel_assets.funnel_id
        AND f.user_id = funnel_assets.user_id
        AND f.org_id IS NOT DISTINCT FROM funnel_assets.org_id
        AND (
          f.user_id = auth.uid()
          OR (f.campaign_id IS NOT NULL AND public.has_org_campaign_access(f.campaign_id, 'edit'))
        )
    )
    AND EXISTS (
      SELECT 1 FROM public.media_assets ma
      WHERE ma.id = funnel_assets.media_asset_id
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_files TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_assets TO authenticated, service_role;

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

NOTIFY pgrst, 'reload schema';

COMMIT;
