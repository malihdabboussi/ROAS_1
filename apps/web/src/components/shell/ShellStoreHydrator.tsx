'use client'

import { useLayoutEffect } from 'react'
import { hydrateShellMenuDockFromStorage } from './use-shell-menu-dock'
import { hydrateShellStoreFromStorage } from './use-shell-store'

/** Apply persisted shell prefs once after mount — keeps SSR and first client paint aligned. */
export function ShellStoreHydrator() {
  useLayoutEffect(() => {
    hydrateShellStoreFromStorage()
    hydrateShellMenuDockFromStorage()
  }, [])
  return null
}
