-- Remove the funnel_blocks TSX block library (user-approved removal).
-- The HTML bundle architecture (funnel_files) replaces block composition;
-- funnel_pages.composition was never rendered at runtime.
-- Apply on develop first; confirm before production (drops tables).

BEGIN;

DROP TABLE IF EXISTS public.funnel_block_assets;
DROP TABLE IF EXISTS public.funnel_blocks;

ALTER TABLE public.funnel_pages DROP COLUMN IF EXISTS composition;

COMMIT;
