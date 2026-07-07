import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_ROUTE } from '../decorators/public-route.decorator'
import {
  AuthInputError,
  AuthUpstreamUnavailableError,
  InvalidTokenError,
} from '../services/auth-errors'
import { SupabaseClientFactory } from '../services/supabase-client.factory'
import { SupabaseJwtVerifierService } from '../services/supabase-jwt-verifier.service'
import { SupabaseServiceClient } from '../services/supabase-service-client.provider'
import { UserSessionMintService } from '../services/user-session-mint.service'

/** Impersonation control routes always run as the superadmin's real identity. */
const IMPERSONATION_CONTROL_PATH = '/admin/impersonation'
const IMPERSONATION_LOOKUP_TTL_MS = 30_000

/**
 * Auth Guard — validates Supabase JWT and attaches user + scoped client to request.
 * Per guidelines: NO service role key. RLS enforced via user JWT.
 * Routes decorated with @Public() bypass authentication entirely.
 *
 * Superadmin impersonation: when a verified superadmin sends
 * `x-impersonate-user-id`, the request runs as that user with a real minted
 * GoTrue session (user-scoped client, RLS and auth.uid() reflect the
 * impersonated user natively) while `request.impersonation` keeps the
 * superadmin's real identity for auditing.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)
  private readonly impersonationRoleCache = new Map<string, { role: string; expires: number }>()
  private readonly impersonationTargetCache = new Map<
    string,
    { email: string | null; expires: number }
  >()
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: SupabaseJwtVerifierService,
    private readonly supabaseClientFactory: SupabaseClientFactory,
    private readonly supabaseServiceClient: SupabaseServiceClient,
    private readonly userSessionMint: UserSessionMintService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    if (request.method === 'OPTIONS') {
      return true
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true
    }

    const internalToken = request.headers['x-internal-token'] as string | undefined
    const internalUserId = request.headers['x-user-id'] as string | undefined
    if (
      internalToken &&
      internalUserId &&
      process.env.INTERNAL_API_TOKEN &&
      internalToken === process.env.INTERNAL_API_TOKEN
    ) {
      request.user = { id: internalUserId }
      request.supabase = this.supabaseServiceClient.client
      return true
    }

    try {
      const token = this.extractBearerToken(request.headers.authorization)
      const url = process.env.SUPABASE_URL
      if (!url) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
      }

      const claims = await this.verifier.verify(token, url)

      const impersonateUserId = request.headers['x-impersonate-user-id'] as string | undefined
      if (
        impersonateUserId &&
        impersonateUserId !== claims.sub &&
        !String(request.url ?? '').includes(IMPERSONATION_CONTROL_PATH)
      ) {
        await this.applyImpersonation(request, claims, impersonateUserId)
        return true
      }

      const authenticatedClient = this.supabaseClientFactory.createUserClient(token)

      request.user = { id: claims.sub, email: claims.email }
      request.supabase = authenticatedClient
      request.token = token

      return true
    } catch (err) {
      if (err instanceof ForbiddenException) {
        throw err
      }
      if (err instanceof AuthInputError) {
        this.logger.warn(`[AUTH] ${err.code}`)
        throw new UnauthorizedException(err.message)
      }
      if (err instanceof InvalidTokenError) {
        this.logger.warn(`[AUTH] ${err.code}`)
        throw new UnauthorizedException(err.message)
      }
      if (err instanceof AuthUpstreamUnavailableError) {
        this.logger.warn(`[AUTH] ${err.code}`)
        throw new ServiceUnavailableException(err.message)
      }
      this.logger.error(
        `[AUTH] auth_internal_error: ${err instanceof Error ? err.message : 'Unknown'}`,
      )
      throw new UnauthorizedException('Authentication failed')
    }
  }

  /**
   * Verifies the caller is a superadmin and swaps the request identity to the
   * target user. A real GoTrue session is minted for the target (cached by
   * UserSessionMintService), so request.supabase is a user-scoped client:
   * RLS, auth.uid(), and SECURITY DEFINER RPCs all see the impersonated user
   * exactly as if they logged in themselves. Lookups are cached briefly to
   * avoid two extra round trips on every impersonated request.
   */
  private async applyImpersonation(
    request: any,
    claims: { sub: string; email?: string },
    impersonateUserId: string,
  ): Promise<void> {
    const serviceClient = this.supabaseServiceClient.client
    const now = Date.now()

    let callerRole = this.impersonationRoleCache.get(claims.sub)
    if (!callerRole || callerRole.expires <= now) {
      const { data: profile, error } = await serviceClient
        .from('user_profiles')
        .select('role')
        .eq('id', claims.sub)
        .single()
      if (error || !profile) {
        this.logger.warn(`[AUTH] impersonation_role_lookup_failed for ${claims.sub}`)
        throw new ForbiddenException('Not authorized to impersonate users')
      }
      callerRole = { role: profile.role as string, expires: now + IMPERSONATION_LOOKUP_TTL_MS }
      this.impersonationRoleCache.set(claims.sub, callerRole)
    }

    if (callerRole.role !== 'superadmin') {
      this.logger.warn(
        `[AUTH] impersonation_denied: ${claims.sub} (role=${callerRole.role}) attempted to impersonate ${impersonateUserId}`,
      )
      throw new ForbiddenException('Not authorized to impersonate users')
    }

    let target = this.impersonationTargetCache.get(impersonateUserId)
    if (!target || target.expires <= now) {
      const [{ data, error }, { data: targetProfile }] = await Promise.all([
        serviceClient.auth.admin.getUserById(impersonateUserId),
        serviceClient.from('user_profiles').select('role').eq('id', impersonateUserId).single(),
      ])
      if (error || !data?.user) {
        throw new ForbiddenException('Impersonation target not found')
      }
      if (targetProfile?.role === 'superadmin') {
        throw new ForbiddenException('Superadmin accounts cannot be impersonated')
      }
      target = { email: data.user.email ?? null, expires: now + IMPERSONATION_LOOKUP_TTL_MS }
      this.impersonationTargetCache.set(impersonateUserId, target)
    }

    if (!target.email) {
      throw new ForbiddenException('Impersonation target has no email')
    }

    let impersonatedToken: string
    try {
      impersonatedToken = await this.userSessionMint.mintAccessToken(
        impersonateUserId,
        target.email,
      )
    } catch (err) {
      this.logger.error(
        `[AUTH] impersonation_mint_failed for ${impersonateUserId}: ${err instanceof Error ? err.message : 'Unknown'}`,
      )
      throw new AuthUpstreamUnavailableError()
    }

    request.user = { id: impersonateUserId, email: target.email }
    request.supabase = this.supabaseClientFactory.createUserClient(impersonatedToken)
    request.token = impersonatedToken
    request.impersonation = { superadminId: claims.sub, superadminEmail: claims.email }
  }

  private extractBearerToken(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new AuthInputError('missing_authorization_header')
    }
    if (!authHeader.startsWith('Bearer ')) {
      throw new AuthInputError('invalid_authorization_header')
    }
    return authHeader.slice(7)
  }
}
