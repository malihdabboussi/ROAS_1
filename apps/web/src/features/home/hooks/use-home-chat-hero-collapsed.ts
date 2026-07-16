'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'vibey.home.chatHeroCollapsed'

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

/** Persist whether the Home chat hero (greeting + composer + templates) is collapsed. */
export function useHomeChatHeroCollapsed() {
  const [collapsed, setCollapsedState] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setCollapsedState(readCollapsed())
    setHydrated(true)
  }, [])

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next)
    writeCollapsed(next)
  }, [])

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      writeCollapsed(next)
      return next
    })
  }, [])

  return { collapsed, hydrated, setCollapsed, toggle }
}
