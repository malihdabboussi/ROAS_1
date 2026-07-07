CREATE TABLE IF NOT EXISTS public.link_preview_cache (
  url_hash TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  provider TEXT NOT NULL,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS link_preview_cache_expires_at_idx
  ON public.link_preview_cache (expires_at);

ALTER TABLE public.link_preview_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read link preview cache"
  ON public.link_preview_cache
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can write public link preview cache"
  ON public.link_preview_cache
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND provider NOT IN ('drive', 'internal'));

CREATE POLICY "authenticated users can update public link preview cache"
  ON public.link_preview_cache
  FOR UPDATE
  USING (auth.role() = 'authenticated' AND provider NOT IN ('drive', 'internal'))
  WITH CHECK (auth.role() = 'authenticated' AND provider NOT IN ('drive', 'internal'));
