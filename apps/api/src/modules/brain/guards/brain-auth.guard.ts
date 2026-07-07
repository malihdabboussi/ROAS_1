import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import {
  AuthInputError,
  AuthUpstreamUnavailableError,
  InvalidTokenError,
  SupabaseClientFactory,
  SupabaseJwtVerifierService,
  UserSessionMintService,
} from '@vibey/api-shared'
import { BrainAuthImpersonationRepository } from '../repositories/brain-auth-impersonation.repository'

const IMPERSONATION_LOOKUP_TTL_MS = 30_000

/**
 * Brain Auth Guard.
 *
 * Requires Supabase JWT in `Authorization: Bearer <jwt>`.
 * Attaches:
 *   - request.user = { id, email }
 *   - request.supabase = RLS-enforced Vibey 2.0 Supabase client
 *
 * Superadmin impersonation mirrors AuthGuard: `x-impersonate-user-id` swaps
 * identity to the target user with a minted GoTrue session.
 */
@Injectable()
export class BrainAuthGuard implements CanActivate {
  private readonly logger = new Logger(BrainAuthGuard.name)
  private readonly impersonationRoleCache = new Map<string, { role: string; expires: number }>()
  private readonly impersonationTargetCache = new Map<
    string,
    { email: string | null; expires: number }
  >()

  constructor(
    private readonly verifier: SupabaseJwtVerifierService,
    private readonly supabaseClientFactory: SupabaseClientFactory,
    private readonly impersonationRepository: BrainAuthImpersonationRepository,
    private readonly userSessionMint: UserSessionMintService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    if (request.method === 'OPTIONS') {
      return true
    }

    try {
      const token = this.extractBearerToken(request.headers.authorization as string | undefined)
      return await this.validateJwt(request, token)
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
      throw err
    }
  }

  private async validateJwt(request: any, token: string): Promise<boolean> {
    const url = process.env.SUPABASE_URL
    if (!url) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
    }

    try {
      const claims = await this.verifier.verify(token, url)

      const impersonateUserId = request.headers['x-impersonate-user-id'] as string | undefined
      if (impersonateUserId && impersonateUserId !== claims.sub) {
        await this.applyImpersonation(request, claims, impersonateUserId)
        return true
      }

      const authenticatedClient = this.supabaseClientFactory.createUserClient(token)

      request.user = { id: claims.sub, email: claims.email }
      request.supabase = authenticatedClient
      request.token = token
      return true
    } catch (err) {
      if (
        err instanceof ForbiddenException ||
        err instanceof UnauthorizedException ||
        err instanceof ServiceUnavailableException ||
        err instanceof InvalidTokenError ||
        err instanceof AuthUpstreamUnavailableError
      ) {
        throw err
      }
      this.logger.error(`Brain JWT auth error: ${err instanceof Error ? err.message : 'Unknown'}`)
      throw new UnauthorizedException('Authentication failed')
    }
  }

  private async applyImpersonation(
    request: any,
    claims: { sub: string; email?: string },
    impersonateUserId: string,
  ): Promise<void> {
    const now = Date.now()

    let callerRole = this.impersonationRoleCache.get(claims.sub)
    if (!callerRole || callerRole.expires <= now) {
      const role = await this.impersonationRepository.findUserRole(claims.sub)
      if (!role) {
        this.logger.warn(`[AUTH] impersonation_role_lookup_failed for ${claims.sub}`)
        throw new ForbiddenException('Not authorized to impersonate users')
      }
      callerRole = { role, expires: now + IMPERSONATION_LOOKUP_TTL_MS }
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
      const targetUser = await this.impersonationRepository.findTargetUser(impersonateUserId)
      if (!targetUser) {
        throw new ForbiddenException('Impersonation target not found')
      }
      if (targetUser.role === 'superadmin') {
        throw new ForbiddenException('Superadmin accounts cannot be impersonated')
      }
      target = { email: targetUser.email, expires: now + IMPERSONATION_LOOKUP_TTL_MS }
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
    if (!authHeader) throw new AuthInputError('missing_authorization_header')
    if (!authHeader.startsWith('Bearer ')) throw new AuthInputError('invalid_authorization_header')
    return authHeader.slice(7)
  }
}
