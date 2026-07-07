import { Injectable, Logger as NestLogger, Optional } from '@nestjs/common'
import { extractSourceCodePointer } from '../observability/public'
import { RouteTraceReporter } from '../observability/route-trace-reporter.service'
import { SupabaseServiceClient } from './supabase-service-client.provider'

export interface ReportErrorParams {
  app: string
  severity?: 'error' | 'warn' | 'critical'
  feature?: string
  error_code?: string
  message: string
  context?: Record<string, unknown>
  stack?: string
  component_stack?: string
  source_context?: Record<string, unknown>
  url?: string
  route?: string
  user_id?: string
  category?: string
  agent_key?: string
  trace_id?: string | null
  message_id?: string | null
  request_id?: string | null
  run_id?: string | null
  conversation_id?: string | null
  source_file?: string | null
  source_line?: number | null
  source_column?: number | null
  function_name?: string | null
  runtime_file?: string | null
  runtime_line?: number | null
  runtime_column?: number | null
  commit_sha?: string | null
  release_id?: string | null
  build_id?: string | null
  source_resolved?: boolean
  code_context?: Record<string, unknown> | null
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type CorrelationField = 'trace_id' | 'message_id' | 'request_id' | 'run_id' | 'conversation_id'

function readContextString(
  context: Record<string, unknown>,
  snakeKey: CorrelationField,
  camelKey: string,
): string | null {
  const snakeValue = context[snakeKey]
  if (typeof snakeValue === 'string' && snakeValue.trim().length > 0) return snakeValue.trim()
  const camelValue = context[camelKey]
  if (typeof camelValue === 'string' && camelValue.trim().length > 0) return camelValue.trim()
  return null
}

function normalizeUuid(value: string | null | undefined): string | null {
  return value && UUID_RE.test(value) ? value : null
}

function normalizeText(value: string | null | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim().slice(0, 256) : null
}

function normalizeCorrelation(params: ReportErrorParams): {
  trace_id: string | null
  message_id: string | null
  request_id: string | null
  run_id: string | null
  conversation_id: string | null
  context: Record<string, unknown>
} {
  const context = params.context ?? {}
  const traceId = normalizeUuid(
    params.trace_id ?? readContextString(context, 'trace_id', 'traceId'),
  )
  const messageId = normalizeUuid(
    params.message_id ?? readContextString(context, 'message_id', 'messageId'),
  )
  const requestId = normalizeText(
    params.request_id ?? readContextString(context, 'request_id', 'requestId'),
  )
  const runId = normalizeText(params.run_id ?? readContextString(context, 'run_id', 'runId'))
  const conversationId = normalizeUuid(
    params.conversation_id ?? readContextString(context, 'conversation_id', 'conversationId'),
  )
  return {
    trace_id: traceId,
    message_id: messageId,
    request_id: requestId,
    run_id: runId,
    conversation_id: conversationId,
    context: {
      ...context,
      ...(traceId ? { trace_id: traceId } : {}),
      ...(messageId ? { message_id: messageId } : {}),
      ...(requestId ? { request_id: requestId } : {}),
      ...(runId ? { run_id: runId } : {}),
      ...(conversationId ? { conversation_id: conversationId } : {}),
    },
  }
}

@Injectable()
export class ErrorReporter {
  private readonly logger = new NestLogger(ErrorReporter.name)

  constructor(
    private readonly svc: SupabaseServiceClient,
    @Optional() private readonly routeTraceReporter?: RouteTraceReporter,
  ) {}

