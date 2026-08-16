'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { GlobalChatPanel } from '@/components/global-chat/containers/GlobalChatPanel'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { ShellArtifactViewerAdapter } from '@/features/studio/components/preview/ShellArtifactViewerAdapter'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { cn } from '@/lib/utils/cn'
import { isShellHomeRoute, isShellWorkspaceRoute } from './shell-route-policy'
import { ShellArtifactViewerColumn } from './ShellArtifactViewerColumn'
import { ShellChatDrawer } from './ShellChatDrawer'
import { ShellNewChatGreeting } from './ShellNewChatGreeting'
import { ShellSidebarSlot } from './ShellSidebarSlot'
import { ShellTopBar } from './ShellTopBar'
import { SpaceWorkDock } from './SpaceWorkDock'
import { useRightEdgePresence } from './use-right-edge-presence'
import {
  isWorkAttachedDock,
  resolveShellMenuDockForLayout,
  useActiveShellMenuDock,
  useShellMenuDock,
} from './use-shell-menu-dock'
import { useShellPrefsHydrated } from './use-shell-prefs-hydrated'
import { useShellStore } from './use-shell-store'
import { useShellWorkspaceScreenChat } from './use-shell-workspace-screen-chat'

export function ShellWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()
  const searchParams = useSearchParams()
  const chatParam = searchParams.get('chat')
  const convParam = searchParams.get('conv')

  const workAreaOpen = useShellStore((s) => s.workAreaOpen)
  const chatDrawerOpen = useShellStore((s) => s.chatDrawer.open)
  const openChatDrawer = useShellStore((s) => s.openChatDrawer)
  const requestNewChat = useShellStore((s) => s.requestNewChat)
  const setWorkAreaOpen = useShellStore((s) => s.setWorkAreaOpen)
  const setRightPanelOpen = useShellStore((s) => s.setRightPanelOpen)
  const summaryPanelDocked = useShellStore((s) => s.summaryPanelDocked)
  const artifactTarget = useShellStore((s) => s.artifactViewer.target)
  const previousArtifactTargetRef = useRef(artifactTarget)
  const shellPrefsHydrated = useShellPrefsHydrated()
  const desktop = useMediaQuery('(min-width: 768px)')
  const savedMenuDock = useShellMenuDock((s) => s.dock)
  const menuStyle = useShellMenuDock((s) => s.menuStyle)
  const dragging = useShellMenuDock((s) => s.dragging)
  const candidateMenuDock = useShellMenuDock((s) => s.candidate)
  const activeMenuDock = useActiveShellMenuDock()
  const setWorkCardHostAvailable = useShellMenuDock((s) => s.setWorkCardHostAvailable)
  const setWorkCollapsedHostAvailable = useShellMenuDock((s) => s.setWorkCollapsedHostAvailable)

  const setCollapsed = useGlobalChatStore((s) => s.setCollapsed)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId)
  const openConversationInSpaceChat = useSpacesStore((s) => s.openConversationInSpaceChat)

  useEffect(() => {
    setCollapsed(true)
  }, [pathname, setCollapsed])

  const spaceParam = searchParams.get('space')
  const previousSimpleChatOpen = useRef(false)
  const conversationBeforeNewChatRef = useRef<string | null>(null)
  useShellWorkspaceScreenChat(pathname, spaceParam)

  useEffect(() => {
    const justOpened = chatDrawerOpen && !previousSimpleChatOpen.current
    previousSimpleChatOpen.current = chatDrawerOpen
    if (menuStyle === 'simple' && justOpened && !artifactTarget) setWorkAreaOpen(false)
  }, [artifactTarget, chatDrawerOpen, menuStyle, setWorkAreaOpen])

  useEffect(() => {
    if (chatParam !== 'new' && chatParam !== 'starting') return
    conversationBeforeNewChatRef.current = useChatStore.getState().activeConversationId
    requestNewChat()
    setActiveConversationId(null)
  }, [chatParam, requestNewChat, setActiveConversationId])

  useEffect(() => {
    if (!convParam) return
    if (isShellHomeRoute(pathname)) {
      openConversationInSpaceChat(convParam)
      setActiveConversationId(convParam)
      return
    }
    if (isShellWorkspaceRoute(pathname)) {
      openChatDrawer(convParam)
      return
    }
    openConversationInSpaceChat(convParam)
    setActiveConversationId(convParam)
  }, [convParam, pathname, openChatDrawer, openConversationInSpaceChat, setActiveConversationId])

  useEffect(() => {
    if (!isShellHomeRoute(pathname) || chatParam !== 'starting' || !activeConversationId) return
    if (activeConversationId === conversationBeforeNewChatRef.current) return
    router.replace(`/home?conv=${encodeURIComponent(activeConversationId)}`)
  }, [activeConversationId, chatParam, pathname, router])

  const showFullNewChat = isShellHomeRoute(pathname) && !convParam && chatParam !== 'starting'
  const showFullConversation =
    isShellHomeRoute(pathname) &&
    (Boolean(convParam) || chatParam === 'starting') &&
    chatParam !== 'new'

  const onSpaces = pathname.startsWith('/spaces')
  const workAreaCollapsible = !showFullNewChat && !showFullConversation
  const workAreaRequestedOpen = workAreaCollapsible ? workAreaOpen : true
  const { mounted: workAreaMounted, visible: workAreaVisible } = useRightEdgePresence(
    workAreaRequestedOpen,
    true,
  )
  const workAreaCollapsed = workAreaCollapsible && !workAreaMounted
  const mobileChatVisible = workAreaCollapsible && !desktop && chatDrawerOpen && !artifactTarget
  const artifactBesideConversation = Boolean(artifactTarget) && showFullConversation && desktop
  const artifactReplacesWorkArea = Boolean(artifactTarget) && !artifactBesideConversation

  useEffect(() => {
    const artifactClosed = previousArtifactTargetRef.current !== null && artifactTarget === null
    previousArtifactTargetRef.current = artifactTarget
    if (artifactClosed && showFullConversation && summaryPanelDocked) setRightPanelOpen(true)
  }, [artifactTarget, setRightPanelOpen, showFullConversation, summaryPanelDocked])
  let homeOrDefaultMain: ReactNode = children
  if (showFullNewChat) {
    homeOrDefaultMain = <ShellNewChatGreeting />
  } else if (showFullConversation) {
    homeOrDefaultMain = (
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
        <GlobalChatPanel shellSidebarChrome presentation="full" />
      </div>
    )
  }

  const showChatDrawer = workAreaCollapsible
  const workColumnPresent =
    shellPrefsHydrated && desktop && !artifactTarget && !showFullNewChat && !showFullConversation
  // During drag, keep work host open so seams stay hittable — layout still uses saved dock.
  const rawWorkAttached =
    isWorkAttachedDock(savedMenuDock) ||
    savedMenuDock === 'left' ||
    (dragging && isWorkAttachedDock(candidateMenuDock))
  const hostInsideWorkBase = workColumnPresent && !workAreaCollapsed
  const hostCollapsedRightBase = workColumnPresent && workAreaCollapsed

  useEffect(() => {
    setWorkCardHostAvailable(hostInsideWorkBase && (rawWorkAttached || dragging))
    setWorkCollapsedHostAvailable(
      hostCollapsedRightBase && (isWorkAttachedDock(savedMenuDock) || dragging),
    )
  }, [
    hostInsideWorkBase,
    hostCollapsedRightBase,
    rawWorkAttached,
    savedMenuDock,
    dragging,
    setWorkCardHostAvailable,
    setWorkCollapsedHostAvailable,
  ])

  // Only clear host flags on unmount — clearing on every dep change briefly
  // forces frame-left fallback mid soft-lock remount.
  useEffect(
    () => () => {
      setWorkCardHostAvailable(false)
      setWorkCollapsedHostAvailable(false)
    },
    [setWorkCardHostAvailable, setWorkCollapsedHostAvailable],
  )

  const menuDock =
    menuStyle === 'simple'
      ? 'left'
      : resolveShellMenuDockForLayout(activeMenuDock, {
          chatOpen: chatDrawerOpen,
          workHostAvailable: hostInsideWorkBase,
        })
  const workAttached = isWorkAttachedDock(menuDock)
  const hostInsideWork = hostInsideWorkBase && workAttached
  // Collapsed-right rail only for docks that were already work-attached (not remapped left).
  const hostCollapsedRight =
    hostCollapsedRightBase &&
    (isWorkAttachedDock(savedMenuDock) || (dragging && isWorkAttachedDock(candidateMenuDock))) &&
    workAttached

  const workBodyDockClass =
    hostInsideWork && menuDock === 'work'
      ? 'shell-work-area-body-dock-work'
      : hostInsideWork && menuDock === 'work-right'
        ? 'shell-work-area-body-dock-work-right'
        : null
  const floatTop = hostInsideWork && menuDock === 'work-top'
  const floatBottom = hostInsideWork && menuDock === 'work-bottom'

  const workspaceMain = onSpaces ? <SpaceWorkDock>{children}</SpaceWorkDock> : homeOrDefaultMain
  const workMain = (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto overflow-x-hidden">
      {menuStyle === 'simple' ? <ShellTopBar /> : null}
      {workspaceMain}
    </div>
  )

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {showChatDrawer && (desktop || !artifactTarget) ? (
          <ShellChatDrawer expanded={workAreaCollapsed || mobileChatVisible} mobile={!desktop} />
        ) : null}

        <div
          className={cn(
            artifactReplacesWorkArea || mobileChatVisible ? 'hidden' : 'shell-work-area',
            !artifactTarget && workAreaCollapsed && 'shell-work-area-collapsed',
          )}
          aria-hidden={!workAreaVisible || artifactReplacesWorkArea || mobileChatVisible}
          data-shell-work-area
        >
          <div
            className={cn(
              'shell-work-area-body',
              workAreaVisible
                ? 'shell-work-area-body-visible'
                : 'shell-work-area-body-offscreen-right',
              workBodyDockClass,
            )}
          >
            {hostInsideWork && menuDock === 'work' ? <ShellSidebarSlot /> : null}
            {/* Always sized — a bare block here collapses the h-full chain below,
                leaving chat panes rendered but 0px tall. */}
            <div className="shell-work-area-body-main">{workMain}</div>
            {hostInsideWork && menuDock === 'work-right' ? <ShellSidebarSlot /> : null}
          </div>
          {floatTop ? (
            <div
              className="shell-menu-dock-float shell-menu-dock-float-top"
              data-shell-menu-dock="work-top"
            >
              <ShellSidebarSlot />
            </div>
          ) : null}
          {floatBottom ? (
            <div
              className="shell-menu-dock-float shell-menu-dock-float-bottom"
              data-shell-menu-dock="work-bottom"
            >
              <ShellSidebarSlot />
            </div>
          ) : null}
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

        <ShellArtifactViewerColumn
          besideConversation={artifactBesideConversation}
          visible={Boolean(artifactTarget) && !workAreaCollapsed}
        >
          <ShellArtifactViewerAdapter />
        </ShellArtifactViewerColumn>
      </div>
    </div>
  )
}
