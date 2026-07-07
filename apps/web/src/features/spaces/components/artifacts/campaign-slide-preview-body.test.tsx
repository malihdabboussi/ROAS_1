import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArtifactPreviewSelection } from './artifact-preview-selection'
import { CampaignSlidePreviewBody } from './campaign-slide-preview-body'

const controllerMocks = vi.hoisted(() => ({
  setFunnelViewport: vi.fn(),
  setLmViewport: vi.fn(),
  setAdViewport: vi.fn(),
  handleFunnelStatusChange: vi.fn(),
  handlePresentationStatusChange: vi.fn(),
  refreshPresentation: vi.fn(),
  handleAdUpdated: vi.fn(),
  handleFunnelPageChange: vi.fn(),
}))

const artifactPreviewServiceMocks = vi.hoisted(() => ({
  fetchAd: vi.fn(),
  fetchCampaignAdCampaigns: vi.fn(),
}))

const controllerState = vi.hoisted(() => ({
  selectedResource: { type: 'social-post', id: 'social-post-1', name: 'Launch post' },
  selectedFunnel: null as {
    id: string
    name: string
    status: string
    slug: string
    publishedUrl: string | null
    funnelType: string
    campaignId?: string | null
  } | null,
}))

type EmailChromeMockProps = { toolbarLeading?: ReactNode; trailingChrome?: ReactNode; publishAdjacentChrome?: ReactNode }

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

vi.mock('@/features/spaces/components/artifacts/ad/AdMenuDropdown', () => ({
  AdMenuDropdown: ({ ad }: { ad: { id: string } }) => (
    <div data-testid="ad-menu-dropdown">Spaces ad menu for {ad.id}</div>
  ),
}))

vi.mock('@/features/spaces/components/artifacts/email/EmailArtifactPreview', () => ({
  EmailArtifactPreview: (props: EmailChromeMockProps) => (
    <div data-testid="email-artifact-preview">
      {props.toolbarLeading}
      {props.publishAdjacentChrome}
      {props.trailingChrome}
    </div>
  ),
}))

vi.mock('@/features/spaces/components/artifacts/form/FormPreviewPane', () => ({
  FormPreviewPane: () => <div data-testid="form-preview-pane" />,
}))

