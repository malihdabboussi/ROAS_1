-- Rename Jaime learning-loop storage from the legacy skill-recommendation table names
-- to agent-improvement names. The skill_recommendation_events table intentionally
-- stays as-is because it is still the repeatable-skill evidence stream.

DO $$
BEGIN
  IF to_regclass('public.agent_improvement_candidates') IS NULL
     AND to_regclass('public.skill_recommendation_candidates') IS NOT NULL THEN
    ALTER TABLE public.skill_recommendation_candidates RENAME TO agent_improvement_candidates;
  END IF;

  IF to_regclass('public.agent_improvement_jobs') IS NULL
     AND to_regclass('public.skill_recommendation_jobs') IS NOT NULL THEN
    ALTER TABLE public.skill_recommendation_jobs RENAME TO agent_improvement_jobs;
  END IF;

  IF to_regclass('public.agent_improvement_proposals') IS NULL
     AND to_regclass('public.skill_recommendations') IS NOT NULL THEN
    ALTER TABLE public.skill_recommendations RENAME TO agent_improvement_proposals;
  END IF;
END $$;

ALTER INDEX IF EXISTS public.uq_skill_recommendation_candidates_group
  RENAME TO uq_agent_improvement_candidates_group;
ALTER INDEX IF EXISTS public.idx_skill_recommendation_candidates_org_status
  RENAME TO idx_agent_improvement_candidates_org_status;

ALTER INDEX IF EXISTS public.idx_skill_recommendation_jobs_due
  RENAME TO idx_agent_improvement_jobs_due;
ALTER INDEX IF EXISTS public.idx_skill_recommendation_jobs_org_created
  RENAME TO idx_agent_improvement_jobs_org_created;
ALTER INDEX IF EXISTS public.uq_skill_recommendation_jobs_active_dedupe
  RENAME TO uq_agent_improvement_jobs_active_dedupe;

ALTER INDEX IF EXISTS public.uq_skill_recommendations_candidate
  RENAME TO uq_agent_improvement_proposals_candidate;
ALTER INDEX IF EXISTS public.idx_skill_recommendations_org_status
  RENAME TO idx_agent_improvement_proposals_org_status;
ALTER INDEX IF EXISTS public.idx_skill_recommendations_org_artifact_lock
  RENAME TO idx_agent_improvement_proposals_org_artifact_lock;
ALTER INDEX IF EXISTS public.idx_skill_recommendations_org_customer_visible
  RENAME TO idx_agent_improvement_proposals_org_customer_visible;
ALTER INDEX IF EXISTS public.idx_skill_recommendations_source_dream_run
  RENAME TO idx_agent_improvement_proposals_source_dream_run;

