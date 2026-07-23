'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import type { Program } from '@/lib/programs'
import { SIDEBAR_UNGROUPED_PROGRAM_KEY } from './group-sidebar-campaigns-by-program'

export function SidebarProgramFolder({
  groupKey,
  label,
  program,
  campaignCount,
  isExpanded,
  onToggle,
  children,
  compact = false,
}: {
  groupKey: string
  label: string
  program: Program | null
  campaignCount: number
  isExpanded: boolean
  onToggle: (key: string) => void
  children: ReactNode
  /** Dock flyout density */
  compact?: boolean
}) {
  const iconName = program?.icon ?? 'folder-kanban'
  const iconColor = getIconColor(program?.icon_color ?? undefined).textColor
  const href =
    program && groupKey !== SIDEBAR_UNGROUPED_PROGRAM_KEY ? `/programs/${program.id}` : null

  return (
    <div className={compact ? 'mb-1 space-y-0.5' : 'mb-1 space-y-0.5'}>
      <div className="group/program rounded-spacing-2 hover:bg-hover-subtle flex items-center gap-0.5 transition-colors">
        <button
          type="button"
          onClick={() => onToggle(groupKey)}
          className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
        >
          <ChevronRight
            className={`icon-sm shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center">
          <LucideIcon name={iconName} className={`icon-sm shrink-0 ${iconColor}`} />
        </div>
        {href ? (
          <Link
            href={href}
            data-hub-dock-navigate
            className="body-3 text-muted-foreground hover:text-foreground min-w-0 flex-1 truncate px-0 py-1 font-medium transition-colors"
          >
            {label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onToggle(groupKey)}
            className="body-3 text-muted-foreground hover:text-foreground min-w-0 flex-1 truncate px-0 py-1 text-left font-medium transition-colors"
          >
            {label}
          </button>
        )}
        <span className="body-3 text-muted-foreground pointer-events-none flex h-6 w-6 shrink-0 items-center justify-center font-medium tabular-nums">
          {campaignCount}
        </span>
      </div>
      {isExpanded ? (
        <div className="border-border ml-2 space-y-0.5 border-l pl-2">{children}</div>
      ) : null}
    </div>
  )
}
