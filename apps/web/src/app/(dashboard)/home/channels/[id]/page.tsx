'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import {
  ChannelChatContainer,
  useChannelMembers,
  useChannelMessages,
  useChannels,
} from '@/features/channels'
import {
  buildChannelAwarenessContext,
  type ChannelRightPanelAwareness,
} from '@/features/channels/lib/build-channel-awareness-context'
import { useAccountContextGate } from '@/features/org/store/use-org-store'
import { SpaceVibeyChatPanel } from '@/features/spaces/components/chat/SpaceVibeyChatPanel'
import { SpaceVibeyChatRail } from '@/features/spaces/components/chat/SpaceVibeyChatRail'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { ResizableDivider } from '@/features/studio/components/layout/ResizableDivider'
import { usePanelResize } from '@/features/studio/hooks/usePanelResize'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { cn } from '@/lib/utils/cn'

const COLLAPSED_RAIL_WIDTH_PX = 48
const COLLAPSE_RAW_PERCENT = 15
const EXPAND_RAW_PERCENT = 22

export default function HomeChannelPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const { isAccountContextReady, isPersonalAccountContext } = useAccountContextGate()
  // Mount exactly one of the desktop/mobile trees — CSS `hidden`/`md:hidden`
  // only hides pixels, so dual-mounting runs every chat fetch/effect twice.
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [mobileMode, setMobileMode] = useState<'chat' | 'channel'>('chat')
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [containerWidthPx, setContainerWidthPx] = useState(0)
  const [rightPanelAwareness, setRightPanelAwareness] = useState<ChannelRightPanelAwareness>({
    activeTab: 'messages',
    openThreadId: null,
    visibleMessageIds: [],
    deliverableThreadFilter: null,
    composerDraft: {
      text: '',
      attachmentNames: [],
      pastedBlockCount: 0,
      recordingState: 'idle',
      linkInputOpen: false,
      uploadingAttachmentCount: 0,
    },
    previewDeliverable: null,
  })
  const setChatRailIntent = useSpacesStore((s) => s.setChatRailIntent)
  const roster = useSpacesStore((s) => s.roster)
  const loadRoster = useSpacesStore((s) => s.loadRoster)
  const vibeyAgent = useMemo(
    () => roster.find((entry) => entry.agent_key === 'vibey') ?? null,
    [roster],
  )
  const id = params?.id
  const thread = searchParams.get('thread')
  const initialOpenThreadId = typeof thread === 'string' && thread.length > 0 ? thread : null
  const { channels } = useChannels(Boolean(id))
  const { members } = useChannelMembers(id ?? null)
  const { messages } = useChannelMessages(id ?? null)
  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === id) ?? null,
    [channels, id],
  )
  const channelAwarenessContext = useMemo(
    () =>
      buildChannelAwarenessContext({
        channel: selectedChannel,
        members,
        messages,
        activeThreadId: rightPanelAwareness.openThreadId ?? initialOpenThreadId,
        rightPanel: {
          ...rightPanelAwareness,
          mobileMode,
          chatCollapsed,
        },
      }),
    [
      chatCollapsed,
      initialOpenThreadId,
      members,
      messages,
      mobileMode,
      rightPanelAwareness,
      selectedChannel,
    ],
  )
  const {
    chatWidthPercent,
    rawDragWidthPercent,
    isDragging,
    containerRef,
    chatRef,
    handleMouseDown,
  } = usePanelResize({
    defaultWidthPercent: 40,
    minPercent: 25,
    maxPercent: 55,
  })

  useEffect(() => {
    if (isPersonalAccountContext) router.replace('/home')
  }, [isPersonalAccountContext, router])

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

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

  useEffect(() => {
    if (!isDragging) return
    if (!chatCollapsed && rawDragWidthPercent < COLLAPSE_RAW_PERCENT) {
      setChatCollapsed(true)
    } else if (chatCollapsed && rawDragWidthPercent >= EXPAND_RAW_PERCENT) {
      setChatCollapsed(false)
    }
  }, [chatCollapsed, isDragging, rawDragWidthPercent])

  const handleRightPanelAwarenessChange = useCallback((next: ChannelRightPanelAwareness) => {
    setRightPanelAwareness(next)
  }, [])

  if (!isAccountContextReady || isPersonalAccountContext || !id) return null

  const dragPanelPx = Math.max(0, Math.round((chatWidthPercent / 100) * containerWidthPx))
  const renderChatPanel = (keySuffix = '') => (
    <SpaceVibeyChatPanel
      key={`channel:${id}${keySuffix}`}
      campaignId={null}
      campaignName={null}
      channelContext={{
        channelId: id,
        channelName: selectedChannel?.name ?? 'Channel',
        awarenessContext: channelAwarenessContext,
      }}
      onCollapseChat={() => setChatCollapsed(true)}
    />
  )
  const renderChannelPanel = () => (
    <ChannelChatContainer
      channelId={id}
      initialOpenThreadId={initialOpenThreadId}
      omitChatTrailingInset
      onViewContextChange={handleRightPanelAwarenessChange}
    />
  )

  return (
    <>
      <div ref={containerRef} className="hidden h-full min-h-0 min-w-0 gap-0 p-3 md:flex">
        <div
          ref={chatRef}
          data-channels-chat-panel
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
          <div className={chatCollapsed ? 'hidden' : 'h-full min-h-0'}>
            {isDesktop ? renderChatPanel() : null}
          </div>
          {chatCollapsed ? (
            <div className="h-full min-h-0">
              <SpaceVibeyChatRail
                agentName={vibeyAgent?.display_name ?? 'Vibey'}
                imageUrl={vibeyAgent?.avatar_url ?? null}
                onExpand={() => setChatCollapsed(false)}
                onNewConversation={() => {
                  setChatRailIntent('new')
                  setChatCollapsed(false)
                }}
                onOpenConversations={() => {
                  setChatRailIntent('list')
                  setChatCollapsed(false)
                }}
              />
            </div>
          ) : null}
        </div>

        <ResizableDivider
          onMouseDown={handleMouseDown}
          isDragging={isDragging}
          compact
          showGrip={false}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {isDesktop ? renderChannelPanel() : null}
        </div>
      </div>

      <div className="flex h-full min-h-0 min-w-0 flex-col p-3 md:hidden">
        <div className="border-border mb-2 grid grid-cols-2 rounded-xl border p-1">
          <button
            type="button"
            onClick={() => setMobileMode('chat')}
            className={`body-4 rounded-lg px-3 py-1.5 font-medium ${
              mobileMode === 'chat' ? 'surface-card text-foreground' : 'text-muted-foreground'
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setMobileMode('channel')}
            className={`body-4 rounded-lg px-3 py-1.5 font-medium ${
              mobileMode === 'channel' ? 'surface-card text-foreground' : 'text-muted-foreground'
            }`}
          >
            Channel
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {isDesktop
            ? null
            : mobileMode === 'chat'
              ? renderChatPanel(':mobile')
              : renderChannelPanel()}
        </div>
      </div>
    </>
  )
}
