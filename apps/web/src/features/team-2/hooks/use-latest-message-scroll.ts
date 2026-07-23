'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const LATEST_MESSAGE_THRESHOLD = 96

export function useLatestMessageScroll(conversationKey: string, itemCount: number) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const initializedKeyRef = useRef<string | null>(null)
  const wasNearLatestRef = useRef(true)
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = scrollRef.current
    if (!container) return
    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ top: container.scrollHeight, behavior })
    } else {
      container.scrollTop = container.scrollHeight
    }
    wasNearLatestRef.current = true
    setShowJumpToLatest(false)
  }, [])

  const handleScroll = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    const distanceFromLatest = container.scrollHeight - container.scrollTop - container.clientHeight
    const isNearLatest = distanceFromLatest <= LATEST_MESSAGE_THRESHOLD
    wasNearLatestRef.current = isNearLatest
    setShowJumpToLatest(!isNearLatest)
  }, [])

  useEffect(() => {
    if (itemCount === 0) return
    const isNewConversation = initializedKeyRef.current !== conversationKey
    if (isNewConversation) {
      initializedKeyRef.current = conversationKey
      requestAnimationFrame(() => scrollToLatest('auto'))
      return
    }
    if (wasNearLatestRef.current) requestAnimationFrame(() => scrollToLatest('smooth'))
  }, [conversationKey, itemCount, scrollToLatest])

  return { scrollRef, handleScroll, scrollToLatest, showJumpToLatest }
}
