-- Allow multiple named whiteboards per Campaign while preserving the existing board as default.

ALTER TABLE public.campaign_canvases
  DROP CONSTRAINT IF EXISTS campaign_canvases_campaign_unique;

ALTER TABLE public.campaign_canvases
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY campaign_id ORDER BY created_at, id) AS board_rank
  FROM public.campaign_canvases
)
UPDATE public.campaign_canvases AS board
SET is_default = true
FROM ranked
WHERE ranked.id = board.id
  AND ranked.board_rank = 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_canvases_default
  ON public.campaign_canvases(campaign_id)
  WHERE is_default;

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_canvases_title
  ON public.campaign_canvases(campaign_id, lower(title));

CREATE INDEX IF NOT EXISTS idx_campaign_canvases_campaign
  ON public.campaign_canvases(campaign_id, created_at);
