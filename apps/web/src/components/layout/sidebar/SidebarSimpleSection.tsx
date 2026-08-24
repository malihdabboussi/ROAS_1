'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Inbox,
  Layers3,
  ListTodo,
  Rocket,
  Search,
  SquarePen,
  Users,
} from 'lucide-react'
import { ConversationHubSectionHeader } from '@/components/conversations/SpaceConversationSections'
import { AvatarDropdown } from '@/components/layout/AvatarDropdown'
import { useShellMenuDock } from '@/components/shell/use-shell-menu-dock'
import { useShellStore } from '@/components/shell/use-shell-store'
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
import { SidebarSimpleRecents } from './SidebarSimpleRecents'
import type { SidebarControllerReturn } from './useSidebarController'

const SIMPLE_LINKS = [
  { href: '/home/inbox', label: 'Inbox', icon: Inbox },
  { href: '/home/meetings', label: 'Meetings', icon: CalendarDays },
  { href: '/all-tasks', label: 'All Tasks', icon: ListTodo },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/client-campaigns', label: 'Client Campaigns', icon: BriefcaseBusiness },
  { href: '/launches', label: 'Launches', icon: Rocket },
  { href: '/artifacts', label: 'Artifacts', icon: Layers3 },
] as const
export function SidebarSimpleSection({
  c,
  featureUpdates,
}: {
  c: SidebarControllerReturn
  featureUpdates?: { hasUnread: boolean; onOpen: (anchor: HTMLElement) => void }
}) {
  const menuCompact = useShellMenuDock((state) => state.menuCompact)
  const chatOpen = useShellStore((state) => state.chatDrawer.open)
  const artifactOpen = useShellStore((state) => Boolean(state.artifactViewer.target))
  const openFreshChatDrawer = useShellStore((state) => state.openFreshChatDrawer)
  const showScreenOnly = useShellStore((state) => state.showScreenOnly)
  const searchParams = useSearchParams()
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
  const hasFavorites =
    favoritePrograms.length > 0 || favoriteCampaigns.length > 0 || favoriteSpaces.length > 0
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
  const newChatSelected =
    c.pathname === '/home' && !searchParams?.get('conv') && searchParams?.get('chat') !== 'starting'
  const handleNewChat = () => {
    if (!chatOpen && (c.pathname !== '/home' || artifactOpen)) {
      openFreshChatDrawer()
      return
    }
    c.router.push('/home?chat=new')
  }
  const navigation = (
    <div>
      <div className="px-spacing-3 pb-spacing-1 space-y-0">
        <button
          type="button"
          className={cn(
            'hub-menu-link-row !py-spacing-1 w-full',
            newChatSelected && 'nav-glass-selected-purple',
          )}
          onClick={handleNewChat}
        >
          <SquarePen className="icon-sm nav-glass-text-purple" aria-hidden />
          <span className="body-2">New chat</span>
        </button>
      </div>
      <div className="px-spacing-3 py-spacing-1 space-y-0">
        {SIMPLE_LINKS.map((item) => {
          const Icon = item.icon
          const active = c.isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={showScreenOnly}
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
      {hasFavorites ? (
        <div className="px-spacing-3 pb-spacing-1">
          <ConversationHubSectionHeader
            label="Favorites"
            expanded={favoritesOpen}
            onToggle={() => setFavoritesOpen((open) => !open)}
          />
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
      ) : null}
      <div className="px-spacing-3 pb-spacing-1">
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
    <div className="hub-sidebar-shell surface-card border-border flex h-full min-h-0 flex-col border-r">
      <div className="hub-sidebar-logo-header hub-sidebar-logo-header-start gap-spacing-1">
        <SidebarHqHubLogoButton expanded wordmark />
        <div className="gap-spacing-1 flex items-center">
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
    </div>
  )
  const moreFlyout = moreAnchor ? (
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
  ) : null
  if (!menuCompact) {
    return (
      <>
        {expandedSidebar}
        {moreFlyout}
      </>
    )
  }
  return (
    <div className="relative h-full">
      <div className="hub-sidebar-shell surface-card border-border flex h-full min-h-0 flex-col border-r">
        <div className="hub-sidebar-logo-header">
          <SidebarHqHubLogoButton expanded={false} />
        </div>
        <nav className="px-spacing-1 gap-spacing-1 flex min-h-0 flex-1 flex-col overflow-y-auto">
          <button
            type="button"
            className={cn(
              'hub-menu-link-row justify-center',
              newChatSelected && 'nav-glass-selected-purple',
            )}
            onClick={handleNewChat}
            aria-label="New chat"
            title="New chat"
          >
            <SquarePen className="icon-sm nav-glass-text-purple" aria-hidden />
          </button>
          {SIMPLE_LINKS.map((item) => {
            const Icon = item.icon
            const active = c.isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={showScreenOnly}
                className={cn(
                  'hub-menu-link-row justify-center',
                  active && 'nav-glass-selected-purple',
                )}
                aria-label={item.label}
                title={item.label}
              >
                <Icon className="icon-sm" aria-hidden />
              </Link>
            )
          })}
          <button
            type="button"
            className="hub-menu-link-row justify-center"
            aria-label="More"
            title="More"
            aria-expanded={Boolean(moreAnchor)}
            onClick={(event) => {
              clearClose()
              const anchor = event.currentTarget.getBoundingClientRect()
              setMoreAnchor((current) => (current ? null : anchor))
            }}
          >
            <Ellipsis className="icon-sm" aria-hidden />
          </button>
        </nav>
      </div>
      {moreFlyout}
    </div>
  )
}
