'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { cn } from '@/lib/utils/cn'
import type { MissionSendOptions } from '../../components/cells/MissionSendDropdown'
import {
  DraggableColumnHeaders,
  getDefaultWidth,
  SpaceListHeaderCheckbox,
} from '../../components/DraggableColumnHeaders'
import type { ListColumnHeaderMenuConfig } from '../../components/list-column-header-menu'
import { displayColumnsForList } from '../../lib/display-columns-list'
import { sortSpaceItemsCopy } from '../../lib/sort-space-list-items'
import type { SpaceItem } from '../../types'
import type {
  DateDisplayFormat,
  DateDisplayFormats,
  FieldDef,
  SelectOption,
  SortDef,
  ViewDef,
} from '../../types/space-schema'
import { SpaceCalendarDayTaskRow } from './SpaceCalendarDayTaskRow'
import { itemsScheduledOnDay } from './space-calendar-day-items'

export type SpaceCalendarDayTaskListProps = {
  day: Date
  items: SpaceItem[]
  dateField: string
  dateFieldLabel: string
  visibleFields: FieldDef[]
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  activeView: ViewDef
  readOnly: boolean
  onViewChange: (patch: Partial<ViewDef>) => Promise<void>
  onUpdateItem: (itemId: string, payload: Partial<SpaceItem>) => Promise<void>
  onDeleteItem: (itemId: string) => void | Promise<void>
  onPushToAgent: (itemId: string, options?: MissionSendOptions) => Promise<void>
  onOpenDetail?: (item: SpaceItem) => void
  onAddField?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onEditStatuses?: () => void
  onEditCategories?: () => void
}

