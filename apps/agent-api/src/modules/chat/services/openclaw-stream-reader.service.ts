import { Injectable, Optional, type Logger } from '@nestjs/common'
import { ErrorReporter, RouteTraceReporter } from '@vibey/api-shared'
import { ProviderBillingAttemptsService } from '../../billing/services/provider-billing-attempts.service'
import type { OpenClawCompletionResult, ProxyOptions } from './openclaw-proxy.types'
import { OpenClawStreamContentService } from './openclaw-stream-content.service'
import { OpenClawStreamLifecycleService } from './openclaw-stream-lifecycle.service'
import {
  buildOpenClawCompletionResult,
  createOpenClawStreamState,
  logFirstStreamTiming,
  type OpenClawStreamContext,
  type OpenClawStreamState,
  type OpenClawStreamTimingLogger,
} from './openclaw-stream-state'
import { OpenClawStreamToolService } from './openclaw-stream-tool.service'
import { ResponseFilterService } from './response-filter.service'

type ReportedError = Error & { __appErrorReported?: true }

function markAppErrorReported(error: Error): ReportedError {
  ;(error as ReportedError).__appErrorReported = true
  return error as ReportedError
}

type ReadGatewayResponseInput = {
  agentId: string
  correlation: string
  logger: Logger
  logStreamTiming: OpenClawStreamTimingLogger
  options: ProxyOptions
  response: Awaited<ReturnType<typeof fetch>>
  resolvedModel: string
  streamTimingLogsEnabled: boolean
  timeoutHandle: ReturnType<typeof setTimeout>
}

@Injectable()
export class OpenClawStreamReaderService {
  private readonly STALL_WARN_MS = 20_000
  private readonly STALL_ABORT_MS = 120_000
  private readonly STALL_EMPTY_ABORT_MS = 300_000
  private readonly TICK_MS = 5_000

  constructor(
    responseFilter: ResponseFilterService,
    private readonly errorReporter: ErrorReporter,
    @Optional() private readonly routeTraceReporter?: RouteTraceReporter,
    @Optional() private readonly providerBillingAttempts?: ProviderBillingAttemptsService,
    private readonly contentEvents: OpenClawStreamContentService = new OpenClawStreamContentService(
      responseFilter,
    ),
    private readonly toolEvents: OpenClawStreamToolService = new OpenClawStreamToolService(
      responseFilter,
      errorReporter,
      routeTraceReporter,
    ),
    private readonly lifecycleEvents: OpenClawStreamLifecycleService = new OpenClawStreamLifecycleService(
      errorReporter,
      providerBillingAttempts,
    ),
  ) {}

  async readGatewayResponse(input: ReadGatewayResponseInput): Promise<OpenClawCompletionResult> {
    clearTimeout(input.timeoutHandle)
    const reader = input.response.body?.getReader()
    if (!reader) {
      this.throwNoBodyError(input)
    }

    input.logStreamTiming('gateway_body_ready', {
      content_type: input.response.headers.get('content-type'),
    })

    const state = createOpenClawStreamState()
    const context: OpenClawStreamContext = {
      agentId: input.agentId,
      correlation: input.correlation,
      logger: input.logger,
      logStreamTiming: input.logStreamTiming,
      options: input.options,
      resolvedModel: input.resolvedModel,
      streamStartedAt: Date.now(),
      streamTimingLogsEnabled: input.streamTimingLogsEnabled,
    }
    const stallTicker = this.startStallTicker(reader, context, state)

    try {
      await this.readSseLoop(reader, context, state)
    } finally {
      clearTimeout(input.timeoutHandle)
      clearInterval(stallTicker)
      reader.releaseLock()
    }

    this.logStreamEnd(context, state)
    this.reportStallIfNeeded(context, state)
    return buildOpenClawCompletionResult(state)
  }

