'use client'

import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { SpaceListDndDragHandleProps } from '../lib/space-list-dnd-types'

export const SPACE_LIST_ROW_SELECTED_TINT =
  'bg-gradient-to-br from-emerald-500/15 via-emerald-400/18 to-emerald-600/10'

/** Full-width 0.5px line with opaque w-10 under grip so border does not show through on horizontal scroll (matches column header). */
export function GriplessHairline({
  edge,
  className,
  isSelected,
  group,
}: {
  edge: 'top' | 'bottom'
  className?: string
  isSelected?: boolean
  group: 'row' | 'add'
}) {
  const pos = edge === 'top' ? 'top-0' : 'bottom-0'
  return (
    <div
      className={cn(
        'pointer-events-none absolute left-0 z-[35] flex h-[0.5px] w-full min-w-0',
        pos,
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          'sticky left-0 h-[0.5px] min-h-[0.5px] w-10 shrink-0 self-stretch',
          isSelected ? SPACE_LIST_ROW_SELECTED_TINT : 'bg-[var(--background)]',
          !isSelected && group === 'row' && 'group-hover/row:bg-[var(--color-hover-subtle)]',
          !isSelected && group === 'add' && 'group-hover/add:bg-[var(--color-hover-subtle)]',
        )}
      />
      <div className="mr-4 h-[0.5px] min-h-[0.5px] min-w-0 flex-1 self-stretch bg-[var(--border)]" />
    </div>
  )
}

/** 40px sticky column: grip + checkbox, aligned for grouped and ungrouped split-chrome list rows. */
export function GroupedRowGripColumn({
  itemId,
  isSelected,
  onToggleSelect,
  reserveLayoutOnly = false,
  hideGrip = false,
  dndDrag,
  surface = 'list',
  tableRowLabel,
}: {
  itemId: string
  isSelected: boolean
  onToggleSelect?: (id: string) => void
  /** Invisible controls but same size (e.g. add-subtask input row). */
  reserveLayoutOnly?: boolean
  /** List mode: show checkbox only (e.g. Instagram research list, no reorder). */
  hideGrip?: boolean
  dndDrag?: SpaceListDndDragHandleProps
  surface?: 'list' | 'table'
  /** When set in table mode, row index shown; hover swaps to checkbox (no grip in table). */
  tableRowLabel?: string | number | null
}) {
  const isTable = surface === 'table'
  const showRowNum = isTable && !reserveLayoutOnly && tableRowLabel != null && tableRowLabel !== ''

  const checkbox = (
    <input
      type="checkbox"
      checked={isSelected}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation()
        onToggleSelect?.(itemId)
      }}
      disabled={!onToggleSelect}
      className="checkbox-glass-green shrink-0"
      aria-label="Select row"
    />
  )

  return (
    <div
      className={cn(
        'relative sticky left-0 z-30 flex w-10 shrink-0 flex-col items-center justify-center gap-1 self-stretch py-1',
        isTable && 'group/gripcol box-border min-h-[2.25rem] bg-[var(--background)]',
        isTable &&
          !isSelected &&
          !reserveLayoutOnly &&
          'transition-colors hover:bg-[var(--color-hover-subtle)]',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-0 transition-none',
          !isTable && 'bg-[var(--background)]',
          !isSelected && !isTable && 'group-hover/row:bg-[var(--color-hover-subtle)]',
        )}
        aria-hidden
      />
      {isSelected && (
        <div
          className={cn('pointer-events-none absolute inset-0 z-[1]', SPACE_LIST_ROW_SELECTED_TINT)}
          aria-hidden
        />
      )}

      {isTable && !reserveLayoutOnly && (
        <div className="relative z-[2] grid h-4 w-full place-items-center">
          {showRowNum && !isSelected && (
            <span className="col-start-1 row-start-1 select-none text-[11px] tabular-nums leading-none text-[var(--color-muted-foreground)] opacity-100 transition-opacity duration-150 group-hover/gripcol:pointer-events-none group-hover/gripcol:opacity-0">
              {tableRowLabel}
            </span>
          )}
          <div
            className={cn(
              'col-start-1 row-start-1 flex items-center justify-center transition-opacity duration-150',
              isSelected ? 'opacity-100' : 'opacity-0 group-hover/gripcol:opacity-100',
            )}
          >
            {checkbox}
          </div>
        </div>
      )}

      {isTable && reserveLayoutOnly && (
        <div className="relative z-[2] h-4 w-4 shrink-0" aria-hidden />
      )}

      {!isTable && (
        <div className="relative z-[2] flex flex-col items-center gap-0.5">
          <div
            className={cn(
              'flex items-center gap-1.5 transition-opacity duration-0',
              reserveLayoutOnly
                ? 'invisible'
                : isSelected
                  ? 'opacity-100'
                  : 'opacity-0 group-hover/row:opacity-100',
            )}
          >
            {!hideGrip &&
              (dndDrag ? (
                <button
                  type="button"
                  className="-ml-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-[var(--color-muted-foreground)] active:cursor-grabbing"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="h-3 w-3" />
                </button>
              ) : (
                <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-[var(--color-muted-foreground)]" />
              ))}
            {checkbox}
          </div>
        </div>
      )}
    </div>
  )
}
