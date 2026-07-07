import type { HTMLAttributes, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Ad, AdCampaign, AdSet } from '@/lib/artifacts'
import { PaidAdsStructurePane } from './PaidAdsStructurePane'
import {
  PAID_ADS_OPEN_CANVAS_REQUEST_EVENT,
  PAID_ADS_SELECTION_EVENT,
  type usePaidAdsData,
} from './use-paid-ads-data'

const paidAdsServiceMocks = vi.hoisted(() => ({
  createAdCampaign: vi.fn(),
  createAdSet: vi.fn(),
  deleteAdCampaign: vi.fn(),
  deleteAdSet: vi.fn(),
  duplicateAdCampaign: vi.fn(),
  duplicateAdSet: vi.fn(),
  fetchAdCampaign: vi.fn(),
  fetchAdSet: vi.fn(),
  refreshAdCampaignMetaStatus: vi.fn(),
  refreshAdSetMetaStatus: vi.fn(),
  setAdCampaignMetaStatus: vi.fn(),
  setAdSetMetaStatus: vi.fn(),
  updateAdCampaign: vi.fn(),
  updateAdSet: vi.fn(),
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    aside: ({
      children,
      transition: _transition,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      ...props
    }: HTMLAttributes<HTMLElement> & {
      transition?: unknown
      initial?: unknown
      animate?: unknown
      exit?: unknown
    }) => <aside {...props}>{children}</aside>,
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
  },
}))

vi.mock('@/lib/artifacts/paid-ads-api', () => paidAdsServiceMocks)

vi.mock('./PaidAdsDetailPane', () => ({
  PaidAdsDetailPane: ({
    selection,
    toolbarExtras,
  }: {
    selection: { kind: string; id?: string } | null
    toolbarExtras?: ReactNode
  }) => (
    <section
      data-testid="paid-ads-detail-pane"
      data-selection-kind={selection?.kind ?? 'none'}
      data-selection-id={selection?.id ?? ''}
    >
      {toolbarExtras}
    </section>
  ),
}))

vi.mock('./PaidAdsRowMenu', () => ({
  PaidAdsRowMenu: ({
    target,
    actions,
  }: {
    target: { kind: string; data: { id: string } }
    actions: {
      onAddAdSet?: () => void
      onStartRename: () => void
      onRefreshMetaStatus: () => void
    }
  }) => (
    <section data-testid="paid-ads-row-menu" data-target-kind={target.kind}>
      <button type="button" onClick={actions.onStartRename}>
        Rename from menu
      </button>
      {actions.onAddAdSet ? (
        <button type="button" onClick={actions.onAddAdSet}>
          Add ad set from menu
        </button>
      ) : null}
      <button type="button" onClick={actions.onRefreshMetaStatus}>
        Refresh from menu
      </button>
    </section>
  ),
}))

const adSetFixture = (overrides: Partial<AdSet> = {}): AdSet =>
  ({
    id: 'ad-set-1',
    name: 'Prospecting',
    metadata: {},
    meta_adset_id: 'meta-ad-set-1',
    meta_effective_status: 'PAUSED',
    ...overrides,
  }) as AdSet

const campaignFixture = (overrides: Partial<AdCampaign> = {}): AdCampaign =>
  ({
    id: 'ad-campaign-1',
    name: 'Launch Campaign',
    metadata: {},
    meta_ad_account_id: 'act_123',
    meta_campaign_id: 'meta-campaign-1',
    meta_effective_status: 'ACTIVE',
    ad_sets: [adSetFixture()],
    ...overrides,
  }) as AdCampaign

const adFixture = (overrides: Partial<Ad> = {}): Ad =>
  ({
    id: 'ad-1',
    headline: 'Hero Ad',
    ad_set_id: 'ad-set-1',
    metadata: {},
    ...overrides,
  }) as Ad

function makePaidAdsData(
  overrides: Partial<ReturnType<typeof usePaidAdsData>> = {},
): ReturnType<typeof usePaidAdsData> {
  const adCampaigns = overrides.adCampaigns ?? [campaignFixture()]
  const ads = overrides.ads ?? [adFixture()]
  const ungroupedAds = overrides.ungroupedAds ?? [adFixture({ id: 'ungrouped-ad-1', ad_set_id: null })]
  const adsByAdSetId =
    overrides.adsByAdSetId ??
    new Map<string, Ad[]>([['ad-set-1', ads.filter((ad) => ad.ad_set_id === 'ad-set-1')]])

  return {
    adCampaigns,
    ads,
    ungroupedAds,
    adsByAdSetId,
    allAdSets: overrides.allAdSets ?? [adSetFixture({ ad_campaign_id: 'ad-campaign-1' } as Partial<AdSet>)],
    loading: false,
    error: null,
    refresh: vi.fn(async () => {}),
    refreshSilent: vi.fn(),
    insertAdSet: vi.fn(),
    insertAdCampaign: vi.fn(),
    insertAd: vi.fn(),
    patchAdCampaign: vi.fn(),
    patchAdSet: vi.fn(),
    ...overrides,
  } as ReturnType<typeof usePaidAdsData>
}

