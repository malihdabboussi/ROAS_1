'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Inbox,
  MessageCircle,
  PanelLeftClose,
  Search,
  SquarePen,
  Star,
} from 'lucide-react'
import { AvatarDropdown } from '@/components/layout/AvatarDropdown'
import { useShellMenuDock } from '@/components/shell/use-shell-menu-dock'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { dispatchOpenStudioSearch } from '@/features/studio/utils/open-studio-search-result'
import {
  invalidateProgramsListCache,
  loadProgramsCached,
  updateProgramUserState,
  type Program,
} from '@/lib/programs'
import { cn } from '@/lib/utils/cn'
import { HUB_DOCK_FLYOUT_LEAVE_MS, HubDockFlyout } from './HubDockFlyout'
import { SidebarFavoritesFlyout } from './SidebarFavoritesFlyout'
import { SidebarHqHubLogoButton } from './SidebarHqHubLogoButton'
import { SidebarHqMoreFlyoutBody } from './SidebarHqMoreFlyoutBody'
import { SidebarSimpleProgramsMenu } from './SidebarSimpleProgramsMenu'
import { SidebarSimpleRecents } from './SidebarSimpleRecents'
import { SidebarWordmark } from './SidebarWordmark'
import type { SidebarControllerReturn } from './useSidebarController'

