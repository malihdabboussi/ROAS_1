BEGIN;

ALTER TABLE public.space_ad_searches
  ADD COLUMN IF NOT EXISTS mission_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_space_ad_searches_mission_ids
  ON public.space_ad_searches USING gin (mission_ids);

COMMIT;
