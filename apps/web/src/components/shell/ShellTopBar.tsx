'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  House,
  List,
  ListChecks,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Search,
  SquarePen,
  Users,
  Workflow,
} from 'lucide-react'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { dispatchOpenStudioSearch } from '@/features/studio/utils/open-studio-search-result'
import { cn } from '@/lib/utils/cn'
import { ShellOpenInMenu } from './ShellOpenInMenu'
import { useShellOpenIn } from './ShellOpenInProvider'
import { shellSidebarExpanded, useShellStore } from './use-shell-store'

function breadcrumbFromPath(
  pathname: string,
  spaceTitle: string | null,
): { label: string; Icon: typeof House } {
  if (pathname === '/home' || pathname.startsWith('/home/')) {
    return { label: 'Home', Icon: House }
  }
  if (pathname.startsWith('/team')) return { label: 'Team', Icon: Users }
  if (pathname.startsWith('/brain')) return { label: 'Brain', Icon: Brain }
  if (pathname.startsWith('/projects')) return { label: 'Projects', Icon: FolderGit2 }
  if (pathname.startsWith('/flows')) return { label: 'Flows', Icon: Workflow }
  if (pathname.startsWith('/campaigns')) return { label: 'Campaigns', Icon: ListChecks }
  if (pathname.startsWith('/spaces')) {
    return {
      label: spaceTitle ? `Campaigns / ${spaceTitle}` : 'Campaigns',
      Icon: ListChecks,
    }
  }
  return { label: 'Home', Icon: House }
}

