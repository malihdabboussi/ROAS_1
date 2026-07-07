import { reportClientError } from '@/lib/log-client-error'
import type { SocialPlatform } from '../types/space-schema'

export function socialResearchErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function reportSocialResearchError(
  errorCode: string,
  err: unknown,
  context?: Record<string, unknown>,
  severity: 'error' | 'warn' = 'error',
): void {
  void reportClientError({
    feature: 'social_research',
    error_code: errorCode,
    message: socialResearchErrorMessage(err),
    context,
    severity,
  })
}

export function socialResearchContext(
  spaceId?: string,
  platform?: SocialPlatform,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...(spaceId ? { space_id: spaceId } : {}),
    ...(platform ? { platform } : {}),
    ...extra,
  }
}
