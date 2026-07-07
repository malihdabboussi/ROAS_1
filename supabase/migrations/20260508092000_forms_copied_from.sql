-- Add copied_from_id lineage column to forms so Copy/Move flows match other artifacts.

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS copied_from_id UUID REFERENCES public.forms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_forms_copied_from ON public.forms(copied_from_id) WHERE copied_from_id IS NOT NULL;
