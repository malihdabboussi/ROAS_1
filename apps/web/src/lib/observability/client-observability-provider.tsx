'use client'

import { useEffect } from 'react'
import { reportClientError } from '@/lib/log-client-error'

const recentErrors = new Set<string>()

function rememberOnce(key: string): boolean {
  if (recentErrors.has(key)) return false
  recentErrors.add(key)
  window.setTimeout(() => recentErrors.delete(key), 60_000)
  return true
}

function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.message === 'string') return record.message
    if (typeof record.error === 'string') return record.error
  }
  return String(value)
}

function errorStack(value: unknown): string | undefined {
  return value instanceof Error ? value.stack : undefined
}

export function ClientObservabilityProvider() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const message = event.message || errorMessage(event.error)
      const key = `error:${message}:${event.filename}:${event.lineno}:${event.colno}`
      if (!rememberOnce(key)) return
      void reportClientError({
        feature: 'browser_runtime',
        error_code: 'WINDOW_ERROR',
        message,
        error: event.error,
        stack: errorStack(event.error),
        source_context: {
          source_file: event.filename,
          source_line: event.lineno,
          source_column: event.colno,
        },
        context: {
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      })
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      const message = errorMessage(event.reason)
      const key = `rejection:${message}:${errorStack(event.reason) ?? ''}`
      if (!rememberOnce(key)) return
      void reportClientError({
        feature: 'browser_runtime',
        error_code: 'UNHANDLED_REJECTION',
        message,
        error: event.reason,
        stack: errorStack(event.reason),
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}
