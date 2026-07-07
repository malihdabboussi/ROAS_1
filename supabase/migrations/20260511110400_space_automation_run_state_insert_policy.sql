-- Allow user-scoped automation execution to persist paused run state.

DROP POLICY IF EXISTS "Users can insert own run state" ON public.space_automation_run_state;
CREATE POLICY "Users can insert own run state"
  ON public.space_automation_run_state FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR (org_id IS NOT NULL AND public.is_org_member(org_id))
  );
