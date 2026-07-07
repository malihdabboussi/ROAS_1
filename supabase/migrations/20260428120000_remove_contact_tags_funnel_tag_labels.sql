-- Remove workspace tag catalog; funnel conversion tags are plain strings (match contacts.tags)
DROP TABLE IF EXISTS public.contact_tags CASCADE;

ALTER TABLE public.funnels DROP COLUMN IF EXISTS tag_ids;
ALTER TABLE public.funnels ADD COLUMN tag_ids TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_funnels_tag_ids_gin ON public.funnels USING GIN (tag_ids);
