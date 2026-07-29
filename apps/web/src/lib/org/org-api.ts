import {
  backendDelete,
  backendGet,
  backendPatch,
  backendPost,
  backendPut,
} from '@/lib/api/backend-client'
import {
  fetchTeamRoster,
  type FetchTeamRosterOptions,
  type TeamRosterEntry,
} from '@/lib/team/team-roster-api'
import { getOrgHumanSpending } from '@/lib/org/org-billing-api'

export type { TeamRosterEntry } from '@/lib/team/team-roster-api'

export interface Organization {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  account_type: string
  status: string
  owner_id: string
  created_at: string
}

export interface OrgMember {
  id: string
  user_id: string
  role: string
  status: string
  ai_data_admin?: boolean
  accepted_at: string | null
  created_at: string
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
    email?: string | null
  } | null
}

export interface CampaignPermissionRow {
  id: string
  org_member_id: string
  campaign_id: string
  permission: 'view' | 'edit'
  created_at: string
  org_members: {
    id: string
    user_id: string
    role: string
    status: string
    profiles: { full_name: string | null; avatar_url: string | null; email: string | null } | null
  }
}

export interface BrainShareRow {
  id: string
  org_id: string | null
  brain_id: string
  entity_type: 'user' | 'org' | 'team'
  entity_id: string
  level: 'view' | 'query' | 'train'
  created_by: string
  created_at: string
}

export interface OrgInvitation {
  id: string
  org_id: string
  email: string
  role: string
  status: string
  expires_at: string
  created_at: string
}

export interface UpdateTeamProfilePayload {
  functional_role?: string | null
  specialties?: string[]
  accepts_agent_assignments?: boolean
  delegation_notes?: string | null
  timezone?: string | null
  working_hours?: Record<string, { start: string; end: string }> | null
  out_of_office_until?: string | null
}

export interface LearnFromSlackSuggestion<T> {
  value: T
  confidence: number
  evidence?: string
}

export interface LearnFromSlackSuggestions {
  functional_role: LearnFromSlackSuggestion<string | null>
  specialties: LearnFromSlackSuggestion<string[]>
  delegation_notes: LearnFromSlackSuggestion<string | null>
  timezone: Omit<LearnFromSlackSuggestion<string | null>, 'evidence'>
}

export interface LearnFromSlackResponse {
  source: 'slack'
  slack_user_id: string
  slack_profile: {
    real_name: string | null
    title: string | null
    timezone: string | null
  } | null
  messages_sampled: number
  suggestions: LearnFromSlackSuggestions
  credits_used: number
  credits_remaining: number
  model_name: string
}

