import { AGENT_RUNTIME_BRAIN_QUEUE } from '../agent-runtime/types/agent-runtime.types'

export const BRAIN_OPS_QUEUE = AGENT_RUNTIME_BRAIN_QUEUE

export type BrainOpsEventType =
  | 'brain_library_sync'
  | 'brain_pattern_analysis'
  | 'brain_timeline_synthesis'
  | 'brain_lint'
  | 'customer_interaction_route'
  | 'brain_avatar_synthesis'
  | 'company_daily_dream'
  | 'company_cortex_formation'
  | 'company_context_rule_lint'

export interface BrainOpsJobData {
  outboxId: string
  brainId: string
  userId: string
  orgId?: string | null
  eventType: BrainOpsEventType
  payload: Record<string, unknown>
}

export interface BrainOpsJobResult {
  brainId: string
  success: boolean
  eventType: string
  processedAt: string
  output?: Record<string, unknown>
  error?: string
}

export type OutboxRow = {
  id: string
  brain_id: string
  user_id: string
  org_id?: string | null
  event_type: string
  dedupe_key: string
  payload: Record<string, unknown> | null
  attempts: number
  max_attempts: number
}
