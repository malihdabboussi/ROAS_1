'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GlobalChatPanel } from '@/components/global-chat/containers/GlobalChatPanel'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { cn } from '@/lib/utils/cn'
import { useShellStore } from './use-shell-store'

export function ShellChatDrawer() {
  const open = useShellStore((s) => s.chatDrawer.open)
  const width = useShellStore((s) => s.chatDrawer.width)
  const conversationId = useShellStore((s) => s.chatDrawer.conversationId)
  const setChatDrawerWidth = useShellStore((s) => s.setChatDrawerWidth)
  const minimizeChatDrawer = useShellStore((s) => s.minimizeChatDrawer)
  const newChatNonce = useShellStore((s) => s.newChatNonce)

  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId)
  const openConversationInSpaceChat = useSpacesStore((s) => s.openConversationInSpaceChat)
  const setCollapsed = useGlobalChatStore((s) => s.setCollapsed)

  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(width)

  useEffect(() => {
    if (!open) return
    // Keep legacy global chat collapsed — shell owns the drawer.
    setCollapsed(true)
    if (conversationId) {
      openConversationInSpaceChat(conversationId)
      setActiveConversationId(conversationId)
    } else {
      // Fresh / empty drawer: normal chat empty state (not Home greeting chrome).
      setActiveConversationId(null)
    }
  }, [
    open,
    conversationId,
    newChatNonce,
    openConversationInSpaceChat,
    setActiveConversationId,
    setCollapsed,
  ])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      dragStartX.current = e.clientX
      dragStartWidth.current = width
    },
    [width],
  )

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: PointerEvent) => {
      const delta = e.clientX - dragStartX.current
      setChatDrawerWidth(dragStartWidth.current + delta)
    }
    const onUp = () => setIsDragging(false)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [isDragging, setChatDrawerWidth])

  if (!open) return null

  return (
    <>
      <div
        className={cn(
          'border-border bg-background flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r',
          !isDragging && 'transition-[width] duration-200 ease-out',
        )}
        style={{ width: `${width}px` }}
        data-shell-chat-drawer
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <GlobalChatPanel shellSidebarChrome onCollapseChat={() => minimizeChatDrawer()} />
        </div>
      </div>
      <ResizableDivider
        onMouseDown={handleMouseDown}
        isDragging={isDragging}
        compact
        showGrip={false}
      />
    </>
  )
}
