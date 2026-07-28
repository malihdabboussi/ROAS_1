'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Brain,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ContactRound,
  FolderGit2,
  Inbox,
  Layers3,
  ListChecks,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Users,
  Workflow,
} from 'lucide-react'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { dispatchOpenStudioSearch } from '@/features/studio/utils/open-studio-search-result'
import { cn } from '@/lib/utils/cn'
import { ShellOpenInMenu } from './ShellOpenInMenu'
import { useShellOpenIn } from './ShellOpenInProvider'
import { ShellWorkAreaControl } from './ShellWorkAreaControl'
import { useShellPrefsHydrated } from './use-shell-prefs-hydrated'
import { useShellStore } from './use-shell-store'

function breadcrumbFromPath(
  pathname: string,
  spaceTitle: string | null,
): { label: string; Icon: typeof Inbox } {
  if (pathname === '/home') return { label: 'Agenda', Icon: CalendarDays }
  if (pathname.startsWith('/home/inbox')) return { label: 'Inbox', Icon: Inbox }
  if (pathname.startsWith('/home/meetings')) return { label: 'Meetings', Icon: CalendarDays }
  if (pathname.startsWith('/home/my-tasks')) return { label: 'My Tasks', Icon: ListChecks }
  if (pathname.startsWith('/home/channels')) return { label: 'Channels', Icon: MessageSquare }
  if (pathname.startsWith('/team/skills')) return { label: 'Skills', Icon: Layers3 }
  if (pathname.startsWith('/team/teams')) return { label: 'Teams', Icon: Users }
  if (pathname.startsWith('/team/people')) return { label: 'People', Icon: ContactRound }
  if (pathname.startsWith('/team')) return { label: 'Team', Icon: Users }
  if (pathname.startsWith('/brain')) return { label: 'Brain', Icon: Brain }
  if (pathname.startsWith('/chats')) return { label: 'Chats', Icon: MessageSquare }
  if (pathname.startsWith('/artifacts')) return { label: 'All Artifacts', Icon: Layers3 }
  if (pathname.startsWith('/projects')) return { label: 'Projects', Icon: FolderGit2 }
  if (pathname.startsWith('/flows')) return { label: 'Flows', Icon: Workflow }
  if (pathname.startsWith('/campaigns')) return { label: 'Campaigns', Icon: ListChecks }
  if (pathname.startsWith('/spaces')) {
    return {
      label: spaceTitle ? `Campaigns / ${spaceTitle}` : 'Campaigns',
      Icon: ListChecks,
    }
  }
  return { label: 'Inbox', Icon: Inbox }
}

