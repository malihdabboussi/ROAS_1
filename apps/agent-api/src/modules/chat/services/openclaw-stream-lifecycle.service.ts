import { Injectable, Optional } from '@nestjs/common'
import { ErrorReporter } from '@vibey/api-shared'
import { ProviderBillingAttemptsService } from '../../billing/services/provider-billing-attempts.service'
import type { UsageData } from '../types/stream-events'
import { resolveOpenRouterGenerationId } from './openclaw-model-routing'
import type {
  ProviderBillingStartedEvent,
  SystemPromptReport,
  TraceRecoveryEvent,
} from './openclaw-proxy.types'
import type { OpenClawStreamContext, OpenClawStreamState } from './openclaw-stream-state'
import { logFirstStreamTiming } from './openclaw-stream-state'

@Injectable()
export class OpenClawStreamLifecycleService {
  constructor(
    private readonly errorReporter: ErrorReporter,
    @Optional() private readonly providerBillingAttempts?: ProviderBillingAttemptsService,
  ) {}

  async handleEvent(
    type: string,
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<boolean> {
    switch (type) {
      case 'response.completed':
        this.handleCompleted(evt, context, state)
        return true
      case 'response.trace':
        this.handleTrace(evt, context, state)
        return true
      case 'response.billing.started':
        await this.handleBillingStarted(evt, context, state)
        return true
      case 'response.failed':
        this.handleFailed(evt, context, state)
        return true
      case 'response.compaction':
        this.handleCompaction(evt, context, state)
        return true
      default:
        return false
    }
  }

  private async handleBillingStarted(
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    logFirstStreamTiming(state, context, 'event_response_billing_started')
    const provider = this.readString(evt.provider) ?? 'openrouter'
    const providerGenerationId =
      resolveOpenRouterGenerationId(evt.provider_generation_id) ??
      resolveOpenRouterGenerationId(evt.generation_id) ??
      resolveOpenRouterGenerationId(evt.id)
    const providerRequestId =
      this.readString(evt.provider_request_id) ?? this.readString(evt.request_id)
    const requestedModel = this.readString(evt.requested_model) ?? context.options.model ?? null
    const resolvedModel = this.readString(evt.resolved_model) ?? context.resolvedModel
    const billingEvent: ProviderBillingStartedEvent = {
      phase: 'provider_started',
      provider,
      requested_model: requestedModel ?? undefined,
      resolved_model: resolvedModel,
      provider_generation_id: providerGenerationId,
      provider_request_id: providerRequestId ?? undefined,
      source: this.readString(evt.source) ?? 'openclaw',
      metadata:
        evt.metadata && typeof evt.metadata === 'object' && !Array.isArray(evt.metadata)
          ? (evt.metadata as Record<string, unknown>)
          : undefined,
    }
    state.providerBillingAttempts.push(billingEvent)

    if (!this.providerBillingAttempts) return
    const ownerType = context.options.orgId
      ? 'org'
      : context.options.userId
        ? 'personal'
        : 'platform'
    const attemptKey = this.buildBillingAttemptKey(context, billingEvent)
    try {
      await this.providerBillingAttempts.recordAttempt({
        attemptKey,
        sourceApp: 'agent-api',
        sourcePath: 'chat/openclaw-stream-lifecycle',
        billingOwnerType: ownerType,
        userId: context.options.userId ?? null,
        orgId: context.options.orgId ?? null,
        campaignId: context.options.campaignId ?? null,
        conversationId: context.options.conversationId ?? null,
        feature: 'chat',
        action: 'generate',
        serviceType: 'text',
        provider,
        requestedModel,
        resolvedModel,
        providerGenerationId,
        providerRequestId,
        metadata: {
          trace_id: context.options.traceId,
          message_id: context.options.messageId,
          request_id: context.options.requestId,
          run_id: context.options.runId,
          agent_id: context.agentId,
          event_source: billingEvent.source,
          ...(billingEvent.metadata ?? {}),
        },
      })
    } catch (error) {
      state.providerBillingAttemptWriteFailed = true
      context.logger.warn(
        `[Chat] provider_billing_attempt_record_failed ${context.correlation} error=${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private handleCompleted(
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): void {
    logFirstStreamTiming(state, context, 'event_response_completed')
    const respData = evt.response as Record<string, unknown> | undefined
    const respMetadata = respData?.metadata as Record<string, unknown> | undefined
    const completedGenerationId =
      resolveOpenRouterGenerationId(respMetadata?.provider_response_id) ??
      resolveOpenRouterGenerationId(respData?.id) ??
      resolveOpenRouterGenerationId(evt.id)
    const usageData = respData?.usage as Record<string, unknown> | undefined
    const completedUsage: UsageData | undefined = usageData
      ? {
          input_tokens: usageData.input_tokens as number | undefined,
          output_tokens: usageData.output_tokens as number | undefined,
          cache_read_input_tokens: (usageData.cache_read_input_tokens as number) ?? 0,
          cache_creation_input_tokens: (usageData.cache_creation_input_tokens as number) ?? 0,
          total_tokens: usageData.total_tokens as number | undefined,
        }
      : undefined
    const completedModel =
      respData && typeof respData.model === 'string' ? (respData.model as string) : undefined
    const providerCost =
      typeof respMetadata?.provider_cost === 'number'
        ? (respMetadata.provider_cost as number)
        : typeof usageData?.cost === 'number'
          ? (usageData.cost as number)
          : undefined

    if (typeof respMetadata?.last_call_input_tokens === 'number') {
      state.lastCallInputTokens = respMetadata.last_call_input_tokens as number
    }
    if (typeof respMetadata?.context_window_tokens === 'number') {
      state.contextWindowTokens = respMetadata.context_window_tokens as number
    }
    if (typeof respMetadata?.compaction_count === 'number') {
      state.compactionCount = respMetadata.compaction_count as number
    }
    if (
      respMetadata?.system_prompt_report &&
      typeof respMetadata.system_prompt_report === 'object'
    ) {
      state.systemPromptReport = respMetadata.system_prompt_report as SystemPromptReport
    }

    state.completedGenerations.push({
      generationId: completedGenerationId,
      usage: completedUsage,
      model: completedModel,
      providerCost,
    })
    state.generationId = completedGenerationId
    state.usage = completedUsage
  }

  private handleTrace(
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): void {
    if (evt.trace_type === 'system_prompt' && typeof evt.system_prompt === 'string') {
      logFirstStreamTiming(state, context, 'event_trace_system_prompt', {
        system_prompt_chars: evt.system_prompt.length,
      })
      state.fullSystemPrompt = evt.system_prompt
      return
    }
    if (evt.trace_type === 'llm_input') {
      logFirstStreamTiming(state, context, 'event_trace_llm_input', {
        provider: typeof evt.provider === 'string' ? evt.provider : null,
        model: typeof evt.model === 'string' ? evt.model : null,
        message_count: Array.isArray(evt.messages) ? evt.messages.length : 0,
        prompt_chars: typeof evt.prompt === 'string' ? evt.prompt.length : 0,
        images_count: typeof evt.images_count === 'number' ? evt.images_count : 0,
      })
      state.llmInput = {
        provider: evt.provider,
        model: evt.model,
        prompt: evt.prompt,
        messages: evt.messages,
        images_count: evt.images_count,
      }
      return
    }
    if (evt.trace_type === 'llm_output' && Array.isArray(evt.messages)) {
      state.llmOutput = evt.messages as unknown[]
      return
    }
    if (evt.trace_type !== 'timing') return

    const openClawStage = typeof evt.stage === 'string' ? evt.stage : 'unknown'
    context.logStreamTiming('event_trace_timing', {
      openclaw_stage: openClawStage,
      openclaw_source: typeof evt.source === 'string' ? evt.source : null,
      openclaw_elapsed_ms: typeof evt.elapsed_ms === 'number' ? evt.elapsed_ms : null,
      openclaw_stage_ms: typeof evt.stage_ms === 'number' ? evt.stage_ms : null,
      provider: typeof evt.provider === 'string' ? evt.provider : null,
      model: typeof evt.model === 'string' ? evt.model : null,
      sandbox_enabled: typeof evt.sandbox_enabled === 'boolean' ? evt.sandbox_enabled : null,
      effective_workspace_changed:
        typeof evt.effective_workspace_changed === 'boolean'
          ? evt.effective_workspace_changed
          : null,
      system_prompt_chars:
        typeof evt.system_prompt_chars === 'number' ? evt.system_prompt_chars : null,
      skills_prompt_chars:
        typeof evt.skills_prompt_chars === 'number' ? evt.skills_prompt_chars : null,
      skill_entries: typeof evt.skill_entries === 'number' ? evt.skill_entries : null,
      bootstrap_files: typeof evt.bootstrap_files === 'number' ? evt.bootstrap_files : null,
      context_files: typeof evt.context_files === 'number' ? evt.context_files : null,
      tools_count: typeof evt.tools_count === 'number' ? evt.tools_count : null,
      extension_paths: typeof evt.extension_paths === 'number' ? evt.extension_paths : null,
      extension_factories:
        typeof evt.extension_factories === 'number' ? evt.extension_factories : null,
      built_in_tools: typeof evt.built_in_tools === 'number' ? evt.built_in_tools : null,
      custom_tools: typeof evt.custom_tools === 'number' ? evt.custom_tools : null,
      client_tools: typeof evt.client_tools === 'number' ? evt.client_tools : null,
      messages_before: typeof evt.messages_before === 'number' ? evt.messages_before : null,
      messages_after: typeof evt.messages_after === 'number' ? evt.messages_after : null,
      prompt_chars: typeof evt.prompt_chars === 'number' ? evt.prompt_chars : null,
      history_messages: typeof evt.history_messages === 'number' ? evt.history_messages : null,
      images_count: typeof evt.images_count === 'number' ? evt.images_count : null,
      prompt_images: typeof evt.prompt_images === 'number' ? evt.prompt_images : null,
      history_image_messages:
        typeof evt.history_image_messages === 'number' ? evt.history_image_messages : null,
    })
  }

  private buildBillingAttemptKey(
    context: OpenClawStreamContext,
    event: ProviderBillingStartedEvent,
  ): string {
    const stableRequest =
      event.provider_generation_id ??
      event.provider_request_id ??
      context.options.requestId ??
      context.options.runId ??
      context.options.messageId ??
      context.options.sessionKey ??
      'unknown'
    return [
      'openclaw',
      context.options.conversationId ?? 'conversationless',
      context.agentId,
      event.provider ?? 'provider',
      stableRequest,
    ].join(':')
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  private handleCompaction(
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): void {
    const phase = typeof evt.phase === 'string' ? evt.phase : 'unknown'
    logFirstStreamTiming(state, context, 'event_response_compaction', {
      phase,
      attempt: typeof evt.attempt === 'number' ? evt.attempt : null,
      max_attempts: typeof evt.maxAttempts === 'number' ? evt.maxAttempts : null,
    })

    const attempt = typeof evt.attempt === 'number' ? evt.attempt : undefined
    if (attempt && attempt > 0) {
      state.compactionCount = Math.max(state.compactionCount ?? 0, attempt)
    }

    state.recoveryEvents.push({
      type: this.resolveCompactionRecoveryType(evt),
      status: this.resolveCompactionRecoveryStatus(evt),
      reason: this.resolveCompactionRecoveryReason(evt),
      at: new Date().toISOString(),
      metadata: this.buildCompactionRecoveryMetadata(evt),
    })
  }

  private resolveCompactionRecoveryType(evt: Record<string, unknown>): string {
    const trigger = typeof evt.trigger === 'string' ? evt.trigger : ''
    if (trigger === 'tool_result_truncation') return 'context_window_tool_result_truncation'
    return 'context_window_compaction'
  }

  private resolveCompactionRecoveryStatus(
    evt: Record<string, unknown>,
  ): TraceRecoveryEvent['status'] {
    const phase = typeof evt.phase === 'string' ? evt.phase : ''
    const outcome = typeof evt.outcome === 'string' ? evt.outcome : ''
    if (phase === 'failed' || outcome === 'failed' || outcome === 'not_compacted') {
      return 'failed'
    }
    if (phase === 'recovered' || phase === 'end') {
      return 'recovered'
    }
    if (phase === 'retrying' && (outcome === 'compacted' || outcome === 'truncated')) {
      return 'recovered'
    }
    return 'attempted'
  }

  private resolveCompactionRecoveryReason(evt: Record<string, unknown>): string {
    const reason =
      typeof evt.reason === 'string'
        ? evt.reason
        : typeof evt.error === 'string'
          ? evt.error
          : typeof evt.outcome === 'string'
            ? evt.outcome
            : typeof evt.phase === 'string'
              ? evt.phase
              : 'context_window_recovery'
    return reason.slice(0, 500)
  }

  private buildCompactionRecoveryMetadata(evt: Record<string, unknown>): Record<string, unknown> {
    const metadata: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(evt)) {
      if (key === 'type') continue
      if (value === undefined) continue
      metadata[key] = value
    }
    return metadata
  }

  private handleFailed(
    evt: Record<string, unknown>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): void {
    logFirstStreamTiming(state, context, 'event_response_failed')
    const resp = evt.response as Record<string, unknown> | undefined
    const errMsg = (resp?.error as Record<string, unknown>)?.message ?? 'Agent failed'
    const errorCode = (resp?.error as Record<string, unknown> | undefined)?.code ?? 'unknown'
    state.failedMessage =
      String(errorCode) === 'tool_error' ? `Tool error: ${String(errMsg)}` : String(errMsg)
    if (this.isTruncationFailure(errorCode, state.failedMessage)) {
      state.truncated = true
    }
    const responseId = (resp?.id as string | undefined) ?? 'unknown'
    context.logger.error(
      `[Chat] response_failed ${context.correlation} responseId=${responseId} code=${String(errorCode)} message=${state.failedMessage}`,
    )
    this.errorReporter.report({
      app: 'agent-api',
      severity: state.truncated ? 'warn' : 'error',
      feature: 'chat',
      error_code: 'response_failed',
      message: state.failedMessage,
      category: 'llm',
      context: {
        agentId: context.agentId,
        conversationId: context.options.conversationId,
        model: context.resolvedModel,
        responseId,
        errorCode: String(errorCode),
        truncated: state.truncated,
        trace_id: context.options.traceId,
        message_id: context.options.messageId,
        request_id: context.options.requestId,
        run_id: context.options.runId,
      },
      user_id: context.options.userId,
      agent_key: context.agentId,
      trace_id: context.options.traceId,
      message_id: context.options.messageId,
      request_id: context.options.requestId,
      run_id: context.options.runId,
      conversation_id: context.options.conversationId,
    })
  }

  private isTruncationFailure(errorCode: unknown, failedMessage: string): boolean {
    const code = String(errorCode).toLowerCase()
    const message = failedMessage.toLowerCase()
    return (
      code.includes('max_tokens') ||
      code.includes('length') ||
      message.includes('max tokens') ||
      message.includes('max_tokens') ||
      message.includes('token limit') ||
      message.includes('response length')
    )
  }
}
