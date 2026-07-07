import { createRef, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SettingsTabContent,
  type SettingsTabContentProps,
} from './settings-tab-content'

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text, state }: { text: string; state?: string }) => (
    <div data-testid="loading-orb" data-state={state ?? ''}>
      {text}
    </div>
  ),
}))

vi.mock('../../settings', () => ({
  ThemeSettings: ({ value }: { value?: string | null }) => (
    <div data-testid="theme-settings" data-theme-id={value ?? ''} />
  ),
}))

vi.mock('./agent-settings-section', () => ({
  AgentSettingsSection: ({
    campaignId,
    mediaGenerationEnabled,
    modelStrategies,
  }: {
    campaignId: string
    mediaGenerationEnabled: boolean
    modelStrategies: ReadonlyArray<unknown>
  }) => (
    <div
      data-testid="agent-section"
      data-campaign-id={campaignId}
      data-media-enabled={String(mediaGenerationEnabled)}
      data-model-strategies={String(modelStrategies.length)}
    />
  ),
}))

vi.mock('./funnel-settings-section', () => ({
  FunnelSettingsSection: ({ campaignId, funnels }: { campaignId: string; funnels: unknown[] }) => (
    <div
      data-testid="funnel-section"
      data-campaign-id={campaignId}
      data-funnels={String(funnels.length)}
    />
  ),
}))

vi.mock('./presentation-settings-section', () => ({
  PresentationSettingsSection: ({ presentations }: { presentations: unknown[] }) => (
    <div data-testid="presentation-section" data-presentations={String(presentations.length)} />
  ),
}))

vi.mock('./website-settings-section', () => ({
  WebsiteSettingsSection: ({ websites }: { websites: unknown[] }) => (
    <div data-testid="website-section" data-websites={String(websites.length)} />
  ),
}))

vi.mock('./ads-settings-section', () => ({
  AdsSettingsSection: ({
    metaConnected,
    metaConnectionCard,
  }: {
    metaConnected: boolean | null
    metaConnectionCard: ReactNode
  }) => (
    <div data-testid="ads-section" data-meta-connected={String(metaConnected)}>
      {metaConnectionCard}
    </div>
  ),
}))

vi.mock('./danger-settings-section', () => ({
  DangerSettingsSection: ({ activeCampaignName }: { activeCampaignName: string | null }) => (
    <div data-testid="danger-section">{activeCampaignName}</div>
  ),
}))

afterEach(cleanup)

function stateSetter<T>(): Dispatch<SetStateAction<T>> {
  return vi.fn() as Dispatch<SetStateAction<T>>
}

