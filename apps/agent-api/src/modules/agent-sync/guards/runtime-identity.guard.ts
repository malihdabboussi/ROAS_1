import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'

@Injectable()
export class RuntimeIdentityGuard implements CanActivate {
  private readonly logger = new Logger(RuntimeIdentityGuard.name)

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    if (request.method === 'OPTIONS') return true

    const expected = process.env.INTERNAL_API_TOKEN
    if (!expected) {
      this.logger.error('INTERNAL_API_TOKEN env var is not set')
      throw new UnauthorizedException('Internal auth not configured')
    }

    const headerToken = request.headers['x-internal-token']
    const authHeader = request.headers.authorization as string | undefined
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const token =
      typeof headerToken === 'string' && headerToken.length > 0 ? headerToken : bearerToken

    if (!token || token !== expected) {
      throw new UnauthorizedException('Invalid internal token')
    }

    return true
  }
}