const SIMPLE_LINKS = [
  { href: '/home/inbox', label: 'Inbox', icon: Inbox },
  { href: '/home/meetings', label: 'Meetings', icon: CalendarDays },
  { href: '/home/my-tasks', label: 'My Tasks', icon: CheckSquare },
] as const
export function SidebarSimpleSection({
  c,
  featureUpdates,
}: {
  c: SidebarControllerReturn
  featureUpdates?: { hasUnread: boolean; onOpen: (anchor: HTMLElement) => void }
}) {
  const menuCompact = useShellMenuDock((state) => state.menuCompact)
  const searchParams = useSearchParams()
  const setMenuCompact = useShellMenuDock((state) => state.setMenuCompact)
  const activeOrgId = useOrgStore((state) => state.activeOrgId)
  const spaceUserState = useSpaceUserState()
  const [programs, setPrograms] = useState<Program[]>([])
  const [favoritesOpen, setFavoritesOpen] = useState(true)
  const [moreAnchor, setMoreAnchor] = useState<DOMRect | null>(null)
  const [subOpen, setSubOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    let cancelled = false
    const load = () => {
      void loadProgramsCached(activeOrgId).then((rows) => {
        if (!cancelled) setPrograms(rows)
      })
    }
    load()
    window.addEventListener('roas:programs-changed', load)
    return () => {
      cancelled = true
      window.removeEventListener('roas:programs-changed', load)
    }
  }, [activeOrgId])

  const favoriteCampaigns = useMemo(
    () => c.manageCampaigns.filter((campaign) => campaign.isFavorite),
    [c.manageCampaigns],
  )
  const favoriteSpaces = useMemo(
    () => c.sidebarLists.filter((space) => spaceUserState.favoriteIds.has(space.id)),
    [c.sidebarLists, spaceUserState.favoriteIds],
  )
  const favoritePrograms = useMemo(
    () => programs.filter((program) => program.is_favorite),
    [programs],
  )
  const clearClose = () => {
    if (!closeTimer.current) return
    clearTimeout(closeTimer.current)
    closeTimer.current = null
  }
  const scheduleClose = () => {
    if (subOpen) return
    clearClose()
    closeTimer.current = setTimeout(() => setMoreAnchor(null), HUB_DOCK_FLYOUT_LEAVE_MS)
  }
  const navigation = (
    <div>
      <div className="px-spacing-3 pb-spacing-1 space-y-0">
        <button
          type="button"
          className={cn(
            'hub-menu-link-row !py-spacing-1 w-full',
            c.pathname === '/home' &&
              !searchParams?.get('conv') &&
              searchParams?.get('chat') !== 'starting' &&
              'nav-glass-selected-purple',
          )}
          onClick={() => c.router.push('/home')}
        >
          <SquarePen className="icon-sm" aria-hidden />
          <span className="body-2">New chat</span>
        </button>
      </div>
      <div className="px-spacing-3 py-spacing-1 space-y-0">
        {SIMPLE_LINKS.map((item) => {
          const Icon = item.icon
          const active = c.pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'hub-menu-link-row !py-spacing-1',
                active && 'nav-glass-selected-purple',
              )}
            >
              <Icon className="icon-sm" aria-hidden />
              <span className="body-2">{item.label}</span>
            </Link>
          )
        })}
      </div>
      <div className="px-spacing-3 pb-spacing-1">
        <button
          type="button"
          className="hub-menu-section-label gap-spacing-1 group flex w-full items-center text-left"
          aria-expanded={favoritesOpen}
          onClick={() => setFavoritesOpen((open) => !open)}
        >
          Favorites
          {favoritesOpen ? (
            <ChevronDown className="icon-xs opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100" />
          ) : (
            <ChevronRight className="icon-xs opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100" />
          )}
        </button>
        {favoritesOpen ? (
          <SidebarFavoritesFlyout
            favoritePrograms={favoritePrograms}
            favoriteCampaigns={favoriteCampaigns}
            favoriteSpaces={favoriteSpaces}
            onToggleProgramFavorite={(program) => {
              setPrograms((current) => current.filter((row) => row.id !== program.id))
              void updateProgramUserState(program.id, false)
                .then(() => {
                  invalidateProgramsListCache(activeOrgId)
                  window.dispatchEvent(new Event('roas:programs-changed'))
                })
                .catch(() => setPrograms((current) => [program, ...current]))
            }}
            onToggleCampaignFavorite={(campaign) => void c.toggleFavoriteCampaign(campaign.id)}
            onToggleSpaceFavorite={(space) => void spaceUserState.toggleFavorite(space.id)}
          />
        ) : null}
      </div>
      <div className="px-spacing-3 pb-spacing-1">
        <SidebarSimpleProgramsMenu c={c} spaceUserState={spaceUserState} />
        <button
          type="button"
          className="hub-menu-link-row !py-spacing-1 w-full"
          aria-expanded={Boolean(moreAnchor)}
          onClick={(event) => {
            clearClose()
            const anchor = event.currentTarget.getBoundingClientRect()
            setMoreAnchor((current) => (current ? null : anchor))
          }}
        >
          <Ellipsis className="icon-sm" aria-hidden />
          <span className="body-3">More</span>
        </button>
      </div>
    </div>
  )
  const expandedSidebar = (
    <div className="surface-card border-border flex h-full min-h-0 flex-col border-r">
      <div className="px-spacing-3 py-spacing-2 gap-spacing-1 flex items-center">
        <div className="min-w-0 flex-1">
          <SidebarWordmark className="max-w-full" />
        </div>
        <button
          type="button"
          className="btn-icon-bare hover:bg-hover-subtle"
          onClick={() => dispatchOpenStudioSearch()}
          aria-label="Search"
          title="Search"
        >
          <Search className="icon-sm" aria-hidden />
        </button>
        <button
          type="button"
          className="btn-icon-bare hover:bg-hover-subtle"
          onClick={() => setMenuCompact(true)}
          aria-label="Collapse menu"
          title="Collapse menu"
        >
          <PanelLeftClose className="icon-sm" aria-hidden />
        </button>
        <button
          type="button"
          className="btn-icon-bare hover:bg-hover-subtle"
          onClick={() => c.router.back()}
          aria-label="Back"
          title="Back"
        >
          <ChevronLeft className="icon-sm" aria-hidden />
        </button>
        <button
          type="button"
          className="btn-icon-bare hover:bg-hover-subtle"
          onClick={() => c.router.forward()}
          aria-label="Forward"
          title="Forward"
        >
          <ChevronRight className="icon-sm" aria-hidden />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SidebarSimpleRecents navigation={navigation} />
      </div>
      <div className="border-border px-spacing-3 py-spacing-2 border-t">
        <AvatarDropdown
          displayName={c.displayName}
          email={c.email ?? ''}
          avatarUrl={c.avatarUrl ?? null}
          initials={c.initials}
          sidebarCollapsed={false}
          featureUpdates={featureUpdates}
        />
      </div>

      {moreAnchor ? (
        <HubDockFlyout
          anchor={moreAnchor}
          title="More"
          compact
          onEnter={clearClose}
          onLeave={scheduleClose}
          onClose={() => setMoreAnchor(null)}
          leaveSuspended={subOpen}
        >
          <SidebarHqMoreFlyoutBody
            c={c}
            showProjects={c.isAdmin}
            featureUpdates={featureUpdates}
            onNavigate={() => setMoreAnchor(null)}
            onHoldParentFlyout={clearClose}
            onReleaseParentFlyout={scheduleClose}
            onSubFlyoutOpenChange={setSubOpen}
            onCloseParentFlyout={() => setMoreAnchor(null)}
          />
        </HubDockFlyout>
      ) : null}
    </div>
  )
  if (!menuCompact) return expandedSidebar
  return (
    <div className="relative h-full">
      <div className="card-glass rounded-spacing-4 gap-spacing-3 py-spacing-3 flex h-full flex-col items-center">
        <SidebarHqHubLogoButton expanded={false} />
        <button
          type="button"
          className="btn-icon-bare hover:bg-hover-subtle"
          onClick={() => c.router.push('/home?chat=new')}
          aria-label="New chat"
          title="New chat"
        >
          <SquarePen className="icon-sm" aria-hidden />
        </button>
        <button
          type="button"
          className="btn-icon-bare hover:bg-hover-subtle"
          onClick={() => dispatchOpenStudioSearch()}
          aria-label="Search conversations"
          title="Search"
        >
          <Search className="icon-sm" aria-hidden />
        </button>
        <button
          type="button"
          className="btn-icon-bare hover:bg-hover-subtle"
          onClick={() => setMenuCompact(false)}
          aria-label="Show favorites"
          title="Favorites"
        >
          <Star className="icon-sm" aria-hidden />
        </button>
        <button
          type="button"
          className="btn-icon-bare hover:bg-hover-subtle"
          onClick={() => setMenuCompact(false)}
          aria-label="Show chats"
          title="Chats"
        >
          <MessageCircle className="icon-sm" aria-hidden />
        </button>
      </div>
    </div>
  )
}
