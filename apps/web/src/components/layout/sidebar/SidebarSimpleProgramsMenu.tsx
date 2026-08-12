'use client'

import { useRef, useState } from 'react'
import { ListChecks } from 'lucide-react'
import { CreateSpaceModal } from '@/features/spaces/components/CreateSpaceModal'
import { SpaceTemplatesBrowsePanel } from '@/features/spaces/components/templates/SpaceTemplatesBrowsePanel'
import type { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { HUB_DOCK_FLYOUT_LEAVE_MS, HubDockFlyout } from './HubDockFlyout'
import { SidebarHqHubMenuSpacesSection } from './SidebarHqHubMenuSpacesSection'
import { SidebarProgramsCreateMenu, type ProgramsCreateAction } from './SidebarProgramsCreateMenu'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarSimpleProgramsMenu({
  c,
  spaceUserState,
}: {
  c: SidebarControllerReturn
  spaceUserState: ReturnType<typeof useSpaceUserState>
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [createMenuAnchor, setCreateMenuAnchor] = useState<DOMRect | null>(null)
  const [browsePanelBucket, setBrowsePanelBucket] = useState<string | null>(null)
  const [createSpaceModalFor, setCreateSpaceModalFor] = useState<{ campaignId: string | null } | null>(
    null,
  )
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearClose = () => {
    if (!closeTimer.current) return
    clearTimeout(closeTimer.current)
    closeTimer.current = null
  }
  const scheduleClose = () => {
    clearClose()
    if (createMenuAnchor) return
    closeTimer.current = setTimeout(() => setAnchor(null), HUB_DOCK_FLYOUT_LEAVE_MS)
  }
  const handleCreate = (action: ProgramsCreateAction) => {
    if (action === 'program') c.setShowNewProgramModal(true)
    else if (action === 'campaign') {
      c.setCreateCampaignProgramId(null)
      c.setShowNewCampaignModal(true)
    } else setCreateSpaceModalFor({ campaignId: null })
  }

  return (
    <>
      <button
        type="button"
        data-hub-rail-trigger="spaces"
        className="hub-menu-link-row !py-spacing-1 w-full"
        onMouseEnter={(event) => {
          clearClose()
          setAnchor(event.currentTarget.getBoundingClientRect())
        }}
        onMouseLeave={scheduleClose}
        onFocus={(event) => setAnchor(event.currentTarget.getBoundingClientRect())}
        onClick={() => c.router.push('/campaigns')}
      >
        <ListChecks className="icon-sm" aria-hidden />
        <span className="body-2">Programs</span>
      </button>
      {anchor ? (
        <HubDockFlyout
          anchor={anchor}
          title="Programs"
          fixedWidth
          placement="right"
          onEnter={clearClose}
          onLeave={scheduleClose}
          onClose={() => setAnchor(null)}
          leaveSuspended={Boolean(createMenuAnchor)}
          headerActions={[
            { kind: 'search', title: 'Search programs', onClick: () => setSearchOpen(true) },
            {
              kind: 'plus',
              title: 'Create',
              onClick: (event) => setCreateMenuAnchor(event.currentTarget.getBoundingClientRect()),
            },
          ]}
          searchOpen={searchOpen}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchClose={() => {
            setSearchOpen(false)
            setSearchQuery('')
          }}
          searchPlaceholder="Search programs…"
          searchInputRef={searchInputRef}
        >
          <SidebarHqHubMenuSpacesSection
            c={c}
            spacesSearchOpen={searchOpen}
            setSpacesSearchOpen={setSearchOpen}
            spacesSearchQuery={searchQuery}
            setSpacesSearchQuery={setSearchQuery}
            spacesSearchInputRef={searchInputRef}
            hiddenSidebarCount={0}
            hiddenEyeRef={{ current: null }}
            hiddenMenuOpen={false}
            setHiddenMenuOpen={() => undefined}
            openHiddenMenu={() => undefined}
            setBrowsePanelBucket={setBrowsePanelBucket}
            setCreateSpaceModalFor={setCreateSpaceModalFor}
            spaceUserState={spaceUserState}
          />
        </HubDockFlyout>
      ) : null}
      <SidebarProgramsCreateMenu
        open={Boolean(createMenuAnchor)}
        anchorRect={createMenuAnchor}
        onClose={() => setCreateMenuAnchor(null)}
        onSelect={handleCreate}
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
          onOpenChange={(open) => {
            if (!open) setCreateSpaceModalFor(null)
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
    </>
  )
}
