BEGIN;

CREATE TABLE IF NOT EXISTS public.funnel_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (
    category IN (
      'hero',
      'navigation',
      'benefits',
      'features',
      'social-proof',
      'urgency',
      'form',
      'cta',
      'footer',
      'pricing',
      'faq',
      'stats',
      'team',
      'gallery',
      'video',
      'countdown',
      'checkout',
      'application',
      'unique'
    )
  ),
  page_types TEXT[] NOT NULL DEFAULT '{}',
  funnel_types TEXT[] NOT NULL DEFAULT '{}',
  slot_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  theme_tokens TEXT[] NOT NULL DEFAULT '{}',
  asset_slots JSONB NOT NULL DEFAULT '{}'::jsonb,
  tsx_template TEXT NOT NULL,
  default_props JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_url TEXT,
  layout_signature TEXT NOT NULL DEFAULT 'unclassified',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  quality_status TEXT NOT NULL DEFAULT 'draft' CHECK (quality_status IN ('draft', 'reviewed', 'approved')),
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'extracted', 'imported')),
  source_reference JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_system BOOLEAN NOT NULL DEFAULT false,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (is_system = false OR org_id IS NULL),
  CHECK (is_system = true OR org_id IS NOT NULL OR created_by IS NOT NULL),
  CHECK (is_published = false OR quality_status = 'approved')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_funnel_blocks_system_slug
  ON public.funnel_blocks (slug)
  WHERE org_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_funnel_blocks_org_slug
  ON public.funnel_blocks (org_id, slug)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_funnel_blocks_category
  ON public.funnel_blocks (category);

CREATE INDEX IF NOT EXISTS idx_funnel_blocks_quality_status
  ON public.funnel_blocks (quality_status);

CREATE INDEX IF NOT EXISTS idx_funnel_blocks_published
  ON public.funnel_blocks (is_published, quality_status);

CREATE INDEX IF NOT EXISTS idx_funnel_blocks_org_id
  ON public.funnel_blocks (org_id);

CREATE INDEX IF NOT EXISTS idx_funnel_blocks_page_types
  ON public.funnel_blocks USING GIN (page_types);

CREATE INDEX IF NOT EXISTS idx_funnel_blocks_funnel_types
  ON public.funnel_blocks USING GIN (funnel_types);

CREATE TABLE IF NOT EXISTS public.funnel_block_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.funnel_blocks(id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('thumbnail', 'source_image', 'video', 'asset')),
  storage_url TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_block_assets_block_id
  ON public.funnel_block_assets (block_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_funnel_block_assets_slot_kind
  ON public.funnel_block_assets (block_id, slot_key, kind);

ALTER TABLE public.funnel_pages
  ADD COLUMN IF NOT EXISTS composition JSONB;

CREATE INDEX IF NOT EXISTS idx_funnel_pages_composition
  ON public.funnel_pages USING GIN (composition);

ALTER TABLE public.funnel_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_block_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visible funnel blocks are readable" ON public.funnel_blocks;
CREATE POLICY "Visible funnel blocks are readable"
  ON public.funnel_blocks FOR SELECT
  USING (
    public.is_admin()
    OR (
      is_system = true
      AND is_published = true
      AND quality_status = 'approved'
    )
    OR (
      org_id IS NOT NULL
      AND public.is_org_member(org_id)
    )
  );

DROP POLICY IF EXISTS "Admins can manage system funnel blocks" ON public.funnel_blocks;
CREATE POLICY "Admins can manage system funnel blocks"
  ON public.funnel_blocks FOR ALL
  USING (is_system = true AND public.is_admin())
  WITH CHECK (is_system = true AND org_id IS NULL AND public.is_admin());

DROP POLICY IF EXISTS "Org members can manage org funnel blocks" ON public.funnel_blocks;
CREATE POLICY "Org members can manage org funnel blocks"
  ON public.funnel_blocks FOR ALL
  USING (
    is_system = false
    AND org_id IS NOT NULL
    AND public.is_org_member(org_id)
  )
  WITH CHECK (
    is_system = false
    AND org_id IS NOT NULL
    AND public.is_org_member(org_id)
  );

DROP POLICY IF EXISTS "Readable funnel block assets are readable" ON public.funnel_block_assets;
CREATE POLICY "Readable funnel block assets are readable"
  ON public.funnel_block_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnel_blocks block
      WHERE block.id = funnel_block_assets.block_id
        AND (
          public.is_admin()
          OR (
            block.is_system = true
            AND block.is_published = true
            AND block.quality_status = 'approved'
          )
          OR (
            block.org_id IS NOT NULL
            AND public.is_org_member(block.org_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS "Admins can manage system funnel block assets" ON public.funnel_block_assets;
CREATE POLICY "Admins can manage system funnel block assets"
  ON public.funnel_block_assets FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnel_blocks block
      WHERE block.id = funnel_block_assets.block_id
        AND block.is_system = true
        AND public.is_admin()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.funnel_blocks block
      WHERE block.id = funnel_block_assets.block_id
        AND block.is_system = true
        AND public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Org members can manage org funnel block assets" ON public.funnel_block_assets;
CREATE POLICY "Org members can manage org funnel block assets"
  ON public.funnel_block_assets FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnel_blocks block
      WHERE block.id = funnel_block_assets.block_id
        AND block.is_system = false
        AND block.org_id IS NOT NULL
        AND public.is_org_member(block.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.funnel_blocks block
      WHERE block.id = funnel_block_assets.block_id
        AND block.is_system = false
        AND block.org_id IS NOT NULL
        AND public.is_org_member(block.org_id)
    )
  );

DROP TRIGGER IF EXISTS set_updated_at_funnel_blocks ON public.funnel_blocks;
CREATE TRIGGER set_updated_at_funnel_blocks
  BEFORE UPDATE ON public.funnel_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE public.funnel_blocks IS 'Designer-reviewed TSX block templates used by agents to compose high-quality funnel pages.';
COMMENT ON COLUMN public.funnel_blocks.quality_status IS 'Review gate for block library QA. Agents only receive blocks that are approved and published.';
COMMENT ON COLUMN public.funnel_pages.composition IS 'Frozen block composition snapshot for hybrid block-rendered funnel pages. Existing generated_html remains the legacy fallback.';

COMMIT;
