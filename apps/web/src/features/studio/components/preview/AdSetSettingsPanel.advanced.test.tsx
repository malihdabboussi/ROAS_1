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

function setupAdvancedPanelMocks() {
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

describe('AdSetSettingsPanel advanced targeting fields', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    })
    setupAdvancedPanelMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps optimization, billing, age, and AI Recommended persistence behavior', async () => {
    render(<AdSetSettingsPanel adSetId="ad-set-1" />)

    await screen.findByDisplayValue('Launch ad set')
    fireEvent.click(screen.getByRole('button', { name: /See advanced options/i }))

    expect(screen.getByText('Optimization Goal')).toBeTruthy()
    expect(screen.getByText('Link Clicks')).toBeTruthy()
    expect(screen.getByText('Billing Event')).toBeTruthy()
    expect(screen.getByText('Impressions')).toBeTruthy()
    expect(screen.getByText('AI Recommended')).toBeTruthy()
    expect(screen.getByText('(Recommended: ON)')).toBeTruthy()

    const ageMinInput = screen.getByPlaceholderText('18') as HTMLInputElement
    const ageMaxInput = screen.getByPlaceholderText('65') as HTMLInputElement

    expect(ageMinInput.value).toBe('18')
    expect(ageMaxInput.value).toBe('65')
    expect(ageMinInput.disabled).toBe(true)
    expect(ageMaxInput.disabled).toBe(true)
    expect(screen.getByText(/age is a suggestion/i)).toBeTruthy()

    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[0]!)

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAdSet).toHaveBeenCalledWith('ad-set-1', {
        targeting: expect.objectContaining({
          targeting_automation: expect.objectContaining({ advantage_audience: 0 }),
        }),
      })
      expect(screen.getByText('Enable to let AI find better-performing audiences')).toBeTruthy()
    })

    artifactPreviewServiceMock.updateAdSet.mockClear()
    vi.useFakeTimers()

    fireEvent.change(ageMinInput, { target: { value: '25' } })

    expect(ageMinInput.value).toBe('25')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })

    expect(artifactPreviewServiceMock.updateAdSet).toHaveBeenCalledWith('ad-set-1', {
      targeting: expect.objectContaining({ age_min: 25 }),
    })
  })
})
