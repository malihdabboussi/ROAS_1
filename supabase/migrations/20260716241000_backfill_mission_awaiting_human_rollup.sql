-- Existing missions could remain `todo` while an active human gate waited for approval because
-- dependency-blocked downstream rows were included in the aggregate. Align those rows with the
-- corrected API and worker rollup precedence.
UPDATE missions AS mission
SET
  status = 'awaiting_human',
  current_agent_key = NULL,
  progress_notes = 'Waiting for your approval — review is required before work continues',
  updated_at = NOW()
WHERE mission.status = 'todo'
  AND EXISTS (
    SELECT 1
    FROM mission_subtasks AS subtask
    WHERE subtask.mission_id = mission.id
      AND subtask.status = 'awaiting_human'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM mission_subtasks AS subtask
    WHERE subtask.mission_id = mission.id
      AND subtask.status = 'in_progress'
  );
