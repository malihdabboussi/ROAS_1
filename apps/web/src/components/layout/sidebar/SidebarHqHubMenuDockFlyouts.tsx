'use client'

import { Suspense, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { dispatchBrainAddAgentModal } from '@/features/brain/lib/brain-agent-modal.events'
import type { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { HubDockFlyout } from './HubDockFlyout'
import { SidebarBrainNavLinks } from './SidebarBrainFlyout'
import { SidebarHqHubMenuSpacesSection } from './SidebarHqHubMenuSpacesSection'
import { SidebarHqMoreFlyoutBody } from './SidebarHqMoreFlyoutBody'
import { SidebarTeam2Flyout } from './SidebarTeam2Flyout'
import type { SidebarControllerReturn } from './useSidebarController'

export type HubMenuDockKey = 'team' | 'spaces' | 'brain' | 'more'

export function SidebarHqHubMenuDockFlyouts({
  showFlyout,
  dock,
  anchor,
  clearClose,
  scheduleClose,
  closeDock,
  pinned,
  setPinned,
  subOpen,
  setSubOpen,
  handleNavigate,
  c,
  spacesSearchOpen,
  setSpacesSearchOpen,
  spacesSearchQuery,
  setSpacesSearchQuery,
  spacesSearchInputRef,
  hiddenSidebarCount,
  hiddenEyeRef,
  hiddenMenuOpen,
  setHiddenMenuOpen,
  openHiddenMenu,
  setBrowsePanelBucket,
  setCreateSpaceModalFor,
  spaceUserState,
  showAdminSections,
}: {
  showFlyout: boolean
  dock: HubMenuDockKey | null
  anchor: DOMRect | null
  clearClose: () => void
  scheduleClose: () => void
  closeDock: () => void
  pinned: boolean
  setPinned: Dispatch<SetStateAction<boolean>>
  subOpen: boolean
  setSubOpen: Dispatch<SetStateAction<boolean>>
  handleNavigate: () => void
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
  setBrowsePanelBucket: Dispatch<SetStateAction<string | null>>
  setCreateSpaceModalFor: Dispatch<SetStateAction<{ campaignId: string | null } | null>>
  spaceUserState: ReturnType<typeof useSpaceUserState>
  showAdminSections: boolean
}) {
  if (!showFlyout || !dock || !anchor) return null

  if (dock === 'team') {
    return (
      <HubDockFlyout
        anchor={anchor}
        title="Team"
        onEnter={clearClose}
        onLeave={scheduleClose}
        onClose={closeDock}
        pinned={pinned}
        onPinnedChange={setPinned}
        headerActions={[
          {
            kind: 'plus',
            title: 'New agent',
            onClick: () => {
              handleNavigate()
              c.router.push('/team')
            },
          },
        ]}
      >
        <SidebarTeam2Flyout pathname={c.pathname} embedded />
      </HubDockFlyout>
    )
  }

  if (dock === 'spaces') {
    return (
      <HubDockFlyout
        anchor={anchor}
        title="Campaigns"
        onEnter={clearClose}
        onLeave={scheduleClose}
        onClose={closeDock}
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
        <SidebarHqHubMenuSpacesSection
          c={c}
          spacesSearchOpen={spacesSearchOpen}
          setSpacesSearchOpen={setSpacesSearchOpen}
          spacesSearchQuery={spacesSearchQuery}
          setSpacesSearchQuery={setSpacesSearchQuery}
          spacesSearchInputRef={spacesSearchInputRef}
          hiddenSidebarCount={hiddenSidebarCount}
          hiddenEyeRef={hiddenEyeRef}
          hiddenMenuOpen={hiddenMenuOpen}
          setHiddenMenuOpen={setHiddenMenuOpen}
          openHiddenMenu={openHiddenMenu}
          setBrowsePanelBucket={setBrowsePanelBucket}
          setCreateSpaceModalFor={setCreateSpaceModalFor}
          spaceUserState={spaceUserState}
          onHoldParentFlyout={clearClose}
          onReleaseParentFlyout={scheduleClose}
          onSubFlyoutOpenChange={setSubOpen}
          onCloseParentFlyout={closeDock}
        />
      </HubDockFlyout>
    )
  }

  if (dock === 'brain') {
    return (
      <HubDockFlyout
        anchor={anchor}
        title="Brain"
        onEnter={clearClose}
        onLeave={scheduleClose}
        onClose={closeDock}
        pinned={pinned}
        onPinnedChange={setPinned}
        headerActions={[
          {
            kind: 'search',
            title: 'Search brains',
            onClick: () => {
              /* optional: focus manage brains */
              handleNavigate()
              c.router.push('/brain')
            },
          },
          {
            kind: 'plus',
            title: 'Add knowledge',
            onClick: () => {
              handleNavigate()
              dispatchBrainAddAgentModal()
            },
          },
        ]}
      >
        <Suspense
          fallback={<p className="body-3 text-muted-foreground px-3 py-4 text-center">Loading…</p>}
        >
          <SidebarBrainNavLinks onNavigate={handleNavigate} />
        </Suspense>
      </HubDockFlyout>
    )
  }

  return (
    <HubDockFlyout
      anchor={anchor}
      title="More"
      onEnter={clearClose}
      onLeave={scheduleClose}
      onClose={closeDock}
      pinned={pinned}
      onPinnedChange={setPinned}
      leaveSuspended={subOpen}
    >
      <SidebarHqMoreFlyoutBody
        c={c}
        showProjects={showAdminSections}
        onNavigate={handleNavigate}
        onHoldParentFlyout={clearClose}
        onReleaseParentFlyout={scheduleClose}
        onSubFlyoutOpenChange={setSubOpen}
        onCloseParentFlyout={closeDock}
      />
    </HubDockFlyout>
  )
}
