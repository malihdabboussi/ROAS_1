import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  MetaIntegrationsReviewModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="meta-integrations-review-modal" /> : null,
}))

vi.mock('./MetaPublishModal', () => ({
  MetaPublishModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="meta-publish-modal" /> : null,
}))

describe('AdSetSettingsPanel layout modes', () => {
  beforeEach(() => {
    artifactPreviewServiceMock.fetchAdSet.mockResolvedValue(adSetFixture())
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
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps Spaces appearance shell and advanced toggle behavior', async () => {
    render(<AdSetSettingsPanel adSetId="ad-set-1" appearance="spaces" />)

    await screen.findByDisplayValue('Launch ad set')

    expect(screen.queryByText('AD SET SETTINGS')).toBeNull()
    expect(screen.getByRole('button', { name: /See advanced options/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /See advanced options/i }))

    expect(screen.getByRole('button', { name: /Simple mode/i })).toBeTruthy()
    expect(screen.getByText('Advanced')).toBeTruthy()
  })
})
