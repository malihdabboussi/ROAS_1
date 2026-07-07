/**
 * InternalAuthGuard
 *
 * Validates that the request comes from the OpenClaw tool plugin
 * running on localhost inside the same Docker container.
 *
 * Checks for the x-openclaw-internal header set by the vibey_backend tool.
 * This is NOT a user-facing auth guard — it protects internal agent-to-backend communication.
 */

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()

    if (request.method === 'OPTIONS') {
      return true
    }

    const internalHeader = request.headers['x-openclaw-internal']

    if (internalHeader !== 'true') {
      throw new UnauthorizedException('Internal access only')
    }

    return true
  }
}
