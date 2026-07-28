'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { GlobalChatPanel } from '@/components/global-chat/containers/GlobalChatPanel'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { ShellArtifactViewerAdapter } from '@/features/studio/components/preview/ShellArtifactViewerAdapter'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { cn } from '@/lib/utils/cn'
import { isShellHomeRoute, isShellWorkspaceRoute } from './shell-route-policy'
import { ShellChatDrawer } from './ShellChatDrawer'
import { ShellNewChatGreeting } from './ShellNewChatGreeting'
import { ShellSidebarSlot } from './ShellSidebarSlot'
import { SpaceWorkDock } from './SpaceWorkDock'
import { isWorkAttachedDock, useShellMenuDock } from './use-shell-menu-dock'
import { useShellPrefsHydrated } from './use-shell-prefs-hydrated'
import { useShellStore } from './use-shell-store'

export function ShellWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()
  const searchParams = useSearchParams()
  const chatParam = searchParams.get('chat')
  const convParam = searchParams.get('conv')

  const workAreaOpen = useShellStore((s) => s.workAreaOpen)
  const openChatDrawer = useShellStore((s) => s.openChatDrawer)
  const requestNewChat = useShellStore((s) => s.requestNewChat)
  const setWorkAreaOpen = useShellStore((s) => s.setWorkAreaOpen)
  const artifactTarget = useShellStore((s) => s.artifactViewer.target)
  const shellPrefsHydrated = useShellPrefsHydrated()
  const desktop = useMediaQuery('(min-width: 768px)')
  const menuDock = useShellMenuDock((s) => s.dock)
  const setWorkCardHostAvailable = useShellMenuDock((s) => s.setWorkCardHostAvailable)
  const setWorkCollapsedHostAvailable = useShellMenuDock((s) => s.setWorkCollapsedHostAvailable)

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
  const workAreaCollapsible = !showFullNewChat && !showFullConversation
  const workAreaCollapsed = workAreaCollapsible && !workAreaOpen
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

  const showChatDrawer = workAreaCollapsible
  const workAttached = isWorkAttachedDock(menuDock)
  const workColumnPresent =
    shellPrefsHydrated && desktop && !artifactTarget && !showFullNewChat && !showFullConversation
  const hostInsideWork = workColumnPresent && workAttached && !workAreaCollapsed
  const hostCollapsedRight = workColumnPresent && workAttached && workAreaCollapsed

  useEffect(() => {
    setWorkCardHostAvailable(hostInsideWork)
    setWorkCollapsedHostAvailable(hostCollapsedRight)
    return () => {
      setWorkCardHostAvailable(false)
      setWorkCollapsedHostAvailable(false)
    }
  }, [hostInsideWork, hostCollapsedRight, setWorkCardHostAvailable, setWorkCollapsedHostAvailable])

  const workBodyDockClass =
    hostInsideWork && menuDock === 'work'
      ? 'shell-work-area-body-dock-work'
      : hostInsideWork && menuDock === 'work-right'
        ? 'shell-work-area-body-dock-work-right'
        : hostInsideWork && menuDock === 'work-top'
          ? 'shell-work-area-body-dock-work-top'
          : hostInsideWork && menuDock === 'work-bottom'
            ? 'shell-work-area-body-dock-work-bottom'
            : null

  const workMain = onSpaces ? <SpaceWorkDock>{children}</SpaceWorkDock> : homeOrDefaultMain

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {showChatDrawer ? <ShellChatDrawer expanded={workAreaCollapsed} /> : null}

        <div
          className={cn(
            artifactTarget ? 'hidden' : 'shell-work-area',
            !artifactTarget && workAreaCollapsed && 'shell-work-area-collapsed',
          )}
          aria-hidden={workAreaCollapsed || Boolean(artifactTarget)}
          data-shell-work-area
        >
          <div className={cn('shell-work-area-body', workBodyDockClass)}>
            {hostInsideWork && (menuDock === 'work' || menuDock === 'work-top') ? (
              <ShellSidebarSlot />
            ) : null}
            <div className={cn(hostInsideWork && 'shell-work-area-body-main')}>{workMain}</div>
            {hostInsideWork && (menuDock === 'work-right' || menuDock === 'work-bottom') ? (
              <ShellSidebarSlot />
            ) : null}
          </div>
        </div>

        {hostCollapsedRight ? (
          <div className="shell-menu-dock-collapsed-right" data-shell-menu-dock="work-right">
            <ShellSidebarSlot />
            <button
              type="button"
              onClick={() => setWorkAreaOpen(true)}
              className="shell-menu-dock-collapsed-right-expand nav-glass-text-purple hover:text-foreground"
              aria-label="Show page"
              title="Show page"
            >
              <ChevronLeft className="icon-sm" aria-hidden />
            </button>
          </div>
        ) : null}

        <div
          className={cn(
            'min-w-0 flex-1',
            artifactTarget && 'flex',
            (!artifactTarget || workAreaCollapsed) && 'hidden',
          )}
        >
          <ShellArtifactViewerAdapter />
        </div>
      </div>
    </div>
  )
}
