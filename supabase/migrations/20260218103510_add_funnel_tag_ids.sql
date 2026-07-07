ALTER TABLE public.funnels
ADD COLUMN IF NOT EXISTS tag_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];

CREATE INDEX IF NOT EXISTS idx_funnels_tag_ids_gin
ON public.funnels
USING GIN (tag_ids);;
