'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'

export function useTaskDetailNavigation({
  spaceId,
  activeViewId,
  onClose,
}: {
  spaceId: string
  activeViewId: string | null
  onClose: () => void
}) {
  const router = useRouter()
  const closeAndNavigate = useCallback(
    (url: string) => {
      onClose()
      router.push(url)
    },
    [onClose, router],
  )
  const openConversationById = useCallback(
    (conversationId: string) => {
      useSpacesStore.getState().openConversationInSpaceChat(conversationId)
      useSpacesStore.getState().setChatCollapsed(false)
      useSpacesStore.getState().setActiveSpace(spaceId)
      closeAndNavigate(`/spaces?space=${encodeURIComponent(spaceId)}`)
    },
    [closeAndNavigate, spaceId],
  )
  const navigateToSpace = useCallback(
    () => closeAndNavigate(`/spaces?space=${encodeURIComponent(spaceId)}`),
    [closeAndNavigate, spaceId],
  )
  const navigateToView = useCallback(() => {
    if (!activeViewId) return
    closeAndNavigate(
      `/spaces?space=${encodeURIComponent(spaceId)}&v=${encodeURIComponent(activeViewId)}`,
    )
  }, [activeViewId, closeAndNavigate, spaceId])

  return { openConversationById, navigateToSpace, navigateToView }
}
