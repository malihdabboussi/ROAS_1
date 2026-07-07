-- Expand `user_notifications.type` allowlist to include space-task events
-- emitted by `SpaceNotificationsService`.
ALTER TABLE public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_type_check;

ALTER TABLE public.user_notifications
  ADD CONSTRAINT user_notifications_type_check CHECK (
    type = ANY (ARRAY[
      'mission_blocked',
      'mission_completed',
      'mission_failed',
      'deliverable_ready',
      'subtask_blocked',
      'plan_approval_required',
      'space_task_assigned',
      'space_task_unassigned',
      'space_task_status_changed',
      'space_task_comment',
      'space_task_mention'
    ])
  );
