import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdCampaign } from '@/features/studio/types'
import { updateAdCampaign, fetchMetaPixels } from '../../../services/artifact-preview.service'
import { updateCampaign } from '../../../services/campaign.service'
import { AdsDefaultMetaAssetsSection } from './ads-default-meta-assets-section'

vi.mock('../../../services/artifact-preview.service', () => ({
  fetchMetaInstagramAccountsForPage: vi.fn().mockResolvedValue([]),
  fetchMetaPixels: vi.fn().mockResolvedValue([{ id: 'pixel-1', name: 'Pixel One' }]),
  updateAdCampaign: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../../services/campaign.service', () => ({
  updateCampaign: vi.fn().mockResolvedValue({}),
}))

vi.mock('../SettingsDropdown', () => ({
  SettingsDropdown: ({
    options,
    onChange,
    placeholder,
  }: {
    options: Array<{ value: string; label: string }>
    onChange: (value: string) => void | Promise<void>
    placeholder?: string
  }) => (
    <button
      type="button"
      data-testid={`settings-dropdown-${placeholder ?? 'select'}`}
      onClick={() => {
        const nextValue = options[0]?.value
        if (nextValue) void onChange(nextValue)
      }}
    >
      {placeholder}
    </button>
  ),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function adCampaign(overrides: Partial<AdCampaign> = {}): AdCampaign {
  return {
    id: 'ad-campaign-1',
    campaign_id: 'campaign-1',
    name: 'Prospecting',
    objective: 'OUTCOME_TRAFFIC',
    status: 'draft',
    budget_type: 'daily',
    daily_budget: null,
    lifetime_budget: null,
    bid_strategy: null,
    special_ad_categories: [],
    meta_ad_account_id: null,
    meta_page_id: null,
    schedule_type: 'continuous',
    start_time: null,
    end_time: null,
    metadata: {},
    created_at: '2026-06-22T00:00:00.000Z',
    updated_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  } as AdCampaign
}

describe('AdsDefaultMetaAssetsSection', () => {
  it('creates the default profile in campaign config', async () => {
    const setCampaignConfig = vi.fn()
    const setAdCampaigns = vi.fn()

    render(
      <AdsDefaultMetaAssetsSection
        campaignId="campaign-1"
        campaignConfig={{}}
        setCampaignConfig={setCampaignConfig}
        adCampaigns={[]}
        setAdCampaigns={setAdCampaigns}
        metaAdAccounts={[]}
        metaPages={[]}
        metaInstagramAccountsByCampaign={{}}
        setMetaInstagramAccountsByCampaign={vi.fn()}
        metaPixelsByAccount={{}}
        setMetaPixelsByAccount={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '+ Add Profile' }))

    const expectedConfig = {
      meta_asset_profiles: [
        {
          id: 'default',
          label: 'Default',
          ad_account_id: null,
          page_id: null,
          instagram_user_id: null,
          pixel_id: null,
        },
      ],
    }
    expect(setCampaignConfig).toHaveBeenCalledWith(expectedConfig)
    expect(updateCampaign).toHaveBeenCalledWith('campaign-1', { config: expectedConfig })
  })

  it('saves ad account changes and applies the default profile to non-overridden campaigns', async () => {
    const setCampaignConfig = vi.fn()
    const setAdCampaigns = vi.fn()
    const setMetaPixelsByAccount = vi.fn()
    const defaultProfile = {
      id: 'default',
      label: 'Default',
      ad_account_id: null,
      page_id: 'page-1',
      instagram_user_id: 'instagram-1',
      pixel_id: 'pixel-old',
    }
    const campaignConfig = { meta_asset_profiles: [defaultProfile] }
    const defaultCampaign = adCampaign()
    const overrideCampaign = adCampaign({
      id: 'ad-campaign-2',
      name: 'Retargeting',
      metadata: { meta_asset_profile_override: true },
    })

    render(
      <AdsDefaultMetaAssetsSection
        campaignId="campaign-1"
        campaignConfig={campaignConfig}
        setCampaignConfig={setCampaignConfig}
        adCampaigns={[defaultCampaign, overrideCampaign]}
        setAdCampaigns={setAdCampaigns}
        metaAdAccounts={[{ id: 'act-1', name: 'Main Ad Account' }]}
        metaPages={[{ id: 'page-1', name: 'Main Page' }]}
        metaInstagramAccountsByCampaign={{ 'profile-default': [{ id: 'instagram-1' }] }}
        setMetaInstagramAccountsByCampaign={vi.fn()}
        metaPixelsByAccount={{}}
        setMetaPixelsByAccount={setMetaPixelsByAccount}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-dropdown-Select ad account'))
    await waitFor(() => {
      expect(updateCampaign).toHaveBeenCalledWith('campaign-1', {
        config: {
          meta_asset_profiles: [
            {
              ...defaultProfile,
              ad_account_id: 'act-1',
              pixel_id: null,
            },
          ],
        },
      })
    })

    expect(fetchMetaPixels).toHaveBeenCalledWith('act-1')
    expect(setMetaPixelsByAccount).toHaveBeenCalled()
    expect(updateAdCampaign).toHaveBeenCalledTimes(1)
    expect(updateAdCampaign).toHaveBeenCalledWith('ad-campaign-1', {
      meta_ad_account_id: 'act-1',
      meta_page_id: 'page-1',
      metadata: {
        meta_pixel_id: null,
        meta_instagram_user_id: 'instagram-1',
      },
    })
    expect(setAdCampaigns).toHaveBeenCalled()
  })
})
