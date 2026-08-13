'use client'

import { Suspense } from 'react'
import { dispatchBrainAddAgentModal } from '@/features/brain/lib/brain-agent-modal.events'
import {
  HUB_DOCK_SUB_FLYOUT_OFFSET_PX,
  HubDockFlyout,
} from './HubDockFlyout'
import { SidebarBrainNavLinks } from './SidebarBrainFlyout'
import { SidebarTeam2Flyout } from './SidebarTeam2Flyout'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarHqMoreTeamBrainFlyouts({
  subDock,
  subAnchor,
  c,
  clearLeave,
  scheduleClose,
  closeSub,
  onHoldParentFlyout,
  onCloseParentFlyout,
  onNavigate,
}: {
  subDock: 'team' | 'brain' | 'projects' | 'account' | null
  subAnchor: DOMRect | null
  c: SidebarControllerReturn
  clearLeave: () => void
  scheduleClose: () => void
  closeSub: () => void
  onHoldParentFlyout?: () => void
  onCloseParentFlyout?: () => void
  onNavigate?: () => void
}) {
  if (!subAnchor || (subDock !== 'team' && subDock !== 'brain')) return null

  const sharedProps = {
    anchor: subAnchor,
    nested: true,
    offsetPx: HUB_DOCK_SUB_FLYOUT_OFFSET_PX,
    onEnter: () => {
      clearLeave()
      onHoldParentFlyout?.()
    },
    onLeave: scheduleClose,
    onClose: () => {
      closeSub()
      onCloseParentFlyout?.()
    },
  }

  if (subDock === 'team') {
    return (
      <HubDockFlyout
        {...sharedProps}
        title="Team"
        headerActions={[
          {
            kind: 'plus',
            title: 'New agent',
            onClick: () => {
              closeSub()
              onCloseParentFlyout?.()
              c.router.push('/team')
            },
          },
        ]}
      >
        <SidebarTeam2Flyout pathname={c.pathname} />
      </HubDockFlyout>
    )
  }

  return (
    <HubDockFlyout
      {...sharedProps}
      title="Brain"
      headerActions={[
        {
          kind: 'search',
          title: 'Search brains',
          onClick: () => {
            closeSub()
            onCloseParentFlyout?.()
            c.router.push('/brain')
          },
        },
        {
          kind: 'plus',
          title: 'Add knowledge',
          onClick: () => {
            closeSub()
            onCloseParentFlyout?.()
            dispatchBrainAddAgentModal()
          },
        },
      ]}
    >
      <Suspense
        fallback={
          <p className="body-3 text-muted-foreground px-spacing-3 py-spacing-6 text-center">
            Loading…
          </p>
        }
      >
        <SidebarBrainNavLinks
          onNavigate={() => {
            closeSub()
            onNavigate?.()
          }}
        />
      </Suspense>
    </HubDockFlyout>
  )
}