export function ShellTopBar() {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()

  const sidebarPinned = useShellStore((s) => s.sidebarPinned)
  const sidebarPeek = useShellStore((s) => s.sidebarPeek)
  const toggleSidebarPinned = useShellStore((s) => s.toggleSidebarPinned)
  const holdSidebarPeek = useShellStore((s) => s.holdSidebarPeek)
  const scheduleSidebarPeekClose = useShellStore((s) => s.scheduleSidebarPeekClose)
  const requestNewChat = useShellStore((s) => s.requestNewChat)
  const openFreshChatDrawer = useShellStore((s) => s.openFreshChatDrawer)
  const toggleRightPanel = useShellStore((s) => s.toggleRightPanel)
  const rightPanelOpen = useShellStore((s) => s.rightPanel.open)
  const spaceWorkOpen = useShellStore((s) => s.spaceWorkOpen)
  const toggleSpaceWorkOpen = useShellStore((s) => s.toggleSpaceWorkOpen)
  const setMenuMode = useShellStore((s) => s.setMenuMode)
  const pageBreadcrumb = useShellStore((s) => s.pageBreadcrumb)

  const { targets } = useShellOpenIn()

  const spaces = useSpacesStore((s) => s.spaces)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const activeSpaceTitle = useMemo(() => {
    if (!activeSpaceId) return null
    return spaces.find((sp) => sp.id === activeSpaceId)?.title ?? null
  }, [activeSpaceId, spaces])

  const crumb = breadcrumbFromPath(pathname, activeSpaceTitle)
  const CrumbIcon = crumb.Icon
  const expanded = shellSidebarExpanded({ sidebarPinned, sidebarPeek })
  const onSpaces = pathname.startsWith('/spaces')
  // ⋯ only when a page registered a trail (rename / section options). Never on Home.
  const showCrumbMenu = Boolean(pageBreadcrumb)

  const histIndex = useRef(0)
  const histMax = useRef(0)
  const [canGoBack, setCanGoBack] = useState(true)
  const [canGoForward, setCanGoForward] = useState(false)

  useEffect(() => {
    // Path changes from in-app links count as a forward step for enablement.
    histMax.current = Math.max(histMax.current, histIndex.current)
    setCanGoForward(histIndex.current < histMax.current)
  }, [pathname])

  const onSidebarBtnEnter = useCallback(() => {
    holdSidebarPeek()
  }, [holdSidebarPeek])

  const onSidebarBtnLeave = useCallback(() => {
    scheduleSidebarPeekClose()
  }, [scheduleSidebarPeekClose])

  const isWorkspaceRoute =
    pathname.startsWith('/spaces') ||
    pathname.startsWith('/campaigns') ||
    pathname.startsWith('/brain') ||
    pathname.startsWith('/flows') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/team')

  const goNewChat = () => {
    // Section routes: dock a fresh chat drawer in place (stay on the page).
    if (isWorkspaceRoute) {
      openFreshChatDrawer()
      return
    }
    // Home / chat routes: full new-chat screen.
    requestNewChat()
    setMenuMode('chat')
    router.push('/home?chat=new')
  }

  const goBack = () => {
    if (!canGoBack) return
    histIndex.current = Math.max(0, histIndex.current - 1)
    setCanGoForward(true)
    setCanGoBack(histIndex.current > 0 || window.history.length > 1)
    router.back()
  }

  const goForward = () => {
    if (!canGoForward) return
    histIndex.current += 1
    setCanGoBack(true)
    setCanGoForward(histIndex.current < histMax.current)
    router.forward()
  }

  return (
    <header className="shell-topbar">
      <button
        type="button"
        title={sidebarPinned ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-pressed={expanded}
        onMouseEnter={onSidebarBtnEnter}
        onMouseLeave={onSidebarBtnLeave}
        onClick={() => toggleSidebarPinned()}
        className={cn('shell-topbar-icon-btn', expanded && 'shell-topbar-icon-btn-active')}
      >
        <PanelLeft />
      </button>

      <button
        type="button"
        title="Back"
        onClick={goBack}
        disabled={!canGoBack}
        className={cn(
          'shell-topbar-icon-btn',
          !canGoBack && 'shell-topbar-icon-btn-disabled',
        )}
      >
        <ChevronLeft />
      </button>
      <button
        type="button"
        title="Forward"
        onClick={goForward}
        disabled={!canGoForward}
        className={cn(
          'shell-topbar-icon-btn',
          !canGoForward && 'shell-topbar-icon-btn-disabled',
        )}
      >
        <ChevronRight />
      </button>

      {!expanded ? (
        <button type="button" title="New chat" onClick={goNewChat} className="shell-topbar-icon-btn">
          <SquarePen />
        </button>
      ) : null}

      <div className="shell-topbar-divider" aria-hidden />

      <div className="shell-topbar-crumb">
        {pageBreadcrumb ? (
          <div className="flex min-w-0 flex-1 items-center overflow-hidden">{pageBreadcrumb}</div>
        ) : (
          <>
            <CrumbIcon className="shell-topbar-crumb-icon" aria-hidden />
            <span className="truncate">{crumb.label}</span>
          </>
        )}
        {showCrumbMenu ? (
          <button type="button" title="Section options" className="shell-topbar-crumb-menu">
            <MoreHorizontal />
          </button>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ShellOpenInMenu targets={targets} />

        <button
          type="button"
          title="Search"
          onClick={() => dispatchOpenStudioSearch()}
          className="shell-topbar-icon-btn"
        >
          <Search />
        </button>

        <button
          type="button"
          title="Summary panel"
          aria-pressed={rightPanelOpen}
          onClick={() => toggleRightPanel()}
          className={cn('shell-topbar-icon-btn', rightPanelOpen && 'shell-topbar-icon-btn-active')}
        >
          <List />
        </button>

        {onSpaces ? (
          <button
            type="button"
            title={spaceWorkOpen ? 'Collapse space work area' : 'Expand space work area'}
            aria-pressed={!spaceWorkOpen}
            onClick={() => toggleSpaceWorkOpen()}
            className={cn('shell-topbar-icon-btn', !spaceWorkOpen && 'shell-topbar-icon-btn-active')}
          >
            <PanelRight />
          </button>
        ) : null}
      </div>
    </header>
  )
}
