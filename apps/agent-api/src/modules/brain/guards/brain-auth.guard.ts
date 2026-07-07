import {
  CanActivate,
  ExecutionContext,
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
} from '@vibey/api-shared'

/**
 * Brain Auth Guard.
 *
 * Requires Supabase JWT in `Authorization: Bearer <jwt>`.
 * Attaches:
 *   - request.user = { id, email }
 *   - request.supabase = RLS-enforced Vibey 2.0 Supabase client
 */
@Injectable()
export class BrainAuthGuard implements CanActivate {
  private readonly logger = new Logger(BrainAuthGuard.name)

  constructor(
    private readonly verifier: SupabaseJwtVerifierService,
    private readonly supabaseClientFactory: SupabaseClientFactory,
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
      const authenticatedClient = this.supabaseClientFactory.createUserClient(token)

      request.user = { id: claims.sub, email: claims.email }
      request.supabase = authenticatedClient
      return true
    } catch (err) {
      if (
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

  private extractBearerToken(authHeader: string | undefined): string {
    if (!authHeader) throw new AuthInputError('missing_authorization_header')
    if (!authHeader.startsWith('Bearer ')) throw new AuthInputError('invalid_authorization_header')
    return authHeader.slice(7)
  }
}
