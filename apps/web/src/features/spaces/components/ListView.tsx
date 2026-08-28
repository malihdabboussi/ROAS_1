'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { cn } from '@/lib/utils/cn'
import { getSpaceListDndInvalidToastMessage } from '../config/space-list-dnd-toast.config'
import { displayColumnsForList } from '../lib/display-columns-list'
import { buildListGridTemplate, fillNameColumnWidth } from '../lib/list-grid-template'
import { groupItems } from '../lib/group-items'
import { sortSpaceItemsCopy } from '../lib/sort-space-list-items'
import {
  buildMoveItemToEmptyGroup,
  buildSpaceListReorder,
  type DndZone,
} from '../lib/space-list-dnd-apply'
import {
  resolveFollowUpParentCallId,
  resolveSpaceEntryType,
  viewPromotesFollowUpSubtasks,
} from '../lib/apply-space-toolbar-filters'
import {
  LIST_TOP_DROP_ID,
  tryParseEmptyGroupDropId,
  tryParseGroupTopDropId,
} from '../lib/space-list-dnd-ids'
import {
  getFieldPatchForEmptyGroup,
  getGroupByFieldSyncPatch,
  mergeSpaceItemPartials,
} from '../lib/space-list-groupby-patch'
import { useSpacesStore } from '../store/use-spaces-store'
import type { SpaceItem } from '../types'
import {
  resolveSubtasksDisplay,
  type DateDisplayFormat,
  type DateDisplayFormats,
  type FieldDef,
  type SelectOption,
  type SortDef,
  type ViewDef,
} from '../types/space-schema'
import { BulkActionBar } from './BulkActionBar'
import {
  DraggableColumnHeaders,
  getDefaultWidth,
  SpaceListHeaderCheckbox,
} from './DraggableColumnHeaders'
import { GroupSection } from './GroupSection'
import type { ListColumnHeaderMenuConfig } from './list-column-header-menu'
import { OptionDot } from './OptionBadge'
import {
  GroupedRowGripColumn,
  SPACE_LIST_EXTERNAL_CONTROL_RAIL_WIDTH,
} from './space-list-group-chrome'
import { ListTopListSentinel } from './SpaceListDndListSentinels'
import { SpaceListDndGroupChromeRow, type SpaceListChatDragPayload } from './SpaceListDndRow'
import { SpaceQuickAdd } from './SpaceQuickAdd'

