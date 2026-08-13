-- Per-user Program favorites, matching campaign and Space favorite behavior.

CREATE TABLE IF NOT EXISTS public.program_user_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  is_favorite boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, program_id)
);

CREATE INDEX IF NOT EXISTS program_user_state_user_favorite_idx
  ON public.program_user_state (user_id)
  WHERE is_favorite = true;

ALTER TABLE public.program_user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "program_user_state_select" ON public.program_user_state;
CREATE POLICY "program_user_state_select" ON public.program_user_state
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "program_user_state_insert" ON public.program_user_state;
CREATE POLICY "program_user_state_insert" ON public.program_user_state
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "program_user_state_update" ON public.program_user_state;
CREATE POLICY "program_user_state_update" ON public.program_user_state
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "program_user_state_delete" ON public.program_user_state;
CREATE POLICY "program_user_state_delete" ON public.program_user_state
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
