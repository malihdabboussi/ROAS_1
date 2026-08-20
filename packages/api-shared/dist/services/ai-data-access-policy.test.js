"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ai_data_access_policy_1 = require("./ai-data-access-policy");
const activeAdmin = {
    id: 'member-1',
    userId: 'user-1',
    orgId: 'org-1',
    role: 'admin',
    status: 'active',
    aiDataAdmin: true,
};
(0, vitest_1.describe)('authorizeOrganizationWideAiData', () => {
    (0, vitest_1.it)('allows an explicitly enabled active organization member', () => {
        (0, vitest_1.expect)((0, ai_data_access_policy_1.authorizeOrganizationWideAiData)({
            requestedOrgId: 'org-1',
            resourceOrgId: 'org-1',
            resourceKind: 'organization_knowledge',
            membership: activeAdmin,
        })).toEqual({ allowed: true, reason: 'organization_data_access_allowed' });
    });
    (0, vitest_1.it)('treats the organization owner as enabled defensively', () => {
        (0, vitest_1.expect)((0, ai_data_access_policy_1.authorizeOrganizationWideAiData)({
            requestedOrgId: 'org-1',
            resourceOrgId: 'org-1',
            resourceKind: 'observed_slack_channel',
            membership: { ...activeAdmin, role: 'owner', aiDataAdmin: false },
        })).toEqual({ allowed: true, reason: 'organization_data_access_allowed' });
    });
    (0, vitest_1.it)('denies members without the explicit capability', () => {
        (0, vitest_1.expect)((0, ai_data_access_policy_1.authorizeOrganizationWideAiData)({
            requestedOrgId: 'org-1',
            resourceOrgId: 'org-1',
            resourceKind: 'organization_knowledge',
            membership: { ...activeAdmin, aiDataAdmin: false },
        })).toEqual({ allowed: false, reason: 'capability_missing' });
    });
    (0, vitest_1.it)('denies cross-organization access even with the capability', () => {
        (0, vitest_1.expect)((0, ai_data_access_policy_1.authorizeOrganizationWideAiData)({
            requestedOrgId: 'org-1',
            resourceOrgId: 'org-2',
            resourceKind: 'organization_knowledge',
            membership: activeAdmin,
        })).toEqual({ allowed: false, reason: 'cross_org' });
    });
    (0, vitest_1.it)('never grants access to private conversations', () => {
        (0, vitest_1.expect)((0, ai_data_access_policy_1.authorizeOrganizationWideAiData)({
            requestedOrgId: 'org-1',
            resourceOrgId: 'org-1',
            resourceKind: 'private_conversation',
            membership: activeAdmin,
        })).toEqual({ allowed: false, reason: 'private_conversation' });
    });
    (0, vitest_1.it)('fails closed for inactive or unavailable memberships', () => {
        (0, vitest_1.expect)((0, ai_data_access_policy_1.authorizeOrganizationWideAiData)({
            requestedOrgId: 'org-1',
            resourceOrgId: 'org-1',
            resourceKind: 'organization_knowledge',
            membership: null,
        })).toEqual({ allowed: false, reason: 'membership_unavailable' });
        (0, vitest_1.expect)((0, ai_data_access_policy_1.authorizeOrganizationWideAiData)({
            requestedOrgId: 'org-1',
            resourceOrgId: 'org-1',
            resourceKind: 'organization_knowledge',
            membership: { ...activeAdmin, status: 'suspended' },
        })).toEqual({ allowed: false, reason: 'membership_inactive' });
    });
});
//# sourceMappingURL=ai-data-access-policy.test.js.map