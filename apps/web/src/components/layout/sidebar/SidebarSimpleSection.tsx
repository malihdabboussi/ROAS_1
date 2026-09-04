'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  Inbox,
  Layers3,
  ListChecks,
  ListTodo,
  Rocket,
  Search,
  SquarePen,
  Users,
  Workflow,
} from 'lucide-react'
import { ClientScopeSelector } from '@/components/client-scope'
import { ConversationHubSectionHeader } from '@/components/conversations/SpaceConversationSections'
import { AvatarDropdown } from '@/components/layout/AvatarDropdown'
import { useShellMenuDock } from '@/components/shell/use-shell-menu-dock'
import { useShellStore } from '@/components/shell/use-shell-store'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { dispatchOpenStudioSearch } from '@/features/studio/utils/open-studio-search-result'
import { clientScopeHref, useClientScope } from '@/lib/client-scope'
import {
  invalidateProgramsListCache,
  loadProgramsCached,
  updateProgramUserState,
  type Program,
} from '@/lib/programs'
import { cn } from '@/lib/utils/cn'
import { SidebarFavoritesFlyout } from './SidebarFavoritesFlyout'
import { SidebarHqHubLogoButton } from './SidebarHqHubLogoButton'
import { SidebarProjectsFlyout } from './SidebarProjectsFlyout'
import { SidebarSimpleRecents } from './SidebarSimpleRecents'
import type { SidebarControllerReturn } from './useSidebarController'

const SIMPLE_LINKS_BEFORE_PROJECTS = [
  { href: '/home/inbox', label: 'Inbox', icon: Inbox },
  { href: '/home/meetings', label: 'Meetings', icon: CalendarDays },
  { href: '/all-tasks', label: 'All Tasks', icon: ListTodo },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/client-campaigns', label: 'Client Campaigns', icon: BriefcaseBusiness },
  { href: '/launches', label: 'Launches', icon: Rocket },
  { href: '/artifacts', label: 'Artifacts', icon: Layers3 },
  { href: '/programs', label: 'Programs', icon: ListChecks },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/brain', label: 'Brain', icon: Brain },
] as const
const SIMPLE_FLOWS_LINK = { href: '/flows', label: 'Flows', icon: Workflow } as const

function isSimpleLinkActive(pathname: string, href: string, isActive: (href: string) => boolean) {
  if (href === '/programs') {
    return (
      pathname.startsWith('/programs') ||
      pathname.startsWith('/campaigns') ||
      pathname.startsWith('/spaces')
    )
  }
  return isActive(href)
}

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
  const { selectedClientId } = useClientScope()
  const spaceUserState = useSpaceUserState()
  const [programs, setPrograms] = useState<Program[]>([])
  const [favoritesOpen, setFavoritesOpen] = useState(true)
  const [projectsAnchor, setProjectsAnchor] = useState<DOMRect | null>(null)
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
  const closeProjects = useCallback(() => {
    setProjectsAnchor(null)
    c.setActiveManagePanel(null)
    c.setIsCreatingProject(false)
    c.setNewProjectName('')
  }, [c.setActiveManagePanel, c.setIsCreatingProject, c.setNewProjectName])
  const toggleProjects = (target: HTMLElement) => {
    if (projectsAnchor) {
      closeProjects()
      return
    }
    c.setActiveManagePanel('projects')
    setProjectsAnchor(target.getBoundingClientRect())
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
        {SIMPLE_LINKS_BEFORE_PROJECTS.map((item) => {
          const Icon = item.icon
          const active = isSimpleLinkActive(c.pathname, item.href, c.isActive)
          return (
            <Link
              key={item.href}
              href={clientScopeHref(item.href, selectedClientId)}
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
        {c.isAdmin ? (
          <button
            type="button"
            data-hub-rail-trigger="projects"
            className={cn(
              'hub-menu-link-row !py-spacing-1 w-full',
              (projectsAnchor || c.pathname.startsWith('/projects')) && 'nav-glass-selected-purple',
            )}
            aria-label="Projects"
            aria-expanded={Boolean(projectsAnchor)}
            onClick={(event) => toggleProjects(event.currentTarget)}
          >
            <FolderGit2 className="icon-sm" aria-hidden />
            <span className="body-2">Projects</span>
          </button>
        ) : null}
        <Link
          href={clientScopeHref(SIMPLE_FLOWS_LINK.href, selectedClientId)}
          onClick={showScreenOnly}
          className={cn(
            'hub-menu-link-row !py-spacing-1',
            c.isActive(SIMPLE_FLOWS_LINK.href) && 'nav-glass-selected-purple',
          )}
        >
          <Workflow className="icon-sm" aria-hidden />
          <span className="body-2">Flows</span>
        </Link>
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
    </div>
  )
  const expandedSidebar = (
    <div className="hub-sidebar-shell surface-card border-border flex h-full min-h-0 flex-col border-r">
      <div className="hub-sidebar-logo-header hub-sidebar-logo-header-start gap-spacing-1">
        <SidebarHqHubLogoButton expanded wordmark />
        <div className="gap-spacing-1 flex items-center">
          <ClientScopeSelector />
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
  const projectsFlyout = projectsAnchor ? (
    <SidebarProjectsFlyout
      c={c}
      anchor={projectsAnchor}
      pinned
      onEnter={() => undefined}
      onLeave={() => undefined}
      onClose={closeProjects}
      onNavigate={() => {
        showScreenOnly()
        closeProjects()
      }}
    />
  ) : null
  if (!menuCompact) {
    return (
      <>
        {expandedSidebar}
        {projectsFlyout}
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
          {SIMPLE_LINKS_BEFORE_PROJECTS.map((item) => {
            const Icon = item.icon
            const active = isSimpleLinkActive(c.pathname, item.href, c.isActive)
            return (
              <Link
                key={item.href}
                href={clientScopeHref(item.href, selectedClientId)}
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
          {c.isAdmin ? (
            <button
              type="button"
              data-hub-rail-trigger="projects"
              className={cn(
                'hub-menu-link-row justify-center',
                (projectsAnchor || c.pathname.startsWith('/projects')) &&
                  'nav-glass-selected-purple',
              )}
              aria-label="Projects"
              title="Projects"
              aria-expanded={Boolean(projectsAnchor)}
              onClick={(event) => toggleProjects(event.currentTarget)}
            >
              <FolderGit2 className="icon-sm" aria-hidden />
            </button>
          ) : null}
          <Link
            href={clientScopeHref(SIMPLE_FLOWS_LINK.href, selectedClientId)}
            onClick={showScreenOnly}
            className={cn(
              'hub-menu-link-row justify-center',
              c.isActive(SIMPLE_FLOWS_LINK.href) && 'nav-glass-selected-purple',
            )}
            aria-label={SIMPLE_FLOWS_LINK.label}
            title={SIMPLE_FLOWS_LINK.label}
          >
            <Workflow className="icon-sm" aria-hidden />
          </Link>
        </nav>
      </div>
      {projectsFlyout}
    </div>
  )
}
