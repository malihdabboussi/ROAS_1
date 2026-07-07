'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 * Returns false during SSR; the client snapshot is correct from the first
 * client render, so it is safe for gating which subtree mounts.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onStoreChange)
      return () => mql.removeEventListener('change', onStoreChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
