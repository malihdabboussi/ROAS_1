'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CreateSpaceModal } from '@/features/spaces/components/CreateSpaceModal'
import { SpaceTemplatesBrowsePanel } from '@/features/spaces/components/templates/SpaceTemplatesBrowsePanel'
import { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { manageRailItems } from './manage-rail-items'
import { SidebarHiddenFromSidebarDropdown } from './SidebarHiddenFromSidebarDropdown'
import { SidebarHqFlyouts } from './SidebarHqFlyouts'
import { SidebarHqMobileDrawer } from './SidebarHqMobileDrawer'
import { SidebarHqRail } from './SidebarHqRail'
import type { SidebarControllerReturn } from './useSidebarController'

const SPACES_FLYOUT_CLOSE_DELAY_MS = 140
const HOVER_CLOSE_PANELS = new Set(['spaces', 'team2', 'brain'])
const adminOnlyRailItemIds = new Set(['projects', 'flows'])

export function SidebarHqSection({
  c,
  featureUpdates,
}: {
  c: SidebarControllerReturn
  featureUpdates?: { hasUnread: boolean; onOpen: (anchor: HTMLElement) => void }
}) {
  const [mobileListsOpen, setMobileListsOpen] = useState(false)
  const [mobileBrainsOpen, setMobileBrainsOpen] = useState(false)
  const [spacesSearchOpen, setSpacesSearchOpen] = useState(false)
  const [spacesSearchQuery, setSpacesSearchQuery] = useState('')
  const [hiddenMenuOpen, setHiddenMenuOpen] = useState(false)
  const hiddenEyeRef = useRef<HTMLButtonElement | null>(null)
  const [hiddenMenuAnchor, setHiddenMenuAnchor] = useState<DOMRect | null>(null)
  const spaceUserState = useSpaceUserState()
  const [browsePanelBucket, setBrowsePanelBucket] = useState<string | null>(null)
  const [createSpaceModalFor, setCreateSpaceModalFor] = useState<{
    campaignId: string | null
  } | null>(null)
  const spacesSearchInputRef = useRef<HTMLInputElement | null>(null)
  const spacesFlyoutCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeManagePanelRef = useRef(c.activeManagePanel)

  useEffect(() => {
    activeManagePanelRef.current = c.activeManagePanel
  }, [c.activeManagePanel])

  const clearSpacesFlyoutCloseTimer = () => {
    if (spacesFlyoutCloseTimerRef.current != null) {
      clearTimeout(spacesFlyoutCloseTimerRef.current)
      spacesFlyoutCloseTimerRef.current = null
    }
  }

  useEffect(() => () => clearSpacesFlyoutCloseTimer(), [])

  useEffect(() => {
    if (spacesSearchOpen) {
      requestAnimationFrame(() => spacesSearchInputRef.current?.focus())
    }
  }, [spacesSearchOpen])

  useEffect(() => {
    if (c.activeManagePanel !== 'spaces') {
      setSpacesSearchOpen(false)
      setSpacesSearchQuery('')
      setHiddenMenuOpen(false)
    }
  }, [c.activeManagePanel])

  useEffect(() => {
    if (!c.mobileDrawerOpen) setMobileBrainsOpen(false)
  }, [c.mobileDrawerOpen])

  const hiddenSpaces = useMemo(
    () =>
      c.sidebarLists
        .filter((s) => !s.share_meta && spaceUserState.hiddenIds.has(s.id))
        .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '')),
    [c.sidebarLists, spaceUserState.hiddenIds],
  )
  const hiddenSidebarCount = c.hiddenCampaigns.length + hiddenSpaces.length
  const visibleRailItems = useMemo(
    () =>
      c.isAdmin
        ? manageRailItems
        : manageRailItems.filter((item) => !adminOnlyRailItemIds.has(item.id)),
    [c.isAdmin],
  )

  const openHiddenMenu = () => {
    if (hiddenEyeRef.current) {
      setHiddenMenuAnchor(hiddenEyeRef.current.getBoundingClientRect())
    }
    setHiddenMenuOpen(true)
  }

  const scheduleSpacesFlyoutClose = () => {
    if (!HOVER_CLOSE_PANELS.has(activeManagePanelRef.current ?? '')) return
    clearSpacesFlyoutCloseTimer()
    spacesFlyoutCloseTimerRef.current = setTimeout(() => {
      spacesFlyoutCloseTimerRef.current = null
      if (!HOVER_CLOSE_PANELS.has(activeManagePanelRef.current ?? '')) return
      c.setIsPanelClosing(true)
    }, SPACES_FLYOUT_CLOSE_DELAY_MS)
  }

  const closeHoverManageFlyout = () => {
    clearSpacesFlyoutCloseTimer()
    if (c.activeManagePanel && HOVER_CLOSE_PANELS.has(c.activeManagePanel)) {
      c.setIsPanelClosing(true)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-visible">
      {c.mobileDrawerOpen ? (
        <SidebarHqMobileDrawer
          c={c}
          featureUpdates={featureUpdates}
          visibleRailItems={visibleRailItems}
          mobileListsOpen={mobileListsOpen}
          setMobileListsOpen={setMobileListsOpen}
          mobileBrainsOpen={mobileBrainsOpen}
          setMobileBrainsOpen={setMobileBrainsOpen}
        />
      ) : (
        <div
          className="relative flex min-h-0 flex-1 flex-row overflow-visible"
          onMouseEnter={clearSpacesFlyoutCloseTimer}
          onMouseLeave={scheduleSpacesFlyoutClose}
        >
          <SidebarHqRail
            c={c}
            featureUpdates={featureUpdates}
            visibleRailItems={visibleRailItems}
            clearSpacesFlyoutCloseTimer={clearSpacesFlyoutCloseTimer}
            closeHoverManageFlyout={closeHoverManageFlyout}
          />
          <SidebarHqFlyouts
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
            clearSpacesFlyoutCloseTimer={clearSpacesFlyoutCloseTimer}
            scheduleSpacesFlyoutClose={scheduleSpacesFlyoutClose}
            setBrowsePanelBucket={setBrowsePanelBucket}
            setCreateSpaceModalFor={setCreateSpaceModalFor}
            spaceUserState={spaceUserState}
          />
        </div>
      )}

      <SidebarHiddenFromSidebarDropdown
        open={hiddenMenuOpen}
        anchorRect={hiddenMenuAnchor}
        onClose={() => setHiddenMenuOpen(false)}
        hiddenCampaigns={c.hiddenCampaigns}
        hiddenSpaces={hiddenSpaces}
        onUnhideCampaign={(id) => void c.toggleHiddenCampaign(id)}
        onUnhideSpace={(id) => void spaceUserState.unhide(id)}
      />

      {browsePanelBucket !== null ? (
        <SpaceTemplatesBrowsePanel
          open
          campaignId={browsePanelBucket || null}
          onClose={() => setBrowsePanelBucket(null)}
        />
      ) : null}

      {createSpaceModalFor ? (
        <CreateSpaceModal
          open
          onOpenChange={(o) => {
            if (!o) setCreateSpaceModalFor(null)
          }}
          onBrowseTemplates={() => {
            setBrowsePanelBucket(createSpaceModalFor.campaignId ?? '')
            setCreateSpaceModalFor(null)
          }}
          onCreate={async (payload) => {
            await c.handleCreateListFull({
              ...payload,
              campaign_id: createSpaceModalFor.campaignId,
            })
          }}
        />
      ) : null}
    </div>
  )
}
