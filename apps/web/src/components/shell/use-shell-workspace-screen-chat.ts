'use client'

import { useEffect, useRef } from 'react'
import { shellChatScreenForPathname } from './shell-screen-chat.config'
import { useShellStore } from './use-shell-store'

/** Applies the screen-scoped chat contract when the shell workspace route changes. */
export function useShellWorkspaceScreenChat(
  pathname: string,
  spaceParam: string | null,
  hydrated: boolean,
) {
  const showScreenOnly = useShellStore((state) => state.showScreenOnly)
  const setWorkAreaOpen = useShellStore((state) => state.setWorkAreaOpen)
  const lastRouteKey = useRef<string | null>(null)
  const hydratedRouteApplied = useRef(false)

  useEffect(() => {
    const routeKey = `${pathname}::${spaceParam ?? ''}`
    const routeChanged = lastRouteKey.current !== null && lastRouteKey.current !== routeKey
    lastRouteKey.current = routeKey
    if (!hydrated && !routeChanged) return
    if (hydrated && !hydratedRouteApplied.current) hydratedRouteApplied.current = true
    else if (!routeChanged) return
    if (shellChatScreenForPathname(pathname)) {
      showScreenOnly()
      return
    }
    setWorkAreaOpen(true)
  }, [hydrated, pathname, setWorkAreaOpen, showScreenOnly, spaceParam])
}
