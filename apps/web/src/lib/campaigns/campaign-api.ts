import {
  backendDelete,
  backendGet,
  backendPatch,
  backendPost,
  type BackendFetchOptions,
} from '@/lib/api/backend-client'
import { getActiveOrgIdFromStorage } from '@/lib/utils/org-storage'

export interface Campaign {
  id: string
  user_id: string
  org_id?: string | null
  program_id?: string | null
  name: string
  campaign_type: string
  status: string
  config: Record<string, unknown>
  metrics: Record<string, unknown>
  created_at: string
  updated_at: string
}

const CAMPAIGNS_LIST_CACHE_PREFIX = 'campaigns:list'

export function campaignListCacheKey(orgId?: string | null): string {
  const effectiveOrgId = orgId === undefined ? getActiveOrgIdFromStorage() : orgId
  return effectiveOrgId
    ? `${CAMPAIGNS_LIST_CACHE_PREFIX}:${effectiveOrgId}`
    : `${CAMPAIGNS_LIST_CACHE_PREFIX}:personal`
}

export async function fetchCampaigns(options?: BackendFetchOptions): Promise<Campaign[]> {
  return backendGet<Campaign[]>('/api/campaigns', options)
}

export async function fetchCampaign(id: string): Promise<Campaign> {
  return backendGet<Campaign>(`/api/campaigns/${id}`)
}

export async function createCampaign(
  name: string,
  icon?: string,
  options?: { programId?: string | null },
): Promise<Campaign> {
  const created = await backendPost<Campaign>('/api/campaigns', {
    name,
    config: icon ? { icon } : {},
  })
  if (!options?.programId) return created
  try {
    return await updateCampaign(created.id, { program_id: options.programId })
  } catch {
    return created
  }
}

export async function updateCampaign(id: string, data: Record<string, unknown>): Promise<Campaign> {
  return backendPatch<Campaign>(`/api/campaigns/${id}`, data)
}

export async function deleteCampaign(id: string): Promise<void> {
  return backendDelete(`/api/campaigns/${id}`)
}

export interface CampaignTeamAgent {
  campaign_id: string
  agent_key: string
  name: string
  status: string
  role: string | null
  level: string | null
  created_at: string
  updated_at: string
}

export interface CampaignUserState {
  campaign_id: string
  is_favorite: boolean
  is_hidden: boolean
  updated_at: string
}

export async function fetchCampaignUserState(): Promise<CampaignUserState[]> {
  return backendGet<CampaignUserState[]>('/api/campaigns/user-state')
}

export async function updateCampaignUserState(
  id: string,
  patch: { is_favorite?: boolean; is_hidden?: boolean },
): Promise<CampaignUserState> {
  return backendPatch<CampaignUserState>(`/api/campaigns/${id}/user-state`, patch)
}

export async function fetchCampaignTeam(campaignId: string): Promise<CampaignTeamAgent[]> {
  const result = await backendGet<{ success: boolean; team: CampaignTeamAgent[] }>(
    `/api/campaigns/${campaignId}/agents`,
  )
  return result.team ?? []
}

export async function fetchAgentCampaignAssignments(agentKey: string): Promise<string[]> {
  const result = await backendGet<{ success: boolean; campaign_ids: string[] }>(
    `/api/campaigns/assignments/by-agent/${encodeURIComponent(agentKey)}`,
  )
  return result.campaign_ids ?? []
}

export async function assignAgentToCampaign(campaignId: string, agentKey: string): Promise<void> {
  await backendPost(`/api/campaigns/${campaignId}/agents`, { agent_key: agentKey })
}

export async function unassignAgentFromCampaign(
  campaignId: string,
  agentKey: string,
): Promise<void> {
  await backendDelete(`/api/campaigns/${campaignId}/agents/${encodeURIComponent(agentKey)}`)
}

export async function moveArtifactToCampaign(
  table: string,
  artifactId: string,
  targetCampaignId: string,
): Promise<void> {
  await backendPatch(`/api/artifacts/${table}/${artifactId}/move`, {
    target_campaign_id: targetCampaignId,
  })
}

export async function copyArtifactToCampaign(
  table: string,
  artifactId: string,
  targetCampaignId: string,
): Promise<void> {
  await backendPost(`/api/artifacts/${table}/${artifactId}/copy`, {
    target_campaign_id: targetCampaignId,
  })
}

/** Distinct campaign_ids for artifact + copy lineage; keys are `${table}:${id}`. */
export async function resolveArtifactCampaigns(
  items: Array<{ table: string; id: string }>,
): Promise<Record<string, string[]>> {
  const res = await backendPost<{ campaigns: Record<string, string[]> }>(
    '/api/artifacts/resolve-campaigns',
    { items },
  )
  return res.campaigns ?? {}
}
