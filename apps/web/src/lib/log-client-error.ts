import { backendFetch } from '@/lib/api/backend-client'

export type ReportClientErrorParams = {
  feature: string
  error_code?: string
  message: string
  error?: unknown
  stack?: string
  component_stack?: string
  source_context?: Record<string, unknown>
  url?: string
  route?: string
  trace_id?: string | null
  message_id?: string | null
  request_id?: string | null
  run_id?: string | null
  conversation_id?: string | null
  context?: Record<string, unknown>
  severity?: 'error' | 'warn' | 'critical'
}

function resolveErrorStack(params: ReportClientErrorParams): string | undefined {
  if (params.stack) return params.stack
  const error = params.error
  return error instanceof Error ? error.stack : undefined
}

function resolveLocation(): { url?: string; route?: string } {
  if (typeof window === 'undefined') return {}
  return {
    url: window.location.href,
    route: window.location.pathname,
  }
}

/**
 * POST /api/log/client-error — best-effort; never throws to callers.
 */
export async function reportClientError(params: ReportClientErrorParams): Promise<void> {
  try {
    const location = resolveLocation()
    const payload = {
      feature: params.feature,
      error_code: params.error_code ?? null,
      message: params.message,
      severity: params.severity ?? 'error',
      stack: resolveErrorStack(params) ?? null,
      component_stack: params.component_stack ?? null,
      source_context: params.source_context ?? null,
      url: params.url ?? location.url ?? null,
      route: params.route ?? location.route ?? null,
      trace_id: params.trace_id ?? null,
      message_id: params.message_id ?? null,
      request_id: params.request_id ?? null,
      run_id: params.run_id ?? null,
      conversation_id: params.conversation_id ?? null,
      context: params.context ?? {},
    }
    await backendFetch('/api/log/client-error', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipClientErrorLog: true,
    })
  } catch {
    /* intentionally ignore */
  }
}
