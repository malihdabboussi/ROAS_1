import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ArtifactPreviewPane,
  type ArtifactPreviewPaneProps,
} from './ArtifactPreviewPaneAdapter'

const artifactPreviewServiceMocks = vi.hoisted(() => ({
  fetchAd: vi.fn(),
  fetchCampaignAdCampaigns: vi.fn(),
}))

type EmailChromeMockProps = {
  toolbarLeading?: ReactNode
  trailingChrome?: ReactNode
  publishAdjacentChrome?: ReactNode
}

vi.mock('@/features/studio/contexts/CampaignModeContext', () => ({
  useCampaignMode: () => ({
    activeCampaignId: 'campaign-1',
    activeCampaignName: 'Launch Campaign',
    expandPanel: vi.fn(),
  }),
}))

vi.mock('@/features/studio/components/preview/hooks/useFunnelUndoRedo', () => ({
  useFunnelUndoRedo: () => ({
    canUndo: false,
    canRedo: false,
    isLoading: false,
    pendingAction: null,
    undo: vi.fn(),
    redo: vi.fn(),
    requestHistory: vi.fn(),
  }),
}))

vi.mock('@/features/studio/lib/funnel-view-mode.util', () => ({
  isFunnelHtmlBundleFullMode: () => false,
}))

vi.mock('@/features/studio/store/use-funnel-full-mode-store', () => ({
  useFunnelFullModeStore: {
    getState: () => ({
      activate: vi.fn(),
      deactivate: vi.fn(),
    }),
  },
}))

vi.mock('@/features/studio/services/artifact-preview.service', () => ({
  fetchAd: artifactPreviewServiceMocks.fetchAd,
  fetchCampaignAdCampaigns: artifactPreviewServiceMocks.fetchCampaignAdCampaigns,
}))

vi.mock('@/components/ui/navigation/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: () => <div data-testid="loading-orb" />,
}))

vi.mock('@/features/studio/components/preview/StudioAdMenuDropdown', () => ({
  StudioAdMenuDropdown: ({ ad }: { ad: { id: string } }) => (
    <div data-testid="studio-ad-menu">Studio ad menu for {ad.id}</div>
  ),
}))

vi.mock('@/features/spaces/components/artifacts/email/EmailArtifactPreview', () => ({
  EmailArtifactPreview: (props: EmailChromeMockProps) => (
    <div data-testid="spaces-email-preview">
      {props.toolbarLeading}
      {props.publishAdjacentChrome}
      {props.trailingChrome}
    </div>
  ),
}))

vi.mock('@/features/spaces/components/artifacts/form/FormPreviewPane', () => ({
  FormPreviewPane: () => <div data-testid="spaces-form-preview" />,
}))

vi.mock('@/features/studio/components/preview/StudioFunnelMenuDropdown', () => ({
  StudioFunnelMenuDropdown: ({ funnel }: { funnel: { id: string } }) => (
    <div data-testid="studio-funnel-menu">Studio funnel menu for {funnel.id}</div>
  ),
}))

vi.mock('@/features/studio/components/preview/ad-canvas', () => ({
  AdStudioLayout: () => <div data-testid="ad-studio-layout" />,
}))

vi.mock('@/features/studio/components/preview/ad-preview/ad-preview-platform-icons', () => ({
  FbIcon: () => <span data-testid="fb-icon" />,
  IgIcon: () => <span data-testid="ig-icon" />,
}))

vi.mock('@/features/studio/components/preview/ad-preview/ad-preview.types', () => ({
  PLACEMENT_OPTIONS: [{ value: 'feed', label: 'Feed' }],
}))

vi.mock('@/features/studio/components/preview/AdCampaignSettingsPanel', () => ({
  AdCampaignSettingsPanel: () => <div data-testid="ad-campaign-settings-panel" />,
}))

vi.mock('@/features/studio/components/preview/AdPreview', () => ({
  AdPreview: () => <div data-testid="ad-preview" />,
}))

vi.mock('@/features/studio/components/preview/AdSetSettingsPanel', () => ({
  AdSetSettingsPanel: () => <div data-testid="ad-set-settings-panel" />,
}))

vi.mock('@/features/studio/components/preview/AdSettingsPanel', () => ({
  AdSettingsPanel: () => <div data-testid="ad-settings-panel" />,
}))

vi.mock('@/features/studio/components/preview/AdsTab', () => ({
  AdsTab: () => <div data-testid="ads-tab" />,
}))

vi.mock('@/features/studio/components/preview/AdUngroupedAssignPanel', () => ({
  AdUngroupedAssignPanel: () => <div data-testid="ad-ungrouped-assign-panel" />,
}))

vi.mock('@/features/studio/components/preview/AvatarPreview', () => ({
  AvatarPreview: () => <div data-testid="avatar-preview" />,
}))

vi.mock('@/features/studio/components/preview/BlogPostPreview', () => ({
  BlogPostPreview: () => <div data-testid="blog-post-preview" />,
}))

vi.mock('@/features/studio/components/preview/BlogToolbar', () => ({
  BlogToolbar: () => <div data-testid="blog-toolbar" />,
}))

vi.mock('@/features/studio/components/preview/FunnelFullModeShell', () => ({
  FunnelFullModeShell: () => <div data-testid="funnel-full-mode-shell" />,
}))

vi.mock('@/features/studio/components/preview/FunnelHistoryControls', () => ({
  FunnelHistoryControls: () => <div data-testid="funnel-history-controls" />,
}))

vi.mock('@/features/studio/components/preview/FunnelHtmlPreview', () => ({
  FunnelHtmlPreview: () => <div data-testid="funnel-html-preview" />,
}))

