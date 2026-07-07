import { ErrorReporter } from './error-reporter'

type ProcessErrorCode =
  | 'MISSION_WORKER_UNHANDLED_REJECTION'
  | 'MISSION_WORKER_UNCAUGHT_EXCEPTION'
  | 'MISSION_WORKER_BOOTSTRAP_FAILED'

export interface MissionWorkerProcessErrorReport {
  app: 'mission-worker'
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
  console.warn(`[mission-worker] process app_errors disabled: ${message}`)
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

export function buildMissionWorkerProcessErrorReport(
  errorCode: ProcessErrorCode,
  error: unknown,
  context: Record<string, unknown> = {},
): MissionWorkerProcessErrorReport {
  return {
    app: 'mission-worker',
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

export function reportMissionWorkerProcessError(
  errorCode: ProcessErrorCode,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const errorReporter = getReporter()
  if (!errorReporter) return
  errorReporter.report(buildMissionWorkerProcessErrorReport(errorCode, error, context))
}
