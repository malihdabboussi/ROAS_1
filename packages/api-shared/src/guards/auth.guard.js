'use strict'
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc)
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r
    return (c > 3 && r && Object.defineProperty(target, key, r), r)
  }
var AuthGuard_1
Object.defineProperty(exports, '__esModule', { value: true })
exports.AuthGuard = void 0
const common_1 = require('@nestjs/common')
const crypto_1 = require('crypto')
const supabase_js_1 = require('@supabase/supabase-js')
const supabase_resilient_fetch_1 = require('../services/supabase-resilient-fetch')
const JWKS_CACHE_TTL_MS = 15 * 60 * 1000
const CLOCK_SKEW_SECONDS = 30
let AuthGuard = (AuthGuard_1 = class AuthGuard {
  logger = new common_1.Logger(AuthGuard_1.name)
  supabaseFetch = (0, supabase_resilient_fetch_1.createResilientFetch)({
    label: 'auth_guard',
    maxRetries: 2,
    timeoutMs: 8000,
  })
  static jwksCache = new Map()
  async canActivate(context) {
    const request = context.switchToHttp().getRequest()
    if (request.method === 'OPTIONS') {
      return true
    }
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new common_1.UnauthorizedException('Missing or invalid Authorization header')
    }
    const token = authHeader.slice(7)
    const url = process.env.SUPABASE_URL
    const anonKey = process.env.SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
    }
    try {
      const claims = await this.verifyTokenLocally(token, url)
      const authenticatedClient = (0, supabase_js_1.createClient)(url, anonKey, {
        global: {
          headers: { Authorization: `Bearer ${token}` },
          fetch: this.supabaseFetch,
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
      request.user = { id: claims.sub, email: claims.email ?? '' }
      request.supabase = authenticatedClient
      request.token = token
      return true
    } catch (err) {
      if (err instanceof common_1.UnauthorizedException) throw err
      this.logger.error(
        `[AUTH] auth_internal_error: ${err instanceof Error ? err.message : 'Unknown'}`,
      )
      throw new common_1.UnauthorizedException('Authentication failed')
    }
  }
  async verifyTokenLocally(token, supabaseUrl) {
    const [headerB64, payloadB64, signatureB64] = token.split('.')
    if (!headerB64 || !payloadB64 || !signatureB64) {
      this.failUnauthorized('jwt_malformed', 'Unauthorized')
    }
    let header
    let payload
    try {
      header = JSON.parse(this.decodeBase64Url(headerB64))
      payload = JSON.parse(this.decodeBase64Url(payloadB64))
    } catch {
      this.failUnauthorized('jwt_decode_failed', 'Unauthorized')
    }
    const signedPart = `${headerB64}.${payloadB64}`
    const signature = this.decodeBase64UrlToBuffer(signatureB64)
    if (header.alg === 'HS256') {
      const jwtSecret = process.env.SUPABASE_JWT_SECRET
      if (!jwtSecret) {
        this.failUnauthorized('hs256_missing_secret', 'Authentication unavailable')
      }
      const expected = (0, crypto_1.createHmac)('sha256', jwtSecret).update(signedPart).digest()
      if (!expected.equals(signature)) {
        this.failUnauthorized('jwt_invalid_signature', 'Unauthorized')
      }
    } else if (header.alg === 'RS256' || header.alg === 'ES256') {
      if (!header.kid) {
        this.failUnauthorized('jwt_missing_kid', 'Unauthorized')
      }
      const jwk = await this.getJwkByKid(supabaseUrl, header.kid)
      const key = (0, crypto_1.createPublicKey)({ format: 'jwk', key: jwk })
      const valid =
        header.alg === 'ES256'
          ? (0, crypto_1.verify)(
              'SHA256',
              Buffer.from(signedPart),
              { key, dsaEncoding: 'ieee-p1363' },
              signature,
            )
          : (0, crypto_1.verify)('RSA-SHA256', Buffer.from(signedPart), key, signature)
      if (!valid) {
        this.failUnauthorized('jwt_invalid_signature', 'Unauthorized')
      }
    } else {
      this.failUnauthorized('jwt_unsupported_alg', 'Unauthorized')
    }
    this.validateClaims(payload, supabaseUrl)
    return payload
  }
  validateClaims(payload, supabaseUrl) {
    const now = Math.floor(Date.now() / 1000)
    const normalizedUrl = supabaseUrl.replace(/\/$/, '')
    const expectedIssuer = `${normalizedUrl}/auth/v1`
    if (!payload.sub) {
      this.failUnauthorized('jwt_missing_sub', 'Unauthorized')
    }
    if (!payload.iss || payload.iss !== expectedIssuer) {
      this.failUnauthorized('jwt_invalid_iss', 'Unauthorized')
    }
    const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    if (!audList.includes('authenticated')) {
      this.failUnauthorized('jwt_invalid_aud', 'Unauthorized')
    }
    if (!payload.exp || payload.exp + CLOCK_SKEW_SECONDS < now) {
      this.failUnauthorized('token_expired', 'Unauthorized')
    }
    if (payload.nbf && payload.nbf - CLOCK_SKEW_SECONDS > now) {
      this.failUnauthorized('jwt_not_yet_valid', 'Unauthorized')
    }
  }
  async getJwkByKid(supabaseUrl, kid) {
    const normalizedUrl = supabaseUrl.replace(/\/$/, '')
    const now = Date.now()
    const cached = AuthGuard_1.jwksCache.get(normalizedUrl)
    if (cached && cached.expiresAt > now) {
      const cachedKey = cached.keys.find((key) => key.kid === kid)
      if (cachedKey) return cachedKey
    }
    try {
      const response = await this.supabaseFetch(`${normalizedUrl}/auth/v1/.well-known/jwks.json`)
      if (response.ok) {
        let body
        try {
          body = await response.json()
        } catch {
          body = { keys: [] }
        }
        const keys = Array.isArray(body.keys) ? body.keys : []
        if (keys.length > 0) {
          AuthGuard_1.jwksCache.set(normalizedUrl, { keys, expiresAt: now + JWKS_CACHE_TTL_MS })
          const matchedKey = keys.find((key) => key.kid === kid)
          if (!matchedKey) {
            this.failUnauthorized('jwks_kid_not_found', 'Unauthorized')
          }
          return matchedKey
        }
      }
    } catch {
      // Network failure — fall through to stale cache below
    }
    if (cached && cached.keys.length > 0) {
      const staleKey = cached.keys.find((key) => key.kid === kid)
      if (staleKey) {
        this.logger.warn(
          '[AUTH] jwks_stale_fallback: network unavailable, serving expired JWKS cache',
        )
        return staleKey
      }
    }
    this.failUnauthorized('jwks_unreachable', 'Authentication temporarily unavailable')
  }
  decodeBase64Url(value) {
    return this.decodeBase64UrlToBuffer(value).toString('utf8')
  }
  decodeBase64UrlToBuffer(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padLength = (4 - (normalized.length % 4)) % 4
    return Buffer.from(normalized + '='.repeat(padLength), 'base64')
  }
  failUnauthorized(code, message) {
    this.logger.warn(`[AUTH] ${code}`)
    throw new common_1.UnauthorizedException(message)
  }
})
exports.AuthGuard = AuthGuard
exports.AuthGuard = AuthGuard = AuthGuard_1 = __decorate([(0, common_1.Injectable)()], AuthGuard)
//# sourceMappingURL=auth.guard.js.map
