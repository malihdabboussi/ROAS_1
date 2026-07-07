'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type PublicAgentScrollMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
}

interface UsePublicAgentMessageScrollOptions {
  messages: PublicAgentScrollMessage[]
  conversationId?: string | null
  isStreaming: boolean
}

export function shouldAnchorPublicAgentLatestUser(
  messages: PublicAgentScrollMessage[],
  isStreaming: boolean,
): boolean {
  const latestMessageRole = messages.at(-1)?.role ?? null
  return latestMessageRole === 'user' || isStreaming
}

export function getPublicAgentBottomSpacerHeight({
  scrollAreaHeight,
  latestUserMessageHeight,
  shouldReserveSpace,
}: {
  scrollAreaHeight: number
  latestUserMessageHeight: number
  shouldReserveSpace: boolean
}): number {
  if (!shouldReserveSpace) return 0
  return Math.max(0, scrollAreaHeight - latestUserMessageHeight)
}

export function usePublicAgentMessageScroll({
  messages,
  conversationId,
  isStreaming,
}: UsePublicAgentMessageScrollOptions) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const latestUserMessageRef = useRef<HTMLDivElement>(null)
  const previousMessageCountRef = useRef(0)
  const lastScrolledConversationRef = useRef<string | null>(null)
  const [scrollAreaHeight, setScrollAreaHeight] = useState(0)
  const [latestUserMessageHeight, setLatestUserMessageHeight] = useState(0)

  const latestUserMessageId = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'user')?.id ?? null,
    [messages],
  )
  const shouldKeepLatestUserAnchored = shouldAnchorPublicAgentLatestUser(messages, isStreaming)

  const scrollLatestUserToTop = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      requestAnimationFrame(() => {
        const scrollEl = scrollRef.current
        if (!scrollEl || !latestUserMessageId) return

        const userMessage = latestUserMessageRef.current
        if (!userMessage) return

        const containerTop = scrollEl.getBoundingClientRect().top
        const messageTop = userMessage.getBoundingClientRect().top
        scrollEl.scrollTo({
          top: scrollEl.scrollTop + messageTop - containerTop,
          behavior,
        })
      })
    },
    [latestUserMessageId],
  )

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      const scrollEl = scrollRef.current
      if (!scrollEl) return
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior })
    })
  }, [])

  useEffect(() => {
    if (messages.length === 0) {
      previousMessageCountRef.current = 0
      return undefined
    }

    const currentCount = messages.length
    const previousCount = previousMessageCountRef.current
    previousMessageCountRef.current = currentCount

    const conversationKey = conversationId ?? 'pending-public-agent-conversation'
    const isNewConversation = lastScrolledConversationRef.current !== conversationKey
    if (isNewConversation) lastScrolledConversationRef.current = conversationKey

    const hasNewMessage = currentCount > previousCount
    const shouldAnchorLatestUser =
      !!latestUserMessageId &&
      shouldKeepLatestUserAnchored &&
      (hasNewMessage || isNewConversation || isStreaming)

    if (shouldAnchorLatestUser) {
      const timeoutId = window.setTimeout(() => scrollLatestUserToTop(), 80)
      return () => window.clearTimeout(timeoutId)
    }

    if (!latestUserMessageId && (hasNewMessage || isNewConversation)) {
      scrollToBottom(isNewConversation ? 'auto' : 'smooth')
    }
    return undefined
  }, [
    conversationId,
    isStreaming,
    latestUserMessageId,
    messages.length,
    scrollLatestUserToTop,
    scrollToBottom,
    shouldKeepLatestUserAnchored,
  ])

  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return undefined

    const applyHeight = () => setScrollAreaHeight(scrollEl.clientHeight)
    if (typeof ResizeObserver === 'undefined') {
      applyHeight()
      return undefined
    }

    const resizeObserver = new ResizeObserver(applyHeight)
    resizeObserver.observe(scrollEl)
    applyHeight()
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    const userMessage = latestUserMessageRef.current
    if (!userMessage) {
      setLatestUserMessageHeight(0)
      return undefined
    }

    const applyHeight = () => setLatestUserMessageHeight(userMessage.getBoundingClientRect().height)
    if (typeof ResizeObserver === 'undefined') {
      applyHeight()
      return undefined
    }

    const resizeObserver = new ResizeObserver(applyHeight)
    resizeObserver.observe(userMessage)
    applyHeight()
    return () => resizeObserver.disconnect()
  }, [latestUserMessageId])

  const bottomSpacerHeight = getPublicAgentBottomSpacerHeight({
    scrollAreaHeight,
    latestUserMessageHeight,
    shouldReserveSpace: !!latestUserMessageId && shouldKeepLatestUserAnchored,
  })

  return { scrollRef, latestUserMessageId, latestUserMessageRef, bottomSpacerHeight }
}
