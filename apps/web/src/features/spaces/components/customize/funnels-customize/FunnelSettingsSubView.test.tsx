import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FunnelSettingsSubView } from './FunnelSettingsSubView'

const mocks = vi.hoisted(() => ({
  getStatus: vi.fn(),
  fetchCampaignFunnels: vi.fn(),
  openWorkspaceSettings: vi.fn(),
  useFunnelSettings: vi.fn(),
}))

vi.mock('@/lib/settings/workspace-settings-modal-context', () => ({
  useWorkspaceSettingsModal: () => ({ openWorkspaceSettings: mocks.openWorkspaceSettings }),
}))

vi.mock('@/lib/billing/billing-api', () => ({
  billingApi: { getStatus: mocks.getStatus },
}))

vi.mock('@/lib/artifacts/funnel-preview-api', () => ({
  fetchCampaignFunnels: mocks.fetchCampaignFunnels,
}))

vi.mock('@/components/domains/AddCustomDomainDialog', () => ({
  AddCustomDomainDialog: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="add-domain-dialog">{isOpen ? 'open' : 'closed'}</div>
  ),
}))

vi.mock('@/components/domains/CustomDomainDnsDialog', () => ({
  CustomDomainDnsDialog: () => <div data-testid="dns-dialog" />,
}))

vi.mock('@/components/funnels/funnel-settings', () => ({
  useFunnelSettings: (params: unknown) => mocks.useFunnelSettings(params),
  FunnelHideBrandingSection: ({ funnel, isFreeUser }: any) => (
    <div data-testid="hide-branding-section">
      {funnel.name}:{isFreeUser ? 'free' : 'paid'}
    </div>
  ),
  FunnelMetaPixelToggleSection: () => <div data-testid="pixel-toggle-section" />,
  FunnelConversionTagsDropdownSection: () => <div data-testid="tags-section" />,
  FunnelCustomDomainSection: ({ onOpenDomainsWorkspace, onOpenAddDomain }: any) => (
    <div data-testid="domain-section">
      <button type="button" onClick={onOpenDomainsWorkspace}>
        Domains workspace
      </button>
      <button type="button" onClick={onOpenAddDomain}>
        Add domain
      </button>
    </div>
  ),
  FunnelConversionSequenceSection: () => <div data-testid="sequence-section" />,
  FunnelMetaPixelSection: () => <div data-testid="pixel-section" />,
  FunnelMetaEventsToggleRow: () => <div data-testid="events-toggle-section" />,
  FunnelMetaEventsPerPageSection: () => <div data-testid="events-per-page-section" />,
}))

const funnel = {
  id: 'funnel-1',
  campaign_id: 'campaign-1',
  name: 'Launch Funnel',
  slug: 'launch-funnel',
  funnel_type: 'lead_magnet',
  status: 'draft',
  hide_branding: false,
  metadata: null,
  domain_id: null,
  published_url: null,
  created_at: '2026-06-22T00:00:00Z',
  updated_at: '2026-06-22T00:00:00Z',
}

function mockSettings(params: any) {
  return {
    funnel: params.funnel,
    isFreeUser: params.isFreeUser,
    savingFunnelIds: new Set<string>(),
    metaPixelEnabled: false,
    domains: [],
    domainsLoading: false,
    selectedDomainId: '',
    setSelectedDomainId: vi.fn(),
    domainActionLoading: false,
    handleConnectFunnelDomain: vi.fn(),
    handleDisconnectFunnelDomain: vi.fn(),
    sequences: [],
    funnelSequenceEdges: [],
    sequenceEdgeLoading: false,
    sequenceEdgeSaving: false,
    handleConnectFunnelSequence: vi.fn(),
    handleDisconnectFunnelSequence: vi.fn(),
    setDomains: vi.fn(),
    handleToggleFunnelBranding: vi.fn(),
    handleToggleMetaPixelEnabled: vi.fn(),
  }
}

describe('FunnelSettingsSubView', () => {
  beforeEach(() => {
    mocks.getStatus.mockResolvedValue({ plan: { slug: 'pro' } })
    mocks.fetchCampaignFunnels.mockResolvedValue([funnel])
    mocks.useFunnelSettings.mockImplementation(mockSettings)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads the selected funnel and wires paid billing state into funnel settings', async () => {
    const onBack = vi.fn()
    const onClose = vi.fn()

    render(
      <FunnelSettingsSubView
        campaignId="campaign-1"
        funnelId="funnel-1"
        onBack={onBack}
        onClose={onClose}
      />,
    )

    expect(screen.getByText('Loading…')).toBeTruthy()

    await waitFor(() => expect(screen.getByText('Launch Funnel')).toBeTruthy())

    expect(mocks.getStatus).toHaveBeenCalledTimes(1)
    expect(mocks.fetchCampaignFunnels).toHaveBeenCalledWith('campaign-1')
    expect(mocks.useFunnelSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: 'campaign-1',
        funnel: expect.objectContaining({ id: 'funnel-1' }),
        isFreeUser: false,
      }),
    )
    expect(screen.getByTestId('hide-branding-section').textContent).toContain('paid')

    fireEvent.click(screen.getByRole('button', { name: 'Domains workspace' }))
    expect(mocks.openWorkspaceSettings).toHaveBeenCalledWith('domains')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
