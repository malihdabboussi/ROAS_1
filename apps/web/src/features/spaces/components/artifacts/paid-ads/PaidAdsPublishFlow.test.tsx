import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PaidAdsPublishFlow } from './PaidAdsPublishFlow'
import { PAID_ADS_META_STATUS_REFRESHED_EVENT } from './use-paid-ads-data'

const paidAdsApiMocks = vi.hoisted(() => ({
  fetchAdCampaign: vi.fn(),
  fetchCampaignAdCampaigns: vi.fn(),
}))

const campaignServiceMocks = vi.hoisted(() => ({
  fetchCampaign: vi.fn(),
}))

vi.mock('@/lib/artifacts/paid-ads-api', () => paidAdsApiMocks)
vi.mock('@/lib/campaigns', () => campaignServiceMocks)

vi.mock('@/components/artifacts/paid-ads/MetaIntegrationsReviewModalAdapter', () => ({
  MetaIntegrationsReviewModal: ({
    open,
    onClose,
    onContinueToPublish,
    platformCampaignId,
    adCampaignOptions,
    launchBeforeReview,
  }: {
    open: boolean
    onClose: () => void
    onContinueToPublish: (id?: string) => void
    platformCampaignId?: string | null
    adCampaignOptions?: Array<{ id: string; name: string }>
    launchBeforeReview?: boolean
  }) =>
    open ? (
      <section
        data-testid="meta-review-modal"
        data-platform-campaign-id={platformCampaignId ?? ''}
        data-launch-before-review={launchBeforeReview ? 'true' : 'false'}
      >
        <button type="button" onClick={onClose}>
          Close review
        </button>
        <button type="button" onClick={() => onContinueToPublish(adCampaignOptions?.[0]?.id)}>
          Continue first campaign
        </button>
        {adCampaignOptions?.map((option) => (
          <span key={option.id}>{option.name}</span>
        ))}
      </section>
    ) : null,
}))

vi.mock('@/components/artifacts/paid-ads/MetaPublishModalAdapter', () => ({
  MetaPublishModal: ({
    open,
    adCampaignId,
    defaultAdAccountId,
    defaultPageId,
    defaultInstagramUserId,
    platformCampaignId,
    onClose,
    onPublished,
  }: {
    open: boolean
    adCampaignId: string
    defaultAdAccountId?: string | null
    defaultPageId?: string | null
    defaultInstagramUserId?: string | null
    platformCampaignId?: string | null
    onClose: () => void
    onPublished?: () => void
  }) =>
    open ? (
      <section
        data-testid="meta-publish-modal"
        data-ad-campaign-id={adCampaignId}
        data-default-ad-account-id={defaultAdAccountId ?? ''}
        data-default-page-id={defaultPageId ?? ''}
        data-default-instagram-user-id={defaultInstagramUserId ?? ''}
        data-platform-campaign-id={platformCampaignId ?? ''}
      >
        <button type="button" onClick={onClose}>
          Close publish
        </button>
        <button type="button" onClick={onPublished}>
          Mark published
        </button>
      </section>
    ) : null,
}))

describe('PaidAdsPublishFlow', () => {
  beforeEach(() => {
    paidAdsApiMocks.fetchCampaignAdCampaigns.mockResolvedValue([
      { id: 'ad-campaign-1', name: ' Launch Campaign ' },
      { id: 'ad-campaign-2', name: '' },
    ])
    paidAdsApiMocks.fetchAdCampaign.mockResolvedValue({
      id: 'ad-campaign-1',
      meta_ad_account_id: null,
      meta_page_id: 'page-from-ad-campaign',
      metadata: {},
    })
    campaignServiceMocks.fetchCampaign.mockResolvedValue({
      id: 'platform-campaign-1',
      config: {
        meta_defaults: {
          meta_ad_account_id: 'default-account',
          meta_page_id: 'default-page',
          meta_instagram_user_id: 'default-ig',
          meta_pixel_id: 'default-pixel',
        },
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads campaign options and opens publish with ad-campaign defaults', async () => {
    const onReviewClose = vi.fn()
    const publishedListener = vi.fn()
    window.addEventListener(PAID_ADS_META_STATUS_REFRESHED_EVENT, publishedListener)

    render(
      <PaidAdsPublishFlow
        platformCampaignId="platform-campaign-1"
        reviewOpen
        onReviewClose={onReviewClose}
      />,
    )

    expect(await screen.findByText('Launch Campaign')).toBeInTheDocument()
    expect(screen.getByText('Untitled Campaign')).toBeInTheDocument()
    expect(paidAdsApiMocks.fetchCampaignAdCampaigns).toHaveBeenCalledWith('platform-campaign-1')

    fireEvent.click(screen.getByRole('button', { name: 'Continue first campaign' }))

    await waitFor(() => {
      expect(onReviewClose).toHaveBeenCalledTimes(1)
    })

    const publishModal = await screen.findByTestId('meta-publish-modal')
    expect(publishModal).toHaveAttribute('data-ad-campaign-id', 'ad-campaign-1')
    expect(publishModal).toHaveAttribute('data-default-ad-account-id', 'default-account')
    expect(publishModal).toHaveAttribute('data-default-page-id', 'page-from-ad-campaign')
    expect(publishModal).toHaveAttribute('data-default-instagram-user-id', 'default-ig')
    expect(publishModal).toHaveAttribute('data-platform-campaign-id', 'platform-campaign-1')

    fireEvent.click(screen.getByRole('button', { name: 'Mark published' }))

    expect(publishedListener).toHaveBeenCalledTimes(1)
    const event = publishedListener.mock.calls[0]?.[0] as CustomEvent<{ campaignId: string }>
    expect(event.detail).toEqual({ campaignId: 'platform-campaign-1' })

    fireEvent.click(screen.getByRole('button', { name: 'Close publish' }))
    expect(screen.queryByTestId('meta-publish-modal')).not.toBeInTheDocument()

    window.removeEventListener(PAID_ADS_META_STATUS_REFRESHED_EVENT, publishedListener)
  })

  it('settles across review open changes without a render loop', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onReviewClose = vi.fn()
    const { rerender } = render(
      <PaidAdsPublishFlow
        platformCampaignId="platform-campaign-1"
        reviewOpen
        onReviewClose={onReviewClose}
      />,
    )

    expect(await screen.findByTestId('meta-review-modal')).toBeInTheDocument()

    rerender(
      <PaidAdsPublishFlow
        platformCampaignId="platform-campaign-1"
        reviewOpen={false}
        onReviewClose={onReviewClose}
      />,
    )

    expect(screen.queryByTestId('meta-review-modal')).not.toBeInTheDocument()
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('Maximum update depth exceeded'),
    )
    consoleError.mockRestore()
  })
})
