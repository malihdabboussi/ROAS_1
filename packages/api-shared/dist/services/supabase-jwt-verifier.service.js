"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SupabaseJwtVerifierService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseJwtVerifierService = void 0;
const common_1 = require("@nestjs/common");
const jose_1 = require("jose");
const auth_errors_1 = require("./auth-errors");
const transient_error_util_1 = require("./transient-error.util");
const CLOCK_TOLERANCE_SECONDS = 30;
const JWKS_URL_SUFFIX = '/auth/v1/.well-known/jwks.json';
let SupabaseJwtVerifierService = SupabaseJwtVerifierService_1 = class SupabaseJwtVerifierService {
    logger = new common_1.Logger(SupabaseJwtVerifierService_1.name);
    jwksCache = new Map();
    getJwksResolver(supabaseUrl) {
        const normalizedUrl = supabaseUrl.replace(/\/$/, '');
        const cached = this.jwksCache.get(normalizedUrl);
        if (cached)
            return cached;
        const jwksUrl = `${normalizedUrl}${JWKS_URL_SUFFIX}`;
        this.logger.debug(`[jwks] resolver_create url=${jwksUrl} timeoutMs=30000`);
        const jwks = (0, jose_1.createRemoteJWKSet)(new URL(jwksUrl), {
            timeoutDuration: 30_000,
        });
        this.jwksCache.set(normalizedUrl, jwks);
        return jwks;
    }
    async verify(token, supabaseUrl) {
        const normalizedUrl = supabaseUrl.replace(/\/$/, '');
        const jwksUrl = `${normalizedUrl}${JWKS_URL_SUFFIX}`;
        try {
            const { payload } = await (0, jose_1.jwtVerify)(token, this.getJwksResolver(normalizedUrl), {
                issuer: `${normalizedUrl}/auth/v1`,
                audience: 'authenticated',
                clockTolerance: CLOCK_TOLERANCE_SECONDS,
            });
            if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
                throw new auth_errors_1.InvalidTokenError('claims_invalid');
            }
            return {
                sub: payload.sub,
                email: typeof payload.email === 'string' ? payload.email : '',
                payload,
            };
        }
        catch (error) {
            if (error instanceof auth_errors_1.InvalidTokenError)
                throw error;
            if (error instanceof jose_1.errors.JWTExpired) {
                throw new auth_errors_1.InvalidTokenError('token_expired');
            }
            if (error instanceof jose_1.errors.JWSSignatureVerificationFailed ||
                error instanceof jose_1.errors.JWTClaimValidationFailed ||
                error instanceof jose_1.errors.JOSEAlgNotAllowed ||
                error instanceof jose_1.errors.JWKSNoMatchingKey ||
                error instanceof jose_1.errors.JWTInvalid) {
                this.logger.warn(`[jwks] token_invalid url=${jwksUrl} errorType=${error.constructor?.name} error=${error.message}`);
                throw new auth_errors_1.InvalidTokenError('token_invalid');
            }
            if (error instanceof jose_1.errors.JWKSTimeout ||
                error instanceof jose_1.errors.JWKSInvalid ||
                (0, transient_error_util_1.isTransientNetworkError)(error)) {
                this.logger.warn(`[jwks] upstream_unavailable url=${jwksUrl} errorType=${error instanceof Error ? error.constructor?.name : typeof error} error=${error instanceof Error ? error.message : String(error)}`);
                throw new auth_errors_1.AuthUpstreamUnavailableError();
            }
            this.logger.warn(`[jwks] token_invalid_unknown url=${jwksUrl} errorType=${error instanceof Error ? error.constructor?.name : typeof error} error=${error instanceof Error ? error.message : String(error)}`);
            throw new auth_errors_1.InvalidTokenError('token_invalid');
        }
    }
};
exports.SupabaseJwtVerifierService = SupabaseJwtVerifierService;
exports.SupabaseJwtVerifierService = SupabaseJwtVerifierService = SupabaseJwtVerifierService_1 = __decorate([
    (0, common_1.Injectable)()
], SupabaseJwtVerifierService);
//# sourceMappingURL=supabase-jwt-verifier.service.js.map