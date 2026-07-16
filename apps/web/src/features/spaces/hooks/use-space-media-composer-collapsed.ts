'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'vibey.spaces.mediaComposerCollapsed'

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeCollapsed(collapsed: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** Persist whether the Space Media "Describe a new image" composer is collapsed. */
export function useSpaceMediaComposerCollapsed() {
  const [collapsed, setCollapsedState] = useState(false)

  useEffect(() => {
    setCollapsedState(readCollapsed())
  }, [])

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      writeCollapsed(next)
      return next
    })
  }, [])

  return { collapsed, toggle }
}
