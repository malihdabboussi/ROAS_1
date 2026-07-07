import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdSettingsPanel } from './AdSettingsPanel'
import { adFixture, setupAdSettingsPanelMocks } from './AdSettingsPanel.test-helpers'

const artifactPreviewServiceMock = vi.hoisted(() => ({
  fetchAd: vi.fn(),
  fetchAdCampaign: vi.fn(),
  fetchAdSet: vi.fn(),
  fetchMetaInstagramAccountsForPage: vi.fn(),
  fetchMetaPage: vi.fn(),
  fetchMetaPages: vi.fn(),
  refreshAdMetaStatus: vi.fn(),
  setAdMetaStatus: vi.fn(),
  updateAd: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}))

vi.mock('@/components/media/MediaPickerModal', () => ({
  MediaPickerModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="media-picker-modal" /> : null,
}))

vi.mock('@/lib/hooks/use-presigned-upload', () => ({
  usePresignedUpload: () => ({
    upload: vi.fn(),
  }),
}))

vi.mock('@/lib/services/google-drive-api', () => ({
  getDriveFile: vi.fn(),
}))

vi.mock('../../services/artifact-preview.service', () => artifactPreviewServiceMock)

vi.mock('./AdConceptWorkflowPanel', () => ({
  AdConceptWorkflowPanel: () => <div data-testid="ad-concept-workflow-panel" />,
}))

vi.mock('./MetaIntegrationsReviewModal', () => ({
  MetaIntegrationsReviewModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="meta-integrations-review-modal" /> : null,
}))

vi.mock('./MetaPublishModal', () => ({
  MetaPublishModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="meta-publish-modal" /> : null,
}))

describe('AdSettingsPanel metadata setup', () => {
  beforeEach(() => {
    setupAdSettingsPanelMocks(artifactPreviewServiceMock)
    artifactPreviewServiceMock.fetchAdSet.mockResolvedValue({
      id: 'ad-set-1',
      ad_campaign_id: 'ad-campaign-1',
    })
    artifactPreviewServiceMock.fetchAdCampaign.mockResolvedValue({
      id: 'ad-campaign-1',
      meta_page_id: 'campaign-page-1',
    })
    artifactPreviewServiceMock.fetchMetaPage.mockResolvedValue({
      id: 'campaign-page-1',
      name: 'Campaign Page',
      picture_url: null,
    })
    artifactPreviewServiceMock.fetchMetaPages.mockResolvedValue([
      { id: 'page-1', name: 'Brand Page' },
      { id: 'page-2', name: 'Backup Page' },
    ])
    artifactPreviewServiceMock.fetchMetaInstagramAccountsForPage.mockResolvedValue([
      { id: 'ig-1', username: 'brand_ig' },
    ])
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads campaign default identity and saves advanced metadata selections', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const initialAd = adFixture({
      ad_set_id: 'ad-set-1',
      metadata: {
        ad_setup_type: 'use_existing_post',
        existing_post_id: 'post-1',
      },
    })

    const { rerender } = render(<AdSettingsPanel adId="ad-1" initialAd={initialAd} />)
    rerender(<AdSettingsPanel adId="ad-1" initialAd={{ ...initialAd }} />)
    fireEvent.click(screen.getByRole('button', { name: /enter advanced mode/i }))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.fetchAdSet).toHaveBeenCalledWith('ad-set-1')
      expect(artifactPreviewServiceMock.fetchAdCampaign).toHaveBeenCalledWith('ad-campaign-1')
      expect(artifactPreviewServiceMock.fetchMetaPage).toHaveBeenCalledWith('campaign-page-1')
      expect(screen.getByRole('button', { name: /Campaign default \(Campaign Page\)/ })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'brand_ig' })).toBeTruthy()
      expect(screen.getByDisplayValue('post-1')).toBeTruthy()
    })

    artifactPreviewServiceMock.updateAd.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /Campaign default \(Campaign Page\)/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Brand Page' }))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAd).toHaveBeenCalledWith('ad-1', {
        metadata: {
          ad_setup_type: 'use_existing_post',
          existing_post_id: 'post-1',
          meta_page_id: 'page-1',
        },
      })
    })

    artifactPreviewServiceMock.updateAd.mockClear()
    fireEvent.click(screen.getByText('Create ad'))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAd).toHaveBeenCalledWith('ad-1', {
        metadata: expect.objectContaining({
          ad_setup_type: 'create_ad',
          existing_post_id: null,
        }),
      })
    })

    await waitFor(() => {
      const maxDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth exceeded')),
      )
      expect(maxDepthErrors).toHaveLength(0)
    })
    consoleError.mockRestore()
  })
})
