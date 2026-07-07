import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { OrgRole } from '../services/org-scope.service'

export const ORG_ROLE_KEY = 'requiredOrgRole'

/**
 * Decorator: specify minimum org role required for an endpoint.
 * Only enforced when in org context (X-Org-Id header present).
 * In personal context, this guard passes through.
 *
 * @example @RequireOrgRole('editor')   -- editor, creator, admin, owner can access
 * @example @RequireOrgRole('creator')  -- creator, admin, owner can access
 * @example @RequireOrgRole('admin')    -- admin, owner can access
 * @example @RequireOrgRole('owner')    -- owner only
 */
export const RequireOrgRole = (role: OrgRole) => SetMetadata(ORG_ROLE_KEY, role)

const ORG_ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 5,
  admin: 4,
  creator: 3,
  editor: 2,
  viewer: 1,
}

/**
 * OrgRoleGuard — checks if user's org role meets the minimum required by @RequireOrgRole().
 *
 * Must run AFTER AuthGuard + OrgContextGuard (needs request.orgId + request.orgRole).
 *
 * Behavior:
 * - No @RequireOrgRole() decorator: passes through (no role check)
 * - Not in org context (orgId = null): passes through (personal context, no org role needed)
 * - In org context: checks orgRole >= requiredRole
 */
@Injectable()
export class OrgRoleGuard implements CanActivate {
  private readonly logger = new Logger(OrgRoleGuard.name)
  private readonly reflector = new Reflector()

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.getAllAndOverride<OrgRole | undefined>(ORG_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRole) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const orgId = request.orgId
    const orgRole = request.orgRole as OrgRole | null

    if (!orgId) {
      return true
    }

    if (!orgRole) {
      throw new ForbiddenException('Organization role not resolved')
    }

    const userLevel = ORG_ROLE_HIERARCHY[orgRole]
    const requiredLevel = ORG_ROLE_HIERARCHY[requiredRole]

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(
        `This action requires "${requiredRole}" role. Your role is "${orgRole}".`,
      )
    }

    return true
  }
}
