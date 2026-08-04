'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useShellStore } from './use-shell-store'

/**
 * Registers page breadcrumbs into the shell top bar and clears them on unmount.
 * Renders nothing in-place — content appears in ShellTopBar.
 * Pass `label` so the work-area memory menu can show the specific surface name.
 */
export function ShellBreadcrumb({ children, label }: { children: ReactNode; label?: string }) {
  const setPageBreadcrumb = useShellStore((s) => s.setPageBreadcrumb)
  const ownerRef = useRef<object | null>(null)
  if (ownerRef.current === null) {
    ownerRef.current = {}
  }

  useLayoutEffect(() => {
    const owner = ownerRef.current
    setPageBreadcrumb(children, owner, label ?? null)
    return () => {
      const state = useShellStore.getState()
      if (state.pageBreadcrumbOwner === owner) {
        setPageBreadcrumb(null, owner)
      }
    }
  }, [children, label, setPageBreadcrumb])

  return null
}
