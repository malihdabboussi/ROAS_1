import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { createClient } from '@supabase/supabase-js'

export type UserRole = 'user' | 'power' | 'admin' | 'enterprise' | 'superadmin'

export const ROLES_KEY = 'roles'

/**
 * Decorator: specify which roles can access an endpoint.
 * @example @Roles('admin') or @Roles('power', 'admin')
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)

/**
 * RoleGuard — checks user role from user_profiles table.
 * Must be used AFTER AuthGuard (needs request.user.id).
 *
 * Uses Reflector directly (no constructor injection) to avoid
 * DI resolution issues in monorepo/serverless environments.
 *
 * Usage:
 *   @UseGuards(AuthGuard, RoleGuard)
 *   @Roles('admin')
 *   async someEndpoint() { ... }
 */
@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name)
  private readonly reflector = new Reflector()

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // No @Roles() decorator = no role check required
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const userId = request.user?.id

    if (!userId) {
      throw new ForbiddenException('User not authenticated')
    }

    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      this.logger.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for role check')
      throw new ForbiddenException('Role verification unavailable')
    }

    const serviceClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
    const { data: profile, error } = await serviceClient
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) {
      this.logger.warn(
        `Role lookup failed for ${userId}: ${error.message} (${error.code || 'no-code'})`,
      )
      if (requiredRoles.includes('user')) return true
      throw new ForbiddenException('Role verification unavailable')
    }

    if (!profile) {
      this.logger.warn(`No profile found for user ${userId}, defaulting to 'user' role`)
      // Default to 'user' role if no profile exists
      if (requiredRoles.includes('user')) return true
      throw new ForbiddenException('Insufficient permissions')
    }

    const userRole = profile.role as UserRole

    // Superadmin has access to everything
    if (userRole === 'superadmin') return true

    // Superadmin-only endpoints reject every other role, including admin
    if (requiredRoles.includes('superadmin')) {
      throw new ForbiddenException(
        `Role '${userRole}' does not have access. Required: ${requiredRoles.join(', ')}`,
      )
    }

    // Admin has access to everything
    if (userRole === 'admin') return true

    // Power has access to power + user endpoints
    if (userRole === 'power' && requiredRoles.some((r) => r === 'power' || r === 'user'))
      return true

    // Enterprise has same access as power (full manage side)
    if (userRole === 'enterprise' && requiredRoles.some((r) => r === 'power' || r === 'user'))
      return true

    // Check exact role match
    if (requiredRoles.includes(userRole)) return true

    throw new ForbiddenException(
      `Role '${userRole}' does not have access. Required: ${requiredRoles.join(', ')}`,
    )
  }
}