export const orgService = {
  createOrg: (data: { name: string; slug: string; avatar_url?: string }) =>
    backendPost<{ success: boolean; org: Organization }>('/api/org', data),

  getOrg: (orgId: string) =>
    backendGet<{ success: boolean; org: Organization }>(`/api/org/${orgId}`),

  updateOrg: (orgId: string, data: { name?: string; slug?: string; avatar_url?: string | null }) =>
    backendPatch<{ success: boolean; org: Organization }>(`/api/org/${orgId}`, data),

  deleteOrg: (orgId: string) => backendDelete<{ success: boolean }>(`/api/org/${orgId}`),

  restoreOrg: (orgId: string) => backendPost<{ success: boolean }>(`/api/org/${orgId}/restore`, {}),

  listMembers: (orgId: string) =>
    backendGet<{ success: boolean; members: OrgMember[] }>(`/api/org/${orgId}/members`),

  changeMemberRole: (orgId: string, memberId: string, role: string) =>
    backendPatch<{ success: boolean }>(`/api/org/${orgId}/members/${memberId}/role`, { role }),

  updateAiDataAdmin: (orgId: string, memberId: string, enabled: boolean) =>
    backendPatch<{ success: boolean; member: OrgMember }>(
      `/api/org/${orgId}/members/${memberId}/ai-data-admin`,
      { enabled },
    ),

  removeMember: (orgId: string, memberId: string) =>
    backendDelete<{ success: boolean }>(`/api/org/${orgId}/members/${memberId}`),

  invite: (orgId: string, data: { email: string; role: string }) =>
    backendPost<{ success: boolean; invitation: OrgInvitation }>(
      `/api/org/${orgId}/invitations`,
      data,
    ),

  listInvitations: (orgId: string) =>
    backendGet<{ success: boolean; invitations: OrgInvitation[] }>(`/api/org/${orgId}/invitations`),

  revokeInvitation: (orgId: string, invitationId: string) =>
    backendDelete<{ success: boolean }>(`/api/org/${orgId}/invitations/${invitationId}`),

  acceptInvitation: (token: string) =>
    backendPost<{ success: boolean; org_id: string; role: string }>('/api/org/invitations/accept', {
      token,
    }),

  acceptInvitationAndBootstrap: (token: string) =>
    backendPost<{
      success: boolean
      org_id: string
      role: string
      requires_machine_setup?: boolean
    }>('/api/org/invitations/accept-and-bootstrap', { token }),

  getInvitationByToken: (token: string) =>
    backendGet<{ success: boolean; invitation: OrgInvitation & { organizations: Organization } }>(
      `/api/org/invitations/${token}`,
    ),

  importAgents: (orgId: string, data: { agent_keys: string[]; include_brains: boolean }) =>
    backendPost<{ success: boolean; imported: unknown[] }>(`/api/org/${orgId}/agents/import`, data),

  /** @deprecated Use transferService.preview() from the transfer service. */
  transferPreview: (orgId: string, campaignId: string) =>
    backendPost<{ success: boolean; preview: unknown }>(
      `/api/org/${orgId}/campaigns/transfer/preview`,
      { campaign_id: campaignId },
    ),

  /** @deprecated Use transferService.execute() from the transfer service. */
  transferCampaigns: (
    orgId: string,
    data: {
      campaign_ids: string[]
      mode: 'move' | 'copy'
      include_contacts?: boolean
      move_domains?: string[]
      move_email_domains?: string[]
    },
  ) =>
    backendPost<{ success: boolean; results: unknown[] }>(
      `/api/org/${orgId}/campaigns/transfer`,
      data,
    ),

  shareBrain: (
    orgId: string,
    data: {
      brain_id: string
      entity_type?: 'user' | 'org' | 'team'
      entity_id?: string
      level?: 'view' | 'query' | 'train'
      permission?: 'view' | 'query'
    },
  ) => backendPost<{ success: boolean }>(`/api/org/${orgId}/brains/share`, data),

  unshareBrain: (orgId: string, brainId: string) =>
    backendDelete<{ success: boolean }>(`/api/org/${orgId}/brains/${brainId}/share`),

  listSharedBrains: (orgId: string) =>
    backendGet<{ success: boolean; sharedBrains: unknown[] }>(`/api/org/${orgId}/brains/shared`),

  listBrainShares: (orgId: string) =>
    backendGet<{ success: boolean; permissions: BrainShareRow[] }>(
      `/api/org/${orgId}/sharing/brains`,
    ),

  upsertBrainShare: (
    orgId: string,
    brainId: string,
    data: {
      entity_type: 'user' | 'org' | 'team'
      entity_id: string
      level: 'view' | 'query' | 'train'
    },
  ) =>
    backendPut<{ success: boolean; permission: BrainShareRow }>(
      `/api/org/${orgId}/sharing/brains/${brainId}`,
      data,
    ),

  removeBrainShare: (orgId: string, brainId: string, shareId: string) =>
    backendDelete<{ success: boolean }>(
      `/api/org/${orgId}/sharing/brains/${brainId}/shares/${shareId}`,
    ),

  getBillingStatus: (orgId: string) =>
    backendGet<{ success: boolean; balance: unknown; plan: unknown; autoRecharge: unknown }>(
      `/api/org/${orgId}/billing/status`,
    ),

  getUsageHistory: (orgId: string, limit = 20, offset = 0) =>
    backendGet<{ success: boolean; items: unknown[]; total: number; hasMore: boolean }>(
      `/api/org/${orgId}/billing/usage?limit=${limit}&offset=${offset}`,
    ),

  getMemberUsage: (orgId: string) =>
    backendGet<{ success: boolean; members: unknown[] }>(`/api/org/${orgId}/billing/members`),

  getHumanSpending: getOrgHumanSpending,

  updateCreditLimit: (
    orgId: string,
    memberId: string,
    data: { period: string; credit_limit: number | null },
  ) =>
    backendPatch<{ success: boolean }>(`/api/org/${orgId}/members/${memberId}/credit-limit`, data),

  listCampaignPermissions: (orgId: string, campaignId: string) =>
    backendGet<{ success: boolean; permissions: CampaignPermissionRow[] }>(
      `/api/org/${orgId}/sharing/campaigns/${campaignId}/permissions`,
    ),

  upsertCampaignPermission: (
    orgId: string,
    campaignId: string,
    memberId: string,
    permission: 'view' | 'edit',
  ) =>
    backendPut<{ success: boolean; permission: unknown }>(
      `/api/org/${orgId}/sharing/campaigns/${campaignId}/permissions/${memberId}`,
      { permission },
    ),

  removeCampaignPermission: (orgId: string, campaignId: string, memberId: string) =>
    backendDelete<{ success: boolean }>(
      `/api/org/${orgId}/sharing/campaigns/${campaignId}/permissions/${memberId}`,
    ),

  listRoster: (opts?: FetchTeamRosterOptions) => fetchTeamRoster(opts),

  updateMyRoster: (patch: UpdateTeamProfilePayload) =>
    backendPatch<TeamRosterEntry | null>('/api/team-roster/me', patch),

  updateRosterMember: (userId: string, patch: UpdateTeamProfilePayload) =>
    backendPatch<TeamRosterEntry | null>(`/api/team-roster/${userId}`, patch),

  learnFromSlack: (userId: string) =>
    backendPost<LearnFromSlackResponse>(`/api/team-roster/${userId}/learn-from-slack`, {}),
}
