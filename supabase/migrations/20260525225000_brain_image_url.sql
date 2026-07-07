-- Per-brain custom image. Used by Brain Home cards (Company Cortex,
-- Customer Brain, etc.) so users can attach a logo without overwriting the
-- org-level avatar.

ALTER TABLE public.ns_brains
  ADD COLUMN IF NOT EXISTS image_url text;
