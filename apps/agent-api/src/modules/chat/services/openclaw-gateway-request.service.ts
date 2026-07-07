import { Injectable, Optional, type Logger } from '@nestjs/common'
import { ErrorReporter, RouteTraceReporter } from '@vibey/api-shared'
import { OpenClawGatewayClient } from '../integrations/openclaw-gateway.client'
import { AnthropicClaudeAdminAuthService } from './anthropic-claude-admin-auth.service'
import { OpenAICodexAdminAuthService } from './openai-codex-admin-auth.service'
import {
  effortToReasoningBudget,
  isAnthropicClaudeSubscriptionGatewayModel,
  isOpenAICodexGatewayModel,
  isUnsupportedGatewayPayloadError,
  resolveGatewayMaxTokens,
} from './openclaw-model-routing'
import type { ProxyOptions } from './openclaw-proxy.types'

type StreamTimingLogger = (stage: string, extra?: Record<string, unknown>) => void

type OpenGatewayStreamInput = {
  agentId: string
  instructions?: string
  logger: Logger
  logStreamTiming: StreamTimingLogger
  options: ProxyOptions
  requestTimeoutMs: number
  resolvedModel: string
  streamTimingLogsEnabled: boolean
}

export type OpenGatewayStreamResult = {
  combinedSignal: AbortSignal
  response: Awaited<ReturnType<typeof fetch>>
  timeoutHandle: ReturnType<typeof setTimeout>
}

type ReportedError = Error & { __appErrorReported?: true }

function markAppErrorReported(error: Error): ReportedError {
  ;(error as ReportedError).__appErrorReported = true
  return error as ReportedError
}

@Injectable()
export class OpenClawGatewayRequestService {
  constructor(
    private readonly errorReporter: ErrorReporter,
    private readonly anthropicClaudeAdminAuth: AnthropicClaudeAdminAuthService,
    private readonly openAICodexAdminAuth: OpenAICodexAdminAuthService,
    @Optional()
    private readonly gatewayClient: OpenClawGatewayClient = new OpenClawGatewayClient(),
    @Optional() private readonly routeTraceReporter?: RouteTraceReporter,
  ) {}

  private get gatewayUrl(): string {
    return process.env.OPENCLAW_GATEWAY_URL ?? 'http://localhost:18789'
  }

  private get gatewayToken(): string {
    return process.env.OPENCLAW_GATEWAY_TOKEN ?? ''
  }

  async openGatewayStream(input: OpenGatewayStreamInput): Promise<OpenGatewayStreamResult> {
    const { agentId, logger, logStreamTiming, options, resolvedModel } = input
    const payload = await this.buildGatewayPayload(input)
    const headers = this.buildHeaders(options, agentId)

    await options.send('status', { phase: 'thinking', message: 'Planning next moves' })
    logStreamTiming('context_ready_status_sent')

    const timeoutController = new AbortController()
    const timeoutHandle = setTimeout(() => timeoutController.abort(), input.requestTimeoutMs)
    const combinedSignal = options.signal
      ? AbortSignal.any([options.signal, timeoutController.signal])
      : timeoutController.signal
    const fetchStartedAt = Date.now()
    logStreamTiming('gateway_fetch_start')
    this.reportGatewayEvent('start', {
      options,
      agentId,
      resolvedModel,
      status: 'attempting',
    })

    let response: Awaited<ReturnType<typeof fetch>>
    try {
      response = await this.gatewayClient.postResponses({
        gatewayUrl: this.gatewayUrl,
        headers,
        payload,
        signal: combinedSignal,
      })
      logStreamTiming('gateway_headers_received', {
        fetch_ms: Date.now() - fetchStartedAt,
        ok: response.ok,
        status: response.status,
        status_text: response.statusText,
      })
      this.reportGatewayEvent('response_headers', {
        options,
        agentId,
        resolvedModel,
        status: response.ok ? 'ok' : 'warn',
        statusCode: response.status,
        durationMs: Date.now() - fetchStartedAt,
      })
    } catch (err) {
      logStreamTiming('gateway_fetch_error', {
        fetch_ms: Date.now() - fetchStartedAt,
        error: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
      })
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      this.reportGatewayEvent('upstream_failure', {
        options,
        agentId,
        resolvedModel,
        status: 'error',
        errorCode: 'gateway_connection',
        durationMs: Date.now() - fetchStartedAt,
        error: err instanceof Error ? err.message : String(err),
      })

      const message = err instanceof Error ? err.message : 'Failed to connect to generation engine'
      const prefixed = `Gateway connection error: ${message}`
      this.errorReporter.report({
        app: 'agent-api',
        severity: 'critical',
        feature: 'chat',
        error_code: 'gateway_connection',
        message: prefixed,
        category: 'infra',
        context: {
          agentId,
          conversationId: options.conversationId,
          model: resolvedModel,
          trace_id: options.traceId,
          message_id: options.messageId,
          request_id: options.requestId,
          run_id: options.runId,
        },
        stack: err instanceof Error ? err.stack : undefined,
        user_id: options.userId,
        agent_key: agentId,
        trace_id: options.traceId,
        message_id: options.messageId,
        request_id: options.requestId,
        run_id: options.runId,
        conversation_id: options.conversationId,
      })
      await options.send('error', { code: 'gateway_connection' })
      throw markAppErrorReported(new Error(prefixed))
    }

    if (input.streamTimingLogsEnabled) {
      logger.log(`[Chat] Gateway response: ${response.status} ${response.statusText}`)
    }

    response = await this.retryWithoutScopedPayloadFieldsIfNeeded({
      agentId,
      combinedSignal,
      headers,
      logger,
      logStreamTiming,
      options,
      payload,
      response,
      resolvedModel,
      streamTimingLogsEnabled: input.streamTimingLogsEnabled,
    })

    return { combinedSignal, response, timeoutHandle }
  }

