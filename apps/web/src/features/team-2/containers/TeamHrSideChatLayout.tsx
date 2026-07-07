'use client'

import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
import { usePanelResize } from '@/components/layout/usePanelResize'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { cn } from '@/lib/utils/cn'
import {
  TeamHrSideChatPanel,
  type TeamHrChatRailIntent,
} from '../components/hr-side-chat/TeamHrSideChatPanel'
import { TeamHrSideChatRail } from '../components/hr-side-chat/TeamHrSideChatRail'
import { LOOP_CHAT_OPEN_PANEL_EVENT } from '@/lib/flows/loop-chat-conversation'
import { TEAM_HR_CHAT_COMPOSE_EVENT } from '../lib/team-hr-chat-compose'
import {
  persistAtlasChatCollapsed,
  persistAtlasChatWidth,
  persistLoopChatCollapsed,
  persistLoopChatWidth,
  persistTeamHrChatCollapsed,
  persistTeamHrChatWidth,
  readStoredAtlasChatCollapsed,
  readStoredAtlasChatWidth,
  readStoredLoopChatCollapsed,
  readStoredLoopChatWidth,
  readStoredTeamHrChatCollapsed,
  readStoredTeamHrChatWidth,
} from '../lib/team-hr-chat-storage'

const COLLAPSED_RAIL_WIDTH_PX = 48
const COLLAPSE_RAW_PERCENT = 15
const EXPAND_RAW_PERCENT = 22

interface TeamHrSideChatLayoutProps {
  children: ReactNode
  hrAgent: MissionAgent | null
  hrAgentLoading?: boolean
  agentKey?: string
  agentName?: string
  mobileMainLabel?: string
  buildAwarenessContext?: () => string
  emptyStateGreeting?: string
  blockingOverlay?: ReactNode
  composerTopAccessory?: ReactNode
  composerBlocked?: boolean
  composerBlockedMessage?: string
  showCheckpoints?: boolean
  storageScope?: 'hr' | 'atlas' | 'loop'
  spaceId?: string | null
  resolveSpaceIdBeforeSend?: () => Promise<string | null>
  onStreamSettled?: () => void
  onNewConversation?: () => void
  /** When true, only the main pane is shown (e.g. human DM). */
  hideHrChat?: boolean
  /** When set/changes (e.g. agent page open), Jaime chat starts collapsed. */
  collapseHrChatForAgentKey?: string | null
  className?: string
}

