'use client'

import { useEffect, useRef } from 'react'

export function useAutoLoadRemainingSpaces({
  enabled,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  enabled: boolean
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}) {
  const requestedRef = useRef(false)

  useEffect(() => {
    if (!enabled || !hasMore) {
      requestedRef.current = false
      return
    }
    if (loadingMore) {
      requestedRef.current = false
      return
    }
    if (requestedRef.current) return
    requestedRef.current = true
    onLoadMore()
  }, [enabled, hasMore, loadingMore, onLoadMore])
}
