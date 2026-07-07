ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS generated_tsx TEXT;