describe('PaidAdsStructurePane', () => {
  beforeEach(() => {
    paidAdsServiceMocks.createAdCampaign.mockResolvedValue(
      campaignFixture({ id: 'created-campaign', name: 'Untitled Campaign', ad_sets: [] }),
    )
    paidAdsServiceMocks.createAdSet.mockResolvedValue(
      adSetFixture({ id: 'created-ad-set', name: 'Untitled Ad Set' }),
    )
    paidAdsServiceMocks.fetchAdCampaign.mockResolvedValue(campaignFixture())
    paidAdsServiceMocks.fetchAdSet.mockResolvedValue(adSetFixture())
    paidAdsServiceMocks.refreshAdCampaignMetaStatus.mockResolvedValue({})
    paidAdsServiceMocks.refreshAdSetMetaStatus.mockResolvedValue({})
    paidAdsServiceMocks.updateAdCampaign.mockImplementation(async (_id, patch) =>
      campaignFixture({ name: String(patch.name ?? 'Launch Campaign') }),
    )
    paidAdsServiceMocks.updateAdSet.mockImplementation(async (_id, patch) =>
      adSetFixture({ name: String(patch.name ?? 'Prospecting') }),
    )
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    Object.values(paidAdsServiceMocks).forEach((mock) => mock.mockReset())
  })

  it('selects campaign, ad set, and ad rows while dispatching toolbar selection events', async () => {
    const selectionListener = vi.fn()
    const onOpenCanvasForAdSet = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    window.addEventListener(PAID_ADS_SELECTION_EVENT, selectionListener)

    try {
      render(
        <PaidAdsStructurePane
          platformCampaignId="platform-campaign-1"
          spaceId="space-1"
          data={makePaidAdsData()}
          onOpenCanvasForAdSet={onOpenCanvasForAdSet}
          toolbarExtras={<button type="button">Toolbar extra</button>}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Launch Campaign' }))
      await waitFor(() => {
        expect(screen.getByTestId('paid-ads-detail-pane')).toHaveAttribute(
          'data-selection-kind',
          'campaign',
        )
      })

      const latestCampaignEvent = selectionListener.mock.calls.at(-1)?.[0] as CustomEvent
      expect(latestCampaignEvent.detail).toEqual({
        campaignId: 'platform-campaign-1',
        selection: { kind: 'campaign' },
      })

      fireEvent.click(screen.getAllByRole('button', { name: 'Expand' })[0]!)
      fireEvent.click(screen.getByRole('button', { name: 'Prospecting' }))

      await waitFor(() => {
        expect(screen.getByTestId('paid-ads-detail-pane')).toHaveAttribute(
          'data-selection-kind',
          'ad_set',
        )
      })

      const latestAdSetEvent = selectionListener.mock.calls.at(-1)?.[0] as CustomEvent
      expect(latestAdSetEvent.detail).toEqual({
        campaignId: 'platform-campaign-1',
        selection: { kind: 'ad_set', adSetId: 'ad-set-1' },
      })

      window.dispatchEvent(
        new CustomEvent(PAID_ADS_OPEN_CANVAS_REQUEST_EVENT, {
          detail: { campaignId: 'platform-campaign-1' },
        }),
      )

      expect(onOpenCanvasForAdSet).toHaveBeenCalledWith('ad-set-1')

      fireEvent.click(screen.getByRole('button', { name: 'Hero Ad' }))
      await waitFor(() => {
        expect(screen.getByTestId('paid-ads-detail-pane')).toHaveAttribute(
          'data-selection-kind',
          'ad',
        )
      })

      const latestAdEvent = selectionListener.mock.calls.at(-1)?.[0] as CustomEvent
      expect(latestAdEvent.detail).toEqual({
        campaignId: 'platform-campaign-1',
        selection: { kind: 'ad', adId: 'ad-1', adSetId: 'ad-set-1' },
      })

      expect(
        consoleError.mock.calls.some((call) =>
          call.some((part) => String(part).match(/maximum update depth|too many re-renders/i)),
        ),
      ).toBe(false)
    } finally {
      window.removeEventListener(PAID_ADS_SELECTION_EVENT, selectionListener)
      consoleError.mockRestore()
    }
  })

  it('creates campaigns and ad sets through the current row actions', async () => {
    const data = makePaidAdsData()

    render(
      <PaidAdsStructurePane
        platformCampaignId="platform-campaign-1"
        spaceId="space-1"
        data={data}
        onOpenCanvasForAdSet={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'New Campaign' }))

    await waitFor(() => {
      expect(paidAdsServiceMocks.createAdCampaign).toHaveBeenCalledWith(
        'platform-campaign-1',
        undefined,
        'space-1',
      )
      expect(data.insertAdCampaign).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'created-campaign' }),
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Campaign menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add ad set from menu' }))

    await waitFor(() => {
      expect(paidAdsServiceMocks.createAdSet).toHaveBeenCalledWith(
        'ad-campaign-1',
        'Untitled Ad Set',
        'space-1',
      )
      expect(data.insertAdSet).toHaveBeenCalledWith(
        'ad-campaign-1',
        expect.objectContaining({ id: 'created-ad-set' }),
      )
    })
  })

  it('settles across stable data rerenders without a render loop', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const data = makePaidAdsData()
    const { rerender } = render(
      <PaidAdsStructurePane
        platformCampaignId="platform-campaign-1"
        spaceId="space-1"
        data={data}
        onOpenCanvasForAdSet={vi.fn()}
      />,
    )

    rerender(
      <PaidAdsStructurePane
        platformCampaignId="platform-campaign-1"
        spaceId="space-1"
        data={data}
        onOpenCanvasForAdSet={vi.fn()}
      />,
    )

    expect(
      consoleError.mock.calls.some((call) =>
        call.some((part) => String(part).match(/maximum update depth|too many re-renders/i)),
      ),
    ).toBe(false)
    consoleError.mockRestore()
  })
})
