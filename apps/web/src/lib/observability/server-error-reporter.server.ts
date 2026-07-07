import { extractSourceCodePointer } from '@vibey/api-shared/observability'
import {
  getObservabilityServiceClient,
  reportProxyRouteEvent,
} from './request-trace-event.server'

type Severity = 'error' | 'warn' | 'critical'

export interface ReportWebServerErrorInput {
  feature: string
  error_code: string
  message?: string
  error?: unknown
  request?: Request | null
  route?: string | null
  method?: string | null
  statusCode?: number | null
  severity?: Severity
  context?: Record<string, unknown>
  stack?: string | null
  source_context?: Record<string, unknown> | null
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let warned = false

function warnOnce(message: string): void {
  if (warned) return
  warned = true
  console.warn(`[WEB_OBSERVABILITY] ${message}`)
}

function text(value: unknown, max = 256): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim().slice(0, max)
    : null
}

function uuid(value: unknown): string | null {
  const normalized = text(value, 128)
  return normalized && UUID_RE.test(normalized) ? normalized : null
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    if (typeof record.message === 'string') return record.message
    if (typeof record.error === 'string') return record.error
  }
  return String(error ?? 'Unknown server route error')
}

function errorStack(error: unknown): string | null {
  return error instanceof Error && error.stack ? error.stack.slice(0, 8000) : null
}

function readHeader(request: Request | null | undefined, name: string): string | null {
  return text(request?.headers.get(name), 256)
}

function correlationFromRequest(request: Request | null | undefined) {
  return {
    request_id: readHeader(request, 'x-vibey-request-id'),
    trace_id: uuid(readHeader(request, 'x-vibey-trace-id')),
    message_id: uuid(readHeader(request, 'x-vibey-message-id')),
    run_id: readHeader(request, 'x-vibey-run-id'),
    conversation_id: uuid(readHeader(request, 'x-vibey-conversation-id')),
    user_id: uuid(readHeader(request, 'x-vibey-user-id')),
  }
}

function stripOptionalObservabilityColumns(row: Record<string, unknown>): Record<string, unknown> {
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

function isOptionalSchemaColumnError(error: { code?: string; message?: string }): boolean {
  const message = error.message ?? ''
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /column .* does not exist/i.test(message) ||
    /could not find .* column/i.test(message) ||
    /schema cache/i.test(message)
  )
}

export async function reportWebServerErrorNow(input: ReportWebServerErrorInput): Promise<void> {
  const supabase = getObservabilityServiceClient()
  if (!supabase) {
    warnOnce('app_errors disabled: missing Supabase service role env')
    return
  }

  const correlation = correlationFromRequest(input.request)
  const stack = input.stack?.slice(0, 8000) ?? errorStack(input.error)
  const sourcePointer = extractSourceCodePointer({
    stack,
    source_context: input.source_context ?? null,
  })
  const method = text(input.method ?? input.request?.method, 16)
  const route = text(input.route, 512) ?? text(input.request?.url, 512)
  const message = text(input.message, 4000) ?? errorMessage(input.error).slice(0, 4000)
  const context = {
    ...(input.context ?? {}),
    ...(route ? { route } : {}),
    ...(method ? { method } : {}),
    ...(typeof input.statusCode === 'number' ? { status: input.statusCode } : {}),
    ...Object.fromEntries(Object.entries(correlation).filter(([, value]) => value)),
  }

  const row = {
    app: 'web',
    severity: input.severity ?? 'error',
    feature: text(input.feature, 120),
    error_code: text(input.error_code, 120),
    message,
    context,
    stack,
    user_id: correlation.user_id,
    category: 'server_route',
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

  const { error } = await supabase.from('app_errors').insert(row)
  if (error) {
    if (!isOptionalSchemaColumnError(error)) {
      warnOnce(`Failed to persist app_error: ${error.message}`)
    } else {
      const { error: retryError } = await supabase
        .from('app_errors')
        .insert(stripOptionalObservabilityColumns(row))
      if (retryError) warnOnce(`Failed to persist legacy app_error: ${retryError.message}`)
    }
  }

  reportProxyRouteEvent({
    ...correlation,
    surface: 'web',
    service: input.feature,
    route,
    method,
    event_type: 'exception',
    stage: 'reported',
    status: input.severity === 'warn' ? 'warn' : 'error',
    status_code: input.statusCode ?? null,
    error_code: input.error_code,
    ...sourcePointer,
    observability: {
      app_error: true,
      category: 'server_route',
      ...(input.context ?? {}),
    },
  })
}

export function reportWebServerError(input: ReportWebServerErrorInput): void {
  void reportWebServerErrorNow(input).catch((error: unknown) => {
    warnOnce(`app_errors insert threw: ${error instanceof Error ? error.message : String(error)}`)
  })
}