export function ShellTopBar() {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()
  const searchParams = useSearchParams()

  const shellPrefsHydrated = useShellPrefsHydrated()
  const chatDrawerOpenRaw = useShellStore((s) => s.chatDrawer.open)
  const chatDrawerOpen = shellPrefsHydrated ? chatDrawerOpenRaw : false
  const restoreChatDrawer = useShellStore((s) => s.restoreChatDrawer)
  const minimizeChatDrawer = useShellStore((s) => s.minimizeChatDrawer)
  const setSidebarPinned = useShellStore((s) => s.setSidebarPinned)
  const workAreaOpen = useShellStore((s) => s.workAreaOpen)
  const artifactTarget = useShellStore((s) => s.artifactViewer.target)
  const closeArtifactViewer = useShellStore((s) => s.closeArtifactViewer)
  const setWorkAreaOpen = useShellStore((s) => s.setWorkAreaOpen)
  const pageBreadcrumb = useShellStore((s) => s.pageBreadcrumb)
  const recordWorkAreaPage = useShellStore((s) => s.recordWorkAreaPage)

  const { targets } = useShellOpenIn()

  const spaces = useSpacesStore((s) => s.spaces)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const activeSpaceTitle = useMemo(() => {
    if (!activeSpaceId) return null
    return spaces.find((sp) => sp.id === activeSpaceId)?.title ?? null
  }, [activeSpaceId, spaces])

  const crumb = breadcrumbFromPath(pathname, activeSpaceTitle)
  const CrumbIcon = crumb.Icon
  const visiblePageBreadcrumb = pageBreadcrumb
  const showWorkAreaControl = chatDrawerOpen || !workAreaOpen || Boolean(artifactTarget)
  const currentPage = { id: pathname, title: crumb.label, href: pathname }
  const portalActive = searchParams.get('surface') === 'portal'

  // Nav stays icon-rail only — clear any legacy pinned expand.
  useEffect(() => {
    setSidebarPinned(false)
  }, [setSidebarPinned])

  useEffect(() => {
    recordWorkAreaPage(currentPage)
  }, [currentPage.href, currentPage.id, currentPage.title, recordWorkAreaPage])

  const histIndex = useRef(0)
  const histMax = useRef(0)
  const [canGoBack, setCanGoBack] = useState(true)
  const [canGoForward, setCanGoForward] = useState(false)

  useEffect(() => {
    // Path changes from in-app links count as a forward step for enablement.
    histMax.current = Math.max(histMax.current, histIndex.current)
    setCanGoForward(histIndex.current < histMax.current)
  }, [pathname])

  const toggleAiChat = () => {
    if (chatDrawerOpen) minimizeChatDrawer()
    else restoreChatDrawer()
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

  const setSurface = (surface: 'workspace' | 'portal') => {
    const params = new URLSearchParams(searchParams.toString())
    if (surface === 'portal') params.set('surface', 'portal')
    else params.delete('surface')
    const query = params.toString()
    setWorkAreaOpen(true)
    closeArtifactViewer()
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
  }

  return (
    <header className="shell-topbar">
      <button
        type="button"
        title={chatDrawerOpen ? 'Collapse AI Chats' : 'Open AI Chats'}
        aria-label={chatDrawerOpen ? 'Collapse AI Chats' : 'Open AI Chats'}
        aria-pressed={chatDrawerOpen}
        onClick={toggleAiChat}
        className="button-glass-purple h-spacing-8 px-spacing-3 gap-spacing-1 rounded-spacing-2 flex shrink-0 items-center"
      >
        {chatDrawerOpen ? (
          <PanelLeftClose className="icon-sm" aria-hidden />
        ) : (
          <PanelLeftOpen className="icon-sm" aria-hidden />
        )}
        <span className="body-3 whitespace-nowrap font-medium">AI Chat</span>
      </button>

      <button
        type="button"
        title="Back"
        onClick={goBack}
        disabled={!canGoBack}
        className={cn('shell-topbar-icon-btn', !canGoBack && 'shell-topbar-icon-btn-disabled')}
      >
        <ChevronLeft />
      </button>
      <button
        type="button"
        title="Forward"
        onClick={goForward}
        disabled={!canGoForward}
        className={cn('shell-topbar-icon-btn', !canGoForward && 'shell-topbar-icon-btn-disabled')}
      >
        <ChevronRight />
      </button>

      <div className="shell-topbar-divider" aria-hidden />

      <div className="shell-topbar-crumb">
        {visiblePageBreadcrumb ? (
          <div className="flex min-w-0 flex-1 items-center overflow-hidden">
            {visiblePageBreadcrumb}
          </div>
        ) : (
          <>
            <CrumbIcon className="shell-topbar-crumb-icon" aria-hidden />
            <span className="truncate">{crumb.label}</span>
          </>
        )}
      </div>

      <div className="shell-topbar-center-unit">
        <button
          type="button"
          title="Search"
          onClick={() => dispatchOpenStudioSearch()}
          className="shell-topbar-search-btn"
        >
          <Search className="shell-topbar-search-icon" aria-hidden />
          <span className="shell-topbar-search-label">Search</span>
          <kbd className="shell-topbar-search-kbd">⌘K</kbd>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ShellOpenInMenu targets={targets} />

        <div className="shell-surface-toggle" aria-label="Work surface">
          <button
            type="button"
            aria-pressed={!portalActive}
            onClick={() => setSurface('workspace')}
            className={cn('shell-surface-toggle-btn', !portalActive && 'shell-surface-toggle-btn-active')}
          >
            Workspace
          </button>
          <button
            type="button"
            aria-pressed={portalActive}
            onClick={() => setSurface('portal')}
            className={cn('shell-surface-toggle-btn', portalActive && 'shell-surface-toggle-btn-active')}
          >
            Portal
          </button>
        </div>

        {showWorkAreaControl ? <ShellWorkAreaControl currentPage={currentPage} /> : null}
      </div>
    </header>
  )
}