vi.mock('@/features/studio/components/preview/FunnelToolbar', () => ({
  FunnelToolbar: ({ publishLeadingChrome }: { publishLeadingChrome?: ReactNode }) => (
    <div data-testid="funnel-toolbar">{publishLeadingChrome}</div>
  ),
}))

vi.mock('@/features/studio/components/preview/OfferPreview', () => ({
  OfferPreview: () => <div data-testid="offer-preview" />,
}))

vi.mock('@/features/studio/components/preview/OfferStepPreview', () => ({
  OfferStepPreview: () => <div data-testid="offer-step-preview" />,
}))

vi.mock('@/features/studio/components/preview/PresentationFullModeShell', () => ({
  PresentationFullModeShell: () => <div data-testid="presentation-full-mode-shell" />,
}))

vi.mock('@/features/studio/components/preview/PresentationPreview', () => ({
  PresentationPreview: () => <div data-testid="presentation-preview" />,
}))

vi.mock('@/features/studio/components/preview/PresentationToolbar', () => ({
  PresentationToolbar: () => <div data-testid="presentation-toolbar" />,
}))

vi.mock('@/features/studio/components/preview/SandpackPreview', () => ({
  SandpackPreview: () => <div data-testid="sandpack-preview" />,
}))

vi.mock('@/features/studio/components/preview/SequencePreview', () => ({
  SequencePreview: () => <div data-testid="sequence-preview" />,
}))

vi.mock('@/features/studio/components/preview/SettingsTab', () => ({
  SettingsTab: () => <div data-testid="settings-tab" />,
}))

vi.mock('@/features/studio/components/preview/SocialPostPreview', () => ({
  default: () => <div data-testid="social-post-preview" />,
}))

function baseProps(
  overrides: Partial<ArtifactPreviewPaneProps> = {},
): ArtifactPreviewPaneProps {
  return {
    selectedResource: null,
    selectedFunnel: null,
    selectedPresentation: null,
    pageContent: null,
    pageLoading: false,
    pageError: null,
    themePreviewCss: '',
    funnelViewport: 'desktop',
    setFunnelViewport: vi.fn(),
    lmViewport: 'desktop',
    setLmViewport: vi.fn(),
    adViewport: 'desktop',
    setAdViewport: vi.fn(),
    onFunnelStatusChange: vi.fn(),
    onPresentationStatusChange: vi.fn(),
    onAdUpdated: vi.fn(),
    funnelPages: [],
    currentPageId: null,
    ...overrides,
  }
}

function expectNoRenderLoop(consoleErrorSpy: ReturnType<typeof vi.spyOn>) {
  const messages = consoleErrorSpy.mock.calls.map((args) => args.join(' '))
  expect(messages.join('\n')).not.toMatch(/Maximum update depth|Too many re-renders/i)
}

describe('ArtifactPreviewPaneAdapter', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    artifactPreviewServiceMocks.fetchAd.mockResolvedValue({
      id: 'ad-1',
      headline: 'Launch headline',
      primary_text: 'Launch primary text',
      campaign_id: 'campaign-1',
      ad_set_id: null,
      platform: 'facebook',
      placement: 'feed',
      updated_at: '2026-06-25T10:00:00.000Z',
      placement_images: {},
    })
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe = vi.fn()
        disconnect = vi.fn()
      },
    )
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    consoleErrorSpy.mockRestore()
  })

  it('preserves the current email and form fallback renderers without render churn', () => {
    const { rerender } = render(
      <ArtifactPreviewPane
        {...baseProps({
          selectedResource: { type: 'email', id: 'email-1', name: 'Launch email' },
        })}
      />,
    )

    expect(screen.getByTestId('spaces-email-preview')).toBeTruthy()

    rerender(
      <ArtifactPreviewPane
        {...baseProps({
          selectedResource: { type: 'form', id: 'form-1', name: 'Launch form' },
        })}
      />,
    )

    expect(screen.getByTestId('spaces-form-preview')).toBeTruthy()
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('uses the Studio-owned ad menu fallback renderer without render churn', async () => {
    render(
      <ArtifactPreviewPane
        {...baseProps({
          selectedResource: { type: 'ad', id: 'ad-1', name: 'Launch ad' },
        })}
      />,
    )

    fireEvent.click(await screen.findByLabelText('Ad options'))

    expect(screen.getByTestId('studio-ad-menu').textContent).toContain(
      'Studio ad menu for ad-1',
    )
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('uses the Studio-owned funnel menu fallback renderer without render churn', () => {
    render(
      <ArtifactPreviewPane
        {...baseProps({
          selectedResource: { type: 'funnel', id: 'funnel-1', name: 'Launch funnel' },
          selectedFunnel: {
            id: 'funnel-1',
            name: 'Launch funnel',
            status: 'draft',
            slug: 'launch-funnel',
            publishedUrl: null,
            funnelType: 'website',
            campaignId: 'campaign-1',
          },
          slideOverOnOpenFullView: vi.fn(),
        })}
      />,
    )

    fireEvent.click(screen.getByLabelText('Funnel options'))

    expect(screen.getByTestId('studio-funnel-menu').textContent).toContain(
      'Studio funnel menu for funnel-1',
    )
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('lets caller-provided render slots override transitional defaults', () => {
    render(
      <ArtifactPreviewPane
        {...baseProps({
          selectedResource: { type: 'email', id: 'email-1', name: 'Launch email' },
          renderEmailPreview: () => <div data-testid="custom-email-preview" />,
        })}
      />,
    )

    expect(screen.getByTestId('custom-email-preview')).toBeTruthy()
    expect(screen.queryByTestId('spaces-email-preview')).toBeNull()
    expectNoRenderLoop(consoleErrorSpy)
  })
})