  private async buildGatewayPayload(
    input: OpenGatewayStreamInput,
  ): Promise<Record<string, unknown>> {
    const { agentId, instructions, options, resolvedModel } = input
    const payload: Record<string, unknown> = {
      input: options.input,
      instructions: instructions || undefined,
      model: resolvedModel,
      stream: true,
      max_output_tokens: resolveGatewayMaxTokens(resolvedModel),
    }
    if (options.conversationId) payload.lane = `chat:${options.conversationId}`
    if (options.modelSettings?.contextWindowTokens) {
      payload.context_window_tokens = options.modelSettings.contextWindowTokens
    }
    this.applyReasoningSettings(payload, options)
    if (Array.isArray(options.enabledToolkits)) payload.enabled_toolkits = options.enabledToolkits
    if (Array.isArray(options.disabledNativeActions) && options.disabledNativeActions.length > 0) {
      payload.disabled_native_actions = options.disabledNativeActions
    }
    if (options.skillCatalog && options.skillCatalog.entries.length > 0) {
      payload.skill_catalog = options.skillCatalog
    }
    await this.applyRuntimeCredentials(payload, options, agentId, resolvedModel)
    return payload
  }

  private applyReasoningSettings(payload: Record<string, unknown>, options: ProxyOptions): void {
    const reasoningEffort = options.modelSettings?.reasoningEffort
    const reasoningTransport = options.modelSettings?.reasoningTransport
    if (!reasoningEffort || reasoningEffort === 'none') return

    if (reasoningTransport === 'verbosity') {
      payload.verbosity = reasoningEffort
    } else if (reasoningTransport === 'reasoning.effort') {
      payload.reasoning = { effort: reasoningEffort }
    } else if (reasoningTransport === 'reasoning.max_tokens') {
      payload.reasoning = { max_tokens: effortToReasoningBudget(reasoningEffort) }
    }
  }

  private async applyRuntimeCredentials(
    payload: Record<string, unknown>,
    options: ProxyOptions,
    agentId: string,
    resolvedModel: string,
  ): Promise<void> {
    if (isOpenAICodexGatewayModel(resolvedModel)) {
      const credential = await this.openAICodexAdminAuth.resolveRuntimeCredential(options.userId)
      if (!credential) {
        await options.send('error', { code: 'openai_codex_not_connected' })
        throw new Error('OpenAI Codex subscription is not connected for this admin account')
      }
      payload.runtime_credentials = [
        { provider: credential.provider, access_token: credential.accessToken },
      ]
      return
    }

    if (isAnthropicClaudeSubscriptionGatewayModel(resolvedModel)) {
      const credential = await this.anthropicClaudeAdminAuth.resolveRuntimeCredential(
        options.userId,
      )
      if (!credential) {
        await options.send('error', { code: 'anthropic_claude_not_connected' })
        throw new Error('Claude subscription is not connected for this admin account')
      }
      payload.runtime_credentials = [
        { provider: credential.provider, access_token: credential.accessToken },
      ]
    }
  }

