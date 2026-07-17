'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, type ReactNode } from 'react'
import { GlobalChatPanel } from '@/components/global-chat/containers/GlobalChatPanel'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { ShellChatDrawer } from './ShellChatDrawer'
import { ShellNewChatGreeting } from './ShellNewChatGreeting'
import { ShellRightPanel } from './ShellRightPanel'
import { useShellStore } from './use-shell-store'

function isWorkspaceRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/spaces') ||
    pathname.startsWith('/campaigns') ||
    pathname.startsWith('/brain') ||
    pathname.startsWith('/flows') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/team')
  )
}

function isHomeRoute(pathname: string): boolean {
  return pathname === '/home' || pathname.startsWith('/home/')
}

export function ShellWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()
  const searchParams = useSearchParams()
  const chatParam = searchParams.get('chat')
  const convParam = searchParams.get('conv')

  const spaceWorkOpen = useShellStore((s) => s.spaceWorkOpen)
  const chatDrawerOpen = useShellStore((s) => s.chatDrawer.open)
  const openChatDrawer = useShellStore((s) => s.openChatDrawer)
  const minimizeChatDrawer = useShellStore((s) => s.minimizeChatDrawer)
  const requestNewChat = useShellStore((s) => s.requestNewChat)
  const setMenuMode = useShellStore((s) => s.setMenuMode)

  const setCollapsed = useGlobalChatStore((s) => s.setCollapsed)
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId)
  const openConversationInSpaceChat = useSpacesStore((s) => s.openConversationInSpaceChat)

  const clearHomeChat = useCallback(() => {
    setActiveConversationId(null)
    router.push('/home')
  }, [router, setActiveConversationId])

  useEffect(() => {
    setCollapsed(true)
  }, [pathname, setCollapsed])

  useEffect(() => {
    if (chatParam !== 'new') return
    requestNewChat()
    setMenuMode('chat')
    setActiveConversationId(null)
  }, [chatParam, requestNewChat, setMenuMode, setActiveConversationId])

  useEffect(() => {
    if (!convParam) return
    if (isWorkspaceRoute(pathname)) {
      openChatDrawer(convParam)
      return
    }
    openConversationInSpaceChat(convParam)
    setActiveConversationId(convParam)
    setMenuMode('chat')
  }, [
    convParam,
    pathname,
    openChatDrawer,
    openConversationInSpaceChat,
    setActiveConversationId,
    setMenuMode,
  ])

  // Plain /home always shows the dashboard. Chat surfaces require explicit ?chat=new or ?conv=.
  const showFullNewChat = isHomeRoute(pathname) && chatParam === 'new'
  const showFullConversation = isHomeRoute(pathname) && Boolean(convParam) && chatParam !== 'new'

  const onSpaces = pathname.startsWith('/spaces')
  const hideSpaceWork = onSpaces && !spaceWorkOpen

  let mainContent: ReactNode = children
  if (showFullNewChat) {
    mainContent = <ShellNewChatGreeting />
  } else if (showFullConversation) {
    // Full-bleed chat column: content stays max-width centered inside the panel,
    // but scroll runs the full main width so the scrollbar sits on the far right.
    mainContent = (
      <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
        <GlobalChatPanel shellSidebarChrome onCollapseChat={clearHomeChat} />
      </div>
    )
  } else if (hideSpaceWork) {
    mainContent = chatDrawerOpen ? (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <GlobalChatPanel shellSidebarChrome onCollapseChat={() => minimizeChatDrawer()} />
      </div>
    ) : (
      <ShellNewChatGreeting />
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {!hideSpaceWork && isWorkspaceRoute(pathname) ? <ShellChatDrawer /> : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{mainContent}</div>
        <ShellRightPanel />
      </div>
    </div>
  )
}
