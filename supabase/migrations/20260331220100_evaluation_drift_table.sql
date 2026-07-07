-- Evaluation drift tracking: stores human ratings alongside model scores
-- to detect systematic divergence and feed the evaluator self-improvement loop.

CREATE TABLE IF NOT EXISTS public.evaluation_drift (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  agent_key text NOT NULL,
  model_quality_score smallint NOT NULL CHECK (model_quality_score BETWEEN 1 AND 10),
  model_dimension_scores jsonb,
  human_rating smallint CHECK (human_rating BETWEEN 1 AND 10),
  human_thumbs_up boolean,
  human_feedback text,
  drift_magnitude smallint GENERATED ALWAYS AS (
    CASE WHEN human_rating IS NOT NULL
      THEN abs(model_quality_score - human_rating)
      ELSE NULL
    END
  ) STORED,
  quality_eval_payload jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_eval_drift_user_id ON public.evaluation_drift (user_id);
CREATE INDEX IF NOT EXISTS idx_eval_drift_mission_id ON public.evaluation_drift (mission_id);
CREATE INDEX IF NOT EXISTS idx_eval_drift_drift_magnitude ON public.evaluation_drift (drift_magnitude DESC NULLS LAST)
  WHERE drift_magnitude IS NOT NULL;

ALTER TABLE public.evaluation_drift ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evaluation drift"
  ON public.evaluation_drift FOR SELECT
  USING (
    auth.uid() = user_id
    OR (org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.org_members om WHERE om.org_id = evaluation_drift.org_id AND om.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert own evaluation drift"
  ON public.evaluation_drift FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evaluation drift"
  ON public.evaluation_drift FOR UPDATE
  USING (auth.uid() = user_id);
