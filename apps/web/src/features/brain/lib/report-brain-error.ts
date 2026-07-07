import { reportClientError } from '@/lib/log-client-error'

export function brainErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function reportBrainError(
  errorCode: string,
  err: unknown,
  context?: Record<string, unknown>,
  severity: 'error' | 'warn' = 'error',
): void {
  void reportClientError({
    feature: 'brain',
    error_code: errorCode,
    message: brainErrorMessage(err),
    context,
    severity,
  })
}