export function SpaceCalendarDayTaskList({
  day,
  items,
  dateField,
  dateFieldLabel,
  visibleFields,
  allFields,
  roster,
  currentUserId,
  activeView,
  readOnly,
  onViewChange,
  onUpdateItem,
  onDeleteItem,
  onPushToAgent,
  onOpenDetail,
  onAddField,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onEditStatuses,
  onEditCategories,
}: SpaceCalendarDayTaskListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [day])

  const sortPrimary = activeView.sort?.[0]
  const dateDisplayFormats = useMemo<DateDisplayFormats>(
    () => ({
      start_date:
        activeView.date_display_formats?.start_date ??
        activeView.date_display_format ??
        'date_time',
      due_date:
        activeView.date_display_formats?.due_date ?? activeView.date_display_format ?? 'date_time',
      call_date: activeView.date_display_formats?.call_date ?? 'date_time',
    }),
    [activeView.date_display_format, activeView.date_display_formats],
  )

  const dayItems = useMemo(() => {
    let rows = itemsScheduledOnDay(items, dateField, day)
    if (sortPrimary) {
      const fd = allFields.find((f) => f.id === sortPrimary.field)
      if (fd) rows = sortSpaceItemsCopy(rows, fd, roster, sortPrimary.dir)
    }
    return rows
  }, [allFields, dateField, day, items, roster, sortPrimary])

  const itemIds = useMemo(() => dayItems.map((i) => i.id), [dayItems])

  const selectAllInTitleColumn = useMemo(() => {
    if (readOnly) return null
    if (itemIds.length === 0) return null
    const n = itemIds.filter((id) => selectedIds.has(id)).length
    const all = n === itemIds.length
    const some = n > 0 && !all
    return {
      checked: all,
      indeterminate: some,
      onToggle: () => {
        if (all) {
          setSelectedIds((prev) => {
            const next = new Set(prev)
            itemIds.forEach((id) => next.delete(id))
            return next
          })
        } else {
          setSelectedIds((prev) => {
            const next = new Set(prev)
            itemIds.forEach((id) => next.add(id))
            return next
          })
        }
      },
    }
  }, [itemIds, readOnly, selectedIds])

  const selectAllHeaderOn =
    selectAllInTitleColumn != null &&
    (selectAllInTitleColumn.checked || selectAllInTitleColumn.indeterminate)

  const displayCols = useMemo(() => displayColumnsForList(visibleFields), [visibleFields])

  const [localWidths, setLocalWidths] = useState<Record<string, number>>(
    () => activeView.column_widths ?? {},
  )

  const columnWidths = useMemo(() => {
    const merged: Record<string, number> = {}
    for (const f of displayCols) {
      merged[f.id] = localWidths[f.id] ?? getDefaultWidth(f.id)
    }
    return merged
  }, [displayCols, localWidths])

  const gridTemplateColumns = useMemo(
    () => displayCols.map((f) => `${columnWidths[f.id]}px`).join(' ') + ' minmax(2rem, 1fr)',
    [displayCols, columnWidths],
  )

  const resolvedSortScope: 'per_group' | 'global' = activeView.sort_scope ?? 'global'

  const applyListColumnSort = useCallback(
    async (fieldId: string, scope: 'per_group' | 'global') => {
      const cur = activeView.sort?.[0]
      const scopeWas = activeView.sort_scope ?? 'global'
      const same = cur?.field === fieldId && scopeWas === scope
      const nextDir: SortDef['dir'] = same && cur?.dir === 'asc' ? 'desc' : 'asc'
      await onViewChange({
        sort: [{ field: fieldId, dir: nextDir }],
        sort_scope: scope,
      })
      toast.success('View saved')
    },
    [activeView.sort, activeView.sort_scope, onViewChange],
  )

  const clearListColumnSort = useCallback(async () => {
    await onViewChange({ sort: [], sort_scope: undefined })
    toast.success('View saved')
  }, [onViewChange])

  const reorderDisplayColumn = useCallback(
    async (fieldId: string, where: 'start' | 'end') => {
      const ids = displayCols.map((f) => f.id)
      const rest = ids.filter((id) => id !== fieldId)
      const ti = rest.indexOf('title')
      const next =
        where === 'start'
          ? (() => {
              const anchor = ti >= 0 ? ti + 1 : 0
              const o = [...rest]
              o.splice(anchor, 0, fieldId)
              return o
            })()
          : [...rest, fieldId]
      await onViewChange({ visible_fields: next })
      toast.success('View saved')
    },
    [displayCols, onViewChange],
  )

  const hideListColumn = useCallback(
    async (fieldId: string) => {
      const base = activeView.visible_fields ?? [
        ...new Set([...visibleFields.map((f) => f.id), ...displayCols.map((f) => f.id)]),
      ]
      await onViewChange({ visible_fields: base.filter((id) => id !== fieldId) })
      toast.success('View saved')
    },
    [activeView.visible_fields, displayCols, onViewChange, visibleFields],
  )

  const updateDateDisplayFormat = useCallback(
    async (fieldId: string, format: DateDisplayFormat) => {
      if (fieldId !== 'start_date' && fieldId !== 'due_date' && fieldId !== 'call_date') return
      await onViewChange({
        date_display_formats: {
          ...(activeView.date_display_formats ?? {}),
          [fieldId]: format,
        },
      })
      toast.success('View saved')
    },
    [activeView.date_display_formats, onViewChange],
  )

  const listColumnHeaderMenu: ListColumnHeaderMenuConfig | undefined = useMemo(() => {
    if (readOnly) return undefined
    return {
      grouped: false,
      primarySort: activeView.sort?.[0],
      sortScope: resolvedSortScope,
      onSortPerGroup: (fieldId) => void applyListColumnSort(fieldId, 'per_group'),
      onSortGlobal: (fieldId) => void applyListColumnSort(fieldId, 'global'),
      onClearSort: () => void clearListColumnSort(),
      onMoveColumn: (fieldId, where) => void reorderDisplayColumn(fieldId, where),
      onHideColumn: (fieldId) => void hideListColumn(fieldId),
      dateFormat: {
        fieldIds: ['due_date', 'start_date', 'call_date'],
        value: (fieldId) =>
          dateDisplayFormats[fieldId as keyof DateDisplayFormats] ??
          activeView.date_display_format ??
          'date_time',
        onChange: (fieldId, format) => void updateDateDisplayFormat(fieldId, format),
      },
    }
  }, [
    readOnly,
    activeView.sort,
    resolvedSortScope,
    applyListColumnSort,
    clearListColumnSort,
    reorderDisplayColumn,
    hideListColumn,
    activeView.date_display_format,
    dateDisplayFormats,
    updateDateDisplayFormat,
  ])

  const handleColumnResize = useCallback((fieldId: string, width: number) => {
    setLocalWidths((prev) => ({ ...prev, [fieldId]: width }))
  }, [])

  const persistWidths = useCallback(() => {
    void onViewChange({ column_widths: { ...localWidths } })
  }, [localWidths, onViewChange])

  const dayLabel = useMemo(
    () =>
      day.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    [day],
  )

  return (
    <div
      className="border-border flex min-h-0 min-h-[200px] flex-1 flex-col overflow-hidden rounded-lg border"
      onMouseUp={persistWidths}
    >
      <div className="body-3 text-muted-foreground border-border flex shrink-0 items-center justify-between border-b px-3 py-2">
        <span>{dayLabel}</span>
        <span className="typo-caption">{dateFieldLabel}</span>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
        <div className="bg-background sticky top-0 z-20 flex shrink-0 flex-col">
          <div className="group/spacehead bg-background sticky left-0 z-30 flex w-full min-w-0 flex-col">
            <div className="flex w-full min-w-0 items-stretch">
              <div
                className={cn(
                  'relative sticky left-0 z-30 flex w-10 shrink-0 items-center',
                  'pb-1.5 pl-[21px] pt-1',
                )}
              >
                <div
                  className="bg-background pointer-events-none absolute inset-0 z-0"
                  aria-hidden
                />
                {selectAllInTitleColumn && dayItems.length > 0 && (
                  <div
                    className={cn(
                      'relative z-[1] shrink-0 transition-opacity duration-0',
                      selectAllHeaderOn
                        ? 'opacity-100'
                        : 'opacity-0 group-hover/spacehead:opacity-100',
                    )}
                  >
                    <SpaceListHeaderCheckbox
                      checked={selectAllInTitleColumn.checked}
                      indeterminate={selectAllInTitleColumn.indeterminate}
                      onToggle={selectAllInTitleColumn.onToggle}
                    />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 items-center pr-4">
                <DraggableColumnHeaders
                  visibleFields={displayCols}
                  listLayout="grouped"
                  compact
                  indented
                  selectAllInTitleColumn={null}
                  columnWidths={columnWidths}
                  onColumnResize={handleColumnResize}
                  onReorder={async (newIds) => {
                    await onViewChange({ visible_fields: newIds })
                    toast.success('View saved')
                  }}
                  onAddField={onAddField}
                  surface="list"
                  readOnly={readOnly}
                  listColumnHeaderMenu={listColumnHeaderMenu}
                />
              </div>
            </div>
            <div className="flex w-full min-w-0" aria-hidden>
              <div className="bg-background sticky left-0 z-[35] h-[0.5px] w-10 shrink-0" />
              <div className="bg-border mr-4 h-[0.5px] min-h-[0.5px] min-w-0 flex-1" />
            </div>
          </div>
        </div>

        <div className="divide-border flex-1 divide-y">
          {dayItems.length === 0 ? (
            <div className="body-3 text-muted-foreground px-3 py-6">No tasks on this day</div>
          ) : (
            dayItems.map((item) => (
              <SpaceCalendarDayTaskRow
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.id)}
                readOnly={readOnly}
                displayCols={displayCols}
                allFields={allFields}
                roster={roster}
                currentUserId={currentUserId}
                gridTemplateColumns={gridTemplateColumns}
                dateDisplayFormats={dateDisplayFormats}
                onUpdateItem={onUpdateItem}
                onDeleteItem={onDeleteItem}
                onPushToAgent={onPushToAgent}
                onOpenDetail={onOpenDetail}
                onToggleSelect={toggleSelect}
                onCreateOption={onCreateOption}
                onUpdateOption={onUpdateOption}
                onDeleteOption={onDeleteOption}
                onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                onEditStatuses={onEditStatuses}
                onEditCategories={onEditCategories}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
