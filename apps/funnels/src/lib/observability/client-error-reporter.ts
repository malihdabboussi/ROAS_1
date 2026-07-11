'use client'

import { resolveBackendUrl } from '@/lib/platform-urls'

export interface ReportFunnelsClientErrorInput {
  feature: string
  error_code?: string | null
  message: string
  error?: unknown
  stack?: string | null
  source_context?: Record<string, unknown> | null
  url?: string | null
  route?: string | null
  context?: Record<string, unknown>
  severity?: 'error' | 'warn' | 'critical'
}

function errorStack(error: unknown): string | null {
  return error instanceof Error && error.stack ? error.stack : null
}

function resolveLocation(): { url: string | null; route: string | null } {
  if (typeof window === 'undefined') return { url: null, route: null }
  return {
    url: window.location.href,
    route: window.location.pathname,
  }
}

export async function reportFunnelsClientError(
  input: ReportFunnelsClientErrorInput,
): Promise<void> {
  try {
    const location = resolveLocation()
    await fetch(`${resolveBackendUrl()}/api/log/client-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        app: 'funnels',
        feature: input.feature,
        error_code: input.error_code ?? null,
        message: input.message,
        severity: input.severity ?? 'error',
        stack: input.stack ?? errorStack(input.error),
        source_context: input.source_context ?? null,
        url: input.url ?? location.url,
        route: input.route ?? location.route,
        context: input.context ?? {},
      }),
    })
  } catch {
    // Reporting must never affect public funnel behavior.
  }
}
