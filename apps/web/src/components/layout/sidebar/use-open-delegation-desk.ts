'use client'

import { toast } from 'sonner'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { DELEGATION_TOAST_MESSAGES } from '@/features/spaces/config/delegation-messages.config'
import { ensureDelegationDesk } from '@/features/spaces/services/delegation-desk.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space } from '@/features/spaces/types'

export function useOpenDelegationDesk({
  router,
  sidebarSpaces,
  onClose,
}: {
  router: { push: (href: string) => void }
  sidebarSpaces: Space[]
  onClose: () => void
}) {
  const setCollapsed = useGlobalChatStore((state) => state.setCollapsed)

  return async () => {
    try {
      const storedSpaces = useSpacesStore.getState().spaces
      const knownSpaces = [
        ...sidebarSpaces,
        ...storedSpaces.filter((stored) => !sidebarSpaces.some((space) => space.id === stored.id)),
      ]
      const { desk } = await ensureDelegationDesk(knownSpaces)
      if (!storedSpaces.some((space) => space.id === desk.id)) {
        useSpacesStore.setState((state) => ({ spaces: [desk, ...state.spaces] }))
      }
      useSpacesStore.getState().setActiveSpace(desk.id)
      setCollapsed(true)
      onClose()
      router.push(`/spaces?space=${encodeURIComponent(desk.id)}`)
    } catch {
      toast.error(DELEGATION_TOAST_MESSAGES.OPEN_FAILED)
    }
  }
}
