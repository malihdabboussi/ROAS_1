import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common'
import type { OrgRole } from '../services/org-scope.service'
import { SupabaseServiceClient } from '../services/supabase-service-client.provider'

/**
 * OrgContextGuard — extracts X-Org-Id from request headers, verifies active membership,
 * and attaches orgId + orgRole to the request.
 *
 * When no X-Org-Id header: personal context (orgId = null, orgRole = null).
 * When X-Org-Id present: verifies user is active member, attaches role.
 *
 * Must run AFTER AuthGuard (needs request.user.id).
 */
@Injectable()
export class OrgContextGuard implements CanActivate {
  private readonly logger = new Logger(OrgContextGuard.name)

  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const orgId = request.headers['x-org-id'] as string | undefined
    const userId = request.user?.id

    if (!orgId) {
      request.orgId = null
      request.orgRole = null
      return true
    }

    if (!userId) {
      throw new ForbiddenException('Authentication required for org context')
    }

    const { data: membership, error } = await this.serviceClient.client
      .from('org_members')
      .select('id, role, status')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      this.logger.error(`Org membership lookup failed: ${error.message}`)
      throw new ForbiddenException('Organization access verification failed')
    }

    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException('You are not an active member of this organization')
    }

    request.orgId = orgId
    request.orgRole = membership.role as OrgRole
    request.orgMemberId = membership.id

    return true
  }
}
