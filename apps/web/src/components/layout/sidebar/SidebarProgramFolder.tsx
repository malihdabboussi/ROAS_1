'use client'

import Link from 'next/link'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { ChevronRight, Lock, MoreHorizontal, Plus } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { resolveProgramIconColorId, type Program } from '@/lib/programs'
import { SIDEBAR_UNGROUPED_PROGRAM_KEY } from './group-sidebar-campaigns-by-program'
import type { SidebarSortableBind } from './sidebar-tree-dnd'
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
  sortable,
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
  /** When set, header starts a program reorder drag (clicks still navigate). */
  sortable?: SidebarSortableBind
}) {
  const iconName = program?.icon ?? 'folder-kanban'
  const iconAppearance = getIconColor(resolveProgramIconColorId(program?.id, program?.icon_color))
  const href =
    program && groupKey !== SIDEBAR_UNGROUPED_PROGRAM_KEY ? `/programs/${program.id}` : null
  const canCreate = Boolean(onCreateCampaign)
  const canMenu = Boolean(program && onOpenMenu)
  const isRestricted = Boolean(program && program.visibility && program.visibility !== 'workspace')

  function openMenu(e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
    if (!program || !onOpenMenu) return
    e.preventDefault()
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    onOpenMenu(program, r)
  }

  const outerStyle: CSSProperties | undefined = sortable?.style
  const headerDragProps = sortable ? { ...sortable.attributes, ...sortable.listeners } : undefined

  return (
    <div
      ref={sortable?.setNodeRef}
      style={outerStyle}
      className={`mb-1 min-w-0 space-y-0.5 ${sortable?.isDragging ? 'opacity-40' : ''}`}
    >
      <div
        className={`group/program rounded-spacing-2 hover:bg-hover-subtle flex min-w-0 items-center gap-0.5 transition-colors ${
          sortable ? 'cursor-grab touch-none active:cursor-grabbing' : ''
        }`}
        {...headerDragProps}
      >
        <button
          type="button"
          onClick={() => onToggle(groupKey)}
          className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground relative flex h-7 w-7 shrink-0 items-center justify-center rounded"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
        >
          <span
            className={`absolute flex h-5 w-5 items-center justify-center rounded transition-opacity ${
              iconAppearance.glassClass || 'badge-glass-muted'
            } opacity-100 group-hover/program:opacity-0`}
            aria-hidden
          >
            <LucideIcon
              name={iconName}
              className={`h-3 w-3 shrink-0 ${iconAppearance.textColor}`}
            />
          </span>
          <ChevronRight
            className={`icon-sm absolute shrink-0 opacity-0 transition-all duration-150 group-hover/program:opacity-100 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            data-testid="program-chevron"
            aria-hidden
          />
        </button>
        {href ? (
          <Link
            href={href}
            data-hub-dock-navigate
            onContextMenu={openMenu}
            className="body-2 text-foreground hover:text-foreground min-w-0 flex-1 truncate px-0 py-1 font-medium transition-colors"
          >
            <span className="gap-spacing-1 inline-flex max-w-full items-center">
              <span className="truncate">{label}</span>
              {isRestricted ? (
                <Lock className="icon-xs text-muted-foreground shrink-0" aria-label="Restricted" />
              ) : null}
            </span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onToggle(groupKey)}
            className="body-2 text-foreground hover:text-foreground min-w-0 flex-1 truncate px-0 py-1 text-left font-medium transition-colors"
          >
            <span className="gap-spacing-1 inline-flex max-w-full items-center">
              <span className="truncate">{label}</span>
              {isRestricted ? (
                <Lock className="icon-xs text-muted-foreground shrink-0" aria-label="Restricted" />
              ) : null}
            </span>
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
