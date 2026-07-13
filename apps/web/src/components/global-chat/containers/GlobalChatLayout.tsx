'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
import { usePanelResize } from '@/components/layout/usePanelResize'
import {
  SPACE_COMPOSER_IMPORT_FILES_EVENT,
  SPACE_PRESENTATION_SOURCE_IMPORT_EVENT,
  type SpacePresentationSourceImportDetail,
} from '@/features/spaces/lib/presentation-import-events'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { PRESENTATION_CHAT_REQUEST_OPEN_EVENT } from '@/lib/presentations/presentation-chat-events'
import { cn } from '@/lib/utils/cn'
import { useGlobalChatStore } from '../store/use-global-chat-store'
import { GlobalChatPanel } from './GlobalChatPanel'

const COLLAPSE_RAW_PERCENT = 15
const EXPAND_RAW_PERCENT = 22

function GlobalChatRouteSync() {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const syncRouteContext = useGlobalChatStore((s) => s.syncRouteContext)
  const loadRoster = useGlobalChatStore((s) => s.loadRoster)
  const setHideForHumanDm = useGlobalChatStore((s) => s.setHideForHumanDm)
  const expandAndFocus = useGlobalChatStore((s) => s.expandAndFocus)
  const setCollapsed = useGlobalChatStore((s) => s.setCollapsed)

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  useEffect(() => {
    syncRouteContext(pathname)
  }, [pathname, syncRouteContext])

  useEffect(() => {
    if (pathname === '/home') {
      setCollapsed(true)
    }
  }, [pathname, setCollapsed])

  useEffect(() => {
    const dm = searchParams.get('dm')
    setHideForHumanDm(Boolean(pathname.startsWith('/team') && dm))
  }, [pathname, searchParams, setHideForHumanDm])

  useEffect(() => {
    const agent = searchParams.get('agent')?.trim()
    if (!agent || !pathname.startsWith('/team')) return
    expandAndFocus({ agentKey: agent, workContext: { surface: 'team' } })
  }, [expandAndFocus, pathname, searchParams])

  useEffect(() => {
    const onPresentationChatRequest = () => useGlobalChatStore.getState().setCollapsed(false)
    window.addEventListener(PRESENTATION_CHAT_REQUEST_OPEN_EVENT, onPresentationChatRequest)
    return () => {
      window.removeEventListener(PRESENTATION_CHAT_REQUEST_OPEN_EVENT, onPresentationChatRequest)
    }
  }, [])

  useEffect(() => {
    const onPresentationSourceImport = (event: Event) => {
      const detail = (event as CustomEvent<SpacePresentationSourceImportDetail>).detail
      if (!detail?.files?.length) return
      useGlobalChatStore.getState().setCollapsed(false)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.dispatchEvent(
            new CustomEvent<SpacePresentationSourceImportDetail>(
              SPACE_COMPOSER_IMPORT_FILES_EVENT,
              { detail },
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
  }, [])

  return null
}

export function GlobalChatLayout({ children }: { children: ReactNode }) {
  const collapsed = useGlobalChatStore((s) => s.collapsed)
  const setCollapsed = useGlobalChatStore((s) => s.setCollapsed)
  const setWidthPercent = useGlobalChatStore((s) => s.setWidthPercent)
  const widthPercent = useGlobalChatStore((s) => s.widthPercent)
  const railIntent = useGlobalChatStore((s) => s.railIntent)
  const setRailIntent = useGlobalChatStore((s) => s.setRailIntent)
  const hideForHumanDm = useGlobalChatStore((s) => s.hideForHumanDm)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [containerWidthPx, setContainerWidthPx] = useState(0)

  const {
    chatWidthPercent,
    rawDragWidthPercent,
    isDragging,
    containerRef,
    chatRef,
    handleMouseDown,
  } = usePanelResize({
    defaultWidthPercent: widthPercent,
    minPercent: 25,
    maxPercent: 55,
  })

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
    if (!collapsed && rawDragWidthPercent < COLLAPSE_RAW_PERCENT) {
      setCollapsed(true)
    } else if (collapsed && rawDragWidthPercent >= EXPAND_RAW_PERCENT) {
      setCollapsed(false)
    }
  }, [rawDragWidthPercent, isDragging, collapsed, setCollapsed])

  useEffect(() => {
    if (rawDragWidthPercent >= EXPAND_RAW_PERCENT) {
      setWidthPercent(chatWidthPercent)
    }
  }, [chatWidthPercent, rawDragWidthPercent, setWidthPercent])

  useLayoutEffect(() => {
    if (railIntent === 'new' || railIntent === 'list') {
      useSpacesStore.getState().setChatRailIntent(railIntent === 'new' ? 'new' : 'list')
      setRailIntent(null)
    }
  }, [railIntent, setRailIntent])

  const dragPanelPx = Math.max(0, Math.round((chatWidthPercent / 100) * containerWidthPx))
  const showChat = !hideForHumanDm
  const showChatColumn = showChat && !collapsed

  const chatColumn = showChat ? (
    <div
      ref={chatRef}
      data-global-chat-panel
      className={cn(
        'min-h-0 shrink-0 overflow-hidden will-change-[width]',
        !showChatColumn && 'pointer-events-none',
        !isDragging && 'transition-[width] duration-300 ease-out',
      )}
      style={{
        width:
          showChatColumn && containerWidthPx > 0
            ? `${dragPanelPx}px`
            : showChatColumn
              ? `${chatWidthPercent}%`
              : 0,
      }}
    >
      <div className={cn('h-full min-h-0', !showChatColumn && 'invisible')}>
        {isDesktop ? <GlobalChatPanel /> : null}
      </div>
    </div>
  ) : null

  return (
    <>
      <GlobalChatRouteSync />
      <div ref={containerRef} className="hidden h-full min-h-0 min-w-0 flex-1 md:flex">
        {chatColumn}
        {showChatColumn ? (
          <ResizableDivider
            onMouseDown={handleMouseDown}
            isDragging={isDragging}
            compact
            showGrip={false}
          />
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>

      <div className="flex h-full min-h-0 min-w-0 flex-col md:hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {showChat && !collapsed && !isDesktop ? <GlobalChatPanel /> : children}
        </div>
      </div>
    </>
  )
}
