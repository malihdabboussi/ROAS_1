export type NotificationType =
  | 'mission_blocked'
  | 'mission_completed'
  | 'mission_failed'
  | 'deliverable_ready'
  | 'subtask_blocked'
  | 'plan_approval_required'
  | 'space_task_assigned'
  | 'space_task_unassigned'
  | 'space_task_status_changed'
  | 'space_task_comment'
  | 'space_task_mention'
  | 'agent_message'
  | 'human_dm_message'
  | 'org_invitation'
  | 'human_subtask_awaiting'
  | 'human_subtask_sla_escalated'
  | 'human_subtask_cancelled'
  | 'brain_cross_suggestion'
  | 'brain_import_succeeded'
  | 'brain_import_failed'
  | 'awareness_paused'
  | 'space_automation_disabled'
  | 'browser_session_expiring'

export interface UserNotification {
  id: string
  user_id: string
  org_id: string | null
  type: NotificationType
  title: string
  body: string | null
  mission_id: string | null
  action_url: string | null
  read_at: string | null
  channel_sent: Record<string, unknown>
  metadata: Record<string, unknown> | null
  inbox_bucket: 'primary' | 'other'
  snoozed_until: string | null
  cleared_at: string | null
  created_at: string
}

export type InboxView = 'primary' | 'system' | 'other' | 'later' | 'cleared' | 'all'

export type InboxTriageCounts = {
  primary: number
  system: number
  other: number
  later: number
  cleared: number
}
