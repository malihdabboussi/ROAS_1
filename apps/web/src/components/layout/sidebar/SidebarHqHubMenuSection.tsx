'use client'

import { ChevronDown, type ReactNode } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { HubMenuSectionId } from './sidebar-hq-hub-menu.types'

export function SidebarHqHubMenuSection({
  sectionId,
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  sectionId: HubMenuSectionId
  title: string
  icon: ReactNode
  expanded: boolean
  onToggle: (sectionId: HubMenuSectionId) => void
  children: ReactNode
}) {
  return (
    <div className="hub-menu-section">
      <button
        type="button"
        onClick={() => onToggle(sectionId)}
        className="hub-menu-section-trigger"
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-muted-foreground shrink-0">{icon}</span>
          <span className="body-3 truncate">{title}</span>
        </span>
        <ChevronDown
          className={cn(
            'icon-sm text-muted-foreground shrink-0 transition-transform duration-200',
            expanded && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {expanded ? <div className="hub-menu-section-body">{children}</div> : null}
    </div>
  )
}