  private throwNoBodyError(input: ReadGatewayResponseInput): never {
    input.logStreamTiming('gateway_body_missing', {
      status: input.response.status,
      content_type: input.response.headers.get('content-type'),
    })
    const noBodyMsg = `No response body from gateway (status=${input.response.status} type=${input.response.headers.get('content-type')})`
    this.errorReporter.report({
      app: 'agent-api',
      severity: 'error',
      feature: 'chat',
      error_code: 'gateway_no_body',
      message: noBodyMsg,
      category: 'infra',
      context: {
        agentId: input.agentId,
        conversationId: input.options.conversationId,
        model: input.resolvedModel,
        gatewayStatus: input.response.status,
        contentType: input.response.headers.get('content-type'),
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
    throw markAppErrorReported(new Error(noBodyMsg))
  }

  private startStallTicker(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): ReturnType<typeof setInterval> {
    return setInterval(() => {
      const idleMs = Date.now() - state.lastEventAt
      if (idleMs >= this.STALL_WARN_MS) {
        context.logger.warn(
          `[Chat] stall_detected ${context.correlation} idleMs=${idleMs} hasContent=${state.hasEmittedContent} toolStarts=${state.sawToolStart} contentLen=${state.fullContent.length}`,
        )
      }
      const abortThreshold =
        !state.hasEmittedContent && !state.sawToolStart && state.fullContent.length === 0
          ? this.STALL_EMPTY_ABORT_MS
          : this.STALL_ABORT_MS
      if (!state.stallAborted && idleMs >= abortThreshold) {
        state.stallAborted = true
        context.logger.error(
          `[Chat] stall_abort ${context.correlation} idleMs=${idleMs} hasContent=${state.hasEmittedContent} toolStarts=${state.sawToolStart} contentLen=${state.fullContent.length} threshold=${abortThreshold}`,
        )
        void reader.cancel().catch(() => {})
      }
    }, this.TICK_MS)
  }

  private async readSseLoop(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    const decoder = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      logFirstStreamTiming(state, context, 'first_chunk', {
        chunk_bytes: value.byteLength,
        stream_ms: Date.now() - context.streamStartedAt,
      })

      state.buffer += decoder.decode(value, { stream: true })
      const lines = state.buffer.split('\n')
      state.buffer = lines.pop() ?? ''

      for (const line of lines) {
        await this.handleLine(line, context, state)
      }
    }
  }

  private async handleLine(
    line: string,
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): Promise<void> {
    if (line.startsWith(': ')) {
      state.lastEventAt = Date.now()
      return
    }
    if (!line.startsWith('data: ')) return
    const data = line.slice(6).trim()
    if (data === '[DONE]' || !data) return

    try {
      const evt = JSON.parse(data) as Record<string, unknown>
      const type = (evt.type as string) ?? ''
      state.lastEventAt = Date.now()
      logFirstStreamTiming(state, context, 'first_event', {
        event_type: type || 'unknown',
        lifecycle: evt.stream === 'lifecycle',
        stream_ms: Date.now() - context.streamStartedAt,
      })
      this.applyLifecycleEnvelope(evt, state)
      if (await this.contentEvents.handleEvent(type, evt, context, state)) return
      if (await this.toolEvents.handleEvent(type, evt, context, state)) return
      await this.lifecycleEvents.handleEvent(type, evt, context, state)
    } catch {
      // Match the legacy stream behavior: skip malformed or failed chunks.
    }
  }

  private applyLifecycleEnvelope(
    evt: Record<string, unknown>,
    state: OpenClawStreamState,
  ): void {
    if (evt.stream !== 'lifecycle') return
    const lifecycleData =
      evt.data && typeof evt.data === 'object' && !Array.isArray(evt.data)
        ? (evt.data as Record<string, unknown>)
        : null
    if (lifecycleData?.phase === 'truncated') {
      state.truncated = true
    }
  }

  private logStreamEnd(context: OpenClawStreamContext, state: OpenClawStreamState): void {
    if (context.streamTimingLogsEnabled) {
      context.logger.log(
        `[Chat] end ${context.correlation} durationMs=${Date.now() - context.streamStartedAt} hasContent=${state.hasEmittedContent} contentLen=${state.fullContent.length} toolStarts=${state.sawToolStart} toolSteps=${state.toolSteps.length} failed=${state.failedMessage ? 'yes' : 'no'}`,
      )
    }
    context.logStreamTiming('end', {
      stream_ms: Date.now() - context.streamStartedAt,
      has_content: state.hasEmittedContent,
      content_len: state.fullContent.length,
      tool_starts: state.sawToolStart,
      tool_steps: state.toolSteps.length,
      hidden_tool_start_count: state.hiddenToolStartCount,
      hidden_tool_end_count: state.hiddenToolEndCount,
      hidden_tool_failed_count: state.hiddenToolFailedCount,
      failed: Boolean(state.failedMessage),
      stalled: state.stallAborted,
    })
  }

  private reportStallIfNeeded(
    context: OpenClawStreamContext,
    state: OpenClawStreamState,
  ): void {
    if (!state.stallAborted || state.failedMessage) return
    state.failedMessage = 'stream_stalled'
    state.truncated = true
    this.errorReporter.report({
      app: 'agent-api',
      severity: 'error',
      feature: 'chat',
      error_code: 'stall_abort',
      message: `Stream stalled after ${Date.now() - context.streamStartedAt}ms`,
      category: 'infra',
      context: {
        agentId: context.agentId,
        conversationId: context.options.conversationId,
        model: context.resolvedModel,
        durationMs: Date.now() - context.streamStartedAt,
        hasContent: state.hasEmittedContent,
        contentLen: state.fullContent.length,
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
}
