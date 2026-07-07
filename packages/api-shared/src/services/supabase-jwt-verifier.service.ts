import { Injectable, Logger } from '@nestjs/common'
import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from 'jose'
import { AuthUpstreamUnavailableError, InvalidTokenError } from './auth-errors'
import { isTransientNetworkError } from './transient-error.util'

export type VerifiedSupabaseClaims = {
  sub: string
  email: string
  payload: JWTPayload
}

const CLOCK_TOLERANCE_SECONDS = 30
const JWKS_URL_SUFFIX = '/auth/v1/.well-known/jwks.json'

@Injectable()
export class SupabaseJwtVerifierService {
  private readonly logger = new Logger(SupabaseJwtVerifierService.name)
  private readonly jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

  private getJwksResolver(supabaseUrl: string): ReturnType<typeof createRemoteJWKSet> {
    const normalizedUrl = supabaseUrl.replace(/\/$/, '')
    const cached = this.jwksCache.get(normalizedUrl)
    if (cached) return cached

    const jwksUrl = `${normalizedUrl}${JWKS_URL_SUFFIX}`
    this.logger.debug(`[jwks] resolver_create url=${jwksUrl} timeoutMs=30000`)
    const jwks = createRemoteJWKSet(new URL(jwksUrl), {
      timeoutDuration: 30_000,
    })
    this.jwksCache.set(normalizedUrl, jwks)
    return jwks
  }

  async verify(token: string, supabaseUrl: string): Promise<VerifiedSupabaseClaims> {
    const normalizedUrl = supabaseUrl.replace(/\/$/, '')
    const jwksUrl = `${normalizedUrl}${JWKS_URL_SUFFIX}`

    try {
      const { payload } = await jwtVerify(token, this.getJwksResolver(normalizedUrl), {
        issuer: `${normalizedUrl}/auth/v1`,
        audience: 'authenticated',
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
      })

      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw new InvalidTokenError('claims_invalid')
      }

      return {
        sub: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : '',
        payload,
      }
    } catch (error) {
      if (error instanceof InvalidTokenError) throw error
      if (error instanceof errors.JWTExpired) {
        throw new InvalidTokenError('token_expired')
      }
      if (
        error instanceof errors.JWSSignatureVerificationFailed ||
        error instanceof errors.JWTClaimValidationFailed ||
        error instanceof errors.JOSEAlgNotAllowed ||
        error instanceof errors.JWKSNoMatchingKey ||
        error instanceof errors.JWTInvalid
      ) {
        this.logger.warn(
          `[jwks] token_invalid url=${jwksUrl} errorType=${error.constructor?.name} error=${error.message}`,
        )
        throw new InvalidTokenError('token_invalid')
      }
      if (
        error instanceof errors.JWKSTimeout ||
        error instanceof errors.JWKSInvalid ||
        isTransientNetworkError(error)
      ) {
        this.logger.warn(
          `[jwks] upstream_unavailable url=${jwksUrl} errorType=${error instanceof Error ? error.constructor?.name : typeof error} error=${error instanceof Error ? error.message : String(error)}`,
        )
        throw new AuthUpstreamUnavailableError()
      }

      this.logger.warn(
        `[jwks] token_invalid_unknown url=${jwksUrl} errorType=${error instanceof Error ? error.constructor?.name : typeof error} error=${error instanceof Error ? error.message : String(error)}`,
      )
      throw new InvalidTokenError('token_invalid')
    }
  }
}