interface ListViewProps {
  items: SpaceItem[]
  visibleFields: FieldDef[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  onUpdateItem: (itemId: string, payload: Partial<SpaceItem>) => Promise<void>
  onPushToAgent: (
    itemId: string,
    options?: import('./cells/MissionSendDropdown').MissionSendOptions,
  ) => Promise<void>
  onOpenDetail?: (item: SpaceItem) => void
  activeView: ViewDef
  allFields: FieldDef[]
  onViewChange: (patch: Partial<ViewDef>) => Promise<void>
  /** Table: bordered columns and header strip; same behavior as list. */
  surface?: 'list' | 'table'
  onAddItemInGroup: (
    title: string,
    groupFieldId: string,
    groupKey: string,
    fieldExtras?: Record<string, unknown>,
  ) => Promise<void>
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onAddField?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onDeleteItem: (itemId: string) => void | Promise<void>
  /** When set, list quick-add row calls this instead of default `createItem` (e.g. Docs view). */
  quickAddOnSubmitItem?: (title: string, extras: Record<string, unknown>) => Promise<void>
  quickAddLabels?: { addTaskLabel?: string; inputPlaceholder?: string }
  quickAddInactiveAction?: (trigger: HTMLElement) => void
  readOnly?: boolean
  /**
   * If provided, replaces each row's leading status dot with this node and keeps the `status`
   * field visible inside the columns area. Used by the Docs list view to lead with the doc icon.
   */
  renderLeadingItemSlot?: (item: SpaceItem) => React.ReactNode
  getRowChatDragPayload?: (item: SpaceItem) => SpaceListChatDragPayload | null
  onRowContextMenu?: (item: SpaceItem, position: { x: number; y: number }) => void
  /** Bulk action bar item kind — docs list hides Convert and adds Remove from space. */
  bulkItemKind?: 'task' | 'doc'
}

export function ListView({
  items,
  visibleFields,
  roster,
  currentUserId,
  onUpdateItem,
  onPushToAgent,
  onOpenDetail,
  activeView,
  allFields,
  onViewChange,
  onAddItemInGroup,
  onEditStatuses,
  onEditCategories,
  onAddField,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onDeleteItem,
  surface = 'list',
  quickAddOnSubmitItem,
  quickAddLabels,
  quickAddInactiveAction,
  readOnly = false,
  renderLeadingItemSlot,
  getRowChatDragPayload,
  onRowContextMenu,
  bulkItemKind = 'task',
}: ListViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const listScrollRef = useRef<HTMLDivElement | null>(null)

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const promoteFollowUpSubtasks = viewPromotesFollowUpSubtasks(activeView)
  const nestFollowUpsUnderCalls = activeView.id === 'all-meetings'

  const topLevelItems = useMemo(() => {
    if (promoteFollowUpSubtasks) {
      return items.filter(
        (i) => !i.parent_item_id || resolveSpaceEntryType(i) === 'follow_up',
      )
    }
    if (nestFollowUpsUnderCalls) {
      return items.filter((i) => resolveSpaceEntryType(i) === 'call')
    }
    return items.filter((i) => !i.parent_item_id)
  }, [items, promoteFollowUpSubtasks, nestFollowUpsUnderCalls])

  const itemIds = useMemo(() => topLevelItems.map((i) => i.id), [topLevelItems])

  const subtasksMode = resolveSubtasksDisplay(activeView)

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

  const onSelectGroupItems = useCallback((ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (select) ids.forEach((id) => next.add(id))
      else ids.forEach((id) => next.delete(id))
      return next
    })
  }, [])

  const groupByField = useMemo(
    () => (activeView.group_by ? allFields.find((f) => f.id === activeView.group_by) : undefined),
    [activeView.group_by, allFields],
  )

  const sortPrimary = activeView.sort?.[0]
  const resolvedSortScope: 'per_group' | 'global' = activeView.sort_scope ?? 'global'
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

  const itemsSortedForGrouping = useMemo(() => {
    let heads = topLevelItems
    if (sortPrimary && groupByField && resolvedSortScope === 'global') {
      const fd = allFields.find((f) => f.id === sortPrimary.field)
      if (fd) heads = sortSpaceItemsCopy(topLevelItems, fd, roster, sortPrimary.dir)
    }
    const tail = items.filter((i) => i.parent_item_id)
    return [...heads, ...tail]
  }, [sortPrimary, groupByField, resolvedSortScope, topLevelItems, items, allFields, roster])

  const groups = useMemo(() => {
    if (!groupByField) return null
    let g = groupItems(
      itemsSortedForGrouping,
      groupByField,
      activeView.group_sort ?? 'asc',
      roster,
      activeView.show_empty_statuses ?? false,
    )
    if (sortPrimary && resolvedSortScope === 'per_group') {
      const fd = allFields.find((f) => f.id === sortPrimary.field)
      if (fd) {
        g = g.map((gr) => ({
          ...gr,
          items: sortSpaceItemsCopy(gr.items, fd, roster, sortPrimary.dir),
        }))
      }
    }
    return g
  }, [
    itemsSortedForGrouping,
    groupByField,
    activeView.group_sort,
    roster,
    activeView.show_empty_statuses,
    sortPrimary,
    resolvedSortScope,
    allFields,
  ])

  // --- Column widths ---
  const displayCols = useMemo(() => displayColumnsForList(visibleFields), [visibleFields])

  const [localWidths, setLocalWidths] = useState<Record<string, number>>(
    () => activeView.column_widths ?? {},
  )

  // Name column stretches to fill the list width unless the user resized it explicitly.
  const listRootRef = useRef<HTMLDivElement | null>(null)
  const [listWidth, setListWidth] = useState<number | null>(null)
  useEffect(() => {
    const el = listRootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const next = entry?.contentRect.width ?? 0
      setListWidth((prev) => (Math.abs((prev ?? 0) - next) < 1 ? prev : next))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const columnWidths = useMemo(() => {
    const merged: Record<string, number> = {}
    const ids = displayCols.map((f) => f.id)
    const widthFor = (id: string) => localWidths[id] ?? getDefaultWidth(id)
    for (const id of ids) merged[id] = widthFor(id)
    if (localWidths.title === undefined && ids.includes('title')) {
      merged.title = fillNameColumnWidth(ids, widthFor, 'title', listWidth)
    }
    return merged
  }, [displayCols, localWidths, listWidth])

  const gridTemplateColumns = useMemo(
    () =>
      buildListGridTemplate(
        displayCols.map((f) => f.id),
        (id) => columnWidths[id] ?? getDefaultWidth(id),
      ),
    [displayCols, columnWidths],
  )

  const flatDisplayedTopLevel = useMemo(() => {
    if (groupByField) return topLevelItems
    if (!sortPrimary) return topLevelItems
    const fd = allFields.find((f) => f.id === sortPrimary.field)
    if (!fd) return topLevelItems
    return sortSpaceItemsCopy(topLevelItems, fd, roster, sortPrimary.dir)
  }, [groupByField, sortPrimary, topLevelItems, allFields, roster])

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
      grouped: !!groupByField,
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
    groupByField,
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

  /** True only after an actual column resize — plain clicks must NOT persist the view. */
  const widthsDirtyRef = useRef(false)

  const handleColumnResize = useCallback((fieldId: string, width: number) => {
    widthsDirtyRef.current = true
    setLocalWidths((prev) => ({ ...prev, [fieldId]: width }))
  }, [])

  const persistWidths = useCallback(() => {
    if (!widthsDirtyRef.current) return
    widthsDirtyRef.current = false
    void onViewChange({ column_widths: { ...localWidths } })
  }, [localWidths, onViewChange])

  const handleColumnResizeWithPersist = useCallback(
    (fieldId: string, width: number) => {
      handleColumnResize(fieldId, width)
    },
    [handleColumnResize],
  )

  // --- Subtask expand/collapse ---
  const subtaskCountMap = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      if (promoteFollowUpSubtasks) continue
      const parentId = nestFollowUpsUnderCalls
        ? resolveFollowUpParentCallId(item)
        : item.parent_item_id
      if (parentId) counts[parentId] = (counts[parentId] ?? 0) + 1
    }
    return counts
  }, [items, nestFollowUpsUnderCalls, promoteFollowUpSubtasks])

  const subtasksByParent = useMemo(() => {
    const map: Record<string, SpaceItem[]> = {}
    if (promoteFollowUpSubtasks) return map
    for (const item of items) {
      const parentId = nestFollowUpsUnderCalls
        ? resolveFollowUpParentCallId(item)
        : item.parent_item_id
      if (parentId) (map[parentId] ??= []).push(item)
    }
    return map
  }, [items, nestFollowUpsUnderCalls, promoteFollowUpSubtasks])

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const prevSubtasksModeRef = useRef(subtasksMode)
  const [addingSubtaskId, setAddingSubtaskId] = useState<string | null>(null)
  const [listDndActiveId, setListDndActiveId] = useState<string | null>(null)

  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: readOnly ? { distance: 99999 } : { distance: 8 },
    }),
  )

  const handleListDndStart = useCallback((e: DragStartEvent) => {
    setListDndActiveId(String(e.active.id))
  }, [])

  const handleListDndEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setListDndActiveId(null)
      if (!over) return
      const oStr = String(over.id)
      const activeId = String(active.id)

      const emptyGroupKey = tryParseEmptyGroupDropId(oStr)
      if (emptyGroupKey != null && groupByField) {
        const activeItem = items.find((i) => i.id === activeId)
        if (!activeItem) return
        const fieldPatch = getFieldPatchForEmptyGroup(
          activeItem,
          groupByField,
          emptyGroupKey,
          roster,
        )
        if (!fieldPatch) return
        const emptyResult = buildMoveItemToEmptyGroup(items, activeId)
        if (!emptyResult.ok) {
          toast.error(getSpaceListDndInvalidToastMessage(emptyResult.reason))
          return
        }
        // One optimistic merge + one batch PATCH instead of a serial request per row.
        const updates = emptyResult.updates.map((u) => {
          const base: Partial<SpaceItem> = {
            parent_item_id: u.parent_item_id,
            sort_order: u.sort_order,
          }
          return {
            itemId: u.id,
            payload: u.id === activeId ? mergeSpaceItemPartials(base, fieldPatch) : base,
          }
        })
        if (!updates.some((u) => u.itemId === activeId)) {
          updates.push({ itemId: activeId, payload: fieldPatch })
        }
        void useSpacesStore
          .getState()
          .updateItemsBatch(updates)
          .catch(() => toast.error('Failed to move task'))
        return
      }

      let overId: string
      let zone: DndZone
      if (oStr === LIST_TOP_DROP_ID) {
        const first = flatDisplayedTopLevel[0]
        if (!first) return
        overId = first.id
        zone = 'before'
      } else {
        const groupTopFirst = tryParseGroupTopDropId(oStr)
        if (groupTopFirst) {
          overId = groupTopFirst
          zone = 'before'
        } else {
          const m = oStr.match(/^dnd:drop:([^:]+):(before|after|into)$/)
          if (!m || m[1] == null || m[2] == null) {
            return
          }
          overId = m[1]
          zone = m[2] as DndZone
        }
      }
      const result = buildSpaceListReorder(items, activeId, overId, zone)
      if (!result.ok) {
        toast.error(getSpaceListDndInvalidToastMessage(result.reason))
        return
      }
      const groupByFieldForSync = activeView.group_by
        ? allFields.find((f) => f.id === activeView.group_by)
        : undefined
      const activeItem = items.find((i) => i.id === activeId)
      const overItem = items.find((i) => i.id === overId)
      const groupFieldPatch =
        groupByFieldForSync && activeItem && overItem
          ? getGroupByFieldSyncPatch(activeItem, overItem, groupByFieldForSync)
          : null

      // ListView.tsx used to await one PATCH per renumbered row; the store's
      // updateItemsBatch does one optimistic merge + one batch request.
      const updates = result.updates.map((u) => {
        const base: Partial<SpaceItem> = {
          parent_item_id: u.parent_item_id,
          sort_order: u.sort_order,
        }
        return {
          itemId: u.id,
          payload:
            u.id === activeId && groupFieldPatch
              ? mergeSpaceItemPartials(base, groupFieldPatch)
              : base,
        }
      })
      void useSpacesStore
        .getState()
        .updateItemsBatch(updates)
        .catch(() => toast.error('Failed to reorder tasks'))
      if (zone === 'into') {
        setExpandedItems((prev) => {
          const n = new Set(prev)
          n.add(overId)
          return n
        })
      }
    },
    [activeView.group_by, allFields, flatDisplayedTopLevel, groupByField, items, roster],
  )

  const handleListDndCancel = useCallback(() => {
    setListDndActiveId(null)
  }, [])

  useEffect(() => {
    const prev = prevSubtasksModeRef.current
    prevSubtasksModeRef.current = subtasksMode
    if (prev !== subtasksMode && (subtasksMode === 'collapsed' || subtasksMode === 'separate')) {
      setExpandedItems(new Set())
    }
  }, [subtasksMode])

  useEffect(() => {
    if (subtasksMode === 'collapsed' || subtasksMode === 'separate') return
    const parentIds = Object.keys(subtaskCountMap).filter((id) => (subtaskCountMap[id] ?? 0) > 0)
    if (parentIds.length === 0) return
    setExpandedItems((prev) => {
      const missing = parentIds.filter((id) => !prev.has(id))
      if (missing.length === 0) return prev
      const next = new Set(prev)
      for (const id of missing) next.add(id)
      return next
    })
  }, [subtasksMode, subtaskCountMap])

  const toggleExpand = useCallback(
    (itemId: string) => {
      const opening = !expandedItems.has(itemId)
      if (opening && (subtaskCountMap[itemId] ?? 0) === 0) setAddingSubtaskId(itemId)
      if (!opening && addingSubtaskId === itemId) setAddingSubtaskId(null)
      setExpandedItems((prev) => {
        const next = new Set(prev)
        if (next.has(itemId)) next.delete(itemId)
        else next.add(itemId)
        return next
      })
    },
    [addingSubtaskId, expandedItems, subtaskCountMap],
  )

  const handleCreateSubtask = useCallback(async (parentId: string, title: string) => {
    try {
      await useSpacesStore.getState().createItem(title, { parent_item_id: parentId })
    } catch (err) {
      console.error('[subtasks] create failed:', err)
      toast.error('Failed to create subtask')
    }
  }, [])

  return (
    <div
      ref={(node) => {
        listRootRef.current = node
        if (groups) listScrollRef.current = node
      }}
      className="flex flex-1 flex-col overflow-auto"
      onMouseUp={persistWidths}
    >
      {/* Content — single DndContext for grouped and ungrouped list */}
      <DndContext
        sensors={dndSensors}
        collisionDetection={pointerWithin}
        onDragStart={handleListDndStart}
        onDragEnd={handleListDndEnd}
        onDragCancel={handleListDndCancel}
      >
        {groups ? (
          <div
            className={cn(
              'gap-spacing-10 flex min-w-max flex-1 flex-col',
              surface === 'table' && 'px-2 pb-2',
            )}
          >
            {surface === 'table' && (
              <div className="sticky top-0 z-20 shrink-0">
                <div
                  className={cn(
                    'group/spacehead card-glass sticky left-0 z-30 flex w-full min-w-0 flex-col overflow-hidden',
                    '!rounded-xl border-x-0 border-b-0 border-t-0 shadow-none',
                  )}
                >
                  <div className="flex w-full min-w-0 items-stretch">
                    <div
                      className={cn(
                        'relative sticky left-0 z-30 flex w-10 shrink-0 items-center',
                        'box-border min-h-[2.25rem] justify-center py-0 pl-0',
                      )}
                    >
                      {selectAllInTitleColumn && topLevelItems.length > 0 && (
                        <div className="relative z-[1] shrink-0 opacity-100 transition-opacity duration-0">
                          <SpaceListHeaderCheckbox
                            checked={selectAllInTitleColumn.checked}
                            indeterminate={selectAllInTitleColumn.indeterminate}
                            onToggle={selectAllInTitleColumn.onToggle}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 items-stretch">
                      <DraggableColumnHeaders
                        visibleFields={displayCols}
                        listLayout="grouped"
                        compact
                        indented
                        selectAllInTitleColumn={null}
                        columnWidths={columnWidths}
                        onColumnResize={handleColumnResizeWithPersist}
                        onReorder={async (newIds: string[]) => {
                          await onViewChange({ visible_fields: newIds })
                          toast.success('View saved')
                        }}
                        onAddField={onAddField}
                        surface={surface}
                        tableEmbedGlass
                        tableEmbedGlassClip={false}
                        readOnly={readOnly}
                        listColumnHeaderMenu={listColumnHeaderMenu}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {groups.map((g, groupIndex) => (
              <GroupSection
                key={g.key}
                group={g}
                primaryToolbarFocusTarget={groupIndex === 0}
                visibleFields={displayCols}
                allFields={allFields}
                roster={roster}
                currentUserId={currentUserId}
                onUpdateItem={onUpdateItem}
                onPushToAgent={onPushToAgent}
                onOpenDetail={onOpenDetail}
                onAddItem={(title, extra) =>
                  onAddItemInGroup(title, activeView.group_by!, g.key, extra)
                }
                groupByFieldId={activeView.group_by}
                onEditStatuses={onEditStatuses}
                onEditCategories={onEditCategories}
                onAddField={onAddField}
                onReorderColumns={async (newIds) => {
                  await onViewChange({ visible_fields: newIds })
                  toast.success('View saved')
                }}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onSelectGroupItems={onSelectGroupItems}
                columnWidths={columnWidths}
                onColumnResize={handleColumnResizeWithPersist}
                gridTemplateColumns={gridTemplateColumns}
                subtaskCountMap={subtaskCountMap}
                expandedItems={expandedItems}
                subtaskCache={subtasksByParent}
                onToggleExpand={toggleExpand}
                onCreateSubtask={handleCreateSubtask}
                listDndActiveId={listDndActiveId}
                onCreateOption={onCreateOption}
                onUpdateOption={onUpdateOption}
                onDeleteOption={onDeleteOption}
                onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                onDeleteItem={onDeleteItem}
                surface={surface}
                sharedTableHeader={surface === 'table'}
                subtasksDisplayMode={subtasksMode}
                readOnly={readOnly}
                listColumnHeaderMenu={listColumnHeaderMenu}
                dateDisplayFormats={dateDisplayFormats}
                renderLeadingItemSlot={renderLeadingItemSlot}
                getRowChatDragPayload={getRowChatDragPayload}
                onRowContextMenu={onRowContextMenu}
                quickAddLabels={quickAddLabels}
                quickAddInactiveAction={quickAddInactiveAction}
              />
            ))}
          </div>
        ) : (
          <div className={cn('flex min-w-0 flex-1 flex-col', surface === 'table' && 'px-2 pb-2')}>
            <div
              ref={listScrollRef}
              className={cn(
                'flex min-w-max flex-1 flex-col overflow-auto',
                surface === 'table' &&
                  'rounded-xl border border-[var(--border)] bg-[var(--background)] px-0 py-0 shadow-sm dark:shadow-none',
              )}
            >
              <div
                className={cn(
                  'sticky top-0 z-20 flex shrink-0 flex-col',
                  surface !== 'table' && 'bg-[var(--background)]',
                )}
              >
                <div
                  className={cn(
                    'group/spacehead sticky left-0 z-30 flex w-full min-w-0 flex-col',
                    surface === 'table'
                      ? 'card-glass overflow-hidden !rounded-b-none !rounded-t-xl border-x-0 border-b-0 border-t-0 shadow-none'
                      : 'bg-[var(--background)]',
                  )}
                >
                  <div className="flex w-full min-w-0 items-stretch">
                    <div
                      className={cn(
                        'relative sticky left-0 z-30 flex shrink-0 items-center',
                        SPACE_LIST_EXTERNAL_CONTROL_RAIL_WIDTH,
                        surface === 'table'
                          ? 'box-border min-h-[2.25rem] justify-center py-0 pl-0'
                          : 'pb-1.5 pl-[21px] pt-1',
                      )}
                    >
                      {surface !== 'table' && (
                        <div
                          className="pointer-events-none absolute inset-0 z-0 bg-[var(--background)]"
                          aria-hidden
                        />
                      )}
                      {selectAllInTitleColumn && topLevelItems.length > 0 && (
                        <div
                          className={cn(
                            'relative z-[1] shrink-0 transition-opacity duration-0',
                            selectAllHeaderOn
                              ? 'opacity-100'
                              : surface === 'table'
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
                    <div
                      className={cn(
                        'flex min-w-0 flex-1',
                        surface === 'table' ? 'items-stretch' : 'items-center',
                        surface !== 'table' && 'pr-4',
                      )}
                    >
                      <DraggableColumnHeaders
                        visibleFields={displayCols}
                        listLayout="grouped"
                        compact
                        indented
                        selectAllInTitleColumn={null}
                        columnWidths={columnWidths}
                        onColumnResize={handleColumnResizeWithPersist}
                        onReorder={async (newIds: string[]) => {
                          await onViewChange({ visible_fields: newIds })
                          toast.success('View saved')
                        }}
                        onAddField={onAddField}
                        surface={surface}
                        tableEmbedGlass={surface === 'table'}
                        readOnly={readOnly}
                        listColumnHeaderMenu={listColumnHeaderMenu}
                        externalRowControls
                      />
                    </div>
                  </div>
                  {surface !== 'table' && (
                    <div className="flex w-full min-w-0" aria-hidden>
                      <div
                        className={cn(
                          'sticky left-0 z-[35] h-[0.5px] shrink-0 bg-[var(--background)]',
                          SPACE_LIST_EXTERNAL_CONTROL_RAIL_WIDTH,
                        )}
                      />
                      <div className="mr-4 h-[0.5px] min-h-[0.5px] min-w-0 flex-1 bg-[var(--border)]" />
                    </div>
                  )}
                </div>
              </div>

              {flatDisplayedTopLevel.length > 0 && (
                <ListTopListSentinel listActiveId={listDndActiveId} />
              )}

              <div
                className={cn('flex-1', surface === 'list' && 'divide-y divide-[var(--border)]')}
              >
                {subtasksMode === 'separate'
                  ? (() => {
                      let tableRowNum = 0
                      return flatDisplayedTopLevel.map((item) => {
                        const subs = [...(subtasksByParent[item.id] ?? [])].sort(
                          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
                        )
                        const pCount = subtaskCountMap[item.id] ?? 0
                        const suppressChev = pCount > 0
                        return (
                          <Fragment key={item.id}>
                            <div>
                              <SpaceListDndGroupChromeRow
                                listActiveId={listDndActiveId}
                                allowInto
                                surface={surface}
                                tableRowLabel={surface === 'table' ? ++tableRowNum : null}
                                item={item}
                                visibleFields={displayCols}
                                allFields={allFields}
                                roster={roster}
                                currentUserId={currentUserId}
                                onUpdateItem={onUpdateItem}
                                onPushToAgent={onPushToAgent}
                                onOpenDetail={onOpenDetail}
                                onEditStatuses={onEditStatuses}
                                onEditCategories={onEditCategories}
                                selected={selectedIds.has(item.id)}
                                onToggleSelect={toggleSelect}
                                gridTemplateColumns={gridTemplateColumns}
                                subtaskCount={pCount}
                                suppressSubtaskChevron={suppressChev}
                                expanded={addingSubtaskId === item.id}
                                onToggleExpand={() => {
                                  setAddingSubtaskId((current) =>
                                    current === item.id ? null : item.id,
                                  )
                                }}
                                onAddSubtask={() => {
                                  setAddingSubtaskId(item.id)
                                }}
                                onCreateOption={onCreateOption}
                                onUpdateOption={onUpdateOption}
                                onDeleteOption={onDeleteOption}
                                onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                                onDeleteItem={onDeleteItem}
                                readOnly={readOnly}
                                leadingItemSlot={renderLeadingItemSlot?.(item)}
                                chatDragPayload={getRowChatDragPayload?.(item)}
                                onRowContextMenu={onRowContextMenu}
                                dateDisplayFormats={dateDisplayFormats}
                              />
                            </div>
                            {subs.map((sub) => (
                              <div key={sub.id}>
                                <SpaceListDndGroupChromeRow
                                  listActiveId={listDndActiveId}
                                  allowInto={false}
                                  surface={surface}
                                  tableRowLabel={surface === 'table' ? ++tableRowNum : null}
                                  item={sub}
                                  visibleFields={displayCols}
                                  allFields={allFields}
                                  roster={roster}
                                  currentUserId={currentUserId}
                                  onUpdateItem={onUpdateItem}
                                  onPushToAgent={onPushToAgent}
                                  onOpenDetail={onOpenDetail}
                                  onEditStatuses={onEditStatuses}
                                  onEditCategories={onEditCategories}
                                  selected={selectedIds.has(sub.id)}
                                  onToggleSelect={toggleSelect}
                                  gridTemplateColumns={gridTemplateColumns}
                                  isSubtask
                                  separateSubtaskFlushRow
                                  onCreateOption={onCreateOption}
                                  onUpdateOption={onUpdateOption}
                                  onDeleteOption={onDeleteOption}
                                  onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                                  onDeleteItem={onDeleteItem}
                                  readOnly={readOnly}
                                  leadingItemSlot={renderLeadingItemSlot?.(sub)}
                                  chatDragPayload={getRowChatDragPayload?.(sub)}
                                  onRowContextMenu={onRowContextMenu}
                                  dateDisplayFormats={dateDisplayFormats}
                                />
                              </div>
                            ))}
                            {addingSubtaskId === item.id ? (
                              <FlatSubtaskBlock
                                parentId={item.id}
                                subtasks={[]}
                                listSubtasksInline={false}
                                visibleFields={displayCols}
                                allFields={allFields}
                                roster={roster}
                                currentUserId={currentUserId}
                                onUpdateItem={onUpdateItem}
                                onPushToAgent={onPushToAgent}
                                onOpenDetail={onOpenDetail}
                                onEditStatuses={onEditStatuses}
                                onEditCategories={onEditCategories}
                                selectedIds={selectedIds}
                                onToggleSelect={toggleSelect}
                                gridTemplateColumns={gridTemplateColumns}
                                onCreateSubtask={handleCreateSubtask}
                                addingSubtask
                                onDoneAdding={() => setAddingSubtaskId(null)}
                                listDndActiveId={listDndActiveId}
                                onCreateOption={onCreateOption}
                                onUpdateOption={onUpdateOption}
                                onDeleteOption={onDeleteOption}
                                onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                                onDeleteItem={onDeleteItem}
                                surface={surface}
                                readOnly={readOnly}
                                renderLeadingItemSlot={renderLeadingItemSlot}
                                getRowChatDragPayload={getRowChatDragPayload}
                                onRowContextMenu={onRowContextMenu}
                                dateDisplayFormats={dateDisplayFormats}
                              />
                            ) : null}
                          </Fragment>
                        )
                      })
                    })()
                  : flatDisplayedTopLevel.map((item, rowIdx) => (
                      <div key={item.id}>
                        <SpaceListDndGroupChromeRow
                          listActiveId={listDndActiveId}
                          allowInto
                          surface={surface}
                          tableRowLabel={surface === 'table' ? rowIdx + 1 : null}
                          item={item}
                          visibleFields={displayCols}
                          allFields={allFields}
                          roster={roster}
                          currentUserId={currentUserId}
                          onUpdateItem={onUpdateItem}
                          onPushToAgent={onPushToAgent}
                          onOpenDetail={onOpenDetail}
                          onEditStatuses={onEditStatuses}
                          onEditCategories={onEditCategories}
                          selected={selectedIds.has(item.id)}
                          onToggleSelect={toggleSelect}
                          gridTemplateColumns={gridTemplateColumns}
                          subtaskCount={subtaskCountMap[item.id] ?? 0}
                          expanded={expandedItems.has(item.id)}
                          onToggleExpand={() => void toggleExpand(item.id)}
                          onAddSubtask={() => {
                            setAddingSubtaskId(item.id)
                            if (!expandedItems.has(item.id)) void toggleExpand(item.id)
                          }}
                          onCreateOption={onCreateOption}
                          onUpdateOption={onUpdateOption}
                          onDeleteOption={onDeleteOption}
                          onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                          onDeleteItem={onDeleteItem}
                          readOnly={readOnly}
                          leadingItemSlot={renderLeadingItemSlot?.(item)}
                          chatDragPayload={getRowChatDragPayload?.(item)}
                          onRowContextMenu={onRowContextMenu}
                          dateDisplayFormats={dateDisplayFormats}
                        />
                        {expandedItems.has(item.id) && (
                          <FlatSubtaskBlock
                            parentId={item.id}
                            subtasks={subtasksByParent[item.id] ?? []}
                            visibleFields={displayCols}
                            allFields={allFields}
                            roster={roster}
                            currentUserId={currentUserId}
                            onUpdateItem={onUpdateItem}
                            onPushToAgent={onPushToAgent}
                            onOpenDetail={onOpenDetail}
                            onEditStatuses={onEditStatuses}
                            onEditCategories={onEditCategories}
                            selectedIds={selectedIds}
                            onToggleSelect={toggleSelect}
                            gridTemplateColumns={gridTemplateColumns}
                            onCreateSubtask={handleCreateSubtask}
                            addingSubtask={addingSubtaskId === item.id}
                            onDoneAdding={() => setAddingSubtaskId(null)}
                            listDndActiveId={listDndActiveId}
                            onCreateOption={onCreateOption}
                            onUpdateOption={onUpdateOption}
                            onDeleteOption={onDeleteOption}
                            onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                            onDeleteItem={onDeleteItem}
                            surface={surface}
                            readOnly={readOnly}
                            renderLeadingItemSlot={renderLeadingItemSlot}
                            getRowChatDragPayload={getRowChatDragPayload}
                            onRowContextMenu={onRowContextMenu}
                            dateDisplayFormats={dateDisplayFormats}
                          />
                        )}
                      </div>
                    ))}
                {!readOnly && (
                  <SpaceQuickAdd
                    roster={roster}
                    currentUserId={currentUserId}
                    allFields={allFields}
                    displayCols={displayCols}
                    gridTemplateColumns={gridTemplateColumns}
                    onEditStatuses={onEditStatuses}
                    surface={surface}
                    acceptToolbarFocus={!groups}
                    onSubmitItem={quickAddOnSubmitItem}
                    addTaskLabel={quickAddLabels?.addTaskLabel}
                    inputPlaceholder={quickAddLabels?.inputPlaceholder}
                    onInactiveActivate={quickAddInactiveAction}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </DndContext>

      {!readOnly && (
        <BulkActionBar
          selectedIds={selectedIds}
          items={items}
          allFields={allFields}
          roster={roster}
          currentUserId={currentUserId}
          spaces={useSpacesStore.getState().spaces}
          activeSpaceId={useSpacesStore.getState().activeSpaceId}
          onUpdateItem={onUpdateItem}
          onDeleteItem={useSpacesStore.getState().deleteItem}
          onCreateItem={useSpacesStore.getState().createItem}
          onClearSelection={clearSelection}
          onRefresh={useSpacesStore.getState().refresh}
          onEditStatuses={onEditStatuses}
          onEditCategories={onEditCategories}
          onCreateOption={onCreateOption}
          onUpdateOption={onUpdateOption}
          onDeleteOption={onDeleteOption}
          onTagCustomSwatchesChange={onTagCustomSwatchesChange}
          onPushToAgent={onPushToAgent}
          duplicateItem={useSpacesStore.getState().duplicateItem}
          itemKind={bulkItemKind}
        />
      )}
    </div>
  )
}

// --- Flat (ungrouped) subtask block ---

function FlatSubtaskBlock({
  parentId,
  subtasks,
  visibleFields,
  allFields,
  roster,
  currentUserId,
  onUpdateItem,
  onPushToAgent,
  onOpenDetail,
  onEditStatuses,
  onEditCategories,
  selectedIds,
  onToggleSelect,
  gridTemplateColumns,
  onCreateSubtask,
  addingSubtask,
  onDoneAdding,
  listDndActiveId,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onDeleteItem,
  surface = 'list',
  /** When false, only the add-subtask composer (subtasks already rendered as list rows). */
  listSubtasksInline = true,
  readOnly = false,
  renderLeadingItemSlot,
  getRowChatDragPayload,
  onRowContextMenu,
  dateDisplayFormats,
}: {
  parentId: string
  subtasks: SpaceItem[]
  visibleFields: FieldDef[]
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  onUpdateItem: (itemId: string, payload: Partial<SpaceItem>) => Promise<void>
  onPushToAgent: (
    itemId: string,
    options?: import('./cells/MissionSendDropdown').MissionSendOptions,
  ) => Promise<void>
  onOpenDetail?: (item: SpaceItem) => void
  onEditStatuses?: () => void
  onEditCategories?: () => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  gridTemplateColumns: string
  onCreateSubtask: (parentId: string, title: string) => Promise<void>
  addingSubtask?: boolean
  onDoneAdding?: () => void
  listDndActiveId: string | null
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onDeleteItem: (itemId: string) => void | Promise<void>
  surface?: 'list' | 'table'
  listSubtasksInline?: boolean
  readOnly?: boolean
  renderLeadingItemSlot?: (item: SpaceItem) => React.ReactNode
  getRowChatDragPayload?: (item: SpaceItem) => SpaceListChatDragPayload | null
  onRowContextMenu?: (item: SpaceItem, position: { x: number; y: number }) => void
  dateDisplayFormats?: DateDisplayFormats
}) {
  const [value, setValue] = useState('')
  const [showInput, setShowInput] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const justOpenedAtRef = useRef<number>(0)
  const displayFields = useMemo(
    () => (renderLeadingItemSlot ? visibleFields : visibleFields.filter((f) => f.id !== 'status')),
    [visibleFields, renderLeadingItemSlot],
  )

  useEffect(() => {
    if (addingSubtask) {
      setShowInput(true)
      justOpenedAtRef.current = Date.now()
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [addingSubtask])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    await onCreateSubtask(parentId, trimmed)
    setValue('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function handleBlur() {
    if (Date.now() - justOpenedAtRef.current < 250) {
      requestAnimationFrame(() => inputRef.current?.focus())
      return
    }
    if (!value.trim()) {
      setShowInput(false)
      onDoneAdding?.()
    }
  }

  return (
    <>
      {listSubtasksInline &&
        subtasks.map((sub) => (
          <SpaceListDndGroupChromeRow
            key={sub.id}
            listActiveId={listDndActiveId}
            allowInto={false}
            surface={surface}
            tableRowLabel={null}
            item={sub}
            visibleFields={visibleFields}
            allFields={allFields}
            roster={roster}
            currentUserId={currentUserId}
            onUpdateItem={onUpdateItem}
            onPushToAgent={onPushToAgent}
            onOpenDetail={onOpenDetail}
            onEditStatuses={onEditStatuses}
            onEditCategories={onEditCategories}
            selected={selectedIds.has(sub.id)}
            onToggleSelect={onToggleSelect}
            gridTemplateColumns={gridTemplateColumns}
            isSubtask
            onCreateOption={onCreateOption}
            onUpdateOption={onUpdateOption}
            onDeleteOption={onDeleteOption}
            onTagCustomSwatchesChange={onTagCustomSwatchesChange}
            onDeleteItem={onDeleteItem}
            readOnly={readOnly}
            leadingItemSlot={renderLeadingItemSlot?.(sub)}
            chatDragPayload={getRowChatDragPayload?.(sub)}
            onRowContextMenu={onRowContextMenu}
            dateDisplayFormats={dateDisplayFormats}
          />
        ))}
      {showInput && !readOnly && (
        <div className="group/row relative">
          {surface !== 'table' && (
            <div className="pointer-events-none absolute inset-0 transition-none group-hover/row:bg-[var(--color-hover-subtle)]" />
          )}
          <div
            className={cn(
              'relative flex items-stretch',
              surface === 'table' && 'border-b border-[var(--border)]',
            )}
          >
            <GroupedRowGripColumn
              itemId={`add-subtask-${parentId}`}
              isSelected={false}
              reserveLayoutOnly
              surface={surface}
              tableRowLabel={null}
            />
            <div className={cn('min-w-0 flex-1', surface !== 'table' && 'pr-4')}>
              <div
                className="grid min-w-0 flex-1 items-stretch gap-0"
                style={{ gridTemplateColumns: gridTemplateColumns ?? undefined }}
              >
                <form
                  onSubmit={handleSubmit}
                  className={cn(
                    'flex min-w-0 items-center py-1',
                    surface === 'table' && 'min-h-[2.25rem] px-2 py-1',
                  )}
                >
                  <div className="flex shrink-0 items-center gap-2.5 pl-5">
                    <span className="inline-block w-4 shrink-0" />
                  </div>
                  <div className="ml-2.5 flex min-w-0 items-center gap-2.5">
                    <OptionDot color="muted" size="sm" />
                    <input
                      ref={inputRef}
                      autoFocus
                      type="text"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      onBlur={handleBlur}
                      placeholder="Add subtask"
                      className="flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                    />
                  </div>
                </form>
                {displayFields.slice(1).map((f) => (
                  <div
                    key={f.id}
                    className={cn('min-w-0', surface === 'table' && 'min-h-[2.25rem]')}
                  />
                ))}
                <div className={cn(surface === 'table' && 'min-h-[2.25rem]')} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
