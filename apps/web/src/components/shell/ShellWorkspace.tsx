'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
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
  const chatDrawerConversationId = useShellStore((s) => s.chatDrawer.conversationId)
  const openChatDrawer = useShellStore((s) => s.openChatDrawer)
  const requestNewChat = useShellStore((s) => s.requestNewChat)
  const setWorkAreaOpen = useShellStore((s) => s.setWorkAreaOpen)
  const artifactTarget = useShellStore((s) => s.artifactViewer.target)

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

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {showChatDrawer ? <ShellChatDrawer expanded={workAreaCollapsed} /> : null}

        {/* Keep the page mounted while collapsed so docs/tasks/tabs survive expand. */}
        <div
          className={cn(
            artifactTarget ? 'hidden' : 'shell-work-area',
            !artifactTarget && workAreaCollapsed && 'shell-work-area-collapsed',
          )}
          aria-hidden={workAreaCollapsed || Boolean(artifactTarget)}
          data-shell-work-area
        >
          <div className="shell-work-area-body">
            {onSpaces ? <SpaceWorkDock>{children}</SpaceWorkDock> : homeOrDefaultMain}
          </div>
        </div>

        <div
          className={cn(
            'min-w-0 flex-1',
            artifactTarget && 'flex',
            (!artifactTarget || workAreaCollapsed) && 'hidden',
          )}
        >
          <ShellArtifactViewerAdapter />
        </div>
        <ShellRightPanel conversationId={summaryConversationId} />
      </div>
    </div>
  )
}
