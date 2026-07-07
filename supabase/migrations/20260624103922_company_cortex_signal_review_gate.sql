ALTER TABLE public.company_cortex_signals
  ADD COLUMN IF NOT EXISTS confidence_basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_decision text,
  ADD COLUMN IF NOT EXISTS review_note text;

ALTER TABLE public.company_cortex_objects
  ADD COLUMN IF NOT EXISTS confidence_basis jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_cortex_signals_evidence_refs_nonempty'
      AND conrelid = 'public.company_cortex_signals'::regclass
  ) THEN
    ALTER TABLE public.company_cortex_signals
      ADD CONSTRAINT company_cortex_signals_evidence_refs_nonempty
      CHECK (
        jsonb_typeof(evidence_refs) = 'array'
        AND jsonb_array_length(evidence_refs) > 0
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_cortex_objects_source_signal_ids_nonempty'
      AND conrelid = 'public.company_cortex_objects'::regclass
  ) THEN
    ALTER TABLE public.company_cortex_objects
      ADD CONSTRAINT company_cortex_objects_source_signal_ids_nonempty
      CHECK (cardinality(source_signal_ids) > 0)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_cortex_objects_evidence_refs_nonempty'
      AND conrelid = 'public.company_cortex_objects'::regclass
  ) THEN
    ALTER TABLE public.company_cortex_objects
      ADD CONSTRAINT company_cortex_objects_evidence_refs_nonempty
      CHECK (
        jsonb_typeof(evidence_refs) = 'array'
        AND jsonb_array_length(evidence_refs) > 0
      )
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_cortex_objects_retrieval_rule_complete'
      AND conrelid = 'public.company_cortex_objects'::regclass
  ) THEN
    ALTER TABLE public.company_cortex_objects
      ADD CONSTRAINT company_cortex_objects_retrieval_rule_complete
      CHECK (
        jsonb_typeof(retrieval_rule) = 'object'
        AND length(btrim(coalesce(retrieval_rule ->> 'trigger', ''))) > 0
        AND length(btrim(coalesce(retrieval_rule ->> 'context_form', ''))) > 0
      )
      NOT VALID;
  END IF;
END $$;