DO $$
BEGIN
  IF to_regclass('public.agent_improvement_candidates') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_candidates'::regclass
        AND conname = 'skill_recommendation_candidates_pkey'
    ) THEN
      ALTER TABLE public.agent_improvement_candidates
        RENAME CONSTRAINT skill_recommendation_candidates_pkey
        TO agent_improvement_candidates_pkey;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_candidates'::regclass
        AND conname = 'skill_recommendation_candidates_org_id_fkey'
    ) THEN
      ALTER TABLE public.agent_improvement_candidates
        RENAME CONSTRAINT skill_recommendation_candidates_org_id_fkey
        TO agent_improvement_candidates_org_id_fkey;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_candidates'::regclass
        AND conname = 'skill_recommendation_candidates_status_check'
    ) THEN
      ALTER TABLE public.agent_improvement_candidates
        RENAME CONSTRAINT skill_recommendation_candidates_status_check
        TO agent_improvement_candidates_status_check;
    END IF;
  END IF;

  IF to_regclass('public.agent_improvement_jobs') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_jobs'::regclass
        AND conname = 'skill_recommendation_jobs_pkey'
    ) THEN
      ALTER TABLE public.agent_improvement_jobs
        RENAME CONSTRAINT skill_recommendation_jobs_pkey
        TO agent_improvement_jobs_pkey;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_jobs'::regclass
        AND conname = 'skill_recommendation_jobs_user_id_fkey'
    ) THEN
      ALTER TABLE public.agent_improvement_jobs
        RENAME CONSTRAINT skill_recommendation_jobs_user_id_fkey
        TO agent_improvement_jobs_user_id_fkey;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_jobs'::regclass
        AND conname = 'skill_recommendation_jobs_org_id_fkey'
    ) THEN
      ALTER TABLE public.agent_improvement_jobs
        RENAME CONSTRAINT skill_recommendation_jobs_org_id_fkey
        TO agent_improvement_jobs_org_id_fkey;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_jobs'::regclass
        AND conname = 'skill_recommendation_jobs_candidate_id_fkey'
    ) THEN
      ALTER TABLE public.agent_improvement_jobs
        RENAME CONSTRAINT skill_recommendation_jobs_candidate_id_fkey
        TO agent_improvement_jobs_candidate_id_fkey;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_jobs'::regclass
        AND conname = 'skill_recommendation_jobs_status_check'
    ) THEN
      ALTER TABLE public.agent_improvement_jobs
        RENAME CONSTRAINT skill_recommendation_jobs_status_check
        TO agent_improvement_jobs_status_check;
    END IF;
  END IF;

  IF to_regclass('public.agent_improvement_proposals') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_proposals'::regclass
        AND conname = 'skill_recommendations_pkey'
    ) THEN
      ALTER TABLE public.agent_improvement_proposals
        RENAME CONSTRAINT skill_recommendations_pkey
        TO agent_improvement_proposals_pkey;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_proposals'::regclass
        AND conname = 'skill_recommendations_org_id_fkey'
    ) THEN
      ALTER TABLE public.agent_improvement_proposals
        RENAME CONSTRAINT skill_recommendations_org_id_fkey
        TO agent_improvement_proposals_org_id_fkey;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_proposals'::regclass
        AND conname = 'skill_recommendations_candidate_id_fkey'
    ) THEN
      ALTER TABLE public.agent_improvement_proposals
        RENAME CONSTRAINT skill_recommendations_candidate_id_fkey
        TO agent_improvement_proposals_candidate_id_fkey;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_proposals'::regclass
        AND conname = 'skill_recommendations_job_id_fkey'
    ) THEN
      ALTER TABLE public.agent_improvement_proposals
        RENAME CONSTRAINT skill_recommendations_job_id_fkey
        TO agent_improvement_proposals_job_id_fkey;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_proposals'::regclass
        AND conname = 'skill_recommendations_applied_checkpoint_id_fkey'
    ) THEN
      ALTER TABLE public.agent_improvement_proposals
        RENAME CONSTRAINT skill_recommendations_applied_checkpoint_id_fkey
        TO agent_improvement_proposals_applied_checkpoint_id_fkey;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_proposals'::regclass
        AND conname = 'skill_recommendations_applied_by_fkey'
    ) THEN
      ALTER TABLE public.agent_improvement_proposals
        RENAME CONSTRAINT skill_recommendations_applied_by_fkey
        TO agent_improvement_proposals_applied_by_fkey;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_proposals'::regclass
        AND conname = 'skill_recommendations_source_dream_run_id_fkey'
    ) THEN
      ALTER TABLE public.agent_improvement_proposals
        RENAME CONSTRAINT skill_recommendations_source_dream_run_id_fkey
        TO agent_improvement_proposals_source_dream_run_id_fkey;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_proposals'::regclass
        AND conname = 'skill_recommendations_confidence_check'
    ) THEN
      ALTER TABLE public.agent_improvement_proposals
        RENAME CONSTRAINT skill_recommendations_confidence_check
        TO agent_improvement_proposals_confidence_check;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_proposals'::regclass
        AND conname = 'skill_recommendations_status_check'
    ) THEN
      ALTER TABLE public.agent_improvement_proposals
        RENAME CONSTRAINT skill_recommendations_status_check
        TO agent_improvement_proposals_status_check;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_proposals'::regclass
        AND conname = 'skill_recommendations_proposal_kind_check'
    ) THEN
      ALTER TABLE public.agent_improvement_proposals
        RENAME CONSTRAINT skill_recommendations_proposal_kind_check
        TO agent_improvement_proposals_proposal_kind_check;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_proposals'::regclass
        AND conname = 'skill_recommendations_route_out_type_check'
    ) THEN
      ALTER TABLE public.agent_improvement_proposals
        RENAME CONSTRAINT skill_recommendations_route_out_type_check
        TO agent_improvement_proposals_route_out_type_check;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_proposals'::regclass
        AND conname = 'skill_recommendations_target_artifact_kind_check'
    ) THEN
      ALTER TABLE public.agent_improvement_proposals
        RENAME CONSTRAINT skill_recommendations_target_artifact_kind_check
        TO agent_improvement_proposals_target_artifact_kind_check;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_proposals'::regclass
        AND conname = 'skill_recommendations_priority_score_check'
    ) THEN
      ALTER TABLE public.agent_improvement_proposals
        RENAME CONSTRAINT skill_recommendations_priority_score_check
        TO agent_improvement_proposals_priority_score_check;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.agent_improvement_proposals'::regclass
        AND conname = 'skill_recommendations_proposed_patch_shape_check'
    ) THEN
      ALTER TABLE public.agent_improvement_proposals
        RENAME CONSTRAINT skill_recommendations_proposed_patch_shape_check
        TO agent_improvement_proposals_proposed_patch_shape_check;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_skill_recommendation_candidates'
      AND tgrelid = 'public.agent_improvement_candidates'::regclass
  ) THEN
    ALTER TRIGGER set_updated_at_skill_recommendation_candidates
      ON public.agent_improvement_candidates
      RENAME TO set_updated_at_agent_improvement_candidates;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_skill_recommendation_jobs'
      AND tgrelid = 'public.agent_improvement_jobs'::regclass
  ) THEN
    ALTER TRIGGER set_updated_at_skill_recommendation_jobs
      ON public.agent_improvement_jobs
      RENAME TO set_updated_at_agent_improvement_jobs;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_skill_recommendations'
      AND tgrelid = 'public.agent_improvement_proposals'::regclass
  ) THEN
    ALTER TRIGGER set_updated_at_skill_recommendations
      ON public.agent_improvement_proposals
      RENAME TO set_updated_at_agent_improvement_proposals;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_improvement_candidates'
      AND policyname = 'skill_recommendation_candidates_select_org'
  ) THEN
    ALTER POLICY skill_recommendation_candidates_select_org
      ON public.agent_improvement_candidates
      RENAME TO agent_improvement_candidates_select_org;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_improvement_jobs'
      AND policyname = 'skill_recommendation_jobs_select_org'
  ) THEN
    ALTER POLICY skill_recommendation_jobs_select_org
      ON public.agent_improvement_jobs
      RENAME TO agent_improvement_jobs_select_org;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_improvement_proposals'
      AND policyname = 'skill_recommendations_select_org'
  ) THEN
    ALTER POLICY skill_recommendations_select_org
      ON public.agent_improvement_proposals
      RENAME TO agent_improvement_proposals_select_org;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_improvement_proposals'
      AND policyname = 'skill_recommendations_update_org'
  ) THEN
    ALTER POLICY skill_recommendations_update_org
      ON public.agent_improvement_proposals
      RENAME TO agent_improvement_proposals_update_org;
  END IF;
