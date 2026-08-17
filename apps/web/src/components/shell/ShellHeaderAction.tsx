'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useShellStore } from './use-shell-store'

/**
 * Registers a page action into the shell top bar (right of the breadcrumb)
 * and clears it on unmount. Renders nothing in-place.
 */
export function ShellHeaderAction({ children }: { children: ReactNode }) {
  const setPageHeaderAction = useShellStore((s) => s.setPageHeaderAction)
  const ownerRef = useRef<object | null>(null)
  if (ownerRef.current === null) {
    ownerRef.current = {}
  }

  useLayoutEffect(() => {
    const owner = ownerRef.current
    setPageHeaderAction(children, owner)
    return () => {
      const state = useShellStore.getState()
      if (state.pageHeaderActionOwner === owner) {
        setPageHeaderAction(null, owner)
      }
    }
  }, [children, setPageHeaderAction])

  return null
}
