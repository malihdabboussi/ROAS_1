'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  Inbox,
  Layers3,
  List,
  ListChecks,
  MessageSquare,
  PanelLeft,
  PanelRight,
  Search,
  Users,
  Workflow,
} from 'lucide-react'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { dispatchOpenStudioSearch } from '@/features/studio/utils/open-studio-search-result'
import { cn } from '@/lib/utils/cn'
import { ShellOpenInMenu } from './ShellOpenInMenu'
import { useShellOpenIn } from './ShellOpenInProvider'
import { useShellPrefsHydrated } from './use-shell-prefs-hydrated'
import { useShellStore } from './use-shell-store'

function breadcrumbFromPath(
  pathname: string,
  spaceTitle: string | null,
): { label: string; Icon: typeof Inbox } {
  if (pathname === '/home' || pathname.startsWith('/home/')) {
    return { label: 'Inbox', Icon: Inbox }
  }
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

  const shellPrefsHydrated = useShellPrefsHydrated()
  const chatDrawerOpenRaw = useShellStore((s) => s.chatDrawer.open)
  const chatDrawerOpen = shellPrefsHydrated ? chatDrawerOpenRaw : false
  const restoreChatDrawer = useShellStore((s) => s.restoreChatDrawer)
  const minimizeChatDrawer = useShellStore((s) => s.minimizeChatDrawer)
  const setSidebarPinned = useShellStore((s) => s.setSidebarPinned)
  const toggleRightPanel = useShellStore((s) => s.toggleRightPanel)
  const rightPanelOpen = useShellStore((s) => s.rightPanel.open)
  const workAreaOpen = useShellStore((s) => s.workAreaOpen)
  const toggleWorkAreaOpen = useShellStore((s) => s.toggleWorkAreaOpen)
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
  const visiblePageBreadcrumb = pageBreadcrumb

  // Nav stays icon-rail only — clear any legacy pinned expand.
  useEffect(() => {
    setSidebarPinned(false)
  }, [setSidebarPinned])

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

  return (
    <header className="shell-topbar">
      <button
        type="button"
        title={chatDrawerOpen ? 'Collapse AI Chats' : 'Expand AI Chats'}
        aria-pressed={chatDrawerOpen}
        onClick={toggleAiChat}
        className={cn('shell-topbar-icon-btn', chatDrawerOpen && 'shell-topbar-icon-btn-active')}
      >
        <PanelLeft />
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

        <button
          type="button"
          title="Summary panel"
          aria-pressed={rightPanelOpen}
          onClick={() => toggleRightPanel()}
          className={cn('shell-topbar-icon-btn', rightPanelOpen && 'shell-topbar-icon-btn-active')}
        >
          <List />
        </button>

        <button
          type="button"
          title={workAreaOpen ? 'Collapse page — chat full screen' : 'Show page'}
          aria-pressed={!workAreaOpen}
          onClick={() => toggleWorkAreaOpen()}
          className={cn('shell-topbar-icon-btn', !workAreaOpen && 'shell-topbar-icon-btn-active')}
        >
          <PanelRight />
        </button>
      </div>
    </header>
  )
}
