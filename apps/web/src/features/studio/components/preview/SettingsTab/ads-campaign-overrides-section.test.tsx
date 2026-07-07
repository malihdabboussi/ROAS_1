import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdCampaign } from '../../../types'
import { updateAdCampaign, fetchMetaPixels } from '../../../services/artifact-preview.service'
import { AdsCampaignOverridesSection } from './ads-campaign-overrides-section'

vi.mock('../../../services/artifact-preview.service', () => ({
  fetchMetaInstagramAccountsForPage: vi.fn().mockResolvedValue([{ id: 'ig-1', username: 'main' }]),
  fetchMetaPixels: vi.fn().mockResolvedValue([{ id: 'pixel-new', name: 'New Pixel' }]),
  updateAdCampaign: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/components/ui/forms/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean
    onCheckedChange: (checked: boolean) => void | Promise<void>
  }) => (
    <button
      type="button"
      data-testid={`override-switch-${checked ? 'on' : 'off'}`}
      onClick={() => void onCheckedChange(!checked)}
    >
      {checked ? 'Custom' : 'Customize'}
    </button>
  ),
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
        const nextValue = placeholder === 'Select profile' ? options[1]?.value : options[0]?.value
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

const campaignConfig = {
  meta_asset_profiles: [
    {
      id: 'default',
      label: 'Default',
      ad_account_id: 'act-1',
      page_id: 'page-1',
      instagram_user_id: 'ig-default',
      pixel_id: 'pixel-default',
    },
    {
      id: 'profile-2',
      label: 'Second Profile',
      ad_account_id: 'act-2',
      page_id: 'page-2',
      instagram_user_id: 'ig-2',
      pixel_id: 'pixel-2',
    },
  ],
}

const metaAdAccounts = [
  { id: 'act-1', name: 'Main Ad Account' },
  { id: 'act-2', name: 'Second Ad Account' },
]

const metaPages = [
  { id: 'page-1', name: 'Main Page' },
  { id: 'page-2', name: 'Second Page' },
]

function renderSection(overrides: Partial<ComponentProps<typeof AdsCampaignOverridesSection>>) {
  return render(
    <AdsCampaignOverridesSection
      adCampaigns={[adCampaign()]}
      setAdCampaigns={vi.fn()}
      campaignConfig={campaignConfig}
      metaAdAccounts={metaAdAccounts}
      metaPages={metaPages}
      metaInstagramAccountsByCampaign={{}}
      setMetaInstagramAccountsByCampaign={vi.fn()}
      metaPixelsByAccount={{ 'act-1': [{ id: 'pixel-default', name: 'Default Pixel' }] }}
      setMetaPixelsByAccount={vi.fn()}
      adsSaving={{}}
      setAdsSaving={vi.fn()}
      setCreatePixelForAccountId={vi.fn()}
      setCreatePixelForCampaignId={vi.fn()}
      {...overrides}
    />,
  )
}

describe('AdsCampaignOverridesSection', () => {
  it('turns off an override and reapplies the default profile', async () => {
    const setAdCampaigns = vi.fn()

    renderSection({
      adCampaigns: [
        adCampaign({
          metadata: {
            meta_asset_profile_override: true,
            meta_pixel_id: 'old-pixel',
            meta_instagram_user_id: 'old-ig',
          },
        }),
      ],
      setAdCampaigns,
    })

    fireEvent.click(screen.getByTestId('override-switch-on'))

    await waitFor(() => {
      expect(updateAdCampaign).toHaveBeenCalledWith('ad-campaign-1', {
        meta_ad_account_id: 'act-1',
        meta_page_id: 'page-1',
        metadata: {
          meta_asset_profile_override: false,
          meta_pixel_id: 'pixel-default',
          meta_instagram_user_id: 'ig-default',
        },
      })
    })
    expect(setAdCampaigns).toHaveBeenCalled()
  })

  it('selects an alternate profile for campaigns without override mode', async () => {
    const setAdCampaigns = vi.fn()

    renderSection({ setAdCampaigns })

    fireEvent.click(screen.getByTestId('settings-dropdown-Select profile'))

    await waitFor(() => {
      expect(updateAdCampaign).toHaveBeenCalledWith('ad-campaign-1', {
        meta_ad_account_id: 'act-2',
        meta_page_id: 'page-2',
        metadata: {
          meta_asset_profile_id: 'profile-2',
          meta_pixel_id: 'pixel-2',
          meta_instagram_user_id: 'ig-2',
        },
      })
    })
    expect(setAdCampaigns).toHaveBeenCalled()
  })

  it('keeps override controls wired for pixel updates and create-pixel flow', async () => {
    const setCreatePixelForAccountId = vi.fn()
    const setCreatePixelForCampaignId = vi.fn()
    const setMetaPixelsByAccount = vi.fn()

    renderSection({
      adCampaigns: [
        adCampaign({
          meta_ad_account_id: 'act-1',
          metadata: { meta_asset_profile_override: true, meta_pixel_id: 'pixel-default' },
        }),
      ],
      setCreatePixelForAccountId,
      setCreatePixelForCampaignId,
      metaPixelsByAccount: {},
      setMetaPixelsByAccount,
    })

    fireEvent.click(screen.getByTestId('settings-dropdown-Select ad account'))
    await waitFor(() => {
      expect(fetchMetaPixels).toHaveBeenCalledWith('act-1')
    })
    expect(setMetaPixelsByAccount).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '+ Create Pixel' }))
    expect(setCreatePixelForAccountId).toHaveBeenCalledWith('act-1')
    expect(setCreatePixelForCampaignId).toHaveBeenCalledWith('ad-campaign-1')
  })
})
