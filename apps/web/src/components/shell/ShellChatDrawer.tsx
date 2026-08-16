'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { History } from 'lucide-react'
import { GlobalChatPanel } from '@/components/global-chat/containers/GlobalChatPanel'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { selectConversation } from '@/features/studio/services/chat.service'
import { initConversationTitleAutogen } from '@/features/studio/services/conversation-title-scheduler'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { ARTIFACT_VIEWER_WIDTH_MIN } from '@/lib/artifacts/artifact-viewer-layout'
import { cn } from '@/lib/utils/cn'
import { ShellChatHeaderPageControl } from './ShellChatHeaderPageControl'
import { ShellChatMenu } from './ShellChatMenu'
import { ShellScreenChatPrompt } from './ShellScreenChatPrompt'
import { isWorkAttachedDock, useShellMenuDock } from './use-shell-menu-dock'
import { useShellStore } from './use-shell-store'

/** Matches the drawer/HQ-rail transition in globals.css. */
const DRAWER_SLIDE_MS = 300
const DRAWER_COLLAPSE_EDGE_TOLERANCE = 24
const HISTORY_COLLAPSE_THRESHOLD = 96
const ARTIFACT_BESIDE_MIN_WIDTH = ARTIFACT_VIEWER_WIDTH_MIN
/** Dragging this far past the artifact's stop reads as intent to dismiss it. */
const ARTIFACT_COLLAPSE_OVERSHOOT = 180

