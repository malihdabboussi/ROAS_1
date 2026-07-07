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

function setupAdSetSettingsPanelMocks() {
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

describe('AdSetSettingsPanel', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    })
    setupAdSetSettingsPanelMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    vi.clearAllMocks()
  })

  it('renders a loading state while the ad set is fetched', () => {
    artifactPreviewServiceMock.fetchAdSet.mockReturnValue(new Promise(() => {}))

    render(<AdSetSettingsPanel adSetId="ad-set-1" />)

    expect(screen.getByText('Loading ad set...')).toBeTruthy()
  })

  it('shows published status controls and stays render-stable across rerenders', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const publishedAdSet = adSetFixture({
      source: 'meta',
      meta_adset_id: 'meta-adset-1',
      meta_effective_status: 'ACTIVE',
      metadata: { meta_published_at: '2026-06-20T10:00:00.000Z' },
      updated_at: '2026-06-20T11:00:00.000Z',
    })
    const pausedAdSet = adSetFixture({
      ...publishedAdSet,
      meta_effective_status: 'PAUSED',
    })
    const onUpdated = vi.fn()
    artifactPreviewServiceMock.fetchAdSet
      .mockResolvedValueOnce(publishedAdSet)
      .mockResolvedValueOnce(pausedAdSet)

    try {
      const { rerender } = render(
        <AdSetSettingsPanel
          adSetId="ad-set-1"
          onUpdated={onUpdated}
          headerTrailing={<span data-testid="header-trailing">Trailing</span>}
        />,
      )

      await screen.findByText('AD SET SETTINGS')
      rerender(
        <AdSetSettingsPanel
          adSetId="ad-set-1"
          onUpdated={onUpdated}
          headerTrailing={<span data-testid="header-trailing">Trailing</span>}
        />,
      )

      expect(screen.getByText('Synced from Meta · ID meta-adset-1')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()
      expect(screen.getByText('Running')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Republish' })).toBeTruthy()
      expect(screen.getByTestId('header-trailing')).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: 'Pause' }))

      await waitFor(() => {
        expect(artifactPreviewServiceMock.setAdSetMetaStatus).toHaveBeenCalledWith(
          'ad-set-1',
          'PAUSED',
        )
        expect(artifactPreviewServiceMock.fetchAdSet).toHaveBeenCalledWith('ad-set-1')
        expect(onUpdated).toHaveBeenCalledWith(
          expect.objectContaining({ meta_effective_status: 'PAUSED' }),
        )
        expect(screen.getByRole('button', { name: 'Activate' })).toBeTruthy()
        expect(screen.getByText('Paused')).toBeTruthy()
      })

      await waitFor(() => {
        const maxDepthErrors = consoleError.mock.calls.filter((call) =>
          call.some((part) => String(part).includes('Maximum update depth exceeded')),
        )
        expect(maxDepthErrors).toHaveLength(0)
      })
    } finally {
      consoleError.mockRestore()
    }
  })

  it('debounces name saves while syncing optimistic local edits', async () => {
    const onAdSetChange = vi.fn()
    const onUpdated = vi.fn()

    render(
      <AdSetSettingsPanel
        adSetId="ad-set-1"
        onAdSetChange={onAdSetChange}
        onUpdated={onUpdated}
      />,
    )

    const nameInput = (await screen.findByDisplayValue('Launch ad set')) as HTMLInputElement
    artifactPreviewServiceMock.updateAdSet.mockClear()

    vi.useFakeTimers()

    fireEvent.change(nameInput, { target: { value: 'Updated ad set' } })

    expect(nameInput.value).toBe('Updated ad set')
    expect(onAdSetChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated ad set' }))
    expect(artifactPreviewServiceMock.updateAdSet).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(799)
    })

    expect(artifactPreviewServiceMock.updateAdSet).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(artifactPreviewServiceMock.updateAdSet).toHaveBeenCalledWith('ad-set-1', {
      name: 'Updated ad set',
    })
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated ad set' }))
  })

  it('loads campaign schedule and Meta audiences for ad set settings', async () => {
    artifactPreviewServiceMock.fetchAdSet.mockResolvedValue(
      adSetFixture({
        daily_budget: null,
        lifetime_budget: 123400,
        targeting: {
          geo_locations: { countries: [] },
          publisher_platforms: ['facebook', 'instagram'],
          facebook_positions: ['feed'],
          instagram_positions: ['feed'],
          targeting_automation: { advantage_audience: 0 },
          custom_audiences: [],
          excluded_custom_audiences: [],
        },
      }),
    )
    artifactPreviewServiceMock.fetchAdCampaign.mockResolvedValue(
      adCampaignFixture({
        budget_type: 'ABO',
        schedule_type: 'one_time',
        meta_ad_account_id: 'act_42',
      }),
    )
    artifactPreviewServiceMock.fetchMetaCustomAudiences.mockResolvedValue([
      {
        id: 'audience-1',
        name: 'Founders',
        subtype: 'CUSTOM',
        approximate_count: 1200,
      },
    ])

    render(<AdSetSettingsPanel adSetId="ad-set-1" />)

    await screen.findByDisplayValue('Launch ad set')

    await waitFor(() => {
      expect(artifactPreviewServiceMock.fetchAdCampaign).toHaveBeenCalledWith('ad-campaign-1')
      expect(artifactPreviewServiceMock.fetchMetaCustomAudiences).toHaveBeenCalledWith('act_42')
    })

    expect(screen.getByDisplayValue('1234.00')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /See advanced options/i }))
    fireEvent.click(await screen.findByRole('button', { name: /\+ Include Audience/i }))

    expect(await screen.findByText('Founders')).toBeTruthy()
  })

  it('debounces country search and renders Meta country results', async () => {
    artifactPreviewServiceMock.searchMetaCountries.mockResolvedValue([
      { key: 'FR', name: 'France' },
    ])

    render(<AdSetSettingsPanel adSetId="ad-set-1" />)

    await screen.findByDisplayValue('Launch ad set')
    fireEvent.click(screen.getByRole('button', { name: /See advanced options/i }))

    const countrySearchInput = await screen.findByPlaceholderText('Search countries...')

    vi.useFakeTimers()

    fireEvent.change(countrySearchInput, { target: { value: 'France' } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(399)
    })

    expect(artifactPreviewServiceMock.searchMetaCountries).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(artifactPreviewServiceMock.searchMetaCountries).toHaveBeenCalledWith('France')
    expect(screen.getByText('France')).toBeTruthy()
    expect(screen.getByText('FR')).toBeTruthy()
  })

  it('debounces location search and renders Meta location results', async () => {
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
    const locationSearchInput = await screen.findByPlaceholderText(
      'Search cities, regions, zip codes...',
    )

    vi.useFakeTimers()

    fireEvent.change(locationSearchInput, { target: { value: 'Paris' } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(399)
    })

    expect(artifactPreviewServiceMock.searchMetaLocations).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(artifactPreviewServiceMock.searchMetaLocations).toHaveBeenCalledWith('Paris')
    expect(screen.getByText('Paris')).toBeTruthy()
    expect(screen.getByText('City · Ile-de-France · France')).toBeTruthy()
  })

  it('keeps advanced location search debounced after opening advanced options', async () => {
    artifactPreviewServiceMock.searchMetaLocations.mockResolvedValue([
      {
        key: 'city-2',
        name: 'Lyon',
        type: 'city',
        country_code: 'FR',
        country_name: 'France',
        region: 'Auvergne-Rhone-Alpes',
      },
    ])

    render(<AdSetSettingsPanel adSetId="ad-set-1" />)

    await screen.findByDisplayValue('Launch ad set')
    fireEvent.click(screen.getByRole('button', { name: /See advanced options/i }))

    const locationSearchInput = await screen.findByPlaceholderText(
      'Search cities, regions, zip codes...',
    )

    vi.useFakeTimers()

    fireEvent.change(locationSearchInput, { target: { value: 'Lyon' } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(399)
    })

    expect(artifactPreviewServiceMock.searchMetaLocations).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(artifactPreviewServiceMock.searchMetaLocations).toHaveBeenCalledWith('Lyon')
    expect(screen.getByText('Lyon')).toBeTruthy()
    expect(screen.getByText('City · Auvergne-Rhone-Alpes · France')).toBeTruthy()
  })

  it('debounces interest search and renders Meta interest results', async () => {
    artifactPreviewServiceMock.fetchAdSet.mockResolvedValue(
      adSetFixture({
        targeting: {
          geo_locations: { countries: [] },
          publisher_platforms: ['facebook', 'instagram'],
          facebook_positions: ['feed'],
          instagram_positions: ['feed'],
          targeting_automation: { advantage_audience: 0 },
          interests: [],
        },
      }),
    )
    artifactPreviewServiceMock.searchMetaInterests.mockResolvedValue([
      {
        id: 'interest-1',
        name: 'Entrepreneurship',
        audience_size_lower_bound: 1000,
        audience_size_upper_bound: 2500,
      },
    ])

    render(<AdSetSettingsPanel adSetId="ad-set-1" />)

    await screen.findByDisplayValue('Launch ad set')
    fireEvent.click(screen.getByRole('button', { name: /See advanced options/i }))

    const interestSearchInput = await screen.findByPlaceholderText(
      'Search interests (e.g. Entrepreneurship, Fitness...)',
    )

    vi.useFakeTimers()

    fireEvent.change(interestSearchInput, { target: { value: 'Entrepreneurship' } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(399)
    })

    expect(artifactPreviewServiceMock.searchMetaInterests).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(artifactPreviewServiceMock.searchMetaInterests).toHaveBeenCalledWith('Entrepreneurship')
    expect(screen.getByText('Entrepreneurship')).toBeTruthy()
  })
})
