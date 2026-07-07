import type { HTMLAttributes, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SpaceToolbarContext } from '../types'
import {
  PAID_ADS_OPEN_CANVAS_REQUEST_EVENT,
  PAID_ADS_SELECTION_EVENT,
} from '../../components/artifacts/paid-ads/use-paid-ads-data'
import { PaidAdsToolbar } from './PaidAdsToolbar'

const paidAdsApiMocks = vi.hoisted(() => ({
  fetchCampaignAdCampaigns: vi.fn(),
  refreshAdCampaignMetaStatus: vi.fn(),
  refreshAdSetMetaStatus: vi.fn(),
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      transition: _transition,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      ...props
    }: HTMLAttributes<HTMLDivElement> & {
      transition?: unknown
      initial?: unknown
      animate?: unknown
      exit?: unknown
    }) => <div {...props}>{children}</div>,
    span: ({
      children,
      transition: _transition,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      ...props
    }: HTMLAttributes<HTMLSpanElement> & {
      transition?: unknown
      initial?: unknown
      animate?: unknown
      exit?: unknown
    }) => <span {...props}>{children}</span>,
  },
}))

vi.mock('@/lib/artifacts/paid-ads-api', () => paidAdsApiMocks)

vi.mock('@/features/spaces/components/artifacts/paid-ads/PaidAdsPublishFlow', () => ({
  PaidAdsPublishFlow: ({
    platformCampaignId,
    reviewOpen,
  }: {
    platformCampaignId: string
    reviewOpen: boolean
  }) => (
    <div
      data-testid="paid-ads-publish-flow"
      data-platform-campaign-id={platformCampaignId}
      data-review-open={reviewOpen ? 'true' : 'false'}
    />
  ),
}))

vi.mock('@/features/spaces/components/toolbar', () => ({
  SpaceCustomizeButton: ({ openCustomizeFromToolbar }: { openCustomizeFromToolbar: () => void }) => (
    <button type="button" onClick={openCustomizeFromToolbar} aria-label="Customize view">
      Customize
    </button>
  ),
}))

function createToolbarActions() {
  return {
    handleViewPatch: vi.fn(async () => {}),
    handleArtifactConfigPatch: vi.fn(async () => {}),
    handleCreateArtifact: vi.fn(async () => {}),
    loadCampaignArtifacts: vi.fn(),
    setSpaceToolbarSearchOpen: vi.fn(),
    openCustomizeFromToolbar: vi.fn(),
    closeCustomizePanel: vi.fn(),
  }
}

type ToolbarActions = ReturnType<typeof createToolbarActions>

function makeToolbarContext(
  actions: ToolbarActions,
  overrides: Partial<SpaceToolbarContext> = {},
): SpaceToolbarContext {
  return {
    activeView: {
      id: 'ads-view',
      type: 'ads',
      name: 'Ads',
      ads_config: { paid_ads_mode: 'creatives' },
    },
    activeSpace: {
      id: 'space-1',
      campaign_id: 'campaign-1',
    },
    showGroupByInToolbar: false,
    showAddColumnsToolbar: false,
    artifactConfig: {
      time_range: '30d',
      search_query: '',
    },
    artifactCampaignId: 'campaign-1',
    includeCampaignArtifacts: false,
    artifactSlidePreviewOpen: false,
    artifactDetailOpen: false,
    artifactDeepDetail: null,
    handleArtifactConfigPatch: actions.handleArtifactConfigPatch,
    handleViewPatch: actions.handleViewPatch,
    handleCreateArtifact: actions.handleCreateArtifact,
    loadCampaignArtifacts: actions.loadCampaignArtifacts,
    spaceToolbarSearchOpen: false,
    setSpaceToolbarSearchOpen: actions.setSpaceToolbarSearchOpen,
    schemaEditorOpen: false,
    closeCustomizePanel: actions.closeCustomizePanel,
    openCustomizeFromToolbar: actions.openCustomizeFromToolbar,
    hasDraft: false,
    handleSaveViewDraft: vi.fn(),
    handleEnableAutosaveAndFlush: vi.fn(),
    handleSaveAsNewView: vi.fn(),
    handleRevertViewDraft: vi.fn(),
    groupByOpen: false,
    setGroupByOpen: vi.fn(),
    groupByBtnRef: createRef<HTMLSpanElement>(),
    docsDriveBrowseActive: false,
    isAllArtifactsView: false,
    isMediaView: false,
    isSocialResearchView: false,
    isMissionsView: false,
    isContactsView: false,
    activeSchema: { fields: [], views: [] },
    activeViewId: 'ads-view',
    activeSpaceId: 'space-1',
    socialPlatform: null,
    groupableFields: [],
    ...overrides,
  } as unknown as SpaceToolbarContext
}

