-- Per-user state for spaces: favorite (star for home/sidebar quick access).

CREATE TABLE IF NOT EXISTS public.space_user_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  is_favorite boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, space_id)
);

CREATE INDEX IF NOT EXISTS space_user_state_user_idx
  ON public.space_user_state (user_id);

CREATE INDEX IF NOT EXISTS space_user_state_user_favorite_idx
  ON public.space_user_state (user_id)
  WHERE is_favorite = true;

ALTER TABLE public.space_user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own space state" ON public.space_user_state;
CREATE POLICY "Users select own space state"
  ON public.space_user_state
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own space state" ON public.space_user_state;
CREATE POLICY "Users insert own space state"
  ON public.space_user_state
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own space state" ON public.space_user_state;
CREATE POLICY "Users update own space state"
  ON public.space_user_state
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own space state" ON public.space_user_state;
CREATE POLICY "Users delete own space state"
  ON public.space_user_state
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
