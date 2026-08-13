'use client'

import { useEffect, useRef } from 'react'
import { shellChatScreenForPathname } from './shell-screen-chat.config'
import { useShellStore } from './use-shell-store'

/** Applies the screen-scoped chat contract when the shell workspace route changes. */
export function useShellWorkspaceScreenChat(pathname: string, spaceParam: string | null) {
  const chatDrawerConversationId = useShellStore((state) => state.chatDrawer.conversationId)
  const handleScreenNavigation = useShellStore((state) => state.handleScreenNavigation)
  const recordScreenConversation = useShellStore((state) => state.recordScreenConversation)
  const setWorkAreaOpen = useShellStore((state) => state.setWorkAreaOpen)
  const lastRouteKey = useRef<string | null>(null)
  const recordedScreenConversationRef = useRef<string | null>(null)

  useEffect(() => {
    const routeKey = `${pathname}::${spaceParam ?? ''}`
    if (lastRouteKey.current === null) {
      lastRouteKey.current = routeKey
      return
    }
    if (lastRouteKey.current === routeKey) return
    lastRouteKey.current = routeKey
    setWorkAreaOpen(true)
    handleScreenNavigation(shellChatScreenForPathname(pathname))
  }, [handleScreenNavigation, pathname, setWorkAreaOpen, spaceParam])

  // A kept-open chat belongs to its original screen. Only a conversation
  // change records an association with the screen currently in view.
  useEffect(() => {
    if (chatDrawerConversationId === recordedScreenConversationRef.current) return
    recordedScreenConversationRef.current = chatDrawerConversationId
    if (!chatDrawerConversationId) return
    const screen = shellChatScreenForPathname(pathname)
    if (!screen) return
    recordScreenConversation(screen.key, chatDrawerConversationId)
  }, [chatDrawerConversationId, pathname, recordScreenConversation])
}
