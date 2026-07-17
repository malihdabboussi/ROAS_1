'use client'

import Link from 'next/link'
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { Brain, ChevronDown, House, ListChecks, Users } from 'lucide-react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { dispatchBrainAddAgentModal } from '@/features/brain/lib/brain-agent-modal.events'
import { cn } from '@/lib/utils/cn'
import { HubDockFlyout, HUB_DOCK_FLYOUT_LEAVE_MS } from './HubDockFlyout'
import { SidebarBrainNavLinks } from './SidebarBrainFlyout'
import { SidebarHqHubMenuSpacesSection } from './SidebarHqHubMenuSpacesSection'
import { SidebarHqMoreFlyoutBody } from './SidebarHqMoreFlyoutBody'
import { SidebarTeam2Flyout } from './SidebarTeam2Flyout'
import type { HubMenuSectionId } from './sidebar-hq-hub-menu.types'
import type { SidebarControllerReturn } from './useSidebarController'

type DockKey = 'team' | 'spaces' | 'brain' | 'more'

function NavRow({
  active,
  icon,
  label,
  href,
  onNavigate,
  onHover,
  onLeave,
  rowRef,
  trailing,
}: {
  active?: boolean
  icon: ReactNode
  label: string
  href?: string
  onNavigate?: () => void
  onHover?: () => void
  onLeave?: () => void
  rowRef?: (el: HTMLElement | null) => void
  trailing?: ReactNode
}) {
  const className = cn(
    'hub-menu-link-row',
    active && 'hub-menu-link-row-active nav-glass-selected-purple nav-glass-text-purple',
  )
  const inner = (
    <>
      <span className="shrink-0">{icon}</span>
      <span className="body-3 flex-1 truncate text-left">{label}</span>
      {trailing}
    </>
  )

  const setRefs = (el: HTMLElement | null) => {
    rowRef?.(el)
  }

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={(e) => {
        // Pointer moved into the dock flyout — keep it open.
        if (
          e.relatedTarget instanceof Element &&
          e.relatedTarget.closest('[data-hub-dock-flyout]')
        ) {
          return
        }
        onLeave?.()
      }}
    >
      {href ? (
        <Link
          href={href}
          onClick={onNavigate}
          className={className}
          ref={setRefs as (el: HTMLAnchorElement | null) => void}
        >
          {inner}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onNavigate}
          className={cn(className, 'w-full')}
          ref={setRefs as (el: HTMLButtonElement | null) => void}
        >
          {inner}
        </button>
      )}
    </div>
  )
}

