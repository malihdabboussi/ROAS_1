'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Minus, PlusCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'
import { listColumnHeaderLabel } from '../lib/display-columns-list'
import type { FieldDef } from '../types/space-schema'
import {
  ListColumnHeaderMenuPortal,
  useListColumnHeaderMenuAnchor,
  type ListColumnHeaderMenuConfig,
} from './list-column-header-menu'

const DEFAULT_COL_WIDTHS: Record<string, number> = {
  title: 420,
  ig_list_preview: 72,
  format: 72,
  multiplier: 72,
  views: 64,
  likes: 56,
  comments: 56,
  posted: 88,
  account: 96,
  caption: 128,
  hook: 128,
  transcript: 128,
  priority: 120,
  assignee: 140,
  due_date: 130,
  start_date: 130,
  status: 120,
  mission: 100,
  email: 240,
  first_name: 130,
  last_name: 130,
  phone: 130,
  tags: 200,
  attendees: 360,
  recording_url: 220,
  contact_type: 130,
  contact_source: 160,
  business_name: 180,
  website: 200,
  address: 200,
  city: 120,
  state: 100,
  country: 120,
  created_at: 130,
  updated_at: 130,
}
const FALLBACK_WIDTH = 140
const MIN_COL_WIDTH = 60
const MIN_TITLE_COL_WIDTH = 320

export function getDefaultWidth(fieldId: string): number {
  return DEFAULT_COL_WIDTHS[fieldId] ?? FALLBACK_WIDTH
}

export type TitleColumnSelectAll = {
  checked: boolean
  indeterminate: boolean
  onToggle: () => void
}

interface DraggableColumnHeadersProps {
  visibleFields: FieldDef[]
  onReorder: (newFieldIds: string[]) => Promise<void>
  compact?: boolean
  indented?: boolean
  listLayout?: 'flat' | 'grouped'
  selectAllInTitleColumn?: TitleColumnSelectAll | null
  columnWidths: Record<string, number>
  onColumnResize?: (fieldId: string, width: number) => void
  onAddField?: (e: React.MouseEvent<HTMLButtonElement>) => void
  /** Table view: column borders and header strip. */
  surface?: 'list' | 'table'
  /** Table header sits on `card-glass`: no tint strip; name column stays transparent for the glass bg. */
  tableEmbedGlass?: boolean
  /**
   * When `tableEmbedGlass`, clip grid contents to the glass curve (flat table in rounded card).
   * Disable for grouped master header so top rounding on the glass strip is not flattened.
   */
  tableEmbedGlassClip?: boolean
  /** Default `title`. Use e.g. `ig_list_preview` for Instagram research list. */
  nameColumnFieldId?: string
  /** When false, the name column header is not draggable (data columns still reorder). Default true. */
  nameColumnDraggable?: boolean
  /** Public shared space: no column reorder, resize, or add column. */
  readOnly?: boolean
  /** List/table task space: header context menu (sort, move column, hide). */
  listColumnHeaderMenu?: ListColumnHeaderMenuConfig
  /** Label for the trailing flex column (e.g. IG research list Actions). */
  trailingColumnLabel?: string
}

export function SpaceListHeaderCheckbox({
  checked,
  indeterminate,
  onToggle,
}: {
  checked: boolean
  indeterminate: boolean
  onToggle: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = inputRef.current
    if (el) el.indeterminate = indeterminate && !checked
  }, [indeterminate, checked])

  return (
    <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="checkbox-glass-green"
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-label="Select all"
      />
      {indeterminate && !checked ? (
        <Minus className="pointer-events-none absolute h-2.5 w-2.5 text-white" strokeWidth={3} />
      ) : null}
    </span>
  )
}

