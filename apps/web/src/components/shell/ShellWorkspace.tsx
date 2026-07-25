'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { GlobalChatPanel } from '@/components/global-chat/containers/GlobalChatPanel'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { ShellArtifactViewerAdapter } from '@/features/studio/components/preview/ShellArtifactViewerAdapter'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { cn } from '@/lib/utils/cn'
import { isShellHomeRoute, isShellWorkspaceRoute } from './shell-route-policy'
import { ShellChatDrawer } from './ShellChatDrawer'
import { ShellNewChatGreeting } from './ShellNewChatGreeting'
import { ShellRightPanel } from './ShellRightPanel'
import { SpaceWorkDock } from './SpaceWorkDock'
import { useShellStore } from './use-shell-store'

export function ShellWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()
  const searchParams = useSearchParams()
  const chatParam = searchParams.get('chat')
  const convParam = searchParams.get('conv')

  const workAreaOpen = useShellStore((s) => s.workAreaOpen)
  const chatDrawerOpen = useShellStore((s) => s.chatDrawer.open)
  const chatDrawerWidth = useShellStore((s) => s.chatDrawer.width)
  const chatDrawerConversationId = useShellStore((s) => s.chatDrawer.conversationId)
  const openChatDrawer = useShellStore((s) => s.openChatDrawer)
  const requestNewChat = useShellStore((s) => s.requestNewChat)
  const setWorkAreaOpen = useShellStore((s) => s.setWorkAreaOpen)

  const setCollapsed = useGlobalChatStore((s) => s.setCollapsed)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId)
  const openConversationInSpaceChat = useSpacesStore((s) => s.openConversationInSpaceChat)

  const clearHomeChat = useCallback(() => {
    setActiveConversationId(null)
    router.push('/home')
  }, [router, setActiveConversationId])

  useEffect(() => {
    setCollapsed(true)
  }, [pathname, setCollapsed])

  // Navigating to a different surface should reveal it, so a collapse from the
  // previous page never leaves the destination stuck behind full-width chat.
  // The first render is skipped so a persisted collapse survives a reload.
  const spaceParam = searchParams.get('space')
  const lastRouteKey = useRef<string | null>(null)
  useEffect(() => {
    const routeKey = `${pathname}::${spaceParam ?? ''}`
    if (lastRouteKey.current === null) {
      lastRouteKey.current = routeKey
      return
    }
    if (lastRouteKey.current === routeKey) return
    lastRouteKey.current = routeKey
    setWorkAreaOpen(true)
  }, [pathname, spaceParam, setWorkAreaOpen])

  useEffect(() => {
    if (chatParam !== 'new') return
    requestNewChat()
    setActiveConversationId(null)
  }, [chatParam, requestNewChat, setActiveConversationId])

  useEffect(() => {
    if (!convParam) return
    if (isShellWorkspaceRoute(pathname)) {
      openChatDrawer(convParam)
      return
    }
    openConversationInSpaceChat(convParam)
    setActiveConversationId(convParam)
  }, [convParam, pathname, openChatDrawer, openConversationInSpaceChat, setActiveConversationId])

  useEffect(() => {
    if (!isShellHomeRoute(pathname) || chatParam !== 'starting' || !activeConversationId) return
    router.replace(`/home?conv=${encodeURIComponent(activeConversationId)}`)
  }, [activeConversationId, chatParam, pathname, router])

  const showFullNewChat = isShellHomeRoute(pathname) && chatParam === 'new'
  const showFullConversation =
    isShellHomeRoute(pathname) &&
    (Boolean(convParam) || chatParam === 'starting') &&
    chatParam !== 'new'

  const onSpaces = pathname.startsWith('/spaces')
  // Full-page Home chat already owns the viewport, so there is nothing to collapse there.
  const workAreaCollapsible = !showFullNewChat && !showFullConversation
  const workAreaCollapsed = workAreaCollapsible && !workAreaOpen
  const summaryConversationId = showFullConversation
    ? (convParam ?? activeConversationId)
    : chatDrawerOpen
      ? chatDrawerConversationId
      : null

  let homeOrDefaultMain: ReactNode = children
  if (showFullNewChat) {
    homeOrDefaultMain = <ShellNewChatGreeting />
  } else if (showFullConversation) {
    homeOrDefaultMain = (
      <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
        <GlobalChatPanel shellSidebarChrome presentation="full" onCollapseChat={clearHomeChat} />
      </div>
    )
  }

  // Left AI drawer (history + chat) stays mounted when the page collapses — the
  // drawer expands to fill the freed space so chat history never disappears.
  const showChatDrawer = workAreaCollapsible

  // Remember the open page width so the body can stay right-anchored while the
  // clip shrinks/grows — otherwise flex growth reveals the page from the left.
  const WORK_AREA_SLIDE_MS = 300
  const workAreaRef = useRef<HTMLDivElement>(null)
  const [anchoredWidth, setAnchoredWidth] = useState<number | null>(null)
  const [anchorActive, setAnchorActive] = useState(false)
  const wasWorkAreaCollapsedRef = useRef(workAreaCollapsed)
  const workAreaAnimatingRef = useRef(false)

  const measureWorkAreaTargetWidth = useCallback(() => {
    const el = workAreaRef.current
    const row = el?.parentElement
    if (!el || !row) return 0

    let occupiedWidth = chatDrawerOpen ? chatDrawerWidth : 0
    let hasDrawerDivider = false
    for (const child of Array.from(row.children)) {
      if (child === el || child.hasAttribute('data-shell-chat-drawer')) continue
      if (child.getAttribute('aria-label') === 'Resize AI chat drawer') {
        hasDrawerDivider = true
      }
      occupiedWidth += child.getBoundingClientRect().width
    }
    // Expanded chat removes its divider; reserve its docked hit target so the
    // restored page width matches the post-transition flex layout exactly.
    if (chatDrawerOpen && !hasDrawerDivider) occupiedWidth += 8

    return Math.max(0, row.getBoundingClientRect().width - occupiedWidth)
  }, [chatDrawerOpen, chatDrawerWidth])

  useEffect(() => {
    const el = workAreaRef.current
    if (!el) return
    const sync = () => {
      if (workAreaAnimatingRef.current) return
      const width = measureWorkAreaTargetWidth()
      if (width > 0) setAnchoredWidth(width)
    }
    sync()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measureWorkAreaTargetWidth])

  useLayoutEffect(() => {
    const wasCollapsed = wasWorkAreaCollapsedRef.current
    wasWorkAreaCollapsedRef.current = workAreaCollapsed

    if (workAreaCollapsed) {
      const width = measureWorkAreaTargetWidth()
      if (width > 0) setAnchoredWidth(width)
      workAreaAnimatingRef.current = true
      setAnchorActive(true)
      return
    }
    if (!wasCollapsed) {
      workAreaAnimatingRef.current = false
      setAnchorActive(false)
      return
    }
    // Collapsed → open: slide the fixed-width page in from beyond the right
    // edge, then release it back to normal flex sizing after the transition.
    workAreaAnimatingRef.current = true
    setAnchorActive(true)
    const timer = setTimeout(() => {
      const width = measureWorkAreaTargetWidth()
      if (width > 0) setAnchoredWidth(width)
      workAreaAnimatingRef.current = false
      setAnchorActive(false)
    }, WORK_AREA_SLIDE_MS)
    return () => clearTimeout(timer)
  }, [measureWorkAreaTargetWidth, workAreaCollapsed])

  const bodyAnchored = anchorActive && anchoredWidth != null && anchoredWidth > 0

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {showChatDrawer ? <ShellChatDrawer expanded={workAreaCollapsed} /> : null}

        {/* Keep the page mounted while collapsed so docs/tasks/tabs survive expand. */}
        <div
          ref={workAreaRef}
          className={cn('shell-work-area', workAreaCollapsed && 'shell-work-area-collapsed')}
          aria-hidden={workAreaCollapsed}
        >
          <div
            className={cn(
              'shell-work-area-body',
              bodyAnchored && 'shell-work-area-body-anchored',
              bodyAnchored && workAreaCollapsed && 'shell-work-area-body-collapsed',
            )}
            style={bodyAnchored ? { width: `${anchoredWidth}px` } : undefined}
          >
            {onSpaces ? <SpaceWorkDock>{children}</SpaceWorkDock> : homeOrDefaultMain}
          </div>
        </div>

        <ShellArtifactViewerAdapter />
        <ShellRightPanel conversationId={summaryConversationId} />
      </div>
    </div>
  )
}
