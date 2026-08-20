"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const org_context_guard_1 = require("./org-context.guard");
function createContext(request) {
    return {
        switchToHttp: () => ({
            getRequest: () => request,
        }),
    };
}
function createServiceClient(membership) {
    const query = {
        select: vitest_1.vi.fn(),
        eq: vitest_1.vi.fn(),
        maybeSingle: vitest_1.vi.fn().mockResolvedValue({ data: membership, error: null }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    return {
        client: {
            from: vitest_1.vi.fn().mockReturnValue(query),
        },
    };
}
(0, vitest_1.describe)('OrgContextGuard AI data access', () => {
    (0, vitest_1.it)('enables organization-wide data access for an active owner', async () => {
        const request = {
            headers: { 'x-org-id': 'org-1' },
            user: { id: 'user-1' },
        };
        const serviceClient = createServiceClient({
            id: 'member-1',
            role: 'owner',
            status: 'active',
            ai_data_admin: false,
        });
        await new org_context_guard_1.OrgContextGuard(serviceClient).canActivate(createContext(request));
        (0, vitest_1.expect)(request).toMatchObject({
            orgId: 'org-1',
            orgRole: 'owner',
            orgMemberId: 'member-1',
            organizationWideDataAccess: true,
        });
    });
    (0, vitest_1.it)('enables organization-wide data access for an explicitly authorized member', async () => {
        const request = {
            headers: { 'x-org-id': 'org-1' },
            user: { id: 'user-2' },
        };
        const serviceClient = createServiceClient({
            id: 'member-2',
            role: 'admin',
            status: 'active',
            ai_data_admin: true,
        });
        await new org_context_guard_1.OrgContextGuard(serviceClient).canActivate(createContext(request));
        (0, vitest_1.expect)(request).toMatchObject({
            orgMemberId: 'member-2',
            organizationWideDataAccess: true,
        });
    });
    (0, vitest_1.it)('keeps a regular active member scoped to attached and normally authorized data', async () => {
        const request = {
            headers: { 'x-org-id': 'org-1' },
            user: { id: 'user-3' },
        };
        const serviceClient = createServiceClient({
            id: 'member-3',
            role: 'admin',
            status: 'active',
            ai_data_admin: false,
        });
        await new org_context_guard_1.OrgContextGuard(serviceClient).canActivate(createContext(request));
        (0, vitest_1.expect)(request).toMatchObject({
            orgMemberId: 'member-3',
            organizationWideDataAccess: false,
        });
    });
    (0, vitest_1.it)('disables organization-wide data access in personal context', async () => {
        const request = {
            headers: {},
            user: { id: 'user-1' },
        };
        const serviceClient = createServiceClient(null);
        await new org_context_guard_1.OrgContextGuard(serviceClient).canActivate(createContext(request));
        (0, vitest_1.expect)(request).toMatchObject({
            orgId: null,
            orgRole: null,
            orgMemberId: null,
            organizationWideDataAccess: false,
        });
    });
});
//# sourceMappingURL=org-context.guard.test.js.map