CREATE INDEX IF NOT EXISTS idx_company_cortex_settings_brain
  ON public.company_cortex_settings (brain_id)
  WHERE brain_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_company_cortex_signals_dream_run
  ON public.company_cortex_signals (dream_run_id)
  WHERE dream_run_id IS NOT NULL;
