export type BrainImportJobType =
  | 'document_remember'
  | 'user_link_import'
  | 'sk_ingest'
  | 'sk_link_ingest'
  | 'fathom_meeting_import'
  | 'fireflies_transcript_import'
  | 'campaign_file_import'
  | 'campaign_fathom_import'
  | 'campaign_fireflies_import'
  | 'campaign_url_import'
  | 'page_grader_brain_sync'
  | 'slack_period_import'
  | 'campaign_slack_import'

export type BrainImportJobStatus = 'queued' | 'processing' | 'retry' | 'succeeded' | 'failed'

export const CREDIT_EXHAUSTED_MESSAGE =
  'Your account is out of credits. Add credits, then retry this import.'

export type BrainImportJobRecord = {
  id: string
  user_id: string
  org_id: string | null
  job_type: BrainImportJobType
  title: string
  dedupe_key: string
  payload: Record<string, unknown>
  status: BrainImportJobStatus
  attempts: number
  max_attempts: number
  next_attempt_at: string
  last_error: string | null
  result: Record<string, unknown> | null
  completed_at: string | null
  chunks_total: number | null
  chunks_completed: number | null
}

export type BrainImportRuntimeExecutionChunk = {
  index: number
  total: number
  userPrompt: string
}

export type BrainImportRuntimeExecutionPayload = {
  jobId: string
  userId: string
  orgId: string | null
  jobType: BrainImportJobType
  title: string
  attempts: number
  agentKey: 'atlas'
  targetBrain: 'user' | 'campaign' | 'agent' | 'customer'
  contentType: string
  campaignId?: string
  brainId?: string
  lane: string
  systemPrompt: string
  chunksTotal: number
  chunks: BrainImportRuntimeExecutionChunk[]
}

export type BrainImportRuntimeClaimResult =
  | { claimed: false; reason: string }
  | {
      claimed: true
      job_id: string
      attempts: number
      execution: BrainImportRuntimeExecutionPayload
    }

export type SlackForkTarget =
  | { kind: 'customer'; targetId: string; contactId: string; slackUserId: string }
  | { kind: 'user'; targetId: string; userId: string; brainId: string; slackUserId: string }

export function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
