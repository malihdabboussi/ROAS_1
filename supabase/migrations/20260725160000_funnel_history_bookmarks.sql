ALTER TABLE public.funnel_change_sets
  ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS funnel_change_sets_bookmarked_idx
  ON public.funnel_change_sets (funnel_id, funnel_page_id, created_at DESC)
  WHERE is_bookmarked = true;