vi.mock('@/features/spaces/components/artifacts/funnel/FunnelMenuDropdown', () => ({
  FunnelMenuDropdown: ({ funnel }: { funnel: { id: string } }) => (
    <div data-testid="funnel-menu-dropdown">Spaces funnel menu for {funnel.id}</div>
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

vi.mock('@/features/studio/components/preview/AdCampaignSettingsPanel', () => ({ AdCampaignSettingsPanel: () => <div data-testid="ad-campaign-settings-panel" /> }))

vi.mock('@/features/studio/components/preview/AdPreview', () => ({ AdPreview: () => <div data-testid="ad-preview" /> }))

vi.mock('@/features/studio/components/preview/AdSetSettingsPanel', () => ({ AdSetSettingsPanel: () => <div data-testid="ad-set-settings-panel" /> }))

vi.mock('@/features/studio/components/preview/AdSettingsPanel', () => ({ AdSettingsPanel: () => <div data-testid="ad-settings-panel" /> }))

vi.mock('@/features/studio/components/preview/AdsTab', () => ({ AdsTab: () => <div data-testid="ads-tab" /> }))

vi.mock('@/features/studio/components/preview/AdUngroupedAssignPanel', () => ({ AdUngroupedAssignPanel: () => <div data-testid="ad-ungrouped-assign-panel" /> }))

vi.mock('@/features/studio/components/preview/AvatarPreview', () => ({ AvatarPreview: () => <div data-testid="avatar-preview" /> }))

vi.mock('@/features/studio/components/preview/BlogPostPreview', () => ({ BlogPostPreview: () => <div data-testid="blog-post-preview" /> }))

vi.mock('@/features/studio/components/preview/BlogToolbar', () => ({ BlogToolbar: () => <div data-testid="blog-toolbar" /> }))

vi.mock('@/features/studio/components/preview/FunnelFullModeShell', () => ({ FunnelFullModeShell: () => <div data-testid="funnel-full-mode-shell" /> }))

vi.mock('@/features/studio/components/preview/FunnelHistoryControls', () => ({ FunnelHistoryControls: () => <div data-testid="funnel-history-controls" /> }))

vi.mock('@/features/studio/components/preview/FunnelHtmlPreview', () => ({ FunnelHtmlPreview: () => <div data-testid="funnel-html-preview" /> }))

vi.mock('@/features/studio/components/preview/FunnelToolbar', () => ({
  FunnelToolbar: ({ publishLeadingChrome }: { publishLeadingChrome?: ReactNode }) => (
    <div data-testid="funnel-toolbar">{publishLeadingChrome}</div>
  ),
}))

vi.mock('@/features/studio/components/preview/OfferPreview', () => ({ OfferPreview: () => <div data-testid="offer-preview" /> }))

vi.mock('@/features/studio/components/preview/OfferStepPreview', () => ({ OfferStepPreview: () => <div data-testid="offer-step-preview" /> }))

vi.mock('@/features/studio/components/preview/PresentationFullModeShell', () => ({ PresentationFullModeShell: () => <div data-testid="presentation-full-mode-shell" /> }))

vi.mock('@/features/studio/components/preview/PresentationPreview', () => ({ PresentationPreview: () => <div data-testid="presentation-preview" /> }))

vi.mock('@/features/studio/components/preview/PresentationToolbar', () => ({ PresentationToolbar: () => <div data-testid="presentation-toolbar" /> }))

vi.mock('@/features/studio/components/preview/SandpackPreview', () => ({ SandpackPreview: () => <div data-testid="sandpack-preview" /> }))

vi.mock('@/features/studio/components/preview/SequencePreview', () => ({ SequencePreview: () => <div data-testid="sequence-preview" /> }))

vi.mock('@/features/studio/components/preview/SettingsTab', () => ({ SettingsTab: () => <div data-testid="settings-tab" /> }))

vi.mock('@/features/studio/components/preview/SocialPostPreview', () => ({
  default: ({
    socialPostId,
    renderPostMenu,
  }: {
    socialPostId: string
    renderPostMenu?: (props: {
      post: {
        id: string
        caption: string | null
        headline: string | null
        status: 'draft'
        scheduled_at: string | null
        campaign_id: string | null
        platform: 'instagram'
      }
      anchorRef: { current: HTMLButtonElement | null }
      onClose: () => void
      onChanged: () => void
      onSchedule: () => void
      onDeleted?: () => void
    }) => ReactNode
  }) => (
    <div data-testid="social-post-preview" data-social-post-id={socialPostId}>
      {renderPostMenu?.({
        post: {
          id: socialPostId,
          caption: 'Launch caption',
          headline: 'Launch headline',
          status: 'draft',
          scheduled_at: null,
          campaign_id: 'campaign-1',
          platform: 'instagram',
        },
        anchorRef: { current: null },
        onClose: vi.fn(),
        onChanged: vi.fn(),
        onSchedule: vi.fn(),
        onDeleted: vi.fn(),
      })}
    </div>
  ),
}))

vi.mock('@/features/spaces/components/artifacts/social-post/SocialPostMenuDropdown', () => ({
  SocialPostMenuDropdown: ({ post }: { post: { id: string } }) => (
    <div data-testid="spaces-social-post-menu">Spaces menu for {post.id}</div>
  ),
}))

vi.mock('./social-post/SocialPostMenuDropdown', () => ({
  SocialPostMenuDropdown: ({ post }: { post: { id: string } }) => (
    <div data-testid="spaces-social-post-menu">Spaces menu for {post.id}</div>
  ),
}))

vi.mock('./use-space-artifact-preview-controller', () => ({
  useSpaceArtifactPreviewController: () => ({
    selectedResource: controllerState.selectedResource,
    selectedFunnel: controllerState.selectedFunnel,
    selectedPresentation: null,
    pageContent: null,
    pageLoading: false,
    pageError: null,
    themePreviewCss: '',
    funnelViewport: 'desktop',
    setFunnelViewport: controllerMocks.setFunnelViewport,
    lmViewport: 'desktop',
    setLmViewport: controllerMocks.setLmViewport,
    adViewport: 'desktop',
    setAdViewport: controllerMocks.setAdViewport,
    handleFunnelStatusChange: controllerMocks.handleFunnelStatusChange,
    handlePresentationStatusChange: controllerMocks.handlePresentationStatusChange,
    refreshPresentation: controllerMocks.refreshPresentation,
    handleAdUpdated: controllerMocks.handleAdUpdated,
    funnelPages: [],
    currentPageId: null,
    handleFunnelPageChange: controllerMocks.handleFunnelPageChange,
  }),
}))

function expectNoRenderLoop(consoleErrorSpy: ReturnType<typeof vi.spyOn>) {
  const messages = consoleErrorSpy.mock.calls.map((args) => args.join(' '))
  expect(messages.join('\n')).not.toMatch(/Maximum update depth|Too many re-renders/i)
}

describe('CampaignSlidePreviewBody', () => {
  const selection: ArtifactPreviewSelection = {
    type: 'social_post',
    id: 'social-post-1',
    title: 'Launch post',
  }
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    controllerState.selectedResource = {
      type: 'social-post',
      id: 'social-post-1',
      name: 'Launch post',
    }
    controllerState.selectedFunnel = null
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

  it('keeps the Spaces social post menu wired through the preview pane without render churn', () => {
    render(<CampaignSlidePreviewBody campaignId="campaign-1" selection={selection} />)

    expect(screen.getByTestId('social-post-preview').getAttribute('data-social-post-id')).toBe(
      'social-post-1',
    )
    expect(screen.getByTestId('spaces-social-post-menu').textContent).toContain(
      'Spaces menu for social-post-1',
    )
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('keeps the Spaces ad menu wired through the preview pane without render churn', async () => {
    controllerState.selectedResource = { type: 'ad', id: 'ad-1', name: 'Launch ad' }

    render(<CampaignSlidePreviewBody campaignId="campaign-1" selection={selection} />)

    fireEvent.click(await screen.findByLabelText('Ad options'))

    expect(screen.getByTestId('ad-menu-dropdown').textContent).toContain(
      'Spaces ad menu for ad-1',
    )
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('keeps the Spaces funnel menu wired through the preview pane without render churn', () => {
    controllerState.selectedResource = {
      type: 'funnel',
      id: 'funnel-1',
      name: 'Launch funnel',
    }
    controllerState.selectedFunnel = {
      id: 'funnel-1',
      name: 'Launch funnel',
      status: 'draft',
      slug: 'launch-funnel',
      publishedUrl: null,
      funnelType: 'website',
      campaignId: 'campaign-1',
    }

    render(
      <CampaignSlidePreviewBody
        campaignId="campaign-1"
        selection={selection}
        onOpenFullView={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText('Funnel options'))

    expect(screen.getByTestId('funnel-menu-dropdown').textContent).toContain(
      'Spaces funnel menu for funnel-1',
    )
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('keeps the email preview branch and slide-over chrome wired without render churn', () => {
    controllerState.selectedResource = {
      type: 'email',
      id: 'email-1',
      name: 'Launch email',
    }
    const [onBack, onClose, onOpenFullView] = [vi.fn(), vi.fn(), vi.fn()]

    render(
      <CampaignSlidePreviewBody
        campaignId="campaign-1"
        selection={selection}
        onSlideClose={onClose}
        onOpenFullView={onOpenFullView}
        spacesDeepWorkBack={onBack}
        spacesDeepWorkToolbarExtras={<button type="button">Save view</button>}
      />,
    )

    expect(screen.getByText('Save view')).toBeTruthy()

    fireEvent.click(screen.getByText('Back'))
    fireEvent.click(screen.getByLabelText('Open full view'))
    fireEvent.click(screen.getByLabelText('Close preview'))

    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onOpenFullView).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('keeps the form preview branch wired through the preview pane without render churn', () => {
    controllerState.selectedResource = {
      type: 'form',
      id: 'form-1',
      name: 'Launch form',
    }

    render(<CampaignSlidePreviewBody campaignId="campaign-1" selection={selection} />)

    expect(screen.getByTestId('form-preview-pane')).toBeTruthy()
    expectNoRenderLoop(consoleErrorSpy)
  })
})
