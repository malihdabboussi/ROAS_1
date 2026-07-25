'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  SquarePen,
  Users,
  Workflow,
} from 'lucide-react'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { dispatchOpenStudioSearch } from '@/features/studio/utils/open-studio-search-result'
import { stripLegacySpacesConversationTitle } from '@/lib/conversations/conversation-title'
import { cn } from '@/lib/utils/cn'
import { isFullShellConversation } from './shell-chat-breadcrumb'
import { isShellHomeRoute } from './shell-route-policy'
import { ShellOpenInMenu } from './ShellOpenInMenu'
import { useShellOpenIn } from './ShellOpenInProvider'
import { useShellPrefsHydrated } from './use-shell-prefs-hydrated'
import { shellSidebarExpanded, useShellStore } from './use-shell-store'

function breadcrumbFromPath(
  pathname: string,
  spaceTitle: string | null,
): { label: string; Icon: typeof Inbox } {
  if (pathname === '/home' || pathname.startsWith('/home/')) {
    return { label: 'Inbox', Icon: Inbox }
  }
  if (pathname.startsWith('/team')) return { label: 'Team', Icon: Users }
  if (pathname.startsWith('/brain')) return { label: 'Brain', Icon: Brain }
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
  const sidebarPinnedRaw = useShellStore((s) => s.sidebarPinned)
  const sidebarPeekRaw = useShellStore((s) => s.sidebarPeek)
  const sidebarPinned = shellPrefsHydrated ? sidebarPinnedRaw : false
  const sidebarPeek = shellPrefsHydrated ? sidebarPeekRaw : false
  const toggleSidebarPinned = useShellStore((s) => s.toggleSidebarPinned)
  const holdSidebarPeek = useShellStore((s) => s.holdSidebarPeek)
  const scheduleSidebarPeekClose = useShellStore((s) => s.scheduleSidebarPeekClose)
  const openChatDrawer = useShellStore((s) => s.openChatDrawer)
  const openFreshChatDrawer = useShellStore((s) => s.openFreshChatDrawer)
  const restoreChatDrawer = useShellStore((s) => s.restoreChatDrawer)
  const minimizeChatDrawer = useShellStore((s) => s.minimizeChatDrawer)
  const chatDrawerOpen = useShellStore((s) => s.chatDrawer.open)
  const toggleRightPanel = useShellStore((s) => s.toggleRightPanel)
  const rightPanelOpen = useShellStore((s) => s.rightPanel.open)
  const spaceWorkOpen = useShellStore((s) => s.spaceWorkOpen)
  const toggleSpaceWorkOpen = useShellStore((s) => s.toggleSpaceWorkOpen)
  const pageBreadcrumb = useShellStore((s) => s.pageBreadcrumb)

  const { targets } = useShellOpenIn()

  const spaces = useSpacesStore((s) => s.spaces)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const activeSpaceTitle = useMemo(() => {
    if (!activeSpaceId) return null
    return spaces.find((sp) => sp.id === activeSpaceId)?.title ?? null
  }, [activeSpaceId, spaces])

  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const conversations = useChatStore((s) => s.conversations)
  const routeConversationId = searchParams.get('conv')
  const chatParam = searchParams.get('chat')
  const breadcrumbConversationId = routeConversationId ?? activeConversationId
  const activeConversationTitle = useMemo(() => {
    const conversation = conversations.find((item) => item.id === breadcrumbConversationId)
    return stripLegacySpacesConversationTitle(conversation?.title) || 'Chat'
  }, [breadcrumbConversationId, conversations])

  const fullConversation = isFullShellConversation({
    pathname,
    hasConversationParam: Boolean(routeConversationId),
    spaceWorkOpen,
    chatDrawerOpen,
  })
  const crumb = fullConversation
    ? { label: activeConversationTitle, Icon: MessageSquare }
    : breadcrumbFromPath(pathname, activeSpaceTitle)
  const CrumbIcon = crumb.Icon
  const expanded = shellSidebarExpanded({ sidebarPinned, sidebarPeek })
  const onSpaces = pathname.startsWith('/spaces')
  const visiblePageBreadcrumb = fullConversation ? null : pageBreadcrumb
  const homeAiOpen =
    isShellHomeRoute(pathname) &&
    (Boolean(routeConversationId) || chatParam === 'new' || chatParam === 'starting')
  const aiChatsActive = chatDrawerOpen || homeAiOpen

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

  const goNewChat = () => {
    // Pencil: always dock a fresh chat in the left AI drawer (with history).
    if (isShellHomeRoute(pathname) && (routeConversationId || chatParam)) {
      router.push('/home')
    }
    openFreshChatDrawer()
  }

  const toggleAiChats = () => {
    if (chatDrawerOpen) {
      minimizeChatDrawer()
      return
    }
    // Leave full-page Home chat if open — AI Chats is the left drawer + history.
    if (isShellHomeRoute(pathname) && (routeConversationId || chatParam)) {
      const convId = routeConversationId
      router.push('/home')
      if (convId) openChatDrawer(convId)
      else restoreChatDrawer()
      return
    }
    restoreChatDrawer()
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

      <button type="button" title="New chat" onClick={goNewChat} className="shell-topbar-icon-btn">
        <SquarePen />
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
        <button
          type="button"
          title="AI Chats"
          aria-pressed={aiChatsActive}
          onClick={toggleAiChats}
          className={cn('shell-topbar-ai-btn', aiChatsActive && 'shell-topbar-ai-btn-active')}
        >
          <span>AI Chats</span>
          <span className="shell-topbar-ai-orb" aria-hidden />
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

        {onSpaces ? (
          <button
            type="button"
            title={spaceWorkOpen ? 'Collapse space work area' : 'Expand space work area'}
            aria-pressed={!spaceWorkOpen}
            onClick={() => toggleSpaceWorkOpen()}
            className={cn(
              'shell-topbar-icon-btn',
              !spaceWorkOpen && 'shell-topbar-icon-btn-active',
            )}
          >
            <PanelRight />
          </button>
        ) : null}
      </div>
    </header>
  )
}
