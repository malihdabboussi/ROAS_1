import { reportClientError } from '@/lib/log-client-error'

export function studioErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function reportStudioError(
  errorCode: string,
  err: unknown,
  context?: Record<string, unknown>,
  severity: 'error' | 'warn' = 'error',
): void {
  void reportClientError({
    feature: 'studio_chat',
    error_code: errorCode,
    message: studioErrorMessage(err),
    context,
    severity,
  })
}
