'use client'

import { useLayoutEffect } from 'react'
import { hydrateShellStoreFromStorage } from './use-shell-store'

/** Apply persisted shell prefs once after mount — keeps SSR and first client paint aligned. */
export function ShellStoreHydrator() {
  useLayoutEffect(() => {
    hydrateShellStoreFromStorage()
  }, [])
  return null
}
