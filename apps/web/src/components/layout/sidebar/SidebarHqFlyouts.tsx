'use client'

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useShellStore } from '@/components/shell/use-shell-store'
import { dispatchBrainAddAgentModal } from '@/features/brain/lib/brain-agent-modal.events'
import { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { HubDockFlyout } from './HubDockFlyout'
import { SidebarBrainNavLinks } from './SidebarBrainFlyout'
import { SidebarHqMoreFlyoutBody } from './SidebarHqMoreFlyoutBody'
import { SidebarHqSpacesGroupedList } from './SidebarHqSpacesGroupedList'
import { SidebarTeam2Flyout } from './SidebarTeam2Flyout'
import type { SidebarControllerReturn } from './useSidebarController'

function railTriggerRect(panelId: string): DOMRect | null {
  if (typeof document === 'undefined') return null
  const el = document.querySelector(`[data-hub-rail-trigger="${panelId}"]`)
  return el instanceof HTMLElement ? el.getBoundingClientRect() : null
}

export function SidebarHqFlyouts({
  placement = 'all',
  c,
  spacesSearchOpen,
  setSpacesSearchOpen,
  spacesSearchQuery,
  setSpacesSearchQuery,
  spacesSearchInputRef,
  hiddenSidebarCount: _hiddenSidebarCount,
  hiddenEyeRef: _hiddenEyeRef,
  hiddenMenuOpen: _hiddenMenuOpen,
  setHiddenMenuOpen: _setHiddenMenuOpen,
  openHiddenMenu: _openHiddenMenu,
  clearSpacesFlyoutCloseTimer,
  scheduleSpacesFlyoutClose,
  setBrowsePanelBucket,
  setCreateSpaceModalFor,
  spaceUserState,
}: {
  placement?: 'all' | 'inline' | 'hover'
  c: SidebarControllerReturn
  spacesSearchOpen: boolean
  setSpacesSearchOpen: Dispatch<SetStateAction<boolean>>
  spacesSearchQuery: string
  setSpacesSearchQuery: Dispatch<SetStateAction<string>>
  spacesSearchInputRef: RefObject<HTMLInputElement | null>
  hiddenSidebarCount: number
  hiddenEyeRef: RefObject<HTMLButtonElement | null>
  hiddenMenuOpen: boolean
  setHiddenMenuOpen: Dispatch<SetStateAction<boolean>>
  openHiddenMenu: () => void
  clearSpacesFlyoutCloseTimer: () => void
  scheduleSpacesFlyoutClose: () => void
  setBrowsePanelBucket: Dispatch<SetStateAction<string | null>>
  setCreateSpaceModalFor: Dispatch<SetStateAction<{ campaignId: string | null } | null>>
  spaceUserState: ReturnType<typeof useSpaceUserState>
}) {
  const showHover = (placement === 'all' || placement === 'hover') && !c.hubMenuOpen
  const [pinned, setPinned] = useState(false)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const [subOpen, setSubOpen] = useState(false)
  const flyoutCloseEpoch = useShellStore((s) => s.sidebarFlyoutCloseEpoch)

  const hoverPanel =
    showHover && !c.isPanelClosing
      ? c.activeManagePanel === 'team2' ||
        c.activeManagePanel === 'brain' ||
        c.activeManagePanel === 'spaces' ||
        c.activeManagePanel === 'more'
        ? c.activeManagePanel
        : null
      : null

  useEffect(() => {
    if (!hoverPanel) {
      setAnchor(null)
      setPinned(false)
      setSubOpen(false)
      return
    }
    const measure = () => {
      const rect = railTriggerRect(hoverPanel)
      if (rect) setAnchor(rect)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [hoverPanel])

  const closeHover = () => {
    setPinned(false)
    setSubOpen(false)
    setSpacesSearchOpen(false)
    setSpacesSearchQuery('')
    c.setIsCreatingProject(false)
    c.setNewProjectName('')
    c.setIsPanelClosing(true)
  }

  useEffect(() => {
    if (flyoutCloseEpoch === 0) return
    if (c.activeManagePanel) closeHover()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close on epoch bump only
  }, [flyoutCloseEpoch])

  const campaignsBody = useMemo(
    () =>
      c.sidebarListsLoading ? (
        <div className="flex justify-center px-2 py-6">
          <VibeyLoadingOrb state="processing" size="sm" text="Loading spaces..." />
        </div>
      ) : (
        <SidebarHqSpacesGroupedList
          controller={c}
          spaces={c.sidebarLists}
          campaigns={c.manageCampaigns}
          pathname={c.pathname}
          expandedIds={c.expandedSpaceCampaignIds}
          setExpandedIds={c.setExpandedSpaceCampaignIds}
          onCreateSpace={(campaignId) => void c.handleCreateList(campaignId)}
          patchCampaignConfig={c.patchCampaignConfig}
          isSubmitting={c.isSubmittingList}
          creatingName={c.newListName}
          setCreatingName={c.setNewListName}
          searchQuery={spacesSearchQuery}
          onOpenBrowseTemplates={setBrowsePanelBucket}
          onOpenCreateSpaceModal={(campaignId) => setCreateSpaceModalFor({ campaignId })}
          spaceUserState={spaceUserState}
          hasMore={c.sidebarListsHasMore}
          loadingMore={c.sidebarListsLoadingMore}
          onLoadMore={() => void c.loadMoreSidebarLists()}
          flyoutMode
          onHoldParentFlyout={clearSpacesFlyoutCloseTimer}
          onReleaseParentFlyout={() => {
            if (!pinned) scheduleSpacesFlyoutClose()
          }}
          onSubFlyoutOpenChange={setSubOpen}
          onCloseParentFlyout={closeHover}
        />
      ),
    [
      c,
      clearSpacesFlyoutCloseTimer,
      pinned,
      scheduleSpacesFlyoutClose,
      setBrowsePanelBucket,
      setCreateSpaceModalFor,
      spaceUserState,
      spacesSearchQuery,
    ],
  )

  if (placement === 'inline') return null

  return (
    <>
      {hoverPanel === 'team2' && anchor ? (
        <HubDockFlyout
          anchor={anchor}
          title="Team"
          onEnter={clearSpacesFlyoutCloseTimer}
          onLeave={() => {
            if (!pinned) scheduleSpacesFlyoutClose()
          }}
          onClose={closeHover}
          pinned={pinned}
          onPinnedChange={setPinned}
          headerActions={[
            {
              kind: 'plus',
              title: 'New agent',
              onClick: () => {
                closeHover()
                c.router.push('/team')
              },
            },
          ]}
        >
          <SidebarTeam2Flyout pathname={c.pathname} />
        </HubDockFlyout>
      ) : null}

      {hoverPanel === 'brain' && anchor ? (
        <HubDockFlyout
          anchor={anchor}
          title="Brain"
          onEnter={clearSpacesFlyoutCloseTimer}
          onLeave={() => {
            if (!pinned) scheduleSpacesFlyoutClose()
          }}
          onClose={closeHover}
          pinned={pinned}
          onPinnedChange={setPinned}
          headerActions={[
            {
              kind: 'search',
              title: 'Search brains',
              onClick: () => {
                closeHover()
                c.router.push('/brain')
              },
            },
            {
              kind: 'plus',
              title: 'Add knowledge',
              onClick: () => {
                closeHover()
                dispatchBrainAddAgentModal()
              },
            },
          ]}
        >
          <Suspense
            fallback={
              <p className="body-3 px-3 py-6 text-center text-[var(--color-muted-foreground)]">
                Loading…
              </p>
            }
          >
            <SidebarBrainNavLinks onNavigate={closeHover} />
          </Suspense>
        </HubDockFlyout>
      ) : null}

      {hoverPanel === 'spaces' && anchor ? (
        <HubDockFlyout
          anchor={anchor}
          title="Campaigns"
          onEnter={clearSpacesFlyoutCloseTimer}
          onLeave={() => {
            if (!pinned && !subOpen) scheduleSpacesFlyoutClose()
          }}
          onClose={closeHover}
          pinned={pinned}
          onPinnedChange={setPinned}
          leaveSuspended={subOpen}
          headerActions={[
            {
              kind: 'search',
              title: 'Search campaigns',
              onClick: () => setSpacesSearchOpen(true),
            },
            {
              kind: 'plus',
              title: 'New campaign',
              onClick: () => c.setShowNewCampaignModal(true),
            },
          ]}
          searchOpen={spacesSearchOpen}
          searchQuery={spacesSearchQuery}
          onSearchQueryChange={setSpacesSearchQuery}
          onSearchClose={() => {
            setSpacesSearchOpen(false)
            setSpacesSearchQuery('')
          }}
          searchPlaceholder="Search campaigns…"
          searchInputRef={spacesSearchInputRef}
        >
          {campaignsBody}
        </HubDockFlyout>
      ) : null}

      {hoverPanel === 'more' && anchor ? (
        <HubDockFlyout
          anchor={anchor}
          title="More"
          onEnter={clearSpacesFlyoutCloseTimer}
          onLeave={() => {
            if (!pinned && !subOpen) scheduleSpacesFlyoutClose()
          }}
          onClose={closeHover}
          pinned={pinned}
          onPinnedChange={setPinned}
          leaveSuspended={subOpen}
        >
          <SidebarHqMoreFlyoutBody
            c={c}
            showProjects={c.isAdmin}
            onNavigate={closeHover}
            onHoldParentFlyout={clearSpacesFlyoutCloseTimer}
            onReleaseParentFlyout={() => {
              if (!pinned) scheduleSpacesFlyoutClose()
            }}
            onSubFlyoutOpenChange={setSubOpen}
            onCloseParentFlyout={closeHover}
          />
        </HubDockFlyout>
      ) : null}
    </>
  )
}
