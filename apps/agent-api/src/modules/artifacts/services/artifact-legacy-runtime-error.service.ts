import { Injectable } from '@nestjs/common'

/** Supabase PostgREST errors are plain objects; surface message/code/details in logs. */
export function formatArtifactThrownError(error: unknown): string {
  if (error instanceof Error) return error.message || String(error)
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const o = error as Record<string, unknown>
    const msg = typeof o.message === 'string' ? o.message : ''
    if (msg.trim().length > 0) {
      const parts = [msg.trim()]
      if (typeof o.code === 'string' && o.code) parts.push(`code=${o.code}`)
      if (typeof o.details === 'string' && o.details) parts.push(`details=${o.details}`)
      if (typeof o.hint === 'string' && o.hint) parts.push(`hint=${o.hint}`)
      return parts.join(' ')
    }
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
  return String(error)
}

@Injectable()
export class ArtifactLegacyRuntimeErrorService {
  async logError(target: Record<string, any>, action: string, error: unknown, sessionKey?: string) {
    const derivedUserId = sessionKey ? target.parseUserId(sessionKey) : null
    const errorText = formatArtifactThrownError(error)
    target.logger.error(`Artifact action "${action}" failed: ${errorText}`)
    try {
      await target.errorLogger.logError({
        severity: 'error',
        feature: `artifacts/${action}`,
        error_code: 'DB_ERROR',
        message: `Artifact action "${action}" failed`,
        context: {
          error_message: errorText,
          userId: derivedUserId,
        },
      })
    } catch (loggerError) {
      target.logger.error(
        `[artifact-debug] Failed to persist error log for "${action}": ${formatArtifactThrownError(loggerError)}`,
      )
    }
  }

  resolveCreditAwareError(error: unknown): string | null {
    const err = error as
      | {
          message?: string
          code?: string | number
          status?: number
          statusCode?: number
          cause?: { code?: string | number; message?: string; status?: number; statusCode?: number }
        }
      | undefined

    const status = Number(
      err?.status ?? err?.statusCode ?? err?.cause?.status ?? err?.cause?.statusCode ?? NaN,
    )
    if (status === 402) return 'credits_exhausted'

    const codeCandidates = [err?.code, err?.cause?.code]
      .filter((value): value is string | number => value !== undefined && value !== null)
      .map((value) => String(value).toLowerCase())
    if (codeCandidates.some((value) => value.includes('credits_exhausted'))) {
      return 'credits_exhausted'
    }

    const messageCandidates = [err?.message, err?.cause?.message]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.toLowerCase())

    const creditPatterns = [
      'credits exhausted',
      'credits_exhausted',
      'out of credits',
      'insufficient credits',
      'insufficient credit',
      'credit balance',
      'payment required',
      'quota exceeded',
      'billing',
    ]

    if (
      messageCandidates.some((message) =>
        creditPatterns.some((pattern) => message.includes(pattern)),
      )
    ) {
      return 'credits_exhausted'
    }

    return null
  }
}
