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
  MetaIntegrationsReviewModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="meta-integrations-review-modal" /> : null,
}))

vi.mock('./MetaPublishModal', () => ({
  MetaPublishModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="meta-publish-modal" /> : null,
}))

function setupPlacementPanelMocks() {
  artifactPreviewServiceMock.fetchAdSet.mockResolvedValue(adSetFixture())
  artifactPreviewServiceMock.fetchAdCampaign.mockResolvedValue(adCampaignFixture())
  artifactPreviewServiceMock.fetchMetaCustomAudiences.mockResolvedValue([])
  artifactPreviewServiceMock.getAdSetDeliveryEstimate.mockResolvedValue({
    estimate_mau_lower_bound: 2000,
    estimate_mau_upper_bound: 9000,
    estimate_dau: 450,
    estimate_ready: true,
    daily_outcomes_curve: [{ spend: 5000, reach: 400, actions: 12 }],
  })
  artifactPreviewServiceMock.searchMetaCountries.mockResolvedValue([])
  artifactPreviewServiceMock.searchMetaInterests.mockResolvedValue([])
  artifactPreviewServiceMock.searchMetaLocations.mockResolvedValue([])
  artifactPreviewServiceMock.setAdSetMetaStatus.mockResolvedValue({})
  artifactPreviewServiceMock.updateAdSet.mockImplementation(
    async (_id: string, patch: Partial<AdSet>) => adSetFixture(patch),
  )
}

function getPlacementGroupRow(label: string): HTMLElement {
  const labelNode = screen.getByText(label)
  const row = labelNode.closest('div')?.parentElement
  if (!row) throw new Error(`Could not find placement group row for ${label}`)
  return row
}

function clickPlacementGroupExpander(label: string) {
  const row = getPlacementGroupRow(label)
  const expander = row.querySelectorAll('button')[0]
  if (!expander) throw new Error(`Could not find placement group expander for ${label}`)
  fireEvent.click(expander)
}

function clickPlacementGroupToggle(label: string) {
  const row = getPlacementGroupRow(label)
  const groupToggle = row.querySelectorAll('button')[1]
  if (!groupToggle) throw new Error(`Could not find placement group toggle for ${label}`)
  fireEvent.click(groupToggle)
}

describe('AdSetSettingsPanel placement and predictions fields', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    })
    setupPlacementPanelMocks()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps manual placement toggle and prediction loading behavior', async () => {
    render(<AdSetSettingsPanel adSetId="ad-set-1" />)

    await screen.findByDisplayValue('Launch ad set')
    fireEvent.click(screen.getByRole('button', { name: /See advanced options/i }))

    expect(screen.getByText('Advantage+ Placements')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Load Predictions' })).toBeTruthy()

    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[1]!)

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAdSet).toHaveBeenCalledWith('ad-set-1', {
        targeting: expect.objectContaining({ manual_placements: true }),
      })
      expect(screen.getByText('Feeds')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Load Predictions' }))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.getAdSetDeliveryEstimate).toHaveBeenCalledWith('ad-set-1')
      expect(screen.getByText('Estimated Reach')).toBeTruthy()
      expect(screen.getByText('2K - 9K')).toBeTruthy()
      expect(screen.getByText('$50/day')).toBeTruthy()
      expect(screen.getByText('400 reach')).toBeTruthy()
      expect(screen.getByText('12 actions')).toBeTruthy()
    })
  })

  it('keeps automatic prediction loading and connection error normalization', async () => {
    artifactPreviewServiceMock.fetchAdSet.mockResolvedValue(
      adSetFixture({
        targeting: {
          geo_locations: { countries: ['US'] },
          publisher_platforms: ['facebook', 'instagram'],
          facebook_positions: ['feed'],
          instagram_positions: ['feed'],
          targeting_automation: { advantage_audience: 1 },
        },
      }),
    )
    artifactPreviewServiceMock.getAdSetDeliveryEstimate.mockRejectedValue(
      new Error('No Meta ad account found'),
    )

    render(<AdSetSettingsPanel adSetId="ad-set-1" />)

    await screen.findByDisplayValue('Launch ad set')

    await waitFor(() => {
      expect(artifactPreviewServiceMock.getAdSetDeliveryEstimate).toHaveBeenCalledWith('ad-set-1')
    })

    fireEvent.click(screen.getByRole('button', { name: /See advanced options/i }))

    expect(await screen.findByText('Not Connected')).toBeTruthy()
  })

  it('keeps individual placement and placement group persistence behavior', async () => {
    artifactPreviewServiceMock.fetchAdSet.mockResolvedValue(
      adSetFixture({
        targeting: {
          geo_locations: { countries: [] },
          manual_placements: true,
          publisher_platforms: ['facebook', 'instagram'],
          facebook_positions: ['feed'],
          instagram_positions: ['feed'],
          targeting_automation: { advantage_audience: 1 },
        },
      }),
    )

    render(<AdSetSettingsPanel adSetId="ad-set-1" />)

    await screen.findByDisplayValue('Launch ad set')
    fireEvent.click(screen.getByRole('button', { name: /See advanced options/i }))

    clickPlacementGroupExpander('Feeds')
    artifactPreviewServiceMock.updateAdSet.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Facebook Marketplace' }))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAdSet).toHaveBeenCalledWith('ad-set-1', {
        targeting: expect.objectContaining({
          facebook_positions: expect.arrayContaining(['feed', 'marketplace']),
          publisher_platforms: expect.arrayContaining(['facebook', 'instagram']),
        }),
      })
    })

    artifactPreviewServiceMock.updateAdSet.mockClear()
    clickPlacementGroupToggle('Stories, Status, Reels')

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAdSet).toHaveBeenCalledWith('ad-set-1', {
        targeting: expect.objectContaining({
          facebook_positions: expect.arrayContaining(['story', 'reels']),
          instagram_positions: expect.arrayContaining(['story', 'reels', 'profile_reels']),
          publisher_platforms: expect.arrayContaining(['facebook', 'instagram']),
        }),
      })
    })
  })
})
