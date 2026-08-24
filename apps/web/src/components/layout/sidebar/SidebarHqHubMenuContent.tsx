'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  Brain,
  BriefcaseBusiness,
  ChevronDown,
  Inbox,
  Layers3,
  ListChecks,
  Rocket,
  Users,
} from 'lucide-react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { cn } from '@/lib/utils/cn'
import { HUB_DOCK_FLYOUT_LEAVE_MS } from './HubDockFlyout'
import type { HubMenuSectionId } from './sidebar-hq-hub-menu.types'
import { SidebarHqHubMenuDockFlyouts, type HubMenuDockKey } from './SidebarHqHubMenuDockFlyouts'
import { SidebarHqHubMenuNavRow } from './SidebarHqHubMenuNavRow'
import type { SidebarControllerReturn } from './useSidebarController'

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
  featureUpdates,
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
  featureUpdates?: { hasUnread: boolean; onOpen: (anchor: HTMLElement) => void }
}) {
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)
  const setChatCollapsed = useGlobalChatStore((s) => s.setCollapsed)
  const flyoutCloseEpoch = useShellStore((s) => s.sidebarFlyoutCloseEpoch)
  const [dock, setDock] = useState<HubMenuDockKey | null>(null)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const [pinned, setPinned] = useState(false)
  const [subOpen, setSubOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rowEls = useRef<Partial<Record<HubMenuDockKey, HTMLElement | null>>>({})
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

  const measure = useCallback((key: HubMenuDockKey) => {
    const el = rowEls.current[key]
    if (!el) return null
    return el.getBoundingClientRect()
  }, [])

  const openDock = useCallback(
    (key: HubMenuDockKey) => {
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
      className={cn(
        'hub-menu-content flex min-h-0 flex-1 flex-col',
        variant === 'drawer' && 'px-0',
      )}
    >
      <div className="scrollbar-hide min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        <SidebarHqHubMenuNavRow
          href="/home"
          active={c.pathname === '/home'}
          icon={<Inbox />}
          label="Inbox"
          onNavigate={() => {
            setWorkContext({ surface: 'general' })
            handleNavigate()
          }}
          onHover={() => scheduleClose()}
        />

        <SidebarHqHubMenuNavRow
          href="/clients"
          active={c.isActive('/clients')}
          icon={<Users />}
          label="Clients"
          onNavigate={() => {
            setWorkContext({ surface: 'general' })
            handleNavigate()
          }}
          onHover={() => scheduleClose()}
        />

        <SidebarHqHubMenuNavRow
          href="/client-campaigns"
          active={c.isActive('/client-campaigns')}
          icon={<BriefcaseBusiness />}
          label="Client Campaigns"
          onNavigate={() => {
            setWorkContext({ surface: 'general' })
            handleNavigate()
          }}
          onHover={() => scheduleClose()}
        />

        <SidebarHqHubMenuNavRow
          href="/launches"
          active={c.isActive('/launches')}
          icon={<Rocket />}
          label="Launches"
          onNavigate={() => {
            setWorkContext({ surface: 'general' })
            handleNavigate()
          }}
          onHover={() => scheduleClose()}
        />

        <SidebarHqHubMenuNavRow
          href="/artifacts"
          active={c.isActive('/artifacts')}
          icon={<Layers3 />}
          label="Artifacts"
          onNavigate={() => {
            setWorkContext({ surface: 'general' })
            handleNavigate()
          }}
          onHover={() => scheduleClose()}
        />

        <SidebarHqHubMenuNavRow
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

        <SidebarHqHubMenuNavRow
          href="/programs"
          active={
            c.pathname.startsWith('/campaigns') ||
            c.pathname.startsWith('/spaces') ||
            c.pathname.startsWith('/programs')
          }
          icon={<ListChecks />}
          label="Programs"
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

        <SidebarHqHubMenuNavRow
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
        <SidebarHqHubMenuNavRow
          icon={<ChevronDown className="hub-menu-more-chevron" />}
          label="More"
          active={
            dock === 'more' || c.pathname.startsWith('/projects') || c.pathname.startsWith('/flows')
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
                <span className="body-3 truncate" title={camp.name}>
                  {camp.name}
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <SidebarHqHubMenuDockFlyouts
        showFlyout={showFlyout}
        dock={dock}
        anchor={anchor}
        clearClose={clearClose}
        scheduleClose={scheduleClose}
        closeDock={closeDock}
        pinned={pinned}
        setPinned={setPinned}
        subOpen={subOpen}
        setSubOpen={setSubOpen}
        handleNavigate={handleNavigate}
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
        showAdminSections={showAdminSections}
        featureUpdates={featureUpdates}
      />
    </div>
  )
}
