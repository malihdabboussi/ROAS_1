import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

@Injectable()
export class ChannelServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    if (request.method === 'OPTIONS') return true

    const token = request.headers['x-internal-token']
    const expected = process.env.INTERNAL_API_TOKEN
    if (!expected || !token || token !== expected) {
      throw new UnauthorizedException('Invalid internal token')
    }
    return true
  }
}