export function ShellChatDrawer({
  expanded = false,
  mobile = false,
}: {
  expanded?: boolean
  mobile?: boolean
}) {
  const open = useShellStore((s) => s.chatDrawer.open)
  const simpleMenu = useShellMenuDock((s) => s.menuStyle === 'simple')
  const menuDock = useShellMenuDock((s) => s.dock)
  const width = useShellStore((s) => s.chatDrawer.width)
  const conversationId = useShellStore((s) => s.chatDrawer.conversationId)
  const historyWidth = useShellStore((s) => s.chatHistoryWidth)
  const historyCollapsed = useShellStore((s) => s.chatHistoryCollapsed)
  const setChatDrawerWidth = useShellStore((s) => s.setChatDrawerWidth)
  const setChatHistoryWidth = useShellStore((s) => s.setChatHistoryWidth)
  const setChatHistoryCollapsed = useShellStore((s) => s.setChatHistoryCollapsed)
  const setWorkAreaOpen = useShellStore((s) => s.setWorkAreaOpen)
  const artifactOpenBeside = useShellStore((s) => Boolean(s.artifactViewer.target))
  const closeArtifactViewer = useShellStore((s) => s.closeArtifactViewer)
  const minimizeChatDrawer = useShellStore((s) => s.minimizeChatDrawer)
  const newChatNonce = useShellStore((s) => s.newChatNonce)

  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId)
  const openConversationInSpaceChat = useSpacesStore((s) => s.openConversationInSpaceChat)
  const setChatRailIntent = useSpacesStore((s) => s.setChatRailIntent)
  const setCollapsed = useGlobalChatStore((s) => s.setCollapsed)

  const [isDragging, setIsDragging] = useState(false)
  const [isHistoryDragging, setIsHistoryDragging] = useState(false)
  const [mounted, setMounted] = useState(open)
  const drawerRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(width)
  const dragStartLeft = useRef(0)
  const dragDividerWidth = useRef(0)
  const dragRemainingWidth = useRef(Number.POSITIVE_INFINITY)
  const dragOvershoot = useRef(Number.NEGATIVE_INFINITY)
  const historyDragStartX = useRef(0)
  const historyDragStartWidth = useRef(historyWidth)
  const historyDragRawWidth = useRef(historyWidth)
  const lastHandledNewChatNonceRef = useRef(0)

  useEffect(() => {
    initConversationTitleAutogen()
  }, [])

  // Keep the drawer mounted for its single width transition. The contents are
  // clipped by the drawer itself so they never run a second, conflicting slide.
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => setMounted(false), DRAWER_SLIDE_MS)
      return () => clearTimeout(timer)
    }
    setMounted(true)
    return undefined
  }, [open])

  useEffect(() => {
    if (!open) return
    // Keep legacy global chat collapsed — shell owns the drawer.
    setCollapsed(true)
    if (conversationId) {
      // Selecting a history row must cancel a stale "new chat" intent so list
      // hydration cannot wipe the panel while the drawer still highlights the row.
      setChatRailIntent(null)
      openConversationInSpaceChat(conversationId)
      setActiveConversationId(conversationId)
      void selectConversation(conversationId)
      return
    }
    // Fresh chat request (pen while open / green New): clear the panel thread.
    if (newChatNonce > lastHandledNewChatNonceRef.current) {
      lastHandledNewChatNonceRef.current = newChatNonce
      setChatRailIntent('new')
      setActiveConversationId(null)
      return
    }
    // Restore without a shell conversation id: leave panel free to hydrate last chat.
  }, [
    open,
    conversationId,
    newChatNonce,
    openConversationInSpaceChat,
    setActiveConversationId,
    setChatRailIntent,
    setCollapsed,
  ])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      dragStartX.current = e.clientX
      dragStartWidth.current = width
      dragStartLeft.current = drawerRef.current?.getBoundingClientRect().left ?? 0
      dragDividerWidth.current = e.currentTarget.getBoundingClientRect().width
      dragRemainingWidth.current = Number.POSITIVE_INFINITY
      dragOvershoot.current = Number.NEGATIVE_INFINITY
    },
    [width],
  )

  const handleHistoryMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsHistoryDragging(true)
      historyDragStartX.current = e.clientX
      historyDragStartWidth.current = historyWidth
      historyDragRawWidth.current = historyWidth
    },
    [historyWidth],
  )

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: PointerEvent) => {
      const delta = e.clientX - dragStartX.current
      const availableWidth = Math.max(
        0,
        window.innerWidth - dragStartLeft.current - dragDividerWidth.current,
      )
      // An open artifact keeps a readable column — the drag stops before
      // crushing it instead of squeezing its content to a sliver.
      const dragLimit = artifactOpenBeside
        ? Math.max(0, availableWidth - ARTIFACT_BESIDE_MIN_WIDTH)
        : availableWidth
      const rawWidth = dragStartWidth.current + delta
      const nextWidth = Math.min(dragLimit, rawWidth)
      dragOvershoot.current = rawWidth - dragLimit
      dragRemainingWidth.current = availableWidth - nextWidth
      setChatDrawerWidth(nextWidth)
    }
    const onUp = () => {
      setIsDragging(false)
      if (artifactOpenBeside) {
        // Pushing well past the stop reads as intent: collapse the artifact
        // away to the right and give the chat back its pre-drag width.
        if (dragOvershoot.current > ARTIFACT_COLLAPSE_OVERSHOOT) {
          closeArtifactViewer()
          setChatDrawerWidth(dragStartWidth.current)
        }
        return
      }
      if (dragRemainingWidth.current > DRAWER_COLLAPSE_EDGE_TOLERANCE) return
      // Reaching the right edge is the drag equivalent of "chat full screen".
      // Keep the prior docked width so showing the page again restores its layout.
      setWorkAreaOpen(false)
      setChatDrawerWidth(dragStartWidth.current)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [artifactOpenBeside, closeArtifactViewer, isDragging, setChatDrawerWidth, setWorkAreaOpen])

  useEffect(() => {
    if (!isHistoryDragging) return
    const onMove = (e: PointerEvent) => {
      const delta = e.clientX - historyDragStartX.current
      historyDragRawWidth.current = historyDragStartWidth.current + delta
      setChatHistoryWidth(historyDragRawWidth.current)
    }
    const onUp = () => {
      setIsHistoryDragging(false)
      if (historyDragRawWidth.current <= HISTORY_COLLAPSE_THRESHOLD) {
        setChatHistoryCollapsed(true)
      }
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [isHistoryDragging, setChatHistoryCollapsed, setChatHistoryWidth])

  if (!mounted) return null

  // Expanded = page collapsed: history stays, chat fills the freed width.
  // Docked = fixed width with slide-in animation. The summary column, when it
  // fits, lives inside the chat pane instead of widening this drawer.
  const drawerWidthStyle = expanded ? undefined : { width: open ? `${width}px` : '0px' }
  const bodyStyle = expanded ? undefined : { width: `${width}px` }
  const showPageRestore = expanded && simpleMenu && !isWorkAttachedDock(menuDock)

  return (
    <>
      <div
        ref={drawerRef}
        className={cn(
          'shell-chat-drawer',
          expanded && 'shell-chat-drawer-expanded',
          !isDragging && !expanded && 'shell-chat-drawer-animated',
        )}
        style={drawerWidthStyle}
        aria-hidden={!expanded && !open}
        data-shell-chat-drawer
        data-expanded={expanded ? 'true' : 'false'}
      >
        <div
          className={cn('shell-chat-drawer-body', expanded && 'shell-chat-drawer-body-expanded')}
          style={bodyStyle}
        >
          {!simpleMenu && !historyCollapsed ? (
            <>
              <div
                className={cn('shell-chat-drawer-menu', mobile && 'w-full')}
                style={mobile ? undefined : { width: `${historyWidth}px` }}
                data-shell-chat-history
              >
                <ShellChatMenu
                  onCollapse={() => setChatHistoryCollapsed(true)}
                  onOpenChat={mobile ? () => setChatHistoryCollapsed(true) : undefined}
                />
              </div>
              {!mobile ? (
                <ResizableDivider
                  onMouseDown={handleHistoryMouseDown}
                  isDragging={isHistoryDragging}
                  compact
                  showGrip={false}
                  ariaLabel="Resize chat history"
                />
              ) : null}
            </>
          ) : null}
          <div
            className={cn(
              'min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
              mobile && !simpleMenu && !historyCollapsed ? 'hidden' : 'flex',
            )}
            aria-hidden={mobile && !simpleMenu && !historyCollapsed}
          >
            <ShellScreenChatPrompt />
            <GlobalChatPanel
              shellSidebarChrome
              onCollapseChat={() => minimizeChatDrawer()}
              headerTrailingAction={showPageRestore ? <ShellChatHeaderPageControl /> : undefined}
              headerLeadingAction={
                !simpleMenu && historyCollapsed ? (
                  <button
                    type="button"
                    onClick={() => setChatHistoryCollapsed(false)}
                    className="btn-icon-bare"
                    aria-label="Show chat history"
                    title="Show chat history"
                  >
                    <History className="icon-sm nav-glass-text-purple" aria-hidden />
                  </button>
                ) : undefined
              }
            />
          </div>
        </div>
      </div>
      {!expanded && !mobile ? (
        <ResizableDivider
          onMouseDown={handleMouseDown}
          isDragging={isDragging}
          compact
          showGrip={false}
          ariaLabel="Resize AI chat drawer"
        />
      ) : null}
    </>
  )
}