END $$;

UPDATE public.agent_improvement_jobs
SET dedupe_key = regexp_replace(dedupe_key, '^skill-recommendation:', 'agent-improvement:')
WHERE dedupe_key LIKE 'skill-recommendation:%';

DROP TRIGGER IF EXISTS skill_recommendation_events_detect_candidate
  ON public.skill_recommendation_events;
DROP TRIGGER IF EXISTS skill_recommendation_events_detect_agent_improvement_candidate
  ON public.skill_recommendation_events;

CREATE OR REPLACE FUNCTION public.enqueue_agent_improvement_candidate()
RETURNS TRIGGER AS $$
DECLARE
  event_count INTEGER;
  event_ids UUID[];
  first_seen TIMESTAMPTZ;
  last_seen TIMESTAMPTZ;
  candidate_row public.agent_improvement_candidates%ROWTYPE;
BEGIN
  IF cardinality(COALESCE(NEW.skill_keys_used, '{}'::TEXT[])) > 0 THEN
    RETURN NEW;
  END IF;

  IF cardinality(COALESCE(NEW.workflow_keys_used, '{}'::TEXT[])) > 0 THEN
    RETURN NEW;
  END IF;

  SELECT
    count(*)::INTEGER,
    array_agg(id ORDER BY created_at DESC),
    min(created_at),
    max(created_at)
  INTO event_count, event_ids, first_seen, last_seen
  FROM public.skill_recommendation_events
  WHERE org_id = NEW.org_id
    AND agent_key = NEW.agent_key
    AND prompt_fingerprint = NEW.prompt_fingerprint
    AND tool_signature = NEW.tool_signature
    AND cardinality(COALESCE(skill_keys_used, '{}'::TEXT[])) = 0
    AND cardinality(COALESCE(workflow_keys_used, '{}'::TEXT[])) = 0
    AND created_at >= now() - interval '30 days';

  IF event_count < 3 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.agent_improvement_candidates (
    org_id,
    agent_key,
    prompt_fingerprint,
    tool_signature,
    tool_names,
    run_count,
    evidence_event_ids,
    first_event_at,
    last_event_at,
    status
  )
  VALUES (
    NEW.org_id,
    NEW.agent_key,
    NEW.prompt_fingerprint,
    NEW.tool_signature,
    NEW.tool_names,
    event_count,
    event_ids,
    first_seen,
    last_seen,
    'open'
  )
  ON CONFLICT (org_id, agent_key, prompt_fingerprint, tool_signature)
  DO UPDATE SET
    tool_names = EXCLUDED.tool_names,
    run_count = EXCLUDED.run_count,
    evidence_event_ids = EXCLUDED.evidence_event_ids,
    first_event_at = EXCLUDED.first_event_at,
    last_event_at = EXCLUDED.last_event_at,
    status = CASE
      WHEN public.agent_improvement_candidates.status IN (
        'skipped',
        'dismissed',
        'converted',
        'recommended',
        'routed_out'
      )
        THEN public.agent_improvement_candidates.status
      ELSE public.agent_improvement_candidates.status
    END,
    updated_at = now()
  RETURNING * INTO candidate_row;

  IF candidate_row.status IN ('open', 'analysis_queued') THEN
    INSERT INTO public.agent_improvement_jobs (
      user_id,
      org_id,
      candidate_id,
      dedupe_key,
      payload,
      status,
      next_attempt_at
    )
    VALUES (
      NEW.user_id,
      NEW.org_id,
      candidate_row.id,
      'agent-improvement:' || candidate_row.id::TEXT,
      jsonb_build_object('candidate_id', candidate_row.id, 'trigger_event_id', NEW.id),
      'queued',
      now()
    )
    ON CONFLICT DO NOTHING;

    UPDATE public.agent_improvement_candidates
    SET status = 'analysis_queued'
    WHERE id = candidate_row.id
      AND status = 'open';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER skill_recommendation_events_detect_agent_improvement_candidate
  AFTER INSERT ON public.skill_recommendation_events
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_agent_improvement_candidate();

DROP FUNCTION IF EXISTS public.enqueue_skill_recommendation_candidate();
