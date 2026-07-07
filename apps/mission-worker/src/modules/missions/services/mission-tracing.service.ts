import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '../../../lib/services/database.service'

export interface MissionTraceStartInput {
  userId: string
  missionId: string
  messageId?: string | null
  runId?: string | null
  requestId?: string | null
  campaignId?: string | null
  sessionKey: string
  agentKey: string
  taskType: string
  systemPrompt: string
  userPrompt: string
  /** Stored on vb_agent_traces.channel — default mission */
  channel?: string
}

export type MissionTraceTerminalStatus = 'done' | 'failed' | 'failed_recoverable' | 'cancelled'
export type MissionTraceUserVisibleOutcome =
  | 'output_visible'
  | 'recovered_output'
  | 'no_visible_output'
  | 'blocked'
  | 'cancelled'
export type MissionTraceRecoveryStatus =
  | 'none'
  | 'recovered'
  | 'failed_recoverable'
  | 'failed_unrecoverable'
  | 'cancelled'

export interface MissionTraceRecoveryEvent {
  type: string
  status: 'attempted' | 'recovered' | 'failed'
  reason?: string
  at?: string
  metadata?: Record<string, unknown>
}

export interface MissionTraceCompleteInput {
  response: string
  toolSteps?: Array<{
    name: string
    label: string
    status: string
    error?: string
    error_code?: string
    error_class?: string
    workflow_class?: string
    effect_state?: string
    retry_policy?: string
    observability?: Record<string, unknown>
  }>
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number }
  durationMs: number
  costUsd?: number
  fullSystemPrompt?: string
  llmInput?: Record<string, unknown>
  llmOutput?: unknown
  terminalStatus?: MissionTraceTerminalStatus
  userVisibleOutcome?: MissionTraceUserVisibleOutcome
  recoveryStatus?: MissionTraceRecoveryStatus
  recoveryEvents?: MissionTraceRecoveryEvent[]
  observability?: Record<string, unknown>
}

export interface MissionTraceFailInput {
  terminalStatus?: MissionTraceTerminalStatus
  userVisibleOutcome?: MissionTraceUserVisibleOutcome
  recoveryStatus?: MissionTraceRecoveryStatus
  recoveryEvents?: MissionTraceRecoveryEvent[]
  observability?: Record<string, unknown>
}

@Injectable()
export class MissionTracingService {
  private readonly logger = new Logger(MissionTracingService.name)

  constructor(private readonly db: DatabaseService) {}

  async startTrace(input: MissionTraceStartInput): Promise<string | null> {
    const client = this.db.getClient()
    const { data, error } = await client
      .from('vb_agent_traces')
      .insert({
        user_id: input.userId,
        conversation_id: input.missionId,
        message_id: input.messageId ?? null,
        run_id: input.runId ?? null,
        request_id: input.requestId ?? null,
        campaign_id: input.campaignId ?? null,
        session_key: input.sessionKey,
        user_message: `[${input.taskType}] ${input.userPrompt}`,
        system_prompt: input.systemPrompt,
        history_length: 1,
        channel: input.channel ?? 'mission',
        agent_key: input.agentKey ?? null,
        status: 'streaming',
      })
      .select('id')
      .single()

    if (error) {
      this.logger.warn(`Mission trace start failed: ${error.message}`)
      return null
    }
    return data?.id ?? null
  }

  async completeTrace(traceId: string | null, input: MissionTraceCompleteInput): Promise<void> {
    if (!traceId) return
    const client = this.db.getClient()

    const { error } = await client
      .from('vb_agent_traces')
      .update({
        response: input.response,
        tool_steps: input.toolSteps ?? [],
        input_tokens: input.usage?.input_tokens ?? null,
        output_tokens: input.usage?.output_tokens ?? null,
        total_tokens: input.usage?.total_tokens ?? null,
        completed_at: new Date().toISOString(),
        duration_ms: input.durationMs,
        status: 'completed',
        terminal_status: input.terminalStatus ?? 'done',
        user_visible_outcome: input.userVisibleOutcome ?? 'output_visible',
        recovery_status: input.recoveryStatus ?? 'none',
        recovery_events: input.recoveryEvents ?? [],
        observability: input.observability ?? {},
        ...(input.costUsd != null ? { cost_usd: input.costUsd } : {}),
        ...(input.fullSystemPrompt != null && input.fullSystemPrompt !== ''
          ? { system_prompt: input.fullSystemPrompt }
          : {}),
        ...(input.llmInput != null ? { messages_input: input.llmInput } : {}),
        ...(input.llmOutput !== undefined ? { messages_output: input.llmOutput } : {}),
      })
      .eq('id', traceId)

    if (error) {
      this.logger.warn(`Mission trace complete failed: ${error.message}`)
    }
  }

  async failTrace(
    traceId: string | null,
    errorMessage: string,
    input: MissionTraceFailInput = {},
  ): Promise<void> {
    if (!traceId) return
    const client = this.db.getClient()

    const { error } = await client
      .from('vb_agent_traces')
      .update({
        status: 'failed',
        error: errorMessage,
        completed_at: new Date().toISOString(),
        terminal_status: input.terminalStatus ?? 'failed',
        user_visible_outcome: input.userVisibleOutcome ?? 'blocked',
        recovery_status: input.recoveryStatus ?? 'failed_unrecoverable',
        recovery_events: input.recoveryEvents ?? [],
        observability: input.observability ?? {},
      })
      .eq('id', traceId)

    if (error) {
      this.logger.warn(`Mission trace fail update failed: ${error.message}`)
    }
  }
}
