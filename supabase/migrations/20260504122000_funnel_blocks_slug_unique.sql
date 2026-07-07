ALTER TABLE public.funnel_blocks
  ADD CONSTRAINT funnel_blocks_slug_key UNIQUE (slug);
