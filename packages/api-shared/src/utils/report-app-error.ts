import type { ErrorReporter, ReportErrorParams } from '../services/error-reporter.service'

export type ReportedError = Error & { __appErrorReported?: true }

export function markAppErrorReported(error: unknown): void {
  if (error instanceof Error) {
    Object.defineProperty(error, '__appErrorReported', { value: true, enumerable: false })
  }
}

export function reportAppError(
  errorReporter: ErrorReporter,
  params: ReportErrorParams,
  error?: unknown,
): void {
  errorReporter.report(params)
  if (error !== undefined) {
    markAppErrorReported(error)
  }
}
