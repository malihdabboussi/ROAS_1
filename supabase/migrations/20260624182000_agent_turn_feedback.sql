CREATE TABLE IF NOT EXISTS public.agent_turn_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_kind text NOT NULL CHECK (
    target_kind IN ('conversation_message', 'space_item_activity', 'mission_log')
  ),
  target_id uuid NOT NULL,
  agent_key text NOT NULL,
  thumbs_up boolean NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  feedback_text text,
  source_surface text NOT NULL DEFAULT 'unknown',
  target_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_turn_feedback_user_target_unique UNIQUE (user_id, target_kind, target_id),
  CONSTRAINT agent_turn_feedback_text_length CHECK (
    feedback_text IS NULL OR char_length(feedback_text) <= 2000
  )
);

CREATE INDEX IF NOT EXISTS idx_agent_turn_feedback_org_agent_created
  ON public.agent_turn_feedback (org_id, agent_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_turn_feedback_target
  ON public.agent_turn_feedback (target_kind, target_id);

CREATE INDEX IF NOT EXISTS idx_agent_turn_feedback_negative
  ON public.agent_turn_feedback (org_id, agent_key, created_at DESC)
  WHERE thumbs_up = false;

DROP TRIGGER IF EXISTS set_updated_at_agent_turn_feedback ON public.agent_turn_feedback;
CREATE TRIGGER set_updated_at_agent_turn_feedback
  BEFORE UPDATE ON public.agent_turn_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.agent_turn_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_turn_feedback_select ON public.agent_turn_feedback;
CREATE POLICY agent_turn_feedback_select ON public.agent_turn_feedback
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR auth.role() = 'service_role'
    OR (
      org_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.org_members om
        WHERE om.org_id = agent_turn_feedback.org_id
          AND om.user_id = (SELECT auth.uid())
          AND om.status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS agent_turn_feedback_insert_own ON public.agent_turn_feedback;
CREATE POLICY agent_turn_feedback_insert_own ON public.agent_turn_feedback
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS agent_turn_feedback_update_own ON public.agent_turn_feedback;
CREATE POLICY agent_turn_feedback_update_own ON public.agent_turn_feedback
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()) OR auth.role() = 'service_role')
  WITH CHECK (user_id = (SELECT auth.uid()) OR auth.role() = 'service_role');