describe('PaidAdsToolbar', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    Object.values(paidAdsApiMocks).forEach((mock) => mock.mockReset())
  })

  it('renders creatives-mode controls and keeps state owned by the toolbar context', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const actions = createToolbarActions()
    paidAdsApiMocks.fetchCampaignAdCampaigns.mockResolvedValue([
      { id: 'ad-campaign-1', ad_sets: [{ id: 'ad-set-1' }] },
    ])
    paidAdsApiMocks.refreshAdCampaignMetaStatus.mockResolvedValue({})
    paidAdsApiMocks.refreshAdSetMetaStatus.mockResolvedValue({})

    const { rerender } = render(<PaidAdsToolbar ctx={makeToolbarContext(actions)} />)

    fireEvent.click(screen.getByRole('button', { name: 'Campaigns, Ad sets, or Ad Creatives' }))
    fireEvent.click(screen.getByRole('button', { name: 'Campaigns' }))
    expect(actions.handleViewPatch).toHaveBeenCalledWith({
      ads_config: { paid_ads_mode: 'structure' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Include campaign artifacts' }))
    expect(actions.loadCampaignArtifacts).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Refresh all Meta statuses' }))
    await waitFor(() => {
      expect(paidAdsApiMocks.fetchCampaignAdCampaigns).toHaveBeenCalledWith('campaign-1')
      expect(paidAdsApiMocks.refreshAdCampaignMetaStatus).toHaveBeenCalledWith('ad-campaign-1')
      expect(paidAdsApiMocks.refreshAdSetMetaStatus).toHaveBeenCalledWith('ad-set-1')
    })

    rerender(
      <PaidAdsToolbar
        ctx={makeToolbarContext(actions, {
          spaceToolbarSearchOpen: true,
          artifactConfig: { time_range: '30d', search_query: 'old query' },
        })}
      />,
    )

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'new query' } })
    expect(actions.handleArtifactConfigPatch).toHaveBeenCalledWith({ search_query: 'new query' })

    fireEvent.keyDown(searchInput, { key: 'Escape' })
    expect(actions.handleArtifactConfigPatch).toHaveBeenCalledWith({ search_query: '' })
    expect(actions.setSpaceToolbarSearchOpen).toHaveBeenCalledWith(false)

    rerender(
      <PaidAdsToolbar
        ctx={makeToolbarContext(actions, {
          artifactConfig: { time_range: '7d', search_query: 'stable' },
        })}
      />,
    )
    expect(
      consoleError.mock.calls.some((call) =>
        call.some((part) => String(part).match(/maximum update depth|too many re-renders/i)),
      ),
    ).toBe(false)
  })

  it('switches structure-mode primary action from publish to open canvas after selection', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const actions = createToolbarActions()
    const openCanvasListener = vi.fn()
    window.addEventListener(PAID_ADS_OPEN_CANVAS_REQUEST_EVENT, openCanvasListener)

    try {
      render(
        <PaidAdsToolbar
          ctx={makeToolbarContext(actions, {
            activeView: {
              id: 'ad-campaigns-view',
              type: 'ad_campaigns',
              name: 'Campaigns',
            },
          })}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
      expect(screen.getByTestId('paid-ads-publish-flow')).toHaveAttribute(
        'data-review-open',
        'true',
      )

      window.dispatchEvent(
        new CustomEvent(PAID_ADS_SELECTION_EVENT, {
          detail: {
            campaignId: 'campaign-1',
            selection: { kind: 'ad_set', adSetId: 'ad-set-1' },
          },
        }),
      )

      await waitFor(() => expect(screen.getByRole('button', { name: 'Open canvas' })).toBeVisible())
      fireEvent.click(screen.getByRole('button', { name: 'Open canvas' }))
      expect(openCanvasListener).toHaveBeenCalledTimes(1)
      expect(
        consoleError.mock.calls.some((call) =>
          call.some((part) => String(part).match(/maximum update depth|too many re-renders/i)),
        ),
      ).toBe(false)
    } finally {
      window.removeEventListener(PAID_ADS_OPEN_CANVAS_REQUEST_EVENT, openCanvasListener)
    }
  })
})
