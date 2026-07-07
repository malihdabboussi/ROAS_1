import { beforeEach, describe, expect, it, vi } from 'vitest'
import { patchCampaignBrainIcon } from './campaign-brain-icon.service'

const mocks = vi.hoisted(() => ({
  fetchCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  invalidate: vi.fn(),
  reload: vi.fn(),
}))

vi.mock('@/features/studio/services/campaign.service', () => ({
  fetchCampaign: mocks.fetchCampaign,
  updateCampaign: mocks.updateCampaign,
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaign: mocks.fetchCampaign,
  updateCampaign: mocks.updateCampaign,
}))

vi.mock('@/features/brain/hooks/use-brain-scope-nav-options', () => ({
  cachedBrainScopeNav: {
    invalidate: mocks.invalidate,
    reload: mocks.reload,
  },
}))

describe('patchCampaignBrainIcon', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchCampaign.mockResolvedValue({
      id: 'campaign-1',
      name: 'Launch',
      config: {
        icon: 'brain',
        icon_color: 'purple',
        system_kind: 'active',
      },
    })
    mocks.updateCampaign.mockResolvedValue({ id: 'campaign-1' })
    mocks.reload.mockResolvedValue(undefined)
  })

  it('merges icon patch into existing campaign config and refreshes Brain scope nav', async () => {
    await patchCampaignBrainIcon('campaign-1', {
      icon: 'sparkles',
      icon_color: 'cyan',
    })

    expect(mocks.fetchCampaign).toHaveBeenCalledWith('campaign-1')
    expect(mocks.updateCampaign).toHaveBeenCalledWith('campaign-1', {
      config: {
        icon: 'sparkles',
        icon_color: 'cyan',
        system_kind: 'active',
      },
    })
    expect(mocks.invalidate).toHaveBeenCalled()
    expect(mocks.reload).toHaveBeenCalled()
  })
})
