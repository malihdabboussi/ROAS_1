import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import type { Message } from '@/lib/chat/studio-chat-runtime-adapter'
import {
  BOTTOM_SCROLL_THRESHOLD,
  OLDER_PAGE_SIZE,
  TOP_LOAD_THRESHOLD,
} from './agent-chat-panel.logic'

export interface UseAgentChatScrollControllerInput {
  selectedSessionId: string | null
  messages: Message[]
  isMobile: boolean
  mobileNavScreen: 'conversations' | 'thread'
  initializing: boolean
  sessionsLoading: boolean
  conversationAnchorRef: MutableRefObject<string | null>
  fetchMessagesForSession: (
    conversationId: string,
    options?: { limit?: number; before?: string },
  ) => Promise<Message[]>
  setMessages: (conversationId: string, messages: Message[]) => void
}

export function useAgentChatScrollController({
  selectedSessionId,
  messages,
  isMobile,
  mobileNavScreen,
  initializing,
  sessionsLoading,
  conversationAnchorRef,
  fetchMessagesForSession,
  setMessages,
}: UseAgentChatScrollControllerInput) {
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasOlder, setHasOlder] = useState(true)
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)
  const [spacerHeight, setSpacerHeight] = useState(0)
  const [lastUserPromptHeight, setLastUserPromptHeight] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const lastUserPromptRef = useRef<HTMLDivElement>(null)
  const isProgrammaticScrollRef = useRef(false)
  const previousMessageCountRef = useRef(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const applyHeight = (height: number) => {
      setSpacerHeight(height)
    }
    const resizeObserver = new ResizeObserver(([entry]) => {
      if (entry) applyHeight(entry.contentRect.height)
    })
    resizeObserver.observe(el)
    applyHeight(el.clientHeight)
    return () => resizeObserver.disconnect()
  }, [selectedSessionId])

  useEffect(() => {
    const el = lastUserPromptRef.current
    if (!el) return
    const resizeObserver = new ResizeObserver(([entry]) => {
      if (entry) {
        const height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height
        setLastUserPromptHeight(height)
      }
    })
    resizeObserver.observe(el)
    return () => resizeObserver.disconnect()
  }, [messages.length])

  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl || messages.length === 0) return

    const currentCount = messages.length
    const prevCount = previousMessageCountRef.current
    previousMessageCountRef.current = currentCount

    const isNewConversation = conversationAnchorRef.current !== selectedSessionId
    if (isNewConversation) {
      conversationAnchorRef.current = selectedSessionId
    }

    if (isNewConversation && isMobile) {
      setUserHasScrolledUp(false)
      return
    }

    if ((currentCount > prevCount && prevCount > 0) || isNewConversation) {
      const latestUserMsg = [...messages].reverse().find((message) => message.role === 'user')
      if (latestUserMsg) {
        setTimeout(() => {
          const el = scrollEl.querySelector(`[data-turn-id="${latestUserMsg.id}"]`)
          if (el) {
            isProgrammaticScrollRef.current = true
            const containerTop = scrollEl.getBoundingClientRect().top
            const elTop = el.getBoundingClientRect().top
            scrollEl.scrollTop += elTop - containerTop
            requestAnimationFrame(() => {
              isProgrammaticScrollRef.current = false
            })
          }
        }, 80)
      }
      setUserHasScrolledUp(false)
    }
  }, [conversationAnchorRef, isMobile, messages, messages.length, selectedSessionId])

  useLayoutEffect(() => {
    if (!isMobile) return
    if (mobileNavScreen !== 'thread') return
    if (!selectedSessionId) return
    if (initializing || sessionsLoading) return

    const el = scrollRef.current
    if (!el) return

    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [initializing, isMobile, mobileNavScreen, selectedSessionId, sessionsLoading])

  const loadOlderMessages = useCallback(async () => {
    if (!selectedSessionId || loadingOlder || !hasOlder || messages.length === 0) return
    const oldest = messages[0]
    if (!oldest?.created_at) return

    const scrollEl = scrollRef.current
    const prevHeight = scrollEl?.scrollHeight ?? 0
    const prevTop = scrollEl?.scrollTop ?? 0
    setLoadingOlder(true)
    try {
      const older = await fetchMessagesForSession(selectedSessionId, {
        limit: OLDER_PAGE_SIZE,
        before: oldest.created_at,
      })
      if (older.length === 0) {
        setHasOlder(false)
        return
      }
      const deduped = older.filter((candidate) => !messages.some((m) => m.id === candidate.id))
      if (deduped.length === 0) {
        setHasOlder(false)
        return
      }
      setMessages(selectedSessionId, [...deduped, ...messages])
      setHasOlder(older.length === OLDER_PAGE_SIZE)
      requestAnimationFrame(() => {
        const el = scrollRef.current
        if (!el) return
        const newHeight = el.scrollHeight
        el.scrollTop = newHeight - prevHeight + prevTop
      })
    } finally {
      setLoadingOlder(false)
    }
  }, [
    fetchMessagesForSession,
    hasOlder,
    loadingOlder,
    messages,
    selectedSessionId,
    setMessages,
  ])

  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop <= TOP_LOAD_THRESHOLD) {
      void loadOlderMessages()
    }
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_SCROLL_THRESHOLD
    setUserHasScrolledUp(!atBottom)
  }, [loadOlderMessages])

  const handleScrollToBottom = useCallback(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return
    scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' })
    setUserHasScrolledUp(false)
  }, [])

  return {
    scrollRef,
    contentRef,
    lastUserPromptRef,
    spacerHeight,
    lastUserPromptHeight,
    userHasScrolledUp,
    setHasOlder,
    setUserHasScrolledUp,
    handleScroll,
    handleScrollToBottom,
  }
}
