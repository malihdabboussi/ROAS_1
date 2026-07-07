-- Ad Creative Canvas — graph layout + node payloads per ad set

CREATE TABLE IF NOT EXISTS public.ad_creative_canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id UUID NOT NULL REFERENCES public.ad_sets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  default_model_id TEXT NOT NULL DEFAULT 'gemini-3.1-flash-image-preview',
  graph JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  viewport JSONB NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ad_creative_canvases_ad_set_unique UNIQUE (ad_set_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_creative_canvases_user ON public.ad_creative_canvases(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_creative_canvases_org ON public.ad_creative_canvases(org_id) WHERE org_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ad_creative_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID NOT NULL REFERENCES public.ad_creative_canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'brief', 'strategy', 'reference_image', 'image', 'edit', 'variation',
    'copy', 'carousel', 'video', 'overlay', 'ad'
  )),
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'generating', 'ready', 'error')),
  parent_node_id UUID REFERENCES public.ad_creative_nodes(id) ON DELETE SET NULL,
  parent_image_node_id UUID REFERENCES public.ad_creative_nodes(id) ON DELETE SET NULL,
  ad_id UUID REFERENCES public.ads(id) ON DELETE SET NULL,
  image_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_creative_nodes_canvas ON public.ad_creative_nodes(canvas_id);
CREATE INDEX IF NOT EXISTS idx_ad_creative_nodes_ad ON public.ad_creative_nodes(ad_id) WHERE ad_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_creative_nodes_parent_image ON public.ad_creative_nodes(parent_image_node_id) WHERE parent_image_node_id IS NOT NULL;

ALTER TABLE public.ad_creative_canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_creative_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY ad_creative_canvases_own ON public.ad_creative_canvases
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY ad_creative_nodes_own ON public.ad_creative_nodes
  FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_updated_at_ad_creative_canvases ON public.ad_creative_canvases;
CREATE TRIGGER set_updated_at_ad_creative_canvases
  BEFORE UPDATE ON public.ad_creative_canvases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_ad_creative_nodes ON public.ad_creative_nodes;
CREATE TRIGGER set_updated_at_ad_creative_nodes
  BEFORE UPDATE ON public.ad_creative_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Backup table for Phase 2 skill rollback (populated before skill rewrites)
CREATE TABLE IF NOT EXISTS public.agent_skills_ad_backup_20260520 (
  LIKE public.agent_skills INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS public.agent_skill_resources_ad_backup_20260520 (
  LIKE public.agent_skill_resources INCLUDING ALL
);

INSERT INTO public.agent_skills_ad_backup_20260520
SELECT * FROM public.agent_skills
WHERE skill_key IN ('ad-builder', 'ad-creative-design', 'premium-ad-image-generation', 'ad-copy-writing')
ON CONFLICT DO NOTHING;

INSERT INTO public.agent_skill_resources_ad_backup_20260520
SELECT * FROM public.agent_skill_resources
WHERE skill_key IN ('ad-builder', 'ad-creative-design', 'premium-ad-image-generation', 'ad-copy-writing')
ON CONFLICT DO NOTHING;
