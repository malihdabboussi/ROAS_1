-- Spaces sidebar reorder: persist relative order within a campaign.
ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_spaces_campaign_sort_order
  ON public.spaces (campaign_id, sort_order)
  WHERE campaign_id IS NOT NULL;
