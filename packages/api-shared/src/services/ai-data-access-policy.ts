export type AiDataResourceKind =
  | 'organization_knowledge'
  | 'observed_slack_channel'
  | 'private_conversation'

export interface AiDataAccessMembership {
  id: string
  userId: string
  orgId: string
  role: string
  status: string
  aiDataAdmin: boolean
}

export type AiDataAccessReason =
  | 'organization_data_access_allowed'
  | 'membership_unavailable'
  | 'membership_inactive'
  | 'cross_org'
  | 'capability_missing'
  | 'private_conversation'

export type AiDataAccessDecision =
  | { allowed: true; reason: 'organization_data_access_allowed' }
  | { allowed: false; reason: Exclude<AiDataAccessReason, 'organization_data_access_allowed'> }

export interface AuthorizeOrganizationWideAiDataInput {
  requestedOrgId: string
  resourceOrgId: string
  resourceKind: AiDataResourceKind
  membership: AiDataAccessMembership | null
}

export function authorizeOrganizationWideAiData(
  input: AuthorizeOrganizationWideAiDataInput,
): AiDataAccessDecision {
  if (!input.membership) return { allowed: false, reason: 'membership_unavailable' }
  if (input.membership.status !== 'active') {
    return { allowed: false, reason: 'membership_inactive' }
  }
  if (
    input.membership.orgId !== input.requestedOrgId ||
    input.resourceOrgId !== input.requestedOrgId
  ) {
    return { allowed: false, reason: 'cross_org' }
  }
  if (input.resourceKind === 'private_conversation') {
    return { allowed: false, reason: 'private_conversation' }
  }
  if (input.membership.role !== 'owner' && !input.membership.aiDataAdmin) {
    return { allowed: false, reason: 'capability_missing' }
  }
  return { allowed: true, reason: 'organization_data_access_allowed' }
}
