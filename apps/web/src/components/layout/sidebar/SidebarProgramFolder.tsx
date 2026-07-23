'use client'

import Link from 'next/link'
import type { MouseEvent, ReactNode } from 'react'
import { ChevronRight, MoreHorizontal, Plus } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import type { Program } from '@/lib/programs'
import { SIDEBAR_UNGROUPED_PROGRAM_KEY } from './group-sidebar-campaigns-by-program'
import type { SectionMenuAnchorRect } from './SidebarHqSpacesRows'

export function SidebarProgramFolder({
  groupKey,
  label,
  program,
  campaignCount,
  isExpanded,
  onToggle,
  onCreateCampaign,
  onOpenMenu,
  children,
}: {
  groupKey: string
  label: string
  program: Program | null
  campaignCount: number
  isExpanded: boolean
  onToggle: (key: string) => void
  onCreateCampaign?: (programId: string | null) => void
  onOpenMenu?: (program: Program, anchorRect: SectionMenuAnchorRect) => void
  children: ReactNode
  /** @deprecated unused — kept for call-site compatibility during rollout */
  compact?: boolean
}) {
  const iconName = program?.icon ?? 'folder-kanban'
  const iconColor = getIconColor(program?.icon_color ?? undefined).textColor
  const href =
    program && groupKey !== SIDEBAR_UNGROUPED_PROGRAM_KEY ? `/programs/${program.id}` : null
  const canCreate = Boolean(onCreateCampaign)
  const canMenu = Boolean(program && onOpenMenu)

  function openMenu(e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
    if (!program || !onOpenMenu) return
    e.preventDefault()
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    onOpenMenu(program, r)
  }

  return (
    <div className="mb-1 min-w-0 space-y-0.5">
      <div className="group/program rounded-spacing-2 hover:bg-hover-subtle flex min-w-0 items-center gap-0.5 transition-colors">
        <button
          type="button"
          onClick={() => onToggle(groupKey)}
          className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground relative flex h-7 w-7 shrink-0 items-center justify-center rounded"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
        >
          <LucideIcon
            name={iconName}
            className={`icon-sm shrink-0 transition-opacity ${iconColor} opacity-100 group-hover/program:opacity-0 ${isExpanded ? 'opacity-0' : ''}`}
          />
          <ChevronRight
            className={`icon-sm absolute shrink-0 transition-all duration-150 ${
              isExpanded ? 'rotate-90 opacity-100' : 'opacity-0 group-hover/program:opacity-100'
            }`}
          />
        </button>
        {href ? (
          <Link
            href={href}
            data-hub-dock-navigate
            onContextMenu={openMenu}
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
        {canMenu ? (
          <button
            type="button"
            onClick={openMenu}
            title={`More options for ${label}`}
            aria-label={`More options for ${label}`}
            className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground pointer-events-none flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition-opacity group-hover/program:pointer-events-auto group-hover/program:opacity-100"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
          {campaignCount > 0 && !isExpanded ? (
            <span className="body-3 text-muted-foreground pointer-events-none absolute inset-0 flex items-center justify-center font-medium tabular-nums opacity-100 transition-opacity group-hover/program:opacity-0">
              {campaignCount}
            </span>
          ) : null}
          {canCreate ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCreateCampaign?.(program?.id ?? null)
              }}
              title={`New campaign in ${label}`}
              aria-label={`New campaign in ${label}`}
              className={`text-muted-foreground hover:text-foreground absolute inset-0 flex items-center justify-center rounded transition-opacity ${
                isExpanded
                  ? 'opacity-100'
                  : 'pointer-events-none opacity-0 group-hover/program:pointer-events-auto group-hover/program:opacity-100'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          ) : campaignCount > 0 ? (
            <span className="body-3 text-muted-foreground pointer-events-none flex items-center justify-center font-medium tabular-nums">
              {campaignCount}
            </span>
          ) : null}
        </div>
      </div>
      {isExpanded ? (
        <div className="border-border ml-2 min-w-0 space-y-0.5 border-l pl-2">{children}</div>
      ) : null}
    </div>
  )
}
