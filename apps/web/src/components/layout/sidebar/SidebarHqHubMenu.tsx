'use client'

import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { ShellMenuModeToggle } from '@/components/shell/ShellMenuChrome'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { useSpaceUserState } from '@/features/spaces/hooks/use-space-user-state'
import { SidebarHqHubMenuContent } from './SidebarHqHubMenuContent'
import { SidebarWorkMenu } from './SidebarWorkMenu'
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

export function SidebarHqHubMenuPane({ c, ...contentProps }: HubMenuPaneProps) {
  const menuMode = useShellStore((s) => s.menuMode)
  const setSidebarPinned = useShellStore((s) => s.setSidebarPinned)

  useEffect(() => {
    if (!c.hubMenuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        c.closeHubMenu()
        setSidebarPinned(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [c.hubMenuOpen, c.closeHubMenu, setSidebarPinned])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ShellMenuModeToggle />
      {menuMode === 'work' ? (
        <SidebarWorkMenu />
      ) : (
        <SidebarHqHubMenuContent
          {...contentProps}
          c={c}
          variant="panel"
          expandedSections={c.hubMenuExpandedSections}
          onToggleSection={c.toggleHubMenuSectionById}
        />
      )}
    </div>
  )
}

/** @deprecated Use SidebarHqHubMenuPane inside SidebarHqRail shell */
export function SidebarHqHubMenu(props: HubMenuPaneProps) {
  return <SidebarHqHubMenuPane {...props} />
}
