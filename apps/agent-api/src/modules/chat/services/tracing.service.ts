import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { ChatRuntimeRepository } from '../repositories/chat-runtime.repository'
import { redactSecretsDeep } from '../utils/secret-redaction.util'
import type {
  TraceRecoveryEvent,
  TraceRecoveryStatus,
  TraceTerminalStatus,
  TraceUserVisibleOutcome,
} from './openclaw-proxy.types'

export interface UsageRecord {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
  total_tokens?: number
}

export type AgentTraceChannel = 'studio' | 'slack' | 'telegram'

export interface StartTraceInput {
  userId: string
  conversationId: string
  messageId?: string | null
  runId?: string | null
  requestId?: string | null
  campaignId?: string
  sessionKey: string
  userMessage: string
  systemPrompt: string
  historyLength: number
  channel: AgentTraceChannel
  agentKey?: string
  orgId?: string | null
  gatewayAgentId?: string | null
  model?: string | null
  observability?: Record<string, unknown>
}

export interface CompleteTraceInput {
  response: string
  toolSteps: Array<{
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
    action?: string
    tool_call_id?: string
    input?: Record<string, unknown>
    result?: Record<string, unknown>
  }>
  usage?: UsageRecord
  durationMs: number
  fullSystemPrompt?: string
  llmInput?: Record<string, unknown>
  llmOutput?: unknown[]
  costUsd?: number
  terminalStatus?: TraceTerminalStatus
  userVisibleOutcome?: TraceUserVisibleOutcome
  recoveryStatus?: TraceRecoveryStatus
  recoveryEvents?: TraceRecoveryEvent[]
  observability?: Record<string, unknown>
}

export interface FailTraceInput {
  terminalStatus?: TraceTerminalStatus
  userVisibleOutcome?: TraceUserVisibleOutcome
  recoveryStatus?: TraceRecoveryStatus
  recoveryEvents?: TraceRecoveryEvent[]
  observability?: Record<string, unknown>
}

@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name)

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly repository: ChatRuntimeRepository = new ChatRuntimeRepository(),
  ) {}

  private resolveModel(input: CompleteTraceInput): string | null {
    const model = input.llmInput?.model
    return typeof model === 'string' && model.length > 0 ? model : null
  }

  private getClient(): SupabaseClient {
    return this.svc.client
  }

  private redactTraceValue<T>(value: T): T {
    return redactSecretsDeep(value) as T
  }

  async startTrace(input: StartTraceInput): Promise<string | null> {
    const client = this.getClient()

    const payload: Record<string, unknown> = {
      user_id: input.userId,
      conversation_id: input.conversationId,
      message_id: input.messageId ?? null,
      run_id: input.runId ?? null,
      request_id: input.requestId ?? null,
      campaign_id: input.campaignId ?? null,
      session_key: input.sessionKey,
      user_message: this.redactTraceValue(input.userMessage),
      system_prompt: this.redactTraceValue(input.systemPrompt),
      history_length: input.historyLength,
      channel: input.channel,
      agent_key: input.agentKey ?? null,
      org_id: input.orgId ?? null,
      gateway_agent_id: input.gatewayAgentId ?? null,
      status: 'streaming',
    }
    if (input.model) {
      payload.model = this.redactTraceValue(input.model)
    }
    if (input.observability) {
      payload.observability = this.redactTraceValue(input.observability)
    }

    const { id, error } = await this.repository.insertTrace(client, payload)

    if (error) {
      this.logger.warn(`Trace start failed: ${error.message}`)
      return null
    }
    return id
  }

  async completeTrace(traceId: string | null, input: CompleteTraceInput): Promise<void> {
    if (!traceId) return
    const client = this.getClient()

    const usage = input.usage
    const model = this.resolveModel(input)
    const updateData: Record<string, unknown> = {
      response: this.redactTraceValue(input.response),
      tool_steps: this.redactTraceValue(input.toolSteps),
      input_tokens: usage?.input_tokens ?? null,
      output_tokens: usage?.output_tokens ?? null,
      cache_read_tokens: usage?.cache_read_input_tokens ?? 0,
      cache_write_tokens: usage?.cache_creation_input_tokens ?? 0,
      total_tokens: usage?.total_tokens ?? null,
      completed_at: new Date().toISOString(),
      duration_ms: input.durationMs,
      status: 'completed',
      terminal_status: input.terminalStatus ?? 'done',
      user_visible_outcome: input.userVisibleOutcome ?? 'output_visible',
      recovery_status: input.recoveryStatus ?? 'none',
      recovery_events: this.redactTraceValue(input.recoveryEvents ?? []),
      observability: this.redactTraceValue(input.observability ?? {}),
    }
    if (model) {
      updateData.model = model
    }
    if (input.fullSystemPrompt) {
      updateData.system_prompt = this.redactTraceValue(input.fullSystemPrompt)
    }
    if (input.llmInput) {
      updateData.messages_input = this.redactTraceValue(input.llmInput)
    }
    if (input.llmOutput) {
      updateData.messages_output = this.redactTraceValue(input.llmOutput)
    }
    if (input.costUsd !== undefined && input.costUsd !== null) {
      updateData.cost_usd = input.costUsd
    }
    const error = await this.repository.updateTrace(client, traceId, updateData)

    if (error) {
      this.logger.warn(`Trace complete failed: ${error.message}`)
    }
  }

  async failTrace(
    traceId: string | null,
    errorMessage: string,
    input: FailTraceInput = {},
  ): Promise<void> {
    if (!traceId) return
    const client = this.getClient()

    const error = await this.repository.updateTrace(client, traceId, {
      status: 'failed',
      error: this.redactTraceValue(errorMessage),
      completed_at: new Date().toISOString(),
      terminal_status: input.terminalStatus ?? 'failed',
      user_visible_outcome: input.userVisibleOutcome ?? 'blocked',
      recovery_status: input.recoveryStatus ?? 'failed_unrecoverable',
      recovery_events: this.redactTraceValue(input.recoveryEvents ?? []),
      observability: this.redactTraceValue(input.observability ?? {}),
    })

    if (error) {
      this.logger.warn(`Trace fail update failed: ${error.message}`)
    }
  }
}
