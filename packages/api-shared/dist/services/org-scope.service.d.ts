export interface RequestScope {
    userId: string;
    orgId: string | null;
    orgRole: OrgRole | null;
    orgMemberId?: string | null;
    organizationWideDataAccess?: boolean;
}
export type OrgRole = 'owner' | 'admin' | 'creator' | 'editor' | 'viewer';
export type OrgScopedQuery<Q> = {
    eq: (col: string, val: string) => Q;
    is: (col: string, val: null) => Q;
};
export declare function applyOwnerScope<Q extends OrgScopedQuery<Q>>(query: Q, scope: Pick<RequestScope, 'userId' | 'orgId'>): Q;
export declare function resolveScopedOrgId(scope: Pick<RequestScope, 'orgId'>): string | null;
export declare class OrgScopeService {
    applyScope<Q extends OrgScopedQuery<Q>>(query: Q, scope: RequestScope): Q;
    getInsertData(scope: RequestScope): {
        user_id: string;
        org_id: string | null;
    };
    hasMinimumRole(userRole: OrgRole | null, requiredRole: OrgRole): boolean;
    isOrgContext(scope: RequestScope): boolean;
    static buildScopeFromRequest(request: any): RequestScope;
}
