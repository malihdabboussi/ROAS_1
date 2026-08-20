'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import {
  currentWorkAreaHref,
  resolveWorkAreaPageForConversationChange,
  shouldRestoreWorkAreaHrefOnConversationChange,
  workAreaHrefsMatch,
} from './shell-work-area-page'
import { useShellMenuDock } from './use-shell-menu-dock'
import { useShellStore } from './use-shell-store'

/**
 * Restores (or keeps pinned) the shell artifact and that chat's last work
 * screen when the active conversation changes.
 */
export function useShellArtifactConversationSync(): void {
  const router = useRouter()
  const pathname = usePathname() ?? '/home'
  const searchParams = useSearchParams()
  const menuStyle = useShellMenuDock((s) => s.menuStyle)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const syncArtifactViewerForConversation = useShellStore(
    (s) => s.syncArtifactViewerForConversation,
  )
  const previousConversationIdRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (previousConversationIdRef.current === undefined) {
      previousConversationIdRef.current = activeConversationId
      return
    }
    if (previousConversationIdRef.current === activeConversationId) return
    previousConversationIdRef.current = activeConversationId
    syncArtifactViewerForConversation(activeConversationId)
    if (!shouldRestoreWorkAreaHrefOnConversationChange({ menuStyle, pathname })) return

    const state = useShellStore.getState()
    const page = resolveWorkAreaPageForConversationChange({
      artifactPinned: state.artifactPinned,
      nextConversationId: activeConversationId,
      lastWorkAreaPageByConversation: state.lastWorkAreaPageByConversation,
    })
    if (!page) return
    if (page.restore) state.setPendingWorkRestore(page.restore)
    state.setWorkAreaOpen(true)
    const current = currentWorkAreaHref(pathname, searchParams.toString())
    if (workAreaHrefsMatch(current, page.href)) return
    router.push(page.href)
  }, [
    activeConversationId,
    menuStyle,
    pathname,
    router,
    searchParams,
    syncArtifactViewerForConversation,
  ])
}
