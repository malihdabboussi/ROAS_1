import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function setupTargetingPanelMocks() {
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
}

describe('AdSetSettingsPanel geo targeting mutations', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    })
    setupTargetingPanelMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps country toggle and location add persistence behavior', async () => {
    artifactPreviewServiceMock.searchMetaLocations.mockResolvedValue([
      {
        key: 'city-1',
        name: 'Paris',
        type: 'city',
        country_code: 'FR',
        country_name: 'France',
        region: 'Ile-de-France',
      },
    ])

    render(<AdSetSettingsPanel adSetId="ad-set-1" />)

    await screen.findByDisplayValue('Launch ad set')
    fireEvent.click(screen.getByRole('button', { name: 'United States' }))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAdSet).toHaveBeenCalledWith('ad-set-1', {
        targeting: expect.objectContaining({
          geo_locations: expect.objectContaining({ countries: ['US'] }),
        }),
      })
    })

    artifactPreviewServiceMock.updateAdSet.mockClear()
    vi.useFakeTimers()

    const locationSearchInput = screen.getByPlaceholderText(
      'Search cities, regions, zip codes...',
    )
    fireEvent.change(locationSearchInput, { target: { value: 'Paris' } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(artifactPreviewServiceMock.searchMetaLocations).toHaveBeenCalledWith('Paris')
    expect(screen.getByText('Paris')).toBeTruthy()

    vi.useRealTimers()

    fireEvent.click(screen.getByRole('button', { name: /Paris/ }))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAdSet).toHaveBeenCalledWith('ad-set-1', {
        targeting: expect.objectContaining({
          geo_locations: expect.objectContaining({
            countries: ['US'],
            cities: expect.arrayContaining([
              expect.objectContaining({
                key: 'city-1',
                name: 'Paris',
                radius: 25,
                distance_unit: 'mile',
                region: 'Ile-de-France',
                country_name: 'France',
              }),
            ]),
          }),
        }),
      })
    })
  })
})
