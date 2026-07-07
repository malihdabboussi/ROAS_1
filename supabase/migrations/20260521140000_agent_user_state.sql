-- Per-user agent favorites for Team sidebar (mirrors campaign_user_state.is_favorite).

CREATE TABLE IF NOT EXISTS public.agent_user_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents_registry(id) ON DELETE CASCADE,
  is_favorite boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, agent_id)
);

CREATE INDEX IF NOT EXISTS agent_user_state_user_idx
  ON public.agent_user_state (user_id);

CREATE INDEX IF NOT EXISTS agent_user_state_user_favorite_idx
  ON public.agent_user_state (user_id)
  WHERE is_favorite = true;

ALTER TABLE public.agent_user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own agent state" ON public.agent_user_state;
CREATE POLICY "Users select own agent state"
  ON public.agent_user_state
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own agent state" ON public.agent_user_state;
CREATE POLICY "Users insert own agent state"
  ON public.agent_user_state
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own agent state" ON public.agent_user_state;
CREATE POLICY "Users update own agent state"
  ON public.agent_user_state
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own agent state" ON public.agent_user_state;
CREATE POLICY "Users delete own agent state"
  ON public.agent_user_state
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
