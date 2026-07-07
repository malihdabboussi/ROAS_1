import { Global, Injectable, Module, Logger as NestLogger } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { extractSourceCodePointer } from './source-code-pointer'

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
  private readonly client: SupabaseClient

  constructor() {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    this.client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

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

    this.reportRouteEvent(params, correlation, sourcePointer)
    this.insertWithUserFkRecovery(row, originalUserId).catch((err: unknown) => {
      this.logger.error(
        `ErrorReporter insert threw: ${err instanceof Error ? err.message : String(err)}`,
      )
    })
  }

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
    const { error } = await this.client.from('app_errors').insert(row)
    if (!error) return null
    if (!this.isOptionalSchemaColumnError(error)) return error
    const { error: retryError } = await this.client
      .from('app_errors')
      .insert(this.stripOptionalObservabilityColumns(row))
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

  private reportRouteEvent(
    params: ReportErrorParams,
    correlation: ReturnType<typeof normalizeCorrelation>,
    sourcePointer: ReturnType<typeof extractSourceCodePointer>,
  ): void {
    const table = this.client.from('request_trace_events') as unknown as {
      insert?: (
        payload: Record<string, unknown>,
      ) => PromiseLike<{ error?: { message: string } | null }>
    }
    if (typeof table.insert !== 'function') return
    void Promise.resolve(
      table.insert({
        request_id: correlation.request_id,
        trace_id: correlation.trace_id,
        message_id: correlation.message_id,
        run_id: correlation.run_id,
        conversation_id: correlation.conversation_id,
        user_id: normalizeUuid(params.user_id),
        surface: params.app,
        service: params.feature ?? params.app,
        route: params.route ?? null,
        event_type: 'exception',
        stage: 'reported',
        status: params.severity === 'warn' ? 'warn' : 'error',
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
        observability: { app_error: true, category: params.category ?? null },
      }),
    )
      .then(({ error }) => {
        if (error) this.logger.warn(`Failed to persist request_trace_event: ${error.message}`)
      })
      .catch(() => undefined)
  }
}

@Global()
@Module({
  providers: [ErrorReporter],
  exports: [ErrorReporter],
})
export class AppErrorsModule {}
