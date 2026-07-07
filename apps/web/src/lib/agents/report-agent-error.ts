import { reportClientError } from '@/lib/log-client-error'

export function teamErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function reportTeamError(
  errorCode: string,
  err: unknown,
  context?: Record<string, unknown>,
  severity: 'error' | 'warn' = 'error',
): void {
  void reportClientError({
    feature: 'team_chat',
    error_code: errorCode,
    message: teamErrorMessage(err),
    context,
    severity,
  })
}