export function SidebarHqHubMenuContent({
  c,
  variant,
  onNavigate,
  showAdminSections,
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
  c: SidebarControllerReturn
  variant: 'panel' | 'drawer'
  expandedSections: Set<HubMenuSectionId>
  onToggleSection: (sectionId: HubMenuSectionId) => void
  onNavigate?: () => void
  showAdminSections: boolean
  spacesSearchOpen: boolean
  setSpacesSearchOpen: Dispatch<SetStateAction<boolean>>
  spacesSearchQuery: string
  setSpacesSearchQuery: Dispatch<SetStateAction<string>>
  spacesSearchInputRef: React.RefObject<HTMLInputElement | null>
  hiddenSidebarCount: number
  hiddenEyeRef: React.RefObject<HTMLButtonElement | null>
  hiddenMenuOpen: boolean
  setHiddenMenuOpen: Dispatch<SetStateAction<boolean>>
  openHiddenMenu: () => void
  setBrowsePanelBucket: Dispatch<SetStateAction<string | null>>
  setCreateSpaceModalFor: Dispatch<SetStateAction<{ campaignId: string | null } | null>>
  spaceUserState: ReturnType<typeof useSpaceUserState>
}) {
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)
  const setChatCollapsed = useGlobalChatStore((s) => s.setCollapsed)
  const setMenuMode = useShellStore((s) => s.setMenuMode)
  const flyoutCloseEpoch = useShellStore((s) => s.sidebarFlyoutCloseEpoch)
  const [dock, setDock] = useState<DockKey | null>(null)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const [pinned, setPinned] = useState(false)
  const [subOpen, setSubOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rowEls = useRef<Partial<Record<DockKey, HTMLElement | null>>>({})
  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const closeDock = useCallback(() => {
    clearClose()
    setDock(null)
    setAnchor(null)
    setPinned(false)
    setSubOpen(false)
    setSpacesSearchOpen(false)
    setSpacesSearchQuery('')
    c.setIsCreatingProject(false)
    c.setNewProjectName('')
  }, [c.setIsCreatingProject, c.setNewProjectName, setSpacesSearchOpen, setSpacesSearchQuery])

  const measure = useCallback((key: DockKey) => {
    const el = rowEls.current[key]
    if (!el) return null
    return el.getBoundingClientRect()
  }, [])

  const openDock = useCallback(
    (key: DockKey) => {
      clearClose()
      const rect = measure(key)
      setDock(key)
      setPinned(false)
      setSubOpen(false)
      if (rect) setAnchor(rect)
    },
    [measure],
  )

  const scheduleClose = useCallback(() => {
    if (pinned || subOpen) return
    clearClose()
    closeTimer.current = setTimeout(() => {
      closeDock()
    }, HUB_DOCK_FLYOUT_LEAVE_MS)
  }, [closeDock, pinned, subOpen])

  useLayoutEffect(() => {
    if (!dock) return
    const rect = measure(dock)
    if (rect) setAnchor(rect)
  }, [dock, measure])

  useEffect(() => () => clearClose(), [])

  useEffect(() => {
    if (flyoutCloseEpoch === 0) return
    closeDock()
  }, [flyoutCloseEpoch, closeDock])

  const handleNavigate = () => {
    setChatCollapsed(true)
    closeDock()
    onNavigate?.()
  }

  const pinnedCampaigns = c.manageCampaigns.filter((camp) => camp.isPinned || camp.isFavorite)
  const showFlyout = Boolean(dock && anchor)

  return (
    <div
      className={cn('hub-menu-content flex min-h-0 flex-1 flex-col', variant === 'drawer' && 'px-0')}
    >
      <div className="scrollbar-hide min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        <NavRow
          href="/home"
          active={c.pathname === '/home'}
          icon={<House />}
          label="Home"
          onNavigate={() => {
            setMenuMode('home')
            setWorkContext({ surface: 'general' })
            handleNavigate()
          }}
          onHover={() => scheduleClose()}
        />

        <NavRow
          href="/team"
          active={c.pathname.startsWith('/team')}
          icon={<Users />}
          label="Team"
          rowRef={(el) => {
            rowEls.current.team = el
          }}
          onNavigate={() => {
            setWorkContext({ surface: 'team' })
            handleNavigate()
          }}
          onHover={() => openDock('team')}
          onLeave={scheduleClose}
        />

        <NavRow
          href="/campaigns"
          active={c.pathname.startsWith('/campaigns') || c.pathname.startsWith('/spaces')}
          icon={<ListChecks />}
          label="Campaigns"
          rowRef={(el) => {
            rowEls.current.spaces = el
          }}
          onNavigate={() => {
            setWorkContext({ surface: 'spaces' })
            handleNavigate()
          }}
          onHover={() => openDock('spaces')}
          onLeave={scheduleClose}
        />

        <NavRow
          href="/brain"
          active={c.pathname.startsWith('/brain')}
          icon={<Brain />}
          label="Brain"
          rowRef={(el) => {
            rowEls.current.brain = el
          }}
          onNavigate={() => {
            setWorkContext({ surface: 'brain' })
            handleNavigate()
          }}
          onHover={() => openDock('brain')}
          onLeave={scheduleClose}
        />

        {/* More = Projects + Flows — always available; hover opens docked menu */}
        <NavRow
          icon={<ChevronDown className="hub-menu-more-chevron" />}
          label="More"
          active={
            dock === 'more' ||
            c.pathname.startsWith('/projects') ||
            c.pathname.startsWith('/flows')
          }
          rowRef={(el) => {
            rowEls.current.more = el
          }}
          onNavigate={() => openDock('more')}
          onHover={() => openDock('more')}
          onLeave={scheduleClose}
        />

        {pinnedCampaigns.length > 0 ? (
          <div className="mt-4 space-y-0.5">
            <p className="hub-menu-section-label">Pinned</p>
            {pinnedCampaigns.slice(0, 8).map((camp) => (
              <Link
                key={camp.id}
                href="/campaigns"
                onClick={() => {
                  setWorkContext({ surface: 'spaces' })
                  handleNavigate()
                }}
                className="hub-menu-link-row"
              >
                <ListChecks className="icon-md shrink-0" />
                <span className="body-3 truncate">{camp.name}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {showFlyout && dock === 'team' && anchor ? (
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
      ) : null}

      {showFlyout && dock === 'spaces' && anchor ? (
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
      ) : null}

      {showFlyout && dock === 'brain' && anchor ? (
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
            fallback={
              <p className="body-3 text-muted-foreground px-3 py-4 text-center">Loading…</p>
            }
          >
            <SidebarBrainNavLinks onNavigate={handleNavigate} />
          </Suspense>
        </HubDockFlyout>
      ) : null}

      {showFlyout && dock === 'more' && anchor ? (
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
      ) : null}
    </div>
  )
}
