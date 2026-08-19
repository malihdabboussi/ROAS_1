import type { DragEvent, MouseEvent } from 'react'
import { PlusCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { MissionColumnId } from '@/lib/spaces/space-schema-types'
import { cn } from '@/lib/utils/cn'
import type { ColumnConfig } from './mission-list-config'

interface MissionListHeaderProps {
  activeCols: ColumnConfig[]
  gridTemplateWithTrail: string
  dragId: MissionColumnId | null
  overId: MissionColumnId | null
  overSide: 'left' | 'right'
  resizingColId: MissionColumnId | null
  usePxGrid: boolean
  onAddColumn?: (e: MouseEvent<HTMLButtonElement>) => void
  onReorderColumns?: (next: MissionColumnId[]) => void | Promise<void>
  onColumnDragStart: (e: DragEvent, colId: MissionColumnId) => void
  onColumnDragOver: (e: DragEvent, colId: MissionColumnId) => void
  onColumnDrop: (e: DragEvent) => void
  onColumnDragEnd: () => void
  onResizeStart: (colId: MissionColumnId, e: MouseEvent) => void
}

export function MissionListHeader({
  activeCols,
  gridTemplateWithTrail,
  dragId,
  overId,
  overSide,
  resizingColId,
  usePxGrid,
  onAddColumn,
  onReorderColumns,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDrop,
  onColumnDragEnd,
  onResizeStart,
}: MissionListHeaderProps) {
  return (
    <>
      <div
        className={cn(
          'group/spacehead typo-caption text-[var(--color-muted-foreground)]',
          'hidden w-full items-center gap-0 px-4 pb-1.5 pt-1 md:grid',
        )}
        style={{ gridTemplateColumns: gridTemplateWithTrail }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onReorderColumns ? onColumnDrop : undefined}
      >
        {activeCols.map((col) => {
          const isOver = overId === col.id && dragId !== null && dragId !== col.id
          const isTitle = col.id === 'title'
          const canDrag = !isTitle && Boolean(onReorderColumns) && !resizingColId
          return (
            <div
              key={col.id}
              className={cn(
                'relative flex min-w-0 max-w-full overflow-hidden transition-colors',
                !isTitle && 'z-0 hover:bg-[var(--color-hover-subtle)]',
                isTitle && 'sticky left-0 z-30',
                'max-w-full items-center rounded-md',
              )}
              style={
                isTitle
                  ? {
                      background:
                        'linear-gradient(to right, var(--background) 0, var(--background) max(0px, calc(100% - 4rem)), transparent 100%)',
                    }
                  : undefined
              }
              draggable={canDrag}
              onDragStart={canDrag ? (e) => onColumnDragStart(e, col.id) : undefined}
              onDragOver={(e) => onColumnDragOver(e, col.id)}
              onDragEnd={canDrag ? onColumnDragEnd : undefined}
            >
              {isOver && overSide === 'left' && (
                <div
                  className="pointer-events-none absolute -left-1.5 bottom-0 top-0 w-[2px]"
                  style={{
                    background:
                      'linear-gradient(180deg, transparent 0%, rgb(59 130 246) 20%, rgb(59 130 246) 80%, transparent 100%)',
                  }}
                />
              )}
              {isTitle ? (
                <span className="min-w-0 max-w-full truncate px-1.5 py-0.5">{col.label}</span>
              ) : (
                <span
                  className={cn(
                    'min-w-0 max-w-full cursor-grab select-none truncate px-1.5 py-0.5 active:cursor-grabbing',
                    dragId === col.id && 'opacity-40',
                  )}
                >
                  {col.label}
                </span>
              )}
              {isOver && overSide === 'right' && (
                <div
                  className="pointer-events-none absolute -right-1.5 bottom-0 top-0 w-[2px]"
                  style={{
                    background:
                      'linear-gradient(180deg, transparent 0%, rgb(59 130 246) 20%, rgb(59 130 246) 80%, transparent 100%)',
                  }}
                />
              )}
              {usePxGrid && (
                <div
                  className={cn(
                    'absolute -right-[5px] bottom-0 top-0 z-[1] flex w-[9px] cursor-col-resize items-center justify-center',
                    'group/resize',
                  )}
                  onMouseDown={(e) => onResizeStart(col.id, e)}
                >
                  <div
                    className={cn(
                      'h-full w-[2px] transition-colors',
                      resizingColId === col.id
                        ? 'bg-blue-500'
                        : 'bg-transparent group-hover/resize:bg-blue-500',
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
        {onAddColumn ? (
          <Tooltip
            label="Add column"
            side="bottom"
            triggerClassName="flex h-full min-h-0 w-full min-w-0 items-stretch"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAddColumn(e)
              }}
              aria-label="Add column"
              className="relative z-0 flex h-full w-full items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
            >
              <PlusCircle className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        ) : (
          <span className="min-w-0" aria-hidden />
        )}
      </div>
      <div className="hidden w-full min-w-0 md:block" aria-hidden>
        <div className="h-[0.5px] min-h-[0.5px] w-full bg-[var(--border)]" />
      </div>
    </>
  )
}