  report(params: ReportErrorParams): void {
    const originalUserId = params.user_id ?? null
    const correlation = normalizeCorrelation(params)
    const sourcePointer = extractSourceCodePointer({
      ...params,
      stack: params.stack,
      component_stack: params.component_stack,
      source_context: params.source_context,
      code_context: params.code_context ?? params.source_context ?? null,
    })
    const context: Record<string, unknown> = {
      ...correlation.context,
      ...(params.url ? { url: params.url.slice(0, 1000) } : {}),
      ...(params.route ? { route: params.route.slice(0, 512) } : {}),
      ...(params.component_stack ? { component_stack: params.component_stack.slice(0, 4000) } : {}),
      ...(params.source_context ? { source_context: params.source_context } : {}),
    }
    const row = {
      app: params.app,
      severity: params.severity ?? 'error',
      feature: params.feature ?? null,
      error_code: params.error_code ?? null,
      message: params.message.slice(0, 4000),
      context,
      stack: params.stack?.slice(0, 8000) ?? null,
      user_id: originalUserId,
      category: params.category ?? null,
      agent_key: params.agent_key ?? null,
      trace_id: correlation.trace_id,
      message_id: correlation.message_id,
      request_id: correlation.request_id,
      run_id: correlation.run_id,
      conversation_id: correlation.conversation_id,
      source_file: sourcePointer.source_file ?? null,
      source_line: sourcePointer.source_line ?? null,
      source_column: sourcePointer.source_column ?? null,
      function_name: sourcePointer.function_name ?? null,
      runtime_file: sourcePointer.runtime_file ?? null,
      runtime_line: sourcePointer.runtime_line ?? null,
      runtime_column: sourcePointer.runtime_column ?? null,
      commit_sha: sourcePointer.commit_sha ?? null,
      release_id: sourcePointer.release_id ?? null,
      build_id: sourcePointer.build_id ?? null,
      source_resolved: sourcePointer.source_resolved === true,
      code_context: sourcePointer.code_context ?? {},
    }

    if (this.routeTraceReporter) {
      this.routeTraceReporter.report({
        request_id: correlation.request_id,
        trace_id: correlation.trace_id,
        message_id: correlation.message_id,
        run_id: correlation.run_id,
        conversation_id: correlation.conversation_id,
        user_id: originalUserId,
        surface: params.app,
        service: params.feature ?? params.app,
        route: params.route ?? (typeof context.path === 'string' ? context.path : null),
        method: typeof context.method === 'string' ? context.method : null,
        event_type: 'exception',
        stage: 'reported',
        status: params.severity === 'warn' ? 'warn' : 'error',
        status_code: typeof context.status === 'number' ? context.status : null,
        error_code: params.error_code ?? null,
        source_file: sourcePointer.source_file ?? null,
        source_line: sourcePointer.source_line ?? null,
        source_column: sourcePointer.source_column ?? null,
        function_name: sourcePointer.function_name ?? null,
        runtime_file: sourcePointer.runtime_file ?? null,
        runtime_line: sourcePointer.runtime_line ?? null,
        runtime_column: sourcePointer.runtime_column ?? null,
        commit_sha: sourcePointer.commit_sha ?? null,
        release_id: sourcePointer.release_id ?? null,
        build_id: sourcePointer.build_id ?? null,
        source_resolved: sourcePointer.source_resolved === true,
        code_context: sourcePointer.code_context ?? {},
        observability: {
          category: params.category ?? null,
          agent_key: params.agent_key ?? null,
          app_error: true,
        },
      })
    }

    this.insertWithUserFkRecovery(row, originalUserId).catch((err: unknown) => {
      this.logger.error(
        `ErrorReporter insert threw: ${err instanceof Error ? err.message : String(err)}`,
      )
    })
  }

  /**
   * Insert into `app_errors`. If the insert fails because `user_id` doesn't exist in
   * `auth.users` (FK `app_errors_user_id_fkey`), we MUST NOT drop the error log — that
   * would hide real bugs behind an orphan-user. Retry once with `user_id = null` and
   * preserve the original id in `context.orphan_user_id` for forensics. The schema's
   * `ON DELETE SET NULL` already expresses "a missing user is not a reason to lose data";
   * we honor the same contract on insert.
   */
  private async insertWithUserFkRecovery(
    row: Record<string, unknown>,
    originalUserId: string | null,
  ): Promise<void> {
    const error = await this.insertAppErrorRow(row)
    if (!error) return

    const isFkUserViolation =
      error.code === '23503' && /app_errors_user_id_fkey/i.test(error.message ?? '')

    if (isFkUserViolation && originalUserId) {
      const existingContext =
        row.context && typeof row.context === 'object'
          ? (row.context as Record<string, unknown>)
          : {}
      const retryRow = {
        ...row,
        user_id: null,
        context: { ...existingContext, orphan_user_id: originalUserId },
      }
      const retryError = await this.insertAppErrorRow(retryRow)
      if (retryError) {
        this.logger.error(`Failed to persist app_error (retry): ${retryError.message}`)
      }
      return
    }

    this.logger.error(`Failed to persist app_error: ${error.message}`)
  }

  private async insertAppErrorRow(row: Record<string, unknown>) {
    const { error } = await this.svc.client.from('app_errors').insert(row)
    if (!error) return null

    if (!this.isOptionalSchemaColumnError(error)) return error

    const legacyRow = this.stripOptionalObservabilityColumns(row)
    const { error: retryError } = await this.svc.client.from('app_errors').insert(legacyRow)
    return retryError ?? null
  }

  private isOptionalSchemaColumnError(error: { code?: string; message?: string }): boolean {
    const message = error.message ?? ''
    return (
      error.code === '42703' ||
      error.code === 'PGRST204' ||
      /column .* does not exist/i.test(message) ||
      /could not find .* column/i.test(message) ||
      /schema cache/i.test(message)
    )
  }

  private stripOptionalObservabilityColumns(row: Record<string, unknown>): Record<string, unknown> {
    const optionalColumns = new Set([
      'trace_id',
      'message_id',
      'request_id',
      'run_id',
      'conversation_id',
      'source_file',
      'source_line',
      'source_column',
      'function_name',
      'runtime_file',
      'runtime_line',
      'runtime_column',
      'commit_sha',
      'release_id',
      'build_id',
      'source_resolved',
      'code_context',
    ])
    return Object.fromEntries(Object.entries(row).filter(([key]) => !optionalColumns.has(key)))
  }
}
