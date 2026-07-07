-- Lineage for copy-to-campaign: copies reference the source row (or chain) for multi-campaign resolution.
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS copied_from_id UUID REFERENCES public.offers(id) ON DELETE SET NULL;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS copied_from_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL;
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS copied_from_id UUID REFERENCES public.presentations(id) ON DELETE SET NULL;
ALTER TABLE public.sequences ADD COLUMN IF NOT EXISTS copied_from_id UUID REFERENCES public.sequences(id) ON DELETE SET NULL;
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS copied_from_id UUID REFERENCES public.avatars(id) ON DELETE SET NULL;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS copied_from_id UUID REFERENCES public.ads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offers_copied_from ON public.offers(copied_from_id) WHERE copied_from_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funnels_copied_from ON public.funnels(copied_from_id) WHERE copied_from_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_presentations_copied_from ON public.presentations(copied_from_id) WHERE copied_from_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sequences_copied_from ON public.sequences(copied_from_id) WHERE copied_from_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_avatars_copied_from ON public.avatars(copied_from_id) WHERE copied_from_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ads_copied_from ON public.ads(copied_from_id) WHERE copied_from_id IS NOT NULL;
