ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.ad_sets ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.sequences ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_space_id ON public.ad_campaigns(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_sets_space_id ON public.ad_sets(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ads_space_id ON public.ads(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offers_space_id ON public.offers(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_avatars_space_id ON public.avatars(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sequences_space_id ON public.sequences(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_posts_space_id ON public.social_posts(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funnels_space_id ON public.funnels(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_presentations_space_id ON public.presentations(space_id) WHERE space_id IS NOT NULL;