  private buildHeaders(options: ProxyOptions, agentId: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.gatewayToken}`,
    }
    if (options.sessionKey) headers['x-openclaw-session-key'] = options.sessionKey
    if (options.model) headers['X-OpenClaw-Agent-Id'] = agentId
    if (options.identitySuffix) headers['x-openclaw-identity-suffix'] = options.identitySuffix
    if (options.traceId) headers['x-vibey-trace-id'] = options.traceId
    if (options.messageId) headers['x-vibey-message-id'] = options.messageId
    if (options.requestId) headers['x-vibey-request-id'] = options.requestId
    if (options.runId) headers['x-vibey-run-id'] = options.runId
    if (options.conversationId) headers['x-vibey-conversation-id'] = options.conversationId
    return headers
  }

  private async retryWithoutScopedPayloadFieldsIfNeeded(input: {
    agentId: string
    combinedSignal: AbortSignal
    headers: Record<string, string>
    logger: Logger
    logStreamTiming: StreamTimingLogger
    options: ProxyOptions
    payload: Record<string, unknown>
    response: Awaited<ReturnType<typeof fetch>>
    resolvedModel: string
    streamTimingLogsEnabled: boolean
  }): Promise<Awaited<ReturnType<typeof fetch>>> {
    let response = input.response
    let gatewayErrorText: string | null = null
    if (!response.ok) {
      gatewayErrorText = await response.text()
      const hasScopedGatewayFields =
        Object.prototype.hasOwnProperty.call(input.payload, 'enabled_toolkits') ||
        Object.prototype.hasOwnProperty.call(input.payload, 'disabled_native_actions') ||
        Object.prototype.hasOwnProperty.call(input.payload, 'skill_catalog') ||
        Object.prototype.hasOwnProperty.call(input.payload, 'lane')

      if (
        response.status === 400 &&
        hasScopedGatewayFields &&
        gatewayErrorText &&
        isUnsupportedGatewayPayloadError(gatewayErrorText)
      ) {
        if (
          input.options.strictDisabledNativeActions === true &&
          Object.prototype.hasOwnProperty.call(input.payload, 'disabled_native_actions')
        ) {
          input.logger.warn(
            '[Chat] Gateway rejected disabled_native_actions for a strict request; failing closed',
          )
          await this.throwGatewayStatusError(input, response, gatewayErrorText)
        }
        input.logger.warn(
          '[Chat] Gateway rejected scoped tool payload keys; retrying without compatibility fields',
        )
        const fallbackPayload = { ...input.payload }
        delete fallbackPayload.enabled_toolkits
        delete fallbackPayload.disabled_native_actions
        delete fallbackPayload.skill_catalog
        delete fallbackPayload.lane
        response = await this.gatewayClient.postResponses({
          gatewayUrl: this.gatewayUrl,
          headers: input.headers,
          payload: fallbackPayload,
          signal: input.combinedSignal,
        })
        if (response.ok) {
          if (input.streamTimingLogsEnabled) {
            input.logger.log('[Chat] Gateway compatibility retry succeeded')
          }
          input.logStreamTiming('gateway_compatibility_retry_succeeded', {
            status: response.status,
            status_text: response.statusText,
          })
          return response
        }
        gatewayErrorText = await response.text()
        input.logStreamTiming('gateway_compatibility_retry_failed', {
          status: response.status,
          status_text: response.statusText,
        })
      }
    }

    if (!response.ok) {
      await this.throwGatewayStatusError(input, response, gatewayErrorText)
    }
    return response
  }

  private async throwGatewayStatusError(
    input: {
      agentId: string
      logger: Logger
      options: ProxyOptions
      resolvedModel: string
    },
    response: Awaited<ReturnType<typeof fetch>>,
    gatewayErrorText: string | null,
  ): Promise<never> {
    const errorText = gatewayErrorText ?? (await response.text())
    input.logger.error(`Gateway error ${response.status}: ${errorText.slice(0, 500)}`)
    const prefixed = `Gateway connection error: agent gateway ${response.status}`
    this.errorReporter.report({
      app: 'agent-api',
      severity: 'error',
      feature: 'chat',
      error_code: `gateway_${response.status}`,
      message: prefixed,
      category: 'infra',
      context: {
        agentId: input.agentId,
        conversationId: input.options.conversationId,
        model: input.resolvedModel,
        statusCode: response.status,
        body: errorText.slice(0, 1000),
        trace_id: input.options.traceId,
        message_id: input.options.messageId,
        request_id: input.options.requestId,
        run_id: input.options.runId,
      },
      user_id: input.options.userId,
      agent_key: input.agentId,
      trace_id: input.options.traceId,
      message_id: input.options.messageId,
      request_id: input.options.requestId,
      run_id: input.options.runId,
      conversation_id: input.options.conversationId,
    })
    await input.options.send('error', { code: 'gateway_connection' })
    throw markAppErrorReported(new Error(`${prefixed}: ${errorText.slice(0, 200)}`))
  }

  private reportGatewayEvent(
    stage: string,
    input: {
      options: ProxyOptions
      agentId: string
      resolvedModel: string
      status: string
      statusCode?: number
      durationMs?: number
      errorCode?: string
      error?: string
    },
  ): void {
    this.routeTraceReporter?.report({
      request_id: input.options.requestId,
      trace_id: input.options.traceId,
      message_id: input.options.messageId,
      run_id: input.options.runId,
      conversation_id: input.options.conversationId,
      user_id: input.options.userId,
      surface: 'agent-api',
      service: 'openclaw',
      route: '/v1/responses',
      method: 'POST',
      event_type: 'external_call',
      stage,
      status: input.status,
      status_code: input.statusCode ?? null,
      duration_ms: input.durationMs ?? null,
      error_code: input.errorCode ?? null,
      observability: {
        agent_id: input.agentId,
        model: input.resolvedModel,
        ...(input.error ? { error: input.error.slice(0, 500) } : {}),
      },
    })
  }
}
