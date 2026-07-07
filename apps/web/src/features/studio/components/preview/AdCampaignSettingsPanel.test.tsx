import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdCampaign } from '../../types'
import { AdCampaignSettingsPanel } from './AdCampaignSettingsPanel'

const artifactPreviewServiceMock = vi.hoisted(() => ({
  fetchAdCampaign: vi.fn(),
  setAdCampaignMetaStatus: vi.fn(),
  updateAdCampaign: vi.fn(),
}))

const campaignServiceMock = vi.hoisted(() => ({
  fetchCampaign: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}))

vi.mock('../../services/artifact-preview.service', () => artifactPreviewServiceMock)
vi.mock('../../services/campaign.service', () => campaignServiceMock)

vi.mock('./MetaIntegrationsReviewModal', () => ({
  MetaIntegrationsReviewModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="meta-integrations-review-modal" /> : null,
}))

vi.mock('./MetaPublishModal', () => ({
  MetaPublishModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="meta-publish-modal" /> : null,
}))

function adCampaignFixture(overrides: Partial<AdCampaign> = {}): AdCampaign {
  return {
    id: 'ad-campaign-1',
    user_id: 'user-1',
    campaign_id: 'platform-campaign-1',
    space_id: null,
    name: 'Launch campaign',
    objective: 'OUTCOME_TRAFFIC',
    status: 'active',
    budget_type: 'CBO',
    daily_budget: 10000,
    lifetime_budget: null,
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    special_ad_categories: [],
    meta_campaign_id: 'meta-campaign-1',
    meta_ad_account_id: 'act_42',
    meta_page_id: 'page-1',
    meta_effective_status: 'ACTIVE',
    schedule_type: 'continuous',
    start_time: null,
    end_time: null,
    source: 'meta',
    metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ad_sets: [
      {
        id: 'ad-set-1',
        user_id: 'user-1',
        ad_campaign_id: 'ad-campaign-1',
        name: 'Launch ad set',
        status: 'active',
        daily_budget: 10000,
        lifetime_budget: null,
        start_time: null,
        end_time: null,
        optimization_goal: 'LINK_CLICKS',
        billing_event: 'IMPRESSIONS',
        targeting: {},
        meta_adset_id: 'meta-adset-1',
        meta_effective_status: 'ACTIVE',
        source: 'meta',
        metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        ads: [
          {
            id: 'ad-1',
            user_id: 'user-1',
            campaign_id: 'platform-campaign-1',
            ad_set_id: 'ad-set-1',
            platform: 'facebook',
            placement: 'feed',
            primary_text: 'Primary text',
            headline: 'Headline',
            description: null,
            cta_type: null,
            cta_text: null,
            destination_url: 'https://example.com',
            display_link: null,
            image_url: null,
            image_asset_id: null,
            generated_tsx: null,
            placement_images: {},
            placement_tsx: {},
            ad_format: 'SINGLE_IMAGE',
            video_url: null,
            carousel_cards: null,
            meta_ad_id: 'meta-ad-1',
            meta_effective_status: 'ACTIVE',
            source: 'meta',
            tracking_url: null,
            metadata: {},
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('AdCampaignSettingsPanel', () => {
  beforeEach(() => {
    artifactPreviewServiceMock.fetchAdCampaign.mockResolvedValue(adCampaignFixture())
    artifactPreviewServiceMock.setAdCampaignMetaStatus.mockResolvedValue({})
    artifactPreviewServiceMock.updateAdCampaign.mockImplementation(
      async (_id: string, patch: Partial<AdCampaign>) => adCampaignFixture(patch),
    )
    campaignServiceMock.fetchCampaign.mockResolvedValue({
      id: 'platform-campaign-1',
      config: {
        meta_defaults: {
          meta_ad_account_id: 'act_default',
          meta_page_id: 'page-default',
        },
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps published header controls, Meta source banner, and pause refresh behavior', async () => {
    const onUpdated = vi.fn()

    render(
      <AdCampaignSettingsPanel
        adCampaignId="ad-campaign-1"
        onUpdated={onUpdated}
        headerTrailing={<span>Header action</span>}
      />,
    )

    await screen.findByText('CAMPAIGN SETTINGS')

    expect(screen.getByText('Header action')).toBeTruthy()
    expect(screen.getByText('Running')).toBeTruthy()
    expect(screen.getByText('Synced from Meta · ID meta-campaign-1')).toBeTruthy()
    expect(screen.getByRole('link', { name: /View on Meta/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Pause/i }))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.setAdCampaignMetaStatus).toHaveBeenCalledWith(
        'ad-campaign-1',
        'PAUSED',
      )
    })
    await waitFor(() => {
      expect(artifactPreviewServiceMock.fetchAdCampaign).toHaveBeenCalledTimes(2)
    })
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ id: 'ad-campaign-1' }))
  })

  it('keeps campaign body fields and advanced toggle behavior', async () => {
    render(<AdCampaignSettingsPanel adCampaignId="ad-campaign-1" />)

    await screen.findByDisplayValue('Launch campaign')

    expect(screen.getByText('Campaign Objective')).toBeTruthy()
    expect(screen.getByText('Daily Budget ($)')).toBeTruthy()
    expect(screen.queryByText('Budget Strategy')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /See advanced options/i }))

    expect(screen.getByText('Budget Strategy')).toBeTruthy()
    expect(screen.getByText('Bid Strategy')).toBeTruthy()
  })
})
