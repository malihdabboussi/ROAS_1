BEGIN;

ALTER TABLE public.project_flow_build_session
  DROP CONSTRAINT IF EXISTS project_flow_build_session_status_check;

INSERT INTO public.project_flow_build_clarification (
  session_id,
  org_id,
  space_id,
  created_by,
  question,
  answer,
  status,
  created_at,
  updated_at
)
SELECT
  session_row.id,
  session_row.org_id,
  session_row.space_id,
  session_row.created_by,
  question.value,
  NULL::jsonb,
  'open',
  COALESCE(session_row.created_at, NOW()),
  COALESCE(session_row.updated_at, NOW())
FROM public.project_flow_build_session AS session_row
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(session_row.clarification_questions) = 'array'
      THEN session_row.clarification_questions
    ELSE '[]'::jsonb
  END
) AS question(value)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.project_flow_build_clarification AS existing
  WHERE existing.session_id = session_row.id
    AND existing.question->>'id' = question.value->>'id'
);

INSERT INTO public.project_flow_build_clarification (
  session_id,
  org_id,
  space_id,
  created_by,
  question,
  answer,
  status,
  created_at,
  updated_at
)
SELECT
  session_row.id,
  session_row.org_id,
  session_row.space_id,
  session_row.created_by,
  question.value,
  NULL::jsonb,
  'open',
  COALESCE(session_row.created_at, NOW()),
  COALESCE(session_row.updated_at, NOW())
FROM public.project_flow_build_session AS session_row
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(session_row.plan->'clarification_questions') = 'array'
      THEN session_row.plan->'clarification_questions'
    ELSE '[]'::jsonb
  END
) AS question(value)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.project_flow_build_clarification AS existing
  WHERE existing.session_id = session_row.id
    AND existing.question->>'id' = question.value->>'id'
);

UPDATE public.project_flow_build_session
SET
  status = CASE
    WHEN status = 'needs_clarification' THEN 'clarifying'
    WHEN status IN ('planned', 'validated', 'compiled', 'blocked') THEN status
    ELSE 'intake'
  END,
  clarification_questions = '[]'::jsonb,
  plan = CASE
    WHEN jsonb_typeof(plan) = 'object' THEN plan - 'clarification_questions'
    ELSE plan
  END,
  updated_at = NOW();

ALTER TABLE public.project_flow_build_session
  ALTER COLUMN status SET DEFAULT 'intake';

ALTER TABLE public.project_flow_build_session
  ADD CONSTRAINT project_flow_build_session_status_check
  CHECK (status IN ('intake', 'clarifying', 'planning', 'planned', 'validated', 'compiled', 'blocked'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'project_flow_build_session'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_flow_build_session;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'project_flow_build_clarification'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_flow_build_clarification;
  END IF;
END $$;

COMMIT;
