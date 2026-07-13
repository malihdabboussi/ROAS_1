'use client'

import { SidebarHqHubMenuContent } from './SidebarHqHubMenuContent'
import { SidebarHqShellFooter } from './SidebarHqShellFooter'
import type { SidebarControllerReturn } from './useSidebarController'
import type { ComponentProps } from 'react'

type HubMenuProps = Omit<ComponentProps<typeof SidebarHqHubMenuContent>, 'variant' | 'expandedSections' | 'onToggleSection'>

export function SidebarHqMobileDrawer({
  c,
  featureUpdates,
  hubMenuProps,
}: {
  c: SidebarControllerReturn
  featureUpdates?: { hasUnread: boolean; onOpen: (anchor: HTMLElement) => void }
  hubMenuProps: HubMenuProps
}) {
  const goToPage = () => {
    c.setMobileDrawerOpen(false)
  }

  return (
    <nav className="scrollbar-hide flex flex-1 flex-col overflow-hidden px-3 py-2">
      <SidebarHqHubMenuContent
        {...hubMenuProps}
        variant="drawer"
        expandedSections={c.hubMenuExpandedSections}
        onToggleSection={c.toggleHubMenuSectionById}
        onNavigate={goToPage}
      />
      <SidebarHqShellFooter
        c={c}
        expanded
        pathname={c.pathname}
        featureUpdates={featureUpdates}
        onChatNavigate={goToPage}
      />
    </nav>
  )
}
