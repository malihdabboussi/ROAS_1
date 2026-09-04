'use client'

import { Suspense, useState, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { dispatchBrainAddAgentModal } from '@/features/brain/lib/brain-agent-modal.events'
import type { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { HubDockFlyout } from './HubDockFlyout'
import { SidebarBrainNavLinks } from './SidebarBrainFlyout'
import { SidebarHqHubMenuSpacesSection } from './SidebarHqHubMenuSpacesSection'
import { SidebarProgramsCreateMenu, type ProgramsCreateAction } from './SidebarProgramsCreateMenu'
import { SidebarProjectsFlyout } from './SidebarProjectsFlyout'
import { SidebarTeam2Flyout } from './SidebarTeam2Flyout'
import type { SidebarControllerReturn } from './useSidebarController'

export type HubMenuDockKey = 'team' | 'spaces' | 'brain' | 'projects'

export function SidebarHqHubMenuDockFlyouts({
  showFlyout,
  dock,
  anchor,
  clearClose,
  scheduleClose,
  closeDock,
  pinned,
  setPinned,
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
}: {
  showFlyout: boolean
  dock: HubMenuDockKey | null
  anchor: DOMRect | null
  clearClose: () => void
  scheduleClose: () => void
  closeDock: () => void
  pinned: boolean
  setPinned: Dispatch<SetStateAction<boolean>>
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
}) {
  const [createMenuAnchor, setCreateMenuAnchor] = useState<DOMRect | null>(null)

  if (!showFlyout || !dock || !anchor) return null

  const handleCreateAction = (action: ProgramsCreateAction) => {
    if (action === 'program') {
      c.setShowNewProgramModal(true)
      return
    }
    if (action === 'campaign') {
      c.setCreateCampaignProgramId(null)
      c.setShowNewCampaignModal(true)
      return
    }
    setCreateSpaceModalFor({ campaignId: null })
  }

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
      <>
        <HubDockFlyout
          anchor={anchor}
          title="Programs"
          fixedWidth
          onEnter={clearClose}
          onLeave={scheduleClose}
          onClose={closeDock}
          pinned={pinned}
          onPinnedChange={setPinned}
          leaveSuspended={!!createMenuAnchor}
          headerActions={[
            {
              kind: 'search',
              title: 'Search programs',
              onClick: () => setSpacesSearchOpen(true),
            },
            {
              kind: 'plus',
              title: 'Create',
              onClick: (e) => setCreateMenuAnchor(e.currentTarget.getBoundingClientRect()),
            },
          ]}
          searchOpen={spacesSearchOpen}
          searchQuery={spacesSearchQuery}
          onSearchQueryChange={setSpacesSearchQuery}
          onSearchClose={() => {
            setSpacesSearchOpen(false)
            setSpacesSearchQuery('')
          }}
          searchPlaceholder="Search programs…"
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
          />
        </HubDockFlyout>
        <SidebarProgramsCreateMenu
          open={!!createMenuAnchor}
          anchorRect={createMenuAnchor}
          onClose={() => setCreateMenuAnchor(null)}
          onSelect={handleCreateAction}
        />
      </>
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
          fallback={
            <div className="px-3 py-4">
              <ListSkeleton rows={3} label="Loading…" />
            </div>
          }
        >
          <SidebarBrainNavLinks onNavigate={handleNavigate} />
        </Suspense>
      </HubDockFlyout>
    )
  }

  return (
    <SidebarProjectsFlyout
      c={c}
      anchor={anchor}
      onEnter={clearClose}
      onLeave={scheduleClose}
      onClose={closeDock}
      pinned={pinned}
      onPinnedChange={setPinned}
      onNavigate={handleNavigate}
    />
  )
}
