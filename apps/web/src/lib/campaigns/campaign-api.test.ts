import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { ACTIVE_ORG_STORAGE_KEY } from '@/lib/utils/org-storage'
import {
  assignAgentToCampaign,
  campaignListCacheKey,
  createCampaign,
  deleteCampaign,
  fetchAgentCampaignAssignments,
  fetchCampaignTeam,
  copyArtifactToCampaign,
  moveArtifactToCampaign,
  resolveArtifactCampaigns,
  unassignAgentFromCampaign,
} from './campaign-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

const backendDeleteMock = vi.mocked(backendDelete)
const backendGetMock = vi.mocked(backendGet)
const backendPatchMock = vi.mocked(backendPatch)
const backendPostMock = vi.mocked(backendPost)

describe('campaign-api campaign team', () => {
  beforeEach(() => {
    backendDeleteMock.mockReset()
    backendGetMock.mockReset()
    backendPatchMock.mockReset()
    backendPostMock.mockReset()
    window.sessionStorage.clear()
  })

  it('fetches campaign team agents from the campaign agents endpoint', async () => {
    const team = [
      {
        campaign_id: 'campaign-1',
        agent_key: 'designer',
        name: 'Designer',
        status: 'active',
        role: 'creative',
        level: 'senior',
        created_at: '2026-06-22T00:00:00.000Z',
        updated_at: '2026-06-22T00:00:00.000Z',
      },
    ]
    backendGetMock.mockResolvedValue({ success: true, team })

    await expect(fetchCampaignTeam('campaign-1')).resolves.toEqual(team)
    expect(backendGetMock).toHaveBeenCalledWith('/api/campaigns/campaign-1/agents')
  })

  it('defaults campaign team to an empty list when the response omits team rows', async () => {
    backendGetMock.mockResolvedValue({ success: true })

    await expect(fetchCampaignTeam('campaign-1')).resolves.toEqual([])
  })

  it('separates personal, active-org, and explicit-org campaign list cache keys', () => {
    expect(campaignListCacheKey()).toBe('campaigns:list:personal')
    expect(campaignListCacheKey(null)).toBe('campaigns:list:personal')
    expect(campaignListCacheKey('org-roas')).toBe('campaigns:list:org-roas')

    window.sessionStorage.setItem(
      ACTIVE_ORG_STORAGE_KEY,
      JSON.stringify({ state: { activeOrgId: 'org-vibey' } }),
    )

    expect(campaignListCacheKey()).toBe('campaigns:list:org-vibey')
    expect(campaignListCacheKey('org-roas')).toBe('campaigns:list:org-roas')
  })

  it('fetches campaign assignments for an agent key', async () => {
    backendGetMock.mockResolvedValue({ success: true, campaign_ids: ['campaign-1'] })

    await expect(fetchAgentCampaignAssignments('agent key')).resolves.toEqual(['campaign-1'])
    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/campaigns/assignments/by-agent/agent%20key',
    )
  })

  it('creates and deletes campaigns through shared campaign endpoints', async () => {
    const campaign = {
      id: 'campaign-new',
      user_id: 'user-1',
      name: 'Launch',
      campaign_type: 'standard',
      status: 'active',
      config: { icon: 'rocket' },
      metrics: {},
      created_at: '2026-06-24T00:00:00.000Z',
      updated_at: '2026-06-24T00:00:00.000Z',
    }
    backendPostMock.mockResolvedValue(campaign)
    backendDeleteMock.mockResolvedValue(undefined)

    await expect(createCampaign('Launch', 'rocket')).resolves.toEqual(campaign)
    await deleteCampaign('campaign-new')

    expect(backendPostMock).toHaveBeenCalledWith('/api/campaigns', {
      name: 'Launch',
      config: { icon: 'rocket' },
    })
    expect(backendDeleteMock).toHaveBeenCalledWith('/api/campaigns/campaign-new')
  })

  it('assigns and unassigns an agent from campaign team endpoints', async () => {
    backendPostMock.mockResolvedValue(undefined)
    backendDeleteMock.mockResolvedValue(undefined)

    await assignAgentToCampaign('campaign-1', 'agent-1')
    await unassignAgentFromCampaign('campaign-1', 'agent key')

    expect(backendPostMock).toHaveBeenCalledWith('/api/campaigns/campaign-1/agents', {
      agent_key: 'agent-1',
    })
    expect(backendDeleteMock).toHaveBeenCalledWith(
      '/api/campaigns/campaign-1/agents/agent%20key',
    )
  })

  it('moves and copies artifacts through shared artifact campaign endpoints', async () => {
    backendPatchMock.mockResolvedValue(undefined)
    backendPostMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        campaigns: { 'presentations:presentation-1': ['campaign-1'] },
      })

    await moveArtifactToCampaign('sequences', 'sequence-1', 'campaign-2')
    await copyArtifactToCampaign('avatars', 'avatar-1', 'campaign-3')
    await expect(
      resolveArtifactCampaigns([{ table: 'presentations', id: 'presentation-1' }]),
    ).resolves.toEqual({
      'presentations:presentation-1': ['campaign-1'],
    })

    expect(backendPatchMock).toHaveBeenCalledWith('/api/artifacts/sequences/sequence-1/move', {
      target_campaign_id: 'campaign-2',
    })
    expect(backendPostMock).toHaveBeenCalledWith('/api/artifacts/avatars/avatar-1/copy', {
      target_campaign_id: 'campaign-3',
    })
    expect(backendPostMock).toHaveBeenCalledWith('/api/artifacts/resolve-campaigns', {
      items: [{ table: 'presentations', id: 'presentation-1' }],
    })
  })
})
