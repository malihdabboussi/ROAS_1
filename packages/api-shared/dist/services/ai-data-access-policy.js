"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeOrganizationWideAiData = authorizeOrganizationWideAiData;
function authorizeOrganizationWideAiData(input) {
    if (!input.membership)
        return { allowed: false, reason: 'membership_unavailable' };
    if (input.membership.status !== 'active') {
        return { allowed: false, reason: 'membership_inactive' };
    }
    if (input.membership.orgId !== input.requestedOrgId ||
        input.resourceOrgId !== input.requestedOrgId) {
        return { allowed: false, reason: 'cross_org' };
    }
    if (input.resourceKind === 'private_conversation') {
        return { allowed: false, reason: 'private_conversation' };
    }
    if (input.membership.role !== 'owner' && !input.membership.aiDataAdmin) {
        return { allowed: false, reason: 'capability_missing' };
    }
    return { allowed: true, reason: 'organization_data_access_allowed' };
}
//# sourceMappingURL=ai-data-access-policy.js.map