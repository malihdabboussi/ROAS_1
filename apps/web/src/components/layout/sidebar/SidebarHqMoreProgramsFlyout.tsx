'use client'

import Link from 'next/link'
import { ListChecks } from 'lucide-react'
import { programDisplayName, type Program } from '@/lib/programs'
import { cn } from '@/lib/utils/cn'
import { HUB_DOCK_SUB_FLYOUT_OFFSET_PX, HubDockFlyout } from './HubDockFlyout'

export function SidebarHqMoreProgramsFlyout({
  programs,
  pathname,
  subAnchor,
  clearLeave,
  scheduleClose,
  closeSub,
  onHoldParentFlyout,
  onCloseParentFlyout,
  onNavigate,
  onSelectProgram,
}: {
  programs: Program[]
  pathname: string
  subAnchor: DOMRect | null
  clearLeave: () => void
  scheduleClose: () => void
  closeSub: () => void
  onHoldParentFlyout?: () => void
  onCloseParentFlyout?: () => void
  onNavigate?: () => void
  onSelectProgram: () => void
}) {
  if (!subAnchor) return null

  return (
    <HubDockFlyout
      anchor={subAnchor}
      title="Programs"
      nested
      offsetPx={HUB_DOCK_SUB_FLYOUT_OFFSET_PX}
      onEnter={() => {
        clearLeave()
        onHoldParentFlyout?.()
      }}
      onLeave={scheduleClose}
      onClose={() => {
        closeSub()
        onCloseParentFlyout?.()
      }}
    >
      {programs.length === 0 ? (
        <p className="hub-dock-flyout-row-muted px-spacing-3 py-spacing-2 body-3">
          No programs yet
        </p>
      ) : (
        programs.map((program) => (
          <Link
            key={program.id}
            href={`/programs/${program.id}`}
            data-hub-dock-navigate
            onClick={() => {
              onSelectProgram()
              closeSub()
              onNavigate?.()
            }}
            className={cn(
              'hub-dock-flyout-row',
              pathname.startsWith(`/programs/${program.id}`) && 'hub-dock-flyout-row-active',
            )}
          >
            <ListChecks />
            <span className="min-w-0 flex-1 truncate">{programDisplayName(program)}</span>
          </Link>
        ))
      )}
    </HubDockFlyout>
  )
}
