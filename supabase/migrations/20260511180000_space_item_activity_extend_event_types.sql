BEGIN;

-- Automation steps (e.g. send_email) log event_type = automation_action; it was missing from the
-- CHECK list, so inserts failed and were swallowed by logAutomationActionActivity's try/catch.
-- Also allow external capture rows and dynamic artifact_lifecycle activity types.
ALTER TABLE public.space_item_activity
  DROP CONSTRAINT IF EXISTS space_item_activity_event_type_check;

ALTER TABLE public.space_item_activity
  ADD CONSTRAINT space_item_activity_event_type_check CHECK (
    event_type IN (
      'comment',
      'field_change',
      'status_change',
      'assignee_change',
      'created',
      'deleted_subtask',
      'added_subtask',
      'agent_task_execution',
      'automation_comment',
      'automation_action',
      'external_email_received',
      'external_slack_message_received',
      'external_fathom_recording_ready'
    )
    OR event_type LIKE 'artifact\_%' ESCAPE '\'
    OR event_type LIKE 'contact\_%' ESCAPE '\'
  );

COMMIT;
