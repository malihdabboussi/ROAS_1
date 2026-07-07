'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
import { usePanelResize } from '@/components/layout/usePanelResize'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { PRESENTATION_CHAT_REQUEST_OPEN_EVENT } from '@/lib/presentations/presentation-chat-events'
import { cn } from '@/lib/utils/cn'
import { SpaceVibeyChatPanel } from '../components/chat/SpaceVibeyChatPanel'
import { SpaceVibeyChatRail } from '../components/chat/SpaceVibeyChatRail'
import {
  SPACE_COMPOSER_IMPORT_FILES_EVENT,
  SPACE_PRESENTATION_SOURCE_IMPORT_EVENT,
  type SpacePresentationSourceImportDetail,
} from '../lib/presentation-import-events'
import {
  persistSpacesChatWidth,
  readStoredSpacesChatWidth,
  useSpacesStore,
} from '../store/use-spaces-store'
import { SpaceItemsContainer } from './SpaceItemsContainer'

const COLLAPSED_RAIL_WIDTH_PX = 48
const COLLAPSE_RAW_PERCENT = 15
const EXPAND_RAW_PERCENT = 22

export function SpacesContainer() {
  const searchParams = useSearchParams()
  const loadSpaces = useSpacesStore((s) => s.loadSpaces)
  const loadRoster = useSpacesStore((s) => s.loadRoster)
  const loading = useSpacesStore((s) => s.loading)
  const spaces = useSpacesStore((s) => s.spaces)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const ensureDefaultSpace = useSpacesStore((s) => s.ensureDefaultSpace)
  const setActiveSpace = useSpacesStore((s) => s.setActiveSpace)
  const [mobileMode, setMobileMode] = useState<'chat' | 'views'>('chat')
  // Both layout trees below stay in the React tree (CSS swaps them at md),
  // so without this gate every chat fetch ran twice per space load.
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [creatingDefaultSpace, setCreatingDefaultSpace] = useState(false)
  const activeSpace = spaces.find((space) => space.id === activeSpaceId) ?? null
  const roster = useSpacesStore((s) => s.roster)
  const vibeyAgent = useMemo(
    () => roster.find((entry) => entry.agent_key === 'vibey') ?? null,
    [roster],
  )
  const chatCollapsed = useSpacesStore((s) => s.chatCollapsed)
  const setChatCollapsed = useSpacesStore((s) => s.setChatCollapsed)
  const defaultChatWidth = useMemo(() => readStoredSpacesChatWidth() ?? 40, [])
  const {
    chatWidthPercent,
    rawDragWidthPercent,
    isDragging,
    containerRef,
    chatRef,
    handleMouseDown,
  } = usePanelResize({
    defaultWidthPercent: defaultChatWidth,
    minPercent: 25,
    maxPercent: 55,
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
    } else if (chatCollapsed && rawDragWidthPercent >= EXPAND_RAW_PERCENT) {
      setChatCollapsed(false)
    }
  }, [rawDragWidthPercent, isDragging, chatCollapsed, setChatCollapsed])

  useEffect(() => {
    if (searchParams.get('home_seed') !== '1') return
    setChatCollapsed(false)
    setMobileMode('chat')
  }, [searchParams, setChatCollapsed])

  useEffect(() => {
    const onPresentationChatRequest = () => setChatCollapsed(false)
    window.addEventListener(PRESENTATION_CHAT_REQUEST_OPEN_EVENT, onPresentationChatRequest)
    return () => {
      window.removeEventListener(PRESENTATION_CHAT_REQUEST_OPEN_EVENT, onPresentationChatRequest)
    }
  }, [setChatCollapsed])

  useEffect(() => {
    const onPresentationSourceImport = (event: Event) => {
      const detail = (event as CustomEvent<SpacePresentationSourceImportDetail>).detail
      if (!detail?.files?.length) return
      setChatCollapsed(false)
      setMobileMode('chat')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.dispatchEvent(
            new CustomEvent<SpacePresentationSourceImportDetail>(
              SPACE_COMPOSER_IMPORT_FILES_EVENT,
              {
                detail,
              },
            ),
          )
        })
      })
    }

    window.addEventListener(
      SPACE_PRESENTATION_SOURCE_IMPORT_EVENT,
      onPresentationSourceImport as EventListener,
    )
    return () => {
      window.removeEventListener(
        SPACE_PRESENTATION_SOURCE_IMPORT_EVENT,
        onPresentationSourceImport as EventListener,
      )
    }
  }, [setChatCollapsed])

  useEffect(() => {
    loadSpaces()
    loadRoster()
  }, [loadSpaces, loadRoster])

  useEffect(() => {
    if (rawDragWidthPercent >= EXPAND_RAW_PERCENT) {
      persistSpacesChatWidth(chatWidthPercent)
    }
  }, [chatWidthPercent, rawDragWidthPercent])

  useEffect(() => {
    if (loading || spaces.length > 0 || creatingDefaultSpace) return
    let cancelled = false
    setCreatingDefaultSpace(true)
    ensureDefaultSpace()
      .then((space) => {
        if (!cancelled) setActiveSpace(space.id)
      })
      .finally(() => {
        if (!cancelled) setCreatingDefaultSpace(false)
      })
    return () => {
      cancelled = true
    }
  }, [creatingDefaultSpace, ensureDefaultSpace, loading, setActiveSpace, spaces.length])

  if (loading || creatingDefaultSpace) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb state="processing" size="lg" text="Loading spaces..." />
      </div>
    )
  }

  return (
    <>
      <div ref={containerRef} className="hidden h-full min-h-0 min-w-0 gap-0 p-3 md:flex">
        {activeSpace ? (
          <div
            ref={chatRef}
            data-spaces-chat-panel
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
              {isDesktop ? (
                <SpaceVibeyChatPanel
                  key={`${activeSpace.id}:${activeSpace.campaign_id ?? 'personal'}`}
                  spaceId={activeSpace.id}
                  campaignId={activeSpace.campaign_id ?? null}
                  campaignName={activeSpace.title}
                />
              ) : null}
            </div>
            {chatCollapsed ? (
              <div className="h-full min-h-0">
                <SpaceVibeyChatRail
                  agentName={vibeyAgent?.display_name ?? 'Vibey'}
                  imageUrl={vibeyAgent?.avatar_url ?? null}
                  onExpand={() => setChatCollapsed(false)}
                  onNewConversation={() => {
                    useSpacesStore.getState().setChatRailIntent('new')
                    setChatCollapsed(false)
                  }}
                  onOpenConversations={() => {
                    useSpacesStore.getState().setChatRailIntent('list')
                    setChatCollapsed(false)
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        {activeSpace ? (
          <ResizableDivider
            onMouseDown={handleMouseDown}
            isDragging={isDragging}
            compact
            showGrip={false}
          />
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Same isDesktop gate as the chat panel: the desktop tree is only
              CSS-hidden on mobile, so without this the items container (and
              every fetch it owns) mounted twice on phones. */}
          {isDesktop ? (
            <SpaceItemsContainer key={activeSpaceId ? 'has-space' : 'no-space'} />
          ) : null}
        </div>
      </div>
      <div className="flex h-full min-h-0 min-w-0 flex-col p-3 md:hidden">
        <div className="mb-2 grid grid-cols-2 rounded-xl border border-[var(--border)] p-1">
          <button
            type="button"
            onClick={() => setMobileMode('chat')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mobileMode === 'chat' ? 'surface-card text-[var(--foreground)]' : 'text-[var(--color-muted-foreground)]'}`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setMobileMode('views')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mobileMode === 'views' ? 'surface-card text-[var(--foreground)]' : 'text-[var(--color-muted-foreground)]'}`}
          >
            Views
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {isDesktop ? null : mobileMode === 'chat' && activeSpace ? (
            <div data-spaces-chat-panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <SpaceVibeyChatPanel
                key={`${activeSpace.id}:${activeSpace.campaign_id ?? 'personal'}:mobile`}
                spaceId={activeSpace.id}
                campaignId={activeSpace.campaign_id ?? null}
                campaignName={activeSpace.title}
              />
            </div>
          ) : (
            <SpaceItemsContainer />
          )}
        </div>
      </div>
    </>
  )
}
