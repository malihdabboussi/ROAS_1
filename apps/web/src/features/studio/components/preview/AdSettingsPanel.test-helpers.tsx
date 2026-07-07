import type { Mock } from 'vitest'
import type { Ad } from '@/features/studio/types'

interface ArtifactPreviewServiceMock {
  fetchAd: Mock
  fetchAdCampaign: Mock
  fetchAdSet: Mock
  fetchMetaInstagramAccountsForPage: Mock
  fetchMetaPage: Mock
  fetchMetaPages: Mock
  refreshAdMetaStatus: Mock
  setAdMetaStatus: Mock
  updateAd: Mock
}

export function adFixture(overrides: Partial<Ad> = {}): Ad {
  return {
    id: 'ad-1',
    user_id: 'user-1',
    campaign_id: 'campaign-1',
    space_id: null,
    ad_set_id: null,
    theme_id: null,
    platform: 'meta',
    placement: 'feed',
    primary_text: 'Primary ad text',
    headline: 'Launch offer (Copy)',
    description: null,
    cta_type: 'LEARN_MORE',
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
    meta_ad_id: null,
    meta_effective_status: null,
    source: 'vibey',
    tracking_url: null,
    metadata: {},
    created_at: '2026-06-20T10:00:00.000Z',
    updated_at: '2026-06-20T10:00:00.000Z',
    ...overrides,
  }
}

export function setupAdSettingsPanelMocks(artifactPreviewServiceMock: ArtifactPreviewServiceMock) {
  artifactPreviewServiceMock.fetchMetaPages.mockResolvedValue([])
  artifactPreviewServiceMock.fetchMetaInstagramAccountsForPage.mockResolvedValue([])
  artifactPreviewServiceMock.fetchAd.mockResolvedValue(adFixture())
  artifactPreviewServiceMock.fetchAdSet.mockResolvedValue({
    id: 'ad-set-1',
    ad_campaign_id: 'ad-campaign-1',
  })
  artifactPreviewServiceMock.fetchAdCampaign.mockResolvedValue({
    id: 'ad-campaign-1',
    meta_page_id: null,
  })
  artifactPreviewServiceMock.fetchMetaPage.mockResolvedValue(null)
  artifactPreviewServiceMock.refreshAdMetaStatus.mockResolvedValue({})
  artifactPreviewServiceMock.setAdMetaStatus.mockResolvedValue({})
  artifactPreviewServiceMock.updateAd.mockImplementation(async (_id: string, patch: Partial<Ad>) =>
    adFixture(patch),
  )
}
