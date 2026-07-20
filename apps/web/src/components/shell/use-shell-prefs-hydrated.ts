'use client'

import { useLayoutEffect, useState } from 'react'

/**
 * False on SSR and the first client render; true after mount layout effects.
 * Gate shell chrome that reads persisted zustand prefs (sidebar pin, etc.).
 */
export function useShellPrefsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useLayoutEffect(() => {
    setHydrated(true)
  }, [])
  return hydrated
}
