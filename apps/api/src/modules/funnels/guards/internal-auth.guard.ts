import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'

/**
 * Internal Auth Guard — validates INTERNAL_API_TOKEN for agent-to-API calls.
 *
 * Expects `Authorization: Bearer {INTERNAL_API_TOKEN}` header.
 * No Supabase client is created — internal endpoints use service role via the service layer.
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
  private readonly logger = new Logger(InternalAuthGuard.name)

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()

    if (request.method === 'OPTIONS') {
      return true
    }

    const authHeader = request.headers.authorization as string | undefined
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header')
    }

    const token = authHeader.slice(7)
    const expectedToken = process.env.INTERNAL_API_TOKEN

    if (!expectedToken) {
      this.logger.error('INTERNAL_API_TOKEN env var is not set')
      throw new UnauthorizedException('Internal auth not configured')
    }

    if (token !== expectedToken) {
      throw new UnauthorizedException('Invalid internal API token')
    }

    return true
  }
}
