ALTER TABLE public.funnel_blocks
  DROP CONSTRAINT IF EXISTS funnel_blocks_quality_status_check;

ALTER TABLE public.funnel_blocks
  ADD CONSTRAINT funnel_blocks_quality_status_check
  CHECK (quality_status IN ('draft', 'reviewed', 'approved', 'error'));
