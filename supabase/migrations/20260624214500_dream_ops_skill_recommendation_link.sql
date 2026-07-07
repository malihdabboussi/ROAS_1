ALTER TABLE public.agent_improvement_proposals
  ADD COLUMN IF NOT EXISTS source_dream_run_id UUID
  REFERENCES public.dream_ops_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agent_improvement_proposals_source_dream_run
  ON public.agent_improvement_proposals(org_id, source_dream_run_id)
  WHERE source_dream_run_id IS NOT NULL;