export function DraggableColumnHeaders({
  visibleFields,
  onReorder,
  compact,
  indented,
  listLayout = 'flat',
  selectAllInTitleColumn,
  columnWidths,
  onColumnResize,
  onAddField,
  surface = 'list',
  tableEmbedGlass = false,
  tableEmbedGlassClip,
  nameColumnFieldId = 'title',
  nameColumnDraggable = true,
  readOnly = false,
  listColumnHeaderMenu,
  trailingColumnLabel,
}: DraggableColumnHeadersProps) {
  const headerMenuUi = useListColumnHeaderMenuAnchor()
  const cols = visibleFields.filter((f) => f.id !== 'status')
  const isGrouped = listLayout === 'grouped'
  const nameColId = nameColumnFieldId
  const nameDrag = !readOnly && nameColumnDraggable
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [overSide, setOverSide] = useState<'left' | 'right'>('right')
  const dragging = useRef(false)

  const [resizingId, setResizingId] = useState<string | null>(null)
  const resizeStart = useRef<{ x: number; width: number } | null>(null)

  function handleDragStart(e: React.DragEvent, fieldId: string) {
    if (resizingId) {
      e.preventDefault()
      return
    }
    dragging.current = true
    setDragId(fieldId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', fieldId)
  }

  function handleDragOver(e: React.DragEvent, fieldId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!dragId || fieldId === dragId) {
      setOverId(null)
      return
    }
    setOverId(fieldId)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midX = rect.left + rect.width / 2
    setOverSide(e.clientX < midX ? 'left' : 'right')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (!dragId || !overId || dragId === overId) {
      reset()
      return
    }

    const allIds = visibleFields.map((f) => f.id)
    const without = allIds.filter((id) => id !== dragId)
    const targetIdx = without.indexOf(overId)
    const insertAt = overSide === 'right' ? targetIdx + 1 : targetIdx
    without.splice(insertAt, 0, dragId)

    reset()
    void onReorder(without)
  }

  function reset() {
    dragging.current = false
    setDragId(null)
    setOverId(null)
  }

  const handleResizeStart = useCallback(
    (fieldId: string, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const w = columnWidths[fieldId] ?? getDefaultWidth(fieldId)
      resizeStart.current = { x: e.clientX, width: w }
      setResizingId(fieldId)
    },
    [columnWidths],
  )

  useEffect(() => {
    if (!resizingId) return
    const handleMove = (e: MouseEvent) => {
      if (!resizeStart.current) return
      const delta = e.clientX - resizeStart.current.x
      const minW = resizingId === nameColId ? MIN_TITLE_COL_WIDTH : MIN_COL_WIDTH
      const next = Math.max(minW, resizeStart.current.width + delta)
      onColumnResize?.(resizingId, Math.round(next))
    }
    const handleUp = () => {
      setResizingId(null)
      resizeStart.current = null
    }
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [resizingId, onColumnResize, nameColId])

  const gridCols =
    cols.map((f) => `${columnWidths[f.id] ?? getDefaultWidth(f.id)}px`).join(' ') +
    ' minmax(2rem, 1fr)'

  const isTable = surface === 'table'
  const glassTableHeader = isTable && tableEmbedGlass
  const clipGlassGrid = glassTableHeader && (tableEmbedGlassClip ?? true)

  return (
    <div
      className={cn(
        'group/spacehead grid text-[11px] font-medium text-[var(--color-muted-foreground)]',
        isTable ? 'items-stretch' : 'items-center',
        indented ? 'px-0' : !isTable ? 'px-4' : 'px-0',
        !isTable && (compact ? 'pb-1.5 pt-1' : 'pb-2 pt-3'),
        isTable &&
          'text-[var(--foreground)]/90 h-full min-h-[2.25rem] w-full py-0 [&>*]:h-full [&>*]:min-h-[2.25rem]',
        isTable && !glassTableHeader && 'bg-[var(--color-hover-subtle)]/45',
        clipGlassGrid && 'min-h-0 overflow-hidden',
      )}
      style={{ gridTemplateColumns: gridCols }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {cols.map((field) => {
        const isOver = overId === field.id && dragId !== field.id
        const isNameCol = field.id === nameColId
        const showSelectAll = selectAllInTitleColumn && !isGrouped
        const selectAllOn =
          showSelectAll &&
          (selectAllInTitleColumn!.checked || selectAllInTitleColumn!.indeterminate)

        const nameHeaderFlat = isNameCol && !isGrouped && (
          <div className="flex w-full min-w-0 max-w-full items-center overflow-hidden">
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="h-3 w-3 shrink-0" aria-hidden />
              {showSelectAll ? (
                <div
                  className={cn(
                    'shrink-0 transition-opacity',
                    selectAllOn ? 'opacity-100' : 'opacity-0 group-hover/spacehead:opacity-100',
                  )}
                >
                  <SpaceListHeaderCheckbox
                    checked={selectAllInTitleColumn!.checked}
                    indeterminate={selectAllInTitleColumn!.indeterminate}
                    onToggle={selectAllInTitleColumn!.onToggle}
                  />
                </div>
              ) : (
                <span className="h-4 w-4 shrink-0" aria-hidden />
              )}
              <span className="h-4 w-4 shrink-0" aria-hidden />
            </div>
            <div className="ml-2.5 flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
              <span className="h-3 w-3 shrink-0" aria-hidden />
              <span
                draggable={nameDrag}
                onDragStart={nameDrag ? (e) => handleDragStart(e, field.id) : undefined}
                onDragOver={(e) => handleDragOver(e, field.id)}
                onDragEnd={nameDrag ? reset : undefined}
                className={cn(
                  'min-w-0 flex-1 select-none truncate rounded px-1.5 transition-colors',
                  nameDrag && 'cursor-grab active:cursor-grabbing',
                  isTable ? 'py-0' : 'py-0.5',
                  !isTable && 'hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                  dragId === field.id && 'opacity-40',
                )}
                title={listColumnHeaderLabel(field)}
              >
                {listColumnHeaderLabel(field)}
              </span>
            </div>
          </div>
        )

        const nameHeaderGrouped = isNameCol && isGrouped && (
          <span
            draggable={nameDrag}
            onDragStart={nameDrag ? (e) => handleDragStart(e, field.id) : undefined}
            onDragOver={(e) => handleDragOver(e, field.id)}
            onDragEnd={nameDrag ? reset : undefined}
            className={cn(
              'block min-w-0 max-w-full select-none truncate rounded px-1.5 transition-colors',
              nameDrag && 'cursor-grab active:cursor-grabbing',
              isTable ? 'py-0' : 'py-0.5',
              !isTable && 'hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
              dragId === field.id && 'opacity-40',
            )}
            title={listColumnHeaderLabel(field)}
          >
            {listColumnHeaderLabel(field)}
          </span>
        )

        const headerBody =
          isNameCol && (nameHeaderFlat || nameHeaderGrouped) ? (
            <>{nameHeaderFlat || nameHeaderGrouped}</>
          ) : (
            <span
              className={cn(
                'min-w-0 max-w-full cursor-grab select-none truncate px-1.5 active:cursor-grabbing',
                isTable ? 'py-0' : 'py-0.5',
                dragId === field.id && 'opacity-40',
              )}
              title={listColumnHeaderLabel(field)}
            >
              {listColumnHeaderLabel(field)}
            </span>
          )

        const openColumnMenuFromEvent = (
          clientX: number,
          clientY: number,
          e?: React.SyntheticEvent,
        ) => {
          e?.preventDefault()
          e?.stopPropagation()
          headerMenuUi.openAt(field.id, clientX, clientY)
        }

        const sortPrimary = listColumnHeaderMenu?.primarySort
        const sortScope = listColumnHeaderMenu?.sortScope ?? 'global'
        const sortIndicatorDir = sortPrimary?.field === field.id ? sortPrimary.dir : null
        const sortChip = sortIndicatorDir ? (
          <button
            type="button"
            data-no-header-menu
            aria-label={`Sorted ${sortIndicatorDir === 'asc' ? 'ascending' : 'descending'}${sortScope === 'per_group' ? ' (within group)' : ''} — click to flip`}
            className="absolute right-1 top-1/2 z-[3] inline-flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded text-emerald-400 transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-emerald-300"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              if (sortScope === 'per_group') listColumnHeaderMenu?.onSortPerGroup(field.id)
              else listColumnHeaderMenu?.onSortGlobal(field.id)
            }}
          >
            {sortIndicatorDir === 'asc' ? (
              <ArrowUp className="h-3 w-3" strokeWidth={3} />
            ) : (
              <ArrowDown className="h-3 w-3" strokeWidth={3} />
            )}
          </button>
        ) : null

        return (
          <div
            key={field.id}
            className={cn(
              'relative flex min-w-0 max-w-full overflow-hidden transition-colors',
              listColumnHeaderMenu && !readOnly && 'group/headercol',
              !isNameCol && 'z-0 hover:bg-[var(--color-hover-subtle)]',
              isNameCol &&
                isTable &&
                'sticky left-0 z-30 hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
              isNameCol && !isTable && (isGrouped ? 'sticky left-10 z-30' : 'sticky left-0 z-30'),
              isTable
                ? 'box-border h-full min-h-[2.25rem] items-stretch rounded-none border-r border-[var(--border)] px-2 py-0'
                : 'max-w-full items-center rounded-md',
            )}
            style={
              isNameCol && !isTable
                ? {
                    background:
                      'linear-gradient(to right, var(--background) 0, var(--background) max(0px, calc(100% - 4rem)), transparent 100%)',
                  }
                : isNameCol && isTable
                  ? { background: glassTableHeader ? 'transparent' : 'var(--background)' }
                  : undefined
            }
            draggable={!readOnly && !isNameCol && !resizingId}
            onDragStart={!isNameCol ? (e) => handleDragStart(e, field.id) : undefined}
            onDragOver={(e) => handleDragOver(e, field.id)}
            onDragEnd={!isNameCol ? reset : undefined}
            onContextMenu={
              listColumnHeaderMenu && !readOnly
                ? (e) => openColumnMenuFromEvent(e.clientX, e.clientY, e)
                : undefined
            }
            onClick={
              listColumnHeaderMenu && !readOnly
                ? (e) => {
                    if ((e.target as HTMLElement).closest('input, button, [data-no-header-menu]'))
                      return
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    openColumnMenuFromEvent(r.left, r.bottom + 4, e)
                  }
                : undefined
            }
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

            {isTable ? (
              <div className="relative z-0 flex h-full min-h-0 w-full min-w-0 flex-1 items-center overflow-hidden">
                {headerBody}
              </div>
            ) : (
              headerBody
            )}

            {sortChip}

            {isOver && overSide === 'right' && (
              <div
                className="pointer-events-none absolute -right-1.5 bottom-0 top-0 w-[2px]"
                style={{
                  background:
                    'linear-gradient(180deg, transparent 0%, rgb(59 130 246) 20%, rgb(59 130 246) 80%, transparent 100%)',
                }}
              />
            )}

            {/* Resize handle — right edge; keep below name column (z-30) so nothing under the name strip is grabbable */}
            {!readOnly && (
              <div
                className={cn(
                  'absolute -right-[5px] bottom-0 top-0 z-[1] flex w-[9px] cursor-col-resize items-center justify-center',
                  'group/resize',
                )}
                onMouseDown={(e) => handleResizeStart(field.id, e)}
              >
                <div
                  className={cn(
                    'h-full w-[2px] transition-colors',
                    resizingId === field.id
                      ? 'bg-blue-500'
                      : 'bg-transparent group-hover/resize:bg-blue-500',
                  )}
                />
              </div>
            )}
          </div>
        )
      })}
      {onAddField && !readOnly ? (
        <Tooltip
          label="Add column"
          side="bottom"
          triggerClassName="flex h-full min-h-0 w-full min-w-0 items-stretch"
        >
          <button
            type="button"
            aria-label="Add column"
            onClick={(e) => onAddField(e)}
            className={cn(
              'relative z-0 flex h-full w-full items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
              isTable &&
                'box-border h-full min-h-[2.25rem] rounded-none border-r border-[var(--border)] py-0',
            )}
          >
            <PlusCircle className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      ) : (
        <span
          className={cn(
            'flex min-w-0 items-center',
            isTable && 'box-border h-full min-h-[2.25rem] border-r border-[var(--border)] py-0',
          )}
        >
          {trailingColumnLabel ? (
            <span className="min-w-0 max-w-full truncate px-1.5 py-0.5" title={trailingColumnLabel}>
              {trailingColumnLabel}
            </span>
          ) : null}
        </span>
      )}
      <ListColumnHeaderMenuPortal
        open={headerMenuUi.open}
        config={listColumnHeaderMenu}
        nameColumnFieldId={nameColId}
        onClose={headerMenuUi.close}
      />
    </div>
  )
}
