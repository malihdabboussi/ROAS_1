import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdsSettingsSection } from './ads-settings-section'

vi.mock('./ads-default-meta-assets-section', () => ({
  AdsDefaultMetaAssetsSection: () => <div data-testid="ads-default-assets" />,
}))

vi.mock('./ads-campaign-overrides-section', () => ({
  AdsCampaignOverridesSection: () => <div data-testid="ads-campaign-overrides" />,
}))

afterEach(cleanup)

function renderSection(
  overrides: Partial<Parameters<typeof AdsSettingsSection>[0]> = {},
) {
  const props: Parameters<typeof AdsSettingsSection>[0] = {
    metaConnected: true,
    metaConnectionCard: null,
    campaignId: 'campaign-1',
    campaignConfig: {},
    setCampaignConfig: vi.fn(),
    adCampaigns: [],
    setAdCampaigns: vi.fn(),
    metaAdAccounts: [],
    metaPages: [],
    metaInstagramAccountsByCampaign: {},
    setMetaInstagramAccountsByCampaign: vi.fn(),
    metaPixelsByAccount: {},
    setMetaPixelsByAccount: vi.fn(),
    adsSaving: {},
    setAdsSaving: vi.fn(),
    setCreatePixelForAccountId: vi.fn(),
    setCreatePixelForCampaignId: vi.fn(),
    ...overrides,
  }

  return { ...render(<AdsSettingsSection {...props} />), props }
}

describe('AdsSettingsSection', () => {
  it('renders the provided Meta connection card when Meta is disconnected', () => {
    renderSection({
      metaConnected: false,
      metaConnectionCard: <button type="button">Connect Meta</button>,
    })

    expect(screen.getByRole('button', { name: 'Connect Meta' })).toBeTruthy()
    expect(screen.queryByTestId('ads-default-assets')).toBeNull()
  })

  it('renders the unavailable fallback when Meta is disconnected without an integration card', () => {
    renderSection({ metaConnected: false, metaConnectionCard: null })

    expect(screen.getByText('Meta integration unavailable.')).toBeTruthy()
    expect(screen.queryByTestId('ads-campaign-overrides')).toBeNull()
  })

  it('renders connected copy and both asset sections when Meta is connected', () => {
    renderSection({ metaConnected: true })

    expect(
      screen.getByText(
        'Configure your default Meta assets. Ad campaigns will inherit these unless overridden.',
      ),
    ).toBeTruthy()
    expect(screen.getByTestId('ads-default-assets')).toBeTruthy()
    expect(screen.getByTestId('ads-campaign-overrides')).toBeTruthy()
  })
})
