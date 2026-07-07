-- Grant assigned humans SELECT + UPDATE on their own mission_subtasks row so they can
-- complete / bounce / block their assigned work directly. Stacks on top of existing
-- org-member and owner policies; does not loosen them.

DROP POLICY IF EXISTS "Assigned human can read own subtask" ON public.mission_subtasks;
CREATE POLICY "Assigned human can read own subtask"
  ON public.mission_subtasks FOR SELECT
  TO authenticated
  USING (assignee_type = 'human' AND assigned_user_id = auth.uid());

DROP POLICY IF EXISTS "Assigned human can update own subtask" ON public.mission_subtasks;
CREATE POLICY "Assigned human can update own subtask"
  ON public.mission_subtasks FOR UPDATE
  TO authenticated
  USING (assignee_type = 'human' AND assigned_user_id = auth.uid())
  WITH CHECK (assignee_type = 'human' AND assigned_user_id = auth.uid());
