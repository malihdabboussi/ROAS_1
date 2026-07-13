'use client'

import { useEffect, type Dispatch, type SetStateAction } from 'react'
import type { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { SidebarHqHubMenuContent } from './SidebarHqHubMenuContent'
import type { SidebarControllerReturn } from './useSidebarController'

export type HubMenuPaneProps = {
  c: SidebarControllerReturn
  featureUpdates?: { hasUnread: boolean; onOpen: (anchor: HTMLElement) => void }
  spacesSearchOpen: boolean
  setSpacesSearchOpen: Dispatch<SetStateAction<boolean>>
  spacesSearchQuery: string
  setSpacesSearchQuery: Dispatch<SetStateAction<string>>
  spacesSearchInputRef: React.RefObject<HTMLInputElement | null>
  hiddenSidebarCount: number
  hiddenEyeRef: React.RefObject<HTMLButtonElement | null>
  hiddenMenuOpen: boolean
  setHiddenMenuOpen: Dispatch<SetStateAction<boolean>>
  openHiddenMenu: () => void
  setBrowsePanelBucket: Dispatch<SetStateAction<string | null>>
  setCreateSpaceModalFor: Dispatch<SetStateAction<{ campaignId: string | null } | null>>
  spaceUserState: ReturnType<typeof useSpaceUserState>
  showAdminSections: boolean
}

export function SidebarHqHubMenuPane({
  c,
  ...contentProps
}: HubMenuPaneProps) {
  useEffect(() => {
    if (!c.hubMenuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') c.closeHubMenu()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [c.hubMenuOpen, c.closeHubMenu])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SidebarHqHubMenuContent
        {...contentProps}
        c={c}
        variant="panel"
        expandedSections={c.hubMenuExpandedSections}
        onToggleSection={c.toggleHubMenuSectionById}
      />
    </div>
  )
}

/** @deprecated Use SidebarHqHubMenuPane inside SidebarHqRail shell */
export function SidebarHqHubMenu(props: HubMenuPaneProps) {
  return <SidebarHqHubMenuPane {...props} />
}
