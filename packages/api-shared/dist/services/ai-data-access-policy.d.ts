export type AiDataResourceKind = 'organization_knowledge' | 'observed_slack_channel' | 'private_conversation';
export interface AiDataAccessMembership {
    id: string;
    userId: string;
    orgId: string;
    role: string;
    status: string;
    aiDataAdmin: boolean;
}
export type AiDataAccessReason = 'organization_data_access_allowed' | 'membership_unavailable' | 'membership_inactive' | 'cross_org' | 'capability_missing' | 'private_conversation';
export type AiDataAccessDecision = {
    allowed: true;
    reason: 'organization_data_access_allowed';
} | {
    allowed: false;
    reason: Exclude<AiDataAccessReason, 'organization_data_access_allowed'>;
};
export interface AuthorizeOrganizationWideAiDataInput {
    requestedOrgId: string;
    resourceOrgId: string;
    resourceKind: AiDataResourceKind;
    membership: AiDataAccessMembership | null;
}
export declare function authorizeOrganizationWideAiData(input: AuthorizeOrganizationWideAiDataInput): AiDataAccessDecision;
