import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet, backendPatch } from '@/lib/api/backend-client'
import { ACTIVE_ORG_STORAGE_KEY } from '@/lib/utils/org-storage'
import {
  campaignListCacheKey,
  fetchCampaignTeam,
  fetchCampaignUserState,
  updateCampaignUserState,
} from './campaign.service'

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)
const backendPatchMock = vi.mocked(backendPatch)

describe('campaign service user state', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPatchMock.mockReset()
  })

  it('fetches campaign user state rows', async () => {
    backendGetMock.mockResolvedValue([{ campaign_id: 'campaign-1', is_favorite: true }])

    await expect(fetchCampaignUserState()).resolves.toEqual([
      { campaign_id: 'campaign-1', is_favorite: true },
    ])
    expect(backendGetMock).toHaveBeenCalledWith('/api/campaigns/user-state')
  })

  it('updates campaign user state flags', async () => {
    backendPatchMock.mockResolvedValue({ campaign_id: 'campaign-1', is_hidden: true })

    await expect(updateCampaignUserState('campaign-1', { is_hidden: true })).resolves.toEqual({
      campaign_id: 'campaign-1',
      is_hidden: true,
    })
    expect(backendPatchMock).toHaveBeenCalledWith('/api/campaigns/campaign-1/user-state', {
      is_hidden: true,
    })
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
})

describe('campaign list cache key', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('separates personal, active-org, and explicit-org campaign lists', () => {
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
})
