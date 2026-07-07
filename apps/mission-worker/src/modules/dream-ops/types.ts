export const DREAM_OPS_QUEUE = 'dream-ops'
export const DREAM_OPS_BULL_QUEUE = DREAM_OPS_QUEUE

export type DreamOpsOperationType = 'company_daily_dream' | 'agent_learning_dream'
export type DreamOpsSubjectKind = 'company_brain' | 'agent'
export type DreamOpsRunStatus = 'queued' | 'running' | 'completed' | 'skipped' | 'failed'
export type DreamOpsSkipReason =
  | 'no_source_activity'
  | 'no_meaningful_evidence'
  | 'deduped'
  | 'disabled'

export type DreamOpsSettingRow = {
  id: string
  org_id: string
  user_id: string | null
  operation_type: DreamOpsOperationType
  subject_kind: DreamOpsSubjectKind
  subject_key: string
  target_id: string | null
  enabled: boolean
  schedule: 'daily' | 'weekdays' | 'manual_only'
  local_time: string
  timezone: string
  lookback_hours: number
  min_activity_threshold: number
  last_queued_local_date?: string | null
}

export type DreamOpsOutboxRow = {
  id: string
  org_id: string
  user_id: string | null
  operation_type: DreamOpsOperationType
  subject_kind: DreamOpsSubjectKind
  subject_key: string
  target_id: string | null
  dedupe_key: string
  payload: Record<string, unknown> | null
  attempts: number
  max_attempts: number
}

export type DreamOpsJobData = {
  outboxId: string
  orgId: string
  userId: string | null
  operationType: DreamOpsOperationType
  subjectKind: DreamOpsSubjectKind
  subjectKey: string
  targetId?: string | null
  dedupeKey?: string | null
  payload: Record<string, unknown>
}

export type DreamOpsJobResult = {
  success: boolean
  operationType: DreamOpsOperationType
  subjectKey: string
  processedAt: string
  output?: Record<string, unknown>
  error?: string
}
