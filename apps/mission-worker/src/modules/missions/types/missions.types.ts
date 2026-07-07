import { AGENT_RUNTIME_MISSION_QUEUE } from '../../agent-runtime/types/agent-runtime.types'

export const MISSIONS_QUEUE = AGENT_RUNTIME_MISSION_QUEUE

export type MissionPhase = 'plan' | 'execute' | 'review' | 'triage' | 'directive'

export type MissionStatus =
  | 'inbox'
  | 'planning'
  | 'pending_approval'
  | 'awaiting_access_approval'
  | 'todo'
  | 'in_progress'
  | 'awaiting_human'
  | 'review'
  | 'blocked'
  | 'done'
  | 'error'
  | 'failed'
  | 'backlog'

export type AgentKey = string

export type AssigneeType = 'agent' | 'human'

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

export type SubtaskStatus =
  | 'pending'
  | 'in_progress'
  | 'awaiting_human'
  | 'done'
  | 'revision'
  | 'blocked'
  | 'cancelled'

export interface MissionJobData {
  missionId: string
  correlationId: string
  userId: string
  orgId?: string | null
  phase: MissionPhase
  priorityRank?: number
  subtaskId?: string
  /** User comment directive phase (mission.comment.directive outbox) */
  commentId?: string
  commentMessage?: string
  fromStatus?: string
}

export interface MissionJobResult {
  missionId: string
  success: boolean
  status: MissionStatus
  processedAt: string
  output?: Record<string, unknown>
  error?: string
  subtaskId?: string
}

export interface IntentPacket {
  why: string
  story: string
  sensory: string
  endState: string
  ecology: string
}

export interface SubtaskRow {
  id: string
  mission_id: string
  user_id: string
  title: string
  status: SubtaskStatus
  assigned_agent_key: string | null
  assignee_type: AssigneeType
  assigned_user_id: string | null
  awaiting_human_since: string | null
  sla_escalate_at: string | null
  sla_escalated_at: string | null
  bounce_reason: string | null
  sort_order: number
  depends_on: string[]
  output: Record<string, unknown>
  feedback: string | null
  deliverable_id: string | null
  intent: IntentPacket | Record<string, unknown>
  execution_state: Record<string, unknown>
  scheduled_at: string | null
  created_at: string
  updated_at: string
}