export function TeamHrSideChatLayout({
  children,
  hrAgent,
  hrAgentLoading = false,
  agentKey = 'hr',
  agentName = 'Jaime',
  mobileMainLabel = 'Manage',
  buildAwarenessContext,
  emptyStateGreeting,
  blockingOverlay,
  composerTopAccessory,
  composerBlocked,
  composerBlockedMessage,
  showCheckpoints = true,
  storageScope = 'hr',
  spaceId = null,
  resolveSpaceIdBeforeSend,
  onStreamSettled,
  onNewConversation,
  hideHrChat = false,
  collapseHrChatForAgentKey = null,
  className,
}: TeamHrSideChatLayoutProps) {
  const [mobileMode, setMobileMode] = useState<'chat' | 'main'>('main')
  // Mount exactly one tree — CSS `hidden`/`md:hidden` only hides pixels, so
  // rendering both desktop and mobile trees ran every fetch/effect twice.
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const readCollapsed =
    storageScope === 'atlas'
      ? readStoredAtlasChatCollapsed
      : storageScope === 'loop'
        ? readStoredLoopChatCollapsed
        : readStoredTeamHrChatCollapsed
  const persistCollapsed =
    storageScope === 'atlas'
      ? persistAtlasChatCollapsed
      : storageScope === 'loop'
        ? persistLoopChatCollapsed
        : persistTeamHrChatCollapsed
  const readWidth =
    storageScope === 'atlas'
      ? readStoredAtlasChatWidth
      : storageScope === 'loop'
        ? readStoredLoopChatWidth
        : readStoredTeamHrChatWidth
  const persistWidth =
    storageScope === 'atlas'
      ? persistAtlasChatWidth
      : storageScope === 'loop'
        ? persistLoopChatWidth
        : persistTeamHrChatWidth
  const [chatCollapsed, setChatCollapsed] = useState(() => readCollapsed())
  const [railIntent, setRailIntent] = useState<TeamHrChatRailIntent>(null)
  const defaultChatWidth = useMemo(() => readWidth() ?? 38, [readWidth])
  const {
    chatWidthPercent,
    rawDragWidthPercent,
    isDragging,
    containerRef,
    chatRef,
    handleMouseDown,
  } = usePanelResize({
    defaultWidthPercent: defaultChatWidth,
    minPercent: 28,
    maxPercent: 52,
  })
  const [containerWidthPx, setContainerWidthPx] = useState(0)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerWidthPx(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidthPx(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef])

  const dragPanelPx = Math.max(0, Math.round((chatWidthPercent / 100) * containerWidthPx))

  useEffect(() => {
    if (!isDragging) return
    if (!chatCollapsed && rawDragWidthPercent < COLLAPSE_RAW_PERCENT) {
      setChatCollapsed(true)
      persistCollapsed(true)
    } else if (chatCollapsed && rawDragWidthPercent >= EXPAND_RAW_PERCENT) {
      setChatCollapsed(false)
      persistCollapsed(false)
    }
  }, [rawDragWidthPercent, isDragging, chatCollapsed, persistCollapsed])

  useEffect(() => {
    if (rawDragWidthPercent >= EXPAND_RAW_PERCENT) {
      persistWidth(chatWidthPercent)
    }
  }, [chatWidthPercent, rawDragWidthPercent, persistWidth])

  const expandChat = () => {
    setChatCollapsed(false)
    persistCollapsed(false)
  }

  const collapseChat = () => {
    setChatCollapsed(true)
    persistCollapsed(true)
  }

  const startNewConversation = () => {
    setRailIntent('new')
    expandChat()
    setMobileMode('chat')
  }

  useEffect(() => {
    if (!collapseHrChatForAgentKey) return
    setChatCollapsed(true)
    persistCollapsed(true)
    setRailIntent(null)
    setMobileMode('main')
  }, [collapseHrChatForAgentKey, persistCollapsed])

  useEffect(() => {
    const handler = () => {
      setRailIntent('new')
      setChatCollapsed(false)
      persistCollapsed(false)
      setMobileMode('chat')
    }
    window.addEventListener('team-hr-chat:start-new', handler)
    return () => window.removeEventListener('team-hr-chat:start-new', handler)
  }, [persistCollapsed])

  useEffect(() => {
    const handler = () => {
      setChatCollapsed(false)
      persistCollapsed(false)
      setMobileMode('chat')
    }
    window.addEventListener(TEAM_HR_CHAT_COMPOSE_EVENT, handler)
    return () => window.removeEventListener(TEAM_HR_CHAT_COMPOSE_EVENT, handler)
  }, [persistCollapsed])

  useEffect(() => {
    const handler = () => {
      setChatCollapsed(false)
      persistCollapsed(false)
      setMobileMode('chat')
    }
    window.addEventListener(LOOP_CHAT_OPEN_PANEL_EVENT, handler)
    return () => window.removeEventListener(LOOP_CHAT_OPEN_PANEL_EVENT, handler)
  }, [persistCollapsed])

  const openConversations = () => {
    setRailIntent('list')
    expandChat()
    setMobileMode('chat')
  }

  if (hideHrChat) {
    return (
      <div className={cn('flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden', className)}>
        {children}
      </div>
    )
  }

  if (isDesktop) {
    return (
      <div ref={containerRef} className={cn('flex h-full min-h-0 min-w-0 flex-1 gap-0', className)}>
        <div
          ref={chatRef}
          data-team-hr-chat-panel
          className={cn(
            'min-h-0 shrink-0 overflow-hidden will-change-[width]',
            !isDragging && 'transition-[width] duration-300 ease-out',
          )}
          style={{
            width: chatCollapsed
              ? `${COLLAPSED_RAIL_WIDTH_PX}px`
              : containerWidthPx > 0
                ? `${dragPanelPx}px`
                : `${chatWidthPercent}%`,
          }}
        >
          {/* Mount the panel only while expanded — collapsed, it previously
              still ran its full fetch waterfall behind `hidden`. Data loads
              on first expand instead. */}
          {!chatCollapsed ? (
            <div className="h-full min-h-0">
              <TeamHrSideChatPanel
                agent={hrAgent}
                agentKey={agentKey}
                fallbackAgentName={agentName}
                loading={hrAgentLoading}
                onCollapseChat={collapseChat}
                railIntent={railIntent}
                onRailIntentConsumed={() => setRailIntent(null)}
                buildAwarenessContext={buildAwarenessContext}
                emptyStateGreeting={emptyStateGreeting}
                blockingOverlay={blockingOverlay}
                composerTopAccessory={composerTopAccessory}
                composerBlocked={composerBlocked}
                composerBlockedMessage={composerBlockedMessage}
                showCheckpoints={showCheckpoints}
                storageScope={storageScope}
                spaceId={spaceId}
                resolveSpaceIdBeforeSend={resolveSpaceIdBeforeSend}
                onStreamSettled={onStreamSettled}
                onNewConversation={onNewConversation}
              />
            </div>
          ) : (
            <div className="h-full min-h-0">
              <TeamHrSideChatRail
                agentName={hrAgent?.name ?? agentName}
                imageUrl={hrAgent?.image_url ?? null}
                onExpand={expandChat}
                onNewConversation={startNewConversation}
                onOpenConversations={openConversations}
              />
            </div>
          )}
        </div>
        <ResizableDivider
          onMouseDown={handleMouseDown}
          isDragging={isDragging}
          compact
          showGrip={false}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full min-h-0 min-w-0 flex-1 flex-col', className)}>
      <div className="mb-2 grid grid-cols-2 rounded-xl border border-border p-1">
        <button
          type="button"
          onClick={() => setMobileMode('chat')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mobileMode === 'chat' ? 'surface-card text-foreground' : 'text-muted-foreground'}`}
        >
          {agentName}
        </button>
        <button
          type="button"
          onClick={() => setMobileMode('main')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mobileMode === 'main' ? 'surface-card text-foreground' : 'text-muted-foreground'}`}
        >
          {mobileMainLabel}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {mobileMode === 'chat' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {hrAgentLoading && !hrAgent ? (
              <div className="flex flex-1 items-center justify-center">
                <VibeyLoadingOrb state="processing" size="sm" />
              </div>
            ) : (
              <TeamHrSideChatPanel
                agent={hrAgent}
                agentKey={agentKey}
                fallbackAgentName={agentName}
                loading={hrAgentLoading}
                onCollapseChat={collapseChat}
                railIntent={railIntent}
                onRailIntentConsumed={() => setRailIntent(null)}
                buildAwarenessContext={buildAwarenessContext}
                emptyStateGreeting={emptyStateGreeting}
                blockingOverlay={blockingOverlay}
                composerTopAccessory={composerTopAccessory}
                composerBlocked={composerBlocked}
                composerBlockedMessage={composerBlockedMessage}
                showCheckpoints={showCheckpoints}
                storageScope={storageScope}
                spaceId={spaceId}
                resolveSpaceIdBeforeSend={resolveSpaceIdBeforeSend}
                onStreamSettled={onStreamSettled}
                onNewConversation={onNewConversation}
              />
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        )}
      </div>
    </div>
  )
}
