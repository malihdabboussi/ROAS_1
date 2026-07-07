import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdSet } from '../../types'
import { AdSetSettingsPanel } from './AdSetSettingsPanel'
import { adCampaignFixture, adSetFixture } from './ad-set-settings-panel-test-fixtures'

const artifactPreviewServiceMock = vi.hoisted(() => ({
  fetchAdCampaign: vi.fn(),
  fetchAdSet: vi.fn(),
  fetchMetaCustomAudiences: vi.fn(),
  getAdSetDeliveryEstimate: vi.fn(),
  searchMetaCountries: vi.fn(),
  searchMetaInterests: vi.fn(),
  searchMetaLocations: vi.fn(),
  setAdSetMetaStatus: vi.fn(),
  updateAdSet: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}))

vi.mock('../../services/artifact-preview.service', () => artifactPreviewServiceMock)

vi.mock('./MetaIntegrationsReviewModal', () => ({
  MetaIntegrationsReviewModal: ({
    open,
    onClose,
    onContinueToPublish,
  }: {
    open: boolean
    onClose: () => void
    onContinueToPublish: () => void
  }) =>
    open ? (
      <div data-testid="meta-integrations-review-modal">
        <button
          type="button"
          onClick={() => {
            onClose()
            onContinueToPublish()
          }}
        >
          Continue to publish
        </button>
      </div>
    ) : null,
}))

vi.mock('./MetaPublishModal', () => ({
  MetaPublishModal: ({
    open,
    adCampaignId,
    defaultAdAccountId,
    defaultPageId,
    defaultInstagramUserId,
    onPublished,
  }: {
    open: boolean
    adCampaignId?: string
    defaultAdAccountId?: string | null
    defaultPageId?: string | null
    defaultInstagramUserId?: string | null
    onPublished?: () => void
  }) =>
    open ? (
      <div data-testid="meta-publish-modal">
        <span data-testid="publish-campaign-id">{adCampaignId}</span>
        <span data-testid="publish-ad-account-id">{defaultAdAccountId}</span>
        <span data-testid="publish-page-id">{defaultPageId}</span>
        <span data-testid="publish-instagram-id">{defaultInstagramUserId}</span>
        <button type="button" onClick={onPublished}>
          Mark published
        </button>
      </div>
    ) : null,
}))

function setupPublishPanelMocks() {
  const initialAdSet = adSetFixture({
    metadata: {
      meta_ad_account_id: 'act_42',
      meta_page_id: 'page_42',
      meta_instagram_user_id: 'ig_42',
    },
  })
  const publishedAdSet = adSetFixture({
    ...initialAdSet,
    meta_adset_id: 'meta-adset-1',
    meta_effective_status: 'ACTIVE',
  })

  artifactPreviewServiceMock.fetchAdSet
    .mockResolvedValueOnce(initialAdSet)
    .mockResolvedValueOnce(publishedAdSet)
  artifactPreviewServiceMock.fetchAdCampaign.mockResolvedValue(adCampaignFixture())
  artifactPreviewServiceMock.fetchMetaCustomAudiences.mockResolvedValue([])
  artifactPreviewServiceMock.getAdSetDeliveryEstimate.mockResolvedValue({
    estimate_mau_lower_bound: 0,
    estimate_mau_upper_bound: 0,
    estimate_dau: 0,
    estimate_ready: true,
    daily_outcomes_curve: [],
  })
  artifactPreviewServiceMock.searchMetaCountries.mockResolvedValue([])
  artifactPreviewServiceMock.searchMetaInterests.mockResolvedValue([])
  artifactPreviewServiceMock.searchMetaLocations.mockResolvedValue([])
  artifactPreviewServiceMock.setAdSetMetaStatus.mockResolvedValue({})
  artifactPreviewServiceMock.updateAdSet.mockImplementation(
    async (_id: string, patch: Partial<AdSet>) => adSetFixture(patch),
  )
}

describe('AdSetSettingsPanel publish modals', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    })
    setupPublishPanelMocks()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps review-to-publish modal flow and publish refetch behavior', async () => {
    const onUpdated = vi.fn()

    render(<AdSetSettingsPanel adSetId="ad-set-1" onUpdated={onUpdated} />)

    await screen.findByDisplayValue('Launch ad set')
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))

    expect(screen.getByTestId('meta-integrations-review-modal')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Continue to publish' }))

    expect(screen.queryByTestId('meta-integrations-review-modal')).toBeNull()
    expect(screen.getByTestId('meta-publish-modal')).toBeTruthy()
    expect(screen.getByTestId('publish-campaign-id').textContent).toBe('ad-campaign-1')
    expect(screen.getByTestId('publish-ad-account-id').textContent).toBe('act_42')
    expect(screen.getByTestId('publish-page-id').textContent).toBe('page_42')
    expect(screen.getByTestId('publish-instagram-id').textContent).toBe('ig_42')

    fireEvent.click(screen.getByRole('button', { name: 'Mark published' }))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.fetchAdSet).toHaveBeenCalledTimes(2)
      expect(artifactPreviewServiceMock.fetchAdSet).toHaveBeenLastCalledWith('ad-set-1')
      expect(onUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          meta_adset_id: 'meta-adset-1',
          meta_effective_status: 'ACTIVE',
        }),
      )
    })
  })
})
