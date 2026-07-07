export type { SubtaskStatus } from '@vibey/api-shared'

export type MissionStatus =
  | 'inbox'
  | 'planning'
  | 'todo'
  | 'in_progress'
  | 'awaiting_human'
  | 'review'
  | 'blocked'
  | 'done'
  | 'error'
  | 'failed'
  | 'backlog'
  | 'pending_approval'
  | 'awaiting_access_approval'

export type AssigneeType = 'agent' | 'human'

export type AgentKey = string

export type MissionPriority = 'low' | 'medium' | 'high' | 'urgent'

const PRIORITY_RANK_MAP: Record<MissionPriority, number> = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
}

export function priorityToRank(priority: string | null | undefined): number {
  if (priority && priority in PRIORITY_RANK_MAP) {
    return PRIORITY_RANK_MAP[priority as MissionPriority]
  }
  return PRIORITY_RANK_MAP.medium
}
