ALTER TABLE public.company_cortex_dream_runs
  ADD COLUMN IF NOT EXISTS chunks_processed integer NOT NULL DEFAULT 0;

ALTER TABLE public.company_cortex_dream_runs
  DROP CONSTRAINT IF EXISTS company_cortex_dream_runs_chunks_processed_check;

ALTER TABLE public.company_cortex_dream_runs
  ADD CONSTRAINT company_cortex_dream_runs_chunks_processed_check
  CHECK (chunks_processed >= 0);
