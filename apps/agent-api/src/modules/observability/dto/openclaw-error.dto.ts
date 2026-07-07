import { BadRequestException } from '@nestjs/common'

export type OpenClawSeverity = 'error' | 'warn' | 'critical'

export interface OpenClawErrorDto {
  severity: OpenClawSeverity
  feature: string
  error_code: string
  message: string
  stack?: string
  route?: string
  request_id?: string | null
  trace_id?: string | null
  message_id?: string | null
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
  source_context?: Record<string, unknown>
  context: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, max = 256): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim().slice(0, max)
    : undefined
}

function positiveInt(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined
}

function sanitizedRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {}
  const out: Record<string, unknown> = {}
  for (const [rawKey, rawValue] of Object.entries(value).slice(0, 32)) {
    const key = rawKey.slice(0, 80)
    if (typeof rawValue === 'string') out[key] = rawValue.slice(0, 1000)
    else if (typeof rawValue === 'number' && Number.isFinite(rawValue)) out[key] = rawValue
    else if (typeof rawValue === 'boolean') out[key] = rawValue
    else if (rawValue === null) out[key] = null
  }
  return out
}

function severity(value: unknown): OpenClawSeverity {
  return value === 'critical' || value === 'warn' || value === 'error' ? value : 'error'
}

export function parseOpenClawErrorDto(input: unknown): OpenClawErrorDto {
  if (!isRecord(input)) throw new BadRequestException('Invalid request body')
  const message = text(input.message, 4000)
  if (!message) throw new BadRequestException('message is required')

  return {
    severity: severity(input.severity),
    feature: text(input.feature, 120) ?? 'openclaw_runtime',
    error_code: text(input.error_code, 120) ?? 'OPENCLAW_RUNTIME_ERROR',
    message,
    stack: text(input.stack, 8000),
    route: text(input.route, 512),
    request_id: text(input.request_id, 256) ?? null,
    trace_id: text(input.trace_id, 128) ?? null,
    message_id: text(input.message_id, 128) ?? null,
    run_id: text(input.run_id, 256) ?? null,
    conversation_id: text(input.conversation_id, 128) ?? null,
    source_file: text(input.source_file, 512) ?? null,
    source_line: positiveInt(input.source_line) ?? null,
    source_column: positiveInt(input.source_column) ?? null,
    function_name: text(input.function_name, 256) ?? null,
    runtime_file: text(input.runtime_file, 512) ?? null,
    runtime_line: positiveInt(input.runtime_line) ?? null,
    runtime_column: positiveInt(input.runtime_column) ?? null,
    commit_sha: text(input.commit_sha, 80) ?? null,
    release_id: text(input.release_id, 160) ?? null,
    build_id: text(input.build_id, 160) ?? null,
    source_resolved: input.source_resolved === true,
    source_context: sanitizedRecord(input.source_context),
    context: sanitizedRecord(input.context),
  }
}
