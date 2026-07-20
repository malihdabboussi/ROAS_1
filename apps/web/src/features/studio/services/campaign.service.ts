import type { CampaignContext } from '@/app/(dashboard)/campaigns/[id]/_lib/types'
import { backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import type { Campaign } from '../types'

export {
  assignAgentToCampaign,
  createCampaign,
  deleteCampaign,
  fetchCampaign,
  fetchAgentCampaignAssignments,
  fetchCampaigns,
  fetchCampaignTeam,
  fetchCampaignUserState,
  campaignListCacheKey,
  copyArtifactToCampaign,
  moveArtifactToCampaign,
  resolveArtifactCampaigns,
  unassignAgentFromCampaign,
  updateCampaign,
  updateCampaignUserState,
} from '@/lib/campaigns/campaign-api'
export type { CampaignTeamAgent, CampaignUserState } from '@/lib/campaigns/campaign-api'

export interface CampaignAssetSummary {
  offers: { id: string; name: string }[]
  funnels: { id: string; name: string }[]
  ads: { id: string; name: string }[]
  sequences: { id: string; name: string }[]
  presentations: { id: string; name: string }[]
  avatars: { id: string; name: string }[]
}

export async function ensureGeneralCampaign(): Promise<Campaign> {
  return backendPost<Campaign>('/api/campaigns', {
    name: 'General',
    config: {
      system_kind: 'general',
      isPinned: true,
      isSystem: true,
      icon: 'folder-kanban',
    },
  })
}

export async function ensurePersonalCampaign(): Promise<Campaign> {
  return backendPost<Campaign>('/api/campaigns', {
    name: 'Personal',
    config: {
      system_kind: 'personal',
      isPinned: true,
      isSystem: true,
      icon: 'house',
    },
  })
}

export async function generateCampaignStrategy(campaignId: string): Promise<CampaignContext> {
  const res = await backendPost<{ context: unknown }>(
    `/api/campaigns/${campaignId}/generate-context`,
    {},
  )
  const raw = res.context
  const base: CampaignContext = { purpose: '', result: '', strategy: '', off_limits: [] }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base
  const o = raw as Record<string, unknown>
  return {
    ...base,
    purpose: typeof o.purpose === 'string' ? o.purpose : base.purpose,
    result: typeof o.result === 'string' ? o.result : base.result,
    strategy: typeof o.strategy === 'string' ? o.strategy : base.strategy,
    off_limits: Array.isArray(o.off_limits)
      ? o.off_limits.filter((x): x is string => typeof x === 'string')
      : base.off_limits,
  }
}

export async function archiveCampaign(id: string): Promise<Campaign> {
  return backendPatch<Campaign>(`/api/campaigns/${id}`, { status: 'archived' })
}

export async function fetchCampaignAssetSummary(campaignId: string): Promise<CampaignAssetSummary> {
  return backendGet<CampaignAssetSummary>(`/api/campaigns/${campaignId}/assets/summary`)
}
