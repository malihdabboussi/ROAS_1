'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, type ReactNode } from 'react'
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

  const spaceWorkOpen = useShellStore((s) => s.spaceWorkOpen)
  const chatDrawerOpen = useShellStore((s) => s.chatDrawer.open)
  const chatDrawerConversationId = useShellStore((s) => s.chatDrawer.conversationId)
  const openChatDrawer = useShellStore((s) => s.openChatDrawer)
  const minimizeChatDrawer = useShellStore((s) => s.minimizeChatDrawer)
  const requestNewChat = useShellStore((s) => s.requestNewChat)
  const setSpaceWorkOpen = useShellStore((s) => s.setSpaceWorkOpen)

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

  // Entering / switching Spaces should show the Space dock (not leave a prior collapse stuck).
  const spaceParam = searchParams.get('space')
  useEffect(() => {
    if (!pathname.startsWith('/spaces')) return
    setSpaceWorkOpen(true)
  }, [pathname, spaceParam, setSpaceWorkOpen])

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
  const spaceDockCollapsed = onSpaces && !spaceWorkOpen
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

  // Left AI drawer (history + chat) on Home and workspace routes. Full-page Home
  // chat / collapsed Space chat remain dedicated fullscreen surfaces.
  const showChatDrawer = (!onSpaces || spaceWorkOpen) && !showFullNewChat && !showFullConversation

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {showChatDrawer ? <ShellChatDrawer /> : null}

        {onSpaces ? (
          <>
            {spaceDockCollapsed ? (
              <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                <GlobalChatPanel
                  shellSidebarChrome
                  presentation="full"
                  onCollapseChat={() => minimizeChatDrawer()}
                />
              </div>
            ) : null}
            {/* Keep Space mounted while collapsed so docs/tasks/tabs survive expand. */}
            <div
              className={cn(
                'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
                spaceDockCollapsed && 'hidden',
              )}
              aria-hidden={spaceDockCollapsed}
            >
              <SpaceWorkDock>{children}</SpaceWorkDock>
            </div>
          </>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {homeOrDefaultMain}
          </div>
        )}

        <ShellArtifactViewerAdapter />
        <ShellRightPanel conversationId={summaryConversationId} />
      </div>
    </div>
  )
}