function baseProps(
  overrides: Partial<SettingsTabContentProps> = {},
): SettingsTabContentProps {
  const entityControls = {
    savingFunnelIds: new Set<string>(),
    activeFunnelIndex: 0,
    setActiveFunnelIndex: stateSetter<number>(),
    editingFunnelId: null,
    draftFunnelName: '',
    setDraftFunnelName: vi.fn(),
    funnelContainerRef: createRef<HTMLDivElement>(),
    funnelNameInputRef: createRef<HTMLInputElement>(),
    handleStartEditFunnelName: vi.fn(),
    handleCancelEditFunnelName: vi.fn(),
    handleCommitEditFunnelName: vi.fn(),
    savingPresentationIds: new Set<string>(),
    activePresentationIndex: 0,
    setActivePresentationIndex: stateSetter<number>(),
    editingPresentationId: null,
    draftPresentationName: '',
    setDraftPresentationName: vi.fn(),
    presentationContainerRef: createRef<HTMLDivElement>(),
    presentationNameInputRef: createRef<HTMLInputElement>(),
    handleStartEditPresentationName: vi.fn(),
    handleCancelEditPresentationName: vi.fn(),
    handleCommitEditPresentationName: vi.fn(),
    handleTogglePresentationBranding: vi.fn(),
    activeWebsiteIndex: 0,
    setActiveWebsiteIndex: vi.fn(),
    editingWebsiteId: null,
    draftWebsiteName: '',
    setDraftWebsiteName: vi.fn(),
    savingWebsiteIds: new Set<string>(),
    websiteContainerRef: createRef<HTMLDivElement>(),
    websiteNameInputRef: createRef<HTMLInputElement>(),
    handleStartEditWebsiteName: vi.fn(),
    handleCancelEditWebsiteName: vi.fn(),
    handleCommitEditWebsiteName: vi.fn(),
    handleSaveWebsiteLayout: vi.fn(),
  }
  const domainControls = {
    domains: [],
    setDomains: stateSetter<SettingsTabContentProps['domainControls']['domains']>(),
    domainsLoading: false,
    selectedDomainId: '',
    setSelectedDomainId: vi.fn(),
    addDomainOpen: false,
    setAddDomainOpen: vi.fn(),
    dnsDialogDomain: null,
    setDnsDialogDomain: stateSetter<SettingsTabContentProps['domainControls']['dnsDialogDomain']>(),
    lmDomainActionLoading: false,
    setLmDomainActionLoading: vi.fn(),
    lmSelectedDomainId: '',
    setLmSelectedDomainId: vi.fn(),
    lmDomainDropdownOpen: false,
    setLmDomainDropdownOpen: stateSetter<boolean>(),
    lmDomainDropdownTriggerRef: createRef<HTMLButtonElement>(),
    lmDomainDropdownPos: { top: 0, left: 0, width: 0 },
    handleDomainUpdated: vi.fn(),
    handleDomainAdded: vi.fn(),
  }
  const pixelControls = {
    lmPixelSaving: false,
    lmPixelAddFlow: '',
    setLmPixelAddFlow: vi.fn(),
    handleUpdatePresentationPixels: vi.fn(),
    handleUpdatePresentationMetaEvents: vi.fn(),
  }
  const metaAssets = {
    adCampaigns: [],
    adCampaignsRef: { current: [] },
    setAdCampaigns: stateSetter<SettingsTabContentProps['metaAssets']['adCampaigns']>(),
    metaConnected: true,
    setMetaConnected: stateSetter<boolean | null>(),
    metaAdAccounts: [],
    setMetaAdAccounts: stateSetter<SettingsTabContentProps['metaAssets']['metaAdAccounts']>(),
    metaPages: [],
    setMetaPages: stateSetter<SettingsTabContentProps['metaAssets']['metaPages']>(),
    metaInstagramAccountsByCampaign: {},
    setMetaInstagramAccountsByCampaign:
      stateSetter<SettingsTabContentProps['metaAssets']['metaInstagramAccountsByCampaign']>(),
    metaPixelsByAccount: {},
    setMetaPixelsByAccount:
      stateSetter<SettingsTabContentProps['metaAssets']['metaPixelsByAccount']>(),
    adsSaving: {},
    setAdsSaving: stateSetter<SettingsTabContentProps['metaAssets']['adsSaving']>(),
    createPixelForAccountId: null,
    setCreatePixelForAccountId: stateSetter<string | null>(),
    createPixelForCampaignId: null,
    setCreatePixelForCampaignId: stateSetter<string | null>(),
    allMetaPixelOptions: [],
  }

  return {
    activeSection: 'agent',
    settingsLoading: false,
    campaignId: 'campaign-1',
    mobileMode: false,
    campaignConfig: {},
    setCampaignConfig: stateSetter<Record<string, unknown>>(),
    mediaGenerationEnabled: true,
    campaignModelStrategy: 'auto',
    modelStrategies: [
      {
        id: 'auto',
        label: 'Auto',
        description: 'Balanced',
        chipClass: 'chip-glass-blue',
        textClass: 'text-primary',
      },
    ],
    userIntegrations: [],
    providerModes: {},
    availableIntegrations: [],
    loadUserIntegrations: vi.fn(),
    selectedThemeId: 'theme-1',
    themeTab: 'colors',
    setThemeTab: vi.fn(),
    displayFunnels: [],
    setFunnels: stateSetter<SettingsTabContentProps['displayFunnels']>(),
    presentations: [],
    setPresentations: stateSetter<SettingsTabContentProps['presentations']>(),
    displayWebsites: [],
    isFreeUser: false,
    metaConnectionCard: <button type="button">Connect Meta</button>,
    openWorkspaceSettings: vi.fn(),
    activeCampaignName: 'Launch Campaign',
    deleteDialogOpen: false,
    deleteCampaignAck: false,
    deleteCampaignNameInput: '',
    isDeletingCampaign: false,
    setDeleteDialogOpen: vi.fn(),
    setDeleteCampaignAck: vi.fn(),
    setDeleteCampaignNameInput: vi.fn(),
    onDeleteCampaign: vi.fn(),
    agentThemeControls: {
      savingAgentSettings: false,
      handleMediaGenerationToggle: vi.fn(),
      handleModelStrategyChange: vi.fn(),
      handleThemeChange: vi.fn(),
    },
    entityControls,
    domainControls,
    pixelControls,
    metaAssets,
    ...overrides,
  }
}

describe('SettingsTabContent', () => {
  it('renders the existing agent settings branch props', () => {
    render(<SettingsTabContent {...baseProps()} />)

    const section = screen.getByTestId('agent-section')
    expect(section.dataset.campaignId).toBe('campaign-1')
    expect(section.dataset.mediaEnabled).toBe('true')
    expect(section.dataset.modelStrategies).toBe('1')
  })

  it('keeps loading copy for the ads branch', () => {
    render(<SettingsTabContent {...baseProps({ activeSection: 'ads', settingsLoading: true })} />)

    expect(screen.getByText('Loading ads settings...')).toBeTruthy()
    expect(screen.getByTestId('loading-orb').dataset.state).toBe('processing')
    expect(screen.queryByTestId('ads-section')).toBeNull()
  })

  it('passes the Meta connection card through to the ads branch', () => {
    render(<SettingsTabContent {...baseProps({ activeSection: 'ads' })} />)

    expect(screen.getByTestId('ads-section').dataset.metaConnected).toBe('true')
    expect(screen.getByRole('button', { name: 'Connect Meta' })).toBeTruthy()
  })

  it('renders the existing danger branch delegation', () => {
    render(<SettingsTabContent {...baseProps({ activeSection: 'danger' })} />)

    expect(screen.getByTestId('danger-section').textContent).toBe('Launch Campaign')
  })
})
