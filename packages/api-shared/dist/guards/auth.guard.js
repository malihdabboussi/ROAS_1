"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const public_route_decorator_1 = require("../decorators/public-route.decorator");
const auth_errors_1 = require("../services/auth-errors");
const supabase_client_factory_1 = require("../services/supabase-client.factory");
const supabase_jwt_verifier_service_1 = require("../services/supabase-jwt-verifier.service");
const supabase_service_client_provider_1 = require("../services/supabase-service-client.provider");
const user_session_mint_service_1 = require("../services/user-session-mint.service");
const IMPERSONATION_CONTROL_PATH = '/admin/impersonation';
const IMPERSONATION_LOOKUP_TTL_MS = 30_000;
let AuthGuard = AuthGuard_1 = class AuthGuard {
    reflector;
    verifier;
    supabaseClientFactory;
    supabaseServiceClient;
    userSessionMint;
    logger = new common_1.Logger(AuthGuard_1.name);
    impersonationRoleCache = new Map();
    impersonationTargetCache = new Map();
    constructor(reflector, verifier, supabaseClientFactory, supabaseServiceClient, userSessionMint) {
        this.reflector = reflector;
        this.verifier = verifier;
        this.supabaseClientFactory = supabaseClientFactory;
        this.supabaseServiceClient = supabaseServiceClient;
        this.userSessionMint = userSessionMint;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        if (request.method === 'OPTIONS') {
            return true;
        }
        const isPublic = this.reflector.getAllAndOverride(public_route_decorator_1.IS_PUBLIC_ROUTE, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const internalToken = request.headers['x-internal-token'];
        const internalUserId = request.headers['x-user-id'];
        if (internalToken &&
            internalUserId &&
            process.env.INTERNAL_API_TOKEN &&
            internalToken === process.env.INTERNAL_API_TOKEN) {
            request.user = { id: internalUserId };
            request.supabase = this.supabaseServiceClient.client;
            return true;
        }
        try {
            const token = this.extractBearerToken(request.headers.authorization);
            const url = process.env.SUPABASE_URL;
            if (!url) {
                throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
            }
            const claims = await this.verifier.verify(token, url);
            const impersonateUserId = request.headers['x-impersonate-user-id'];
            if (impersonateUserId &&
                impersonateUserId !== claims.sub &&
                !String(request.url ?? '').includes(IMPERSONATION_CONTROL_PATH)) {
                await this.applyImpersonation(request, claims, impersonateUserId);
                return true;
            }
            const authenticatedClient = this.supabaseClientFactory.createUserClient(token);
            request.user = { id: claims.sub, email: claims.email };
            request.supabase = authenticatedClient;
            request.token = token;
            return true;
        }
        catch (err) {
            if (err instanceof common_1.ForbiddenException) {
                throw err;
            }
            if (err instanceof auth_errors_1.AuthInputError) {
                this.logger.warn(`[AUTH] ${err.code}`);
                throw new common_1.UnauthorizedException(err.message);
            }
            if (err instanceof auth_errors_1.InvalidTokenError) {
                this.logger.warn(`[AUTH] ${err.code}`);
                throw new common_1.UnauthorizedException(err.message);
            }
            if (err instanceof auth_errors_1.AuthUpstreamUnavailableError) {
                this.logger.warn(`[AUTH] ${err.code}`);
                throw new common_1.ServiceUnavailableException(err.message);
            }
            this.logger.error(`[AUTH] auth_internal_error: ${err instanceof Error ? err.message : 'Unknown'}`);
            throw new common_1.UnauthorizedException('Authentication failed');
        }
    }
    async applyImpersonation(request, claims, impersonateUserId) {
        const serviceClient = this.supabaseServiceClient.client;
        const now = Date.now();
        let callerRole = this.impersonationRoleCache.get(claims.sub);
        if (!callerRole || callerRole.expires <= now) {
            const { data: profile, error } = await serviceClient
                .from('user_profiles')
                .select('role')
                .eq('id', claims.sub)
                .single();
            if (error || !profile) {
                this.logger.warn(`[AUTH] impersonation_role_lookup_failed for ${claims.sub}`);
                throw new common_1.ForbiddenException('Not authorized to impersonate users');
            }
            callerRole = { role: profile.role, expires: now + IMPERSONATION_LOOKUP_TTL_MS };
            this.impersonationRoleCache.set(claims.sub, callerRole);
        }
        if (callerRole.role !== 'superadmin') {
            this.logger.warn(`[AUTH] impersonation_denied: ${claims.sub} (role=${callerRole.role}) attempted to impersonate ${impersonateUserId}`);
            throw new common_1.ForbiddenException('Not authorized to impersonate users');
        }
        let target = this.impersonationTargetCache.get(impersonateUserId);
        if (!target || target.expires <= now) {
            const [{ data, error }, { data: targetProfile }] = await Promise.all([
                serviceClient.auth.admin.getUserById(impersonateUserId),
                serviceClient.from('user_profiles').select('role').eq('id', impersonateUserId).single(),
            ]);
            if (error || !data?.user) {
                throw new common_1.ForbiddenException('Impersonation target not found');
            }
            if (targetProfile?.role === 'superadmin') {
                throw new common_1.ForbiddenException('Superadmin accounts cannot be impersonated');
            }
            target = { email: data.user.email ?? null, expires: now + IMPERSONATION_LOOKUP_TTL_MS };
            this.impersonationTargetCache.set(impersonateUserId, target);
        }
        if (!target.email) {
            throw new common_1.ForbiddenException('Impersonation target has no email');
        }
        let impersonatedToken;
        try {
            impersonatedToken = await this.userSessionMint.mintAccessToken(impersonateUserId, target.email);
        }
        catch (err) {
            this.logger.error(`[AUTH] impersonation_mint_failed for ${impersonateUserId}: ${err instanceof Error ? err.message : 'Unknown'}`);
            throw new auth_errors_1.AuthUpstreamUnavailableError();
        }
        request.user = { id: impersonateUserId, email: target.email };
        request.supabase = this.supabaseClientFactory.createUserClient(impersonatedToken);
        request.token = impersonatedToken;
        request.impersonation = { superadminId: claims.sub, superadminEmail: claims.email };
    }
    extractBearerToken(authHeader) {
        if (!authHeader) {
            throw new auth_errors_1.AuthInputError('missing_authorization_header');
        }
        if (!authHeader.startsWith('Bearer ')) {
            throw new auth_errors_1.AuthInputError('invalid_authorization_header');
        }
        return authHeader.slice(7);
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = AuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        supabase_jwt_verifier_service_1.SupabaseJwtVerifierService,
        supabase_client_factory_1.SupabaseClientFactory,
        supabase_service_client_provider_1.SupabaseServiceClient,
        user_session_mint_service_1.UserSessionMintService])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map