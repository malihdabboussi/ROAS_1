import { Injectable } from '@nestjs/common'

export interface RequestScope {
  userId: string
  orgId: string | null
  orgRole: OrgRole | null
  orgMemberId?: string | null
  organizationWideDataAccess?: boolean
}

export type OrgRole = 'owner' | 'admin' | 'creator' | 'editor' | 'viewer'

export type OrgScopedQuery<Q> = {
  eq: (col: string, val: string) => Q
  is: (col: string, val: null) => Q
}

const ORG_ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 5,
  admin: 4,
  creator: 3,
  editor: 2,
  viewer: 1,
}

export function applyOwnerScope<Q extends OrgScopedQuery<Q>>(
  query: Q,
  scope: Pick<RequestScope, 'userId' | 'orgId'>,
): Q {
  if (scope.orgId) {
    return query.eq('org_id', scope.orgId)
  }
  return query.eq('user_id', scope.userId).is('org_id', null)
}

export function resolveScopedOrgId(scope: Pick<RequestScope, 'orgId'>): string | null {
  return scope.orgId ?? null
}

/**
 * Centralized org/personal scoping for all database queries.
 *
 * Usage in services:
 *   const filters = this.orgScope.getFilters(scope)
 *   query.eq(filters.column, filters.value)
 *   // + if personal: .is('org_id', null)
 *
 * Or use applyScope() for any query builder that has .eq() and .is():
 *   this.orgScope.applyScope(supabase.from('campaigns').select('*'), scope)
 */
@Injectable()
export class OrgScopeService {
  applyScope<Q extends OrgScopedQuery<Q>>(query: Q, scope: RequestScope): Q {
    return applyOwnerScope(query, scope)
  }

  getInsertData(scope: RequestScope): { user_id: string; org_id: string | null } {
    return {
      user_id: scope.userId,
      org_id: resolveScopedOrgId(scope),
    }
  }

  hasMinimumRole(userRole: OrgRole | null, requiredRole: OrgRole): boolean {
    if (!userRole) return false
    return ORG_ROLE_HIERARCHY[userRole] >= ORG_ROLE_HIERARCHY[requiredRole]
  }

  isOrgContext(scope: RequestScope): boolean {
    return scope.orgId !== null
  }

  static buildScopeFromRequest(request: any): RequestScope {
    return {
      userId: request.user?.id,
      orgId: request.orgId ?? null,
      orgRole: request.orgRole ?? null,
      orgMemberId: request.orgMemberId ?? null,
      organizationWideDataAccess: request.organizationWideDataAccess === true,
    }
  }
}
