import { ErrorReporter } from './error-reporter'

type ProcessErrorCode =
  | 'QUEUE_WORKER_UNHANDLED_REJECTION'
  | 'QUEUE_WORKER_UNCAUGHT_EXCEPTION'
  | 'QUEUE_WORKER_BOOTSTRAP_FAILED'

export interface QueueWorkerProcessErrorReport {
  app: 'queue-worker'
  severity: 'critical'
  feature: 'process'
  error_code: ProcessErrorCode
  message: string
  stack?: string
  context: Record<string, unknown>
  category: 'worker_process'
}

let reporter: ErrorReporter | null | undefined
let warned = false

function warnOnce(message: string): void {
  if (warned) return
  warned = true
  console.warn(`[queue-worker] process app_errors disabled: ${message}`)
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    if (typeof record.message === 'string') return record.message
    if (typeof record.error === 'string') return record.error
  }
  return String(error ?? 'Unknown process error')
}

function errorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined
}

function getReporter(): ErrorReporter | null {
  if (reporter !== undefined) return reporter
  try {
    reporter = new ErrorReporter()
  } catch (error) {
    reporter = null
    warnOnce(errorMessage(error))
  }
  return reporter
}

export function buildQueueWorkerProcessErrorReport(
  errorCode: ProcessErrorCode,
  error: unknown,
  context: Record<string, unknown> = {},
): QueueWorkerProcessErrorReport {
  return {
    app: 'queue-worker',
    severity: 'critical',
    feature: 'process',
    error_code: errorCode,
    message: errorMessage(error),
    stack: errorStack(error),
    context: {
      pid: process.pid,
      hostname: process.env.HOSTNAME ?? null,
      railway_service: process.env.RAILWAY_SERVICE_NAME ?? null,
      ...context,
    },
    category: 'worker_process',
  }
}

export function reportQueueWorkerProcessError(
  errorCode: ProcessErrorCode,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const errorReporter = getReporter()
  if (!errorReporter) return
  errorReporter.report(buildQueueWorkerProcessErrorReport(errorCode, error, context))
}
