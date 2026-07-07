/**
 * Shared mission status + subtask status types used across apps/api, apps/mission-worker,
 * apps/agent-api. Adding `awaiting_human` here keeps all three surfaces in lockstep.
 */

export type AssigneeType = 'agent' | 'human'

export type SubtaskStatus =
  | 'pending'
  | 'in_progress'
  | 'awaiting_human'
  | 'done'
  | 'revision'
  | 'blocked'
  | 'cancelled'

export type MissionStatus =
  | 'inbox'
  | 'backlog'
  | 'planning'
  | 'todo'
  | 'in_progress'
  | 'awaiting_human'
  | 'review'
  | 'blocked'
  | 'done'
  | 'archived'
  | 'error'
  | 'failed'
  | 'dead_letter'
  | 'pending_approval'

export interface TeamRosterEntry {
  participant_id: string
  kind: 'agent' | 'human'
  org_id: string | null
  user_id: string | null
  agent_key: string | null
  display_name: string
  avatar_url: string | null
  role_label: string | null
  specialties: string[]
  accepts_assignments: boolean
  delegation_notes: string | null
  timezone: string | null
  working_hours: Record<string, { start: string; end: string }> | null
  out_of_office_until: string | null
  current_load: number
  is_ready: boolean
  agent_level: string | null
  org_role: string | null
  email: string | null
  created_at: string
  updated_at: string | null
}
