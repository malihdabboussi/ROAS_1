'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { getSpaceListDndInvalidToastMessage } from '../../config/space-list-dnd-toast.config'
import { displayColumnsForList } from '../../lib/display-columns-list'
import { buildSpaceListReorder, type DndZone } from '../../lib/space-list-dnd-apply'
import type { SpaceItem } from '../../types'
import {
  DEFAULT_SPACE_SCHEMA,
  DEFAULT_TASK_VISIBLE_FIELD_IDS,
  isSpaceFieldVisibleInUi,
  type FieldDef,
  type SelectOption,
  type SpaceSchema,
  type ViewDef,
} from '../../types/space-schema'
import type { MissionSendOptions } from '../cells/MissionSendDropdown'
import { getDefaultWidth } from '../DraggableColumnHeaders'
import { TaskSubtasksBulkActions } from './TaskSubtasksBulkActions'
import { TaskSubtasksFieldsMenu } from './TaskSubtasksFieldsMenu'
import { TaskSubtasksHeader } from './TaskSubtasksHeader'
import { TaskSubtasksTable } from './TaskSubtasksTable'

interface TaskSubtasksProps {
  subtasks: SpaceItem[]
  /** Parent task id; used for ordering math with `buildSpaceListReorder`. */
  parentItemId: string
  allFields: FieldDef[]
  activeView: ViewDef
  spaceSchema: SpaceSchema
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  roster: TeamRosterEntry[]
  currentUserId: string | null
  subtasksSectionCollapsed: boolean
  onSubtasksSectionCollapsedChange: (collapsed: boolean) => void
  onUpdateSubtask: (subtaskId: string, patch: Partial<SpaceItem>) => void
  onCreateSubtask: (title: string, extra?: Record<string, unknown>) => void | Promise<void>
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onPushToAgent: (itemId: string, options?: MissionSendOptions) => Promise<void>
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onDeleteItem: (itemId: string) => void | Promise<void>
  /** Drill into subtask in the same modal flow (pushes parent onto stack). */
  onOpenTaskDetail?: (item: SpaceItem) => void
  loading?: boolean
  onRefresh?: () => Promise<void>
}

const SUBTASK_GRID_TRAIL_PX = 32
const SUBTASK_GRIP_PX = 40
const SUBTASK_ROW_PAD_PX = 16

export function TaskSubtasks({
  subtasks,
  parentItemId,
  allFields,
  activeView,
  spaceSchema,
  onViewPatch,
  roster,
  currentUserId,
  subtasksSectionCollapsed,
  onSubtasksSectionCollapsedChange,
  onUpdateSubtask,
  onCreateSubtask,
  onEditStatuses,
  onEditCategories,
  onPushToAgent,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onDeleteItem,
  onOpenTaskDetail,
  loading,
  onRefresh,
}: TaskSubtasksProps) {
  const [collapsed, setCollapsedInternal] = useState(subtasksSectionCollapsed)
  /** Keep local toggle in sync when parent passes a new value (e.g. switching tasks). */
  useEffect(() => {
    setCollapsedInternal(subtasksSectionCollapsed)
  }, [subtasksSectionCollapsed])

  const setCollapsed = useCallback(
    (next: boolean) => {
      setCollapsedInternal(next)
      onSubtasksSectionCollapsedChange(next)
    },
    [onSubtasksSectionCollapsedChange],
  )

  const [showClosed, setShowClosed] = useState(false)
  const [fieldsMenuOpen, setFieldsMenuOpen] = useState(false)
  const [fieldsMenuPos, setFieldsMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [localWidths, setLocalWidths] = useState<Record<string, number>>(
    () => activeView.column_widths ?? {},
  )
  const [listDndActiveId, setListDndActiveId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const subtaskIds = useMemo(() => subtasks.map((s) => s.id), [subtasks])

  const selectAllInTitleColumn = useMemo(() => {
    if (subtaskIds.length === 0) return null
    const n = subtaskIds.filter((id) => selectedIds.has(id)).length
    const all = n === subtaskIds.length
    const some = n > 0 && !all
    return {
      checked: all,
      indeterminate: some,
      onToggle: () => {
        if (all) {
          setSelectedIds((prev) => {
            const next = new Set(prev)
            subtaskIds.forEach((id) => next.delete(id))
            return next
          })
        } else {
          setSelectedIds((prev) => {
            const next = new Set(prev)
            subtaskIds.forEach((id) => next.add(id))
            return next
          })
        }
      },
    }
  }, [subtaskIds, selectedIds])

  const selectAllHeaderOn =
    selectAllInTitleColumn != null &&
    (selectAllInTitleColumn.checked || selectAllInTitleColumn.indeterminate)

  useEffect(() => {
    setSelectedIds(new Set())
  }, [parentItemId])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    setLocalWidths(activeView.column_widths ?? {})
  }, [activeView.id, activeView.column_widths])

  const fieldsById = useMemo(() => new Map(allFields.map((f) => [f.id, f] as const)), [allFields])

  const listVisibleFields = useMemo(() => {
    const ids = activeView.visible_fields ?? [...DEFAULT_TASK_VISIBLE_FIELD_IDS]
    return ids
      .map((id) => fieldsById.get(id))
      .filter((f): f is FieldDef => Boolean(f))
      .filter(isSpaceFieldVisibleInUi)
  }, [activeView.visible_fields, fieldsById])

  const displayCols = useMemo(() => {
    const cols = displayColumnsForList(listVisibleFields)
    if (cols.some((f) => f.id === 'title')) return cols
    const titleField = spaceSchema.fields.find((f) => f.id === 'title') ?? fieldsById.get('title')
    return titleField ? [titleField, ...cols] : cols
  }, [listVisibleFields, spaceSchema.fields, fieldsById])

  const columnWidths = useMemo(() => {
    const merged: Record<string, number> = {}
    for (const f of displayCols) {
      merged[f.id] = localWidths[f.id] ?? getDefaultWidth(f.id)
    }
    return merged
  }, [displayCols, localWidths])

  const gridTemplateColumns = useMemo(
    () =>
      displayCols.map((f) => `${columnWidths[f.id]}px`).join(' ') + ` ${SUBTASK_GRID_TRAIL_PX}px`,
    [displayCols, columnWidths],
  )

  const subtaskGridWidthPx = useMemo(
    () =>
      displayCols.reduce((sum, f) => sum + (columnWidths[f.id] ?? 0), 0) + SUBTASK_GRID_TRAIL_PX,
    [displayCols, columnWidths],
  )

  const subtaskTableMinWidthPx = SUBTASK_GRIP_PX + subtaskGridWidthPx + SUBTASK_ROW_PAD_PX

  const handleColumnResize = useCallback((fieldId: string, width: number) => {
    setLocalWidths((prev) => ({ ...prev, [fieldId]: width }))
  }, [])

  const persistWidths = useCallback(() => {
    void onViewPatch({ column_widths: { ...localWidths } })
  }, [localWidths, onViewPatch])

  const handleViewReorder = useCallback(
    async (newIds: string[]) => {
      const merged = newIds.includes('status')
        ? newIds
        : ['status', ...newIds.filter((id) => id !== 'status')]
      await onViewPatch({ visible_fields: merged })
      toast.success('View saved')
    },
    [onViewPatch],
  )

  const openFieldsMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const w = 320
    const left = Math.max(8, r.right - w)
    setFieldsMenuPos({ top: r.bottom + 6, left })
    setFieldsMenuOpen(true)
  }, [])

  useEffect(() => {
    if (!fieldsMenuOpen) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setFieldsMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fieldsMenuOpen])

  const openSubtasks = useMemo(() => subtasks.filter((s) => s.status !== 'done'), [subtasks])
  const closedSubtasks = useMemo(() => subtasks.filter((s) => s.status === 'done'), [subtasks])
  const doneCount = closedSubtasks.length
  const total = subtasks.length

  /** Full sibling list ordered like the list view for `buildSpaceListReorder` (includes open + done). */
  const itemsForReorder = useMemo(() => {
    const list = subtasks.filter((s) => s.parent_item_id === parentItemId)
    list.sort((a, b) => {
      const da = (a.sort_order ?? 0) - (b.sort_order ?? 0)
      if (da !== 0) return da
      return a.id.localeCompare(b.id)
    })
    return list
  }, [subtasks, parentItemId])

  const handleListDndStart = useCallback((e: DragStartEvent) => {
    setListDndActiveId(String(e.active.id))
  }, [])

  const handleListDndCancel = useCallback(() => {
    setListDndActiveId(null)
  }, [])

  const handleListDndEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setListDndActiveId(null)
      if (!over) return
      const oStr = String(over.id)
      const activeId = String(active.id)
      const m = oStr.match(/^dnd:drop:([^:]+):(before|after|into)$/)
      if (!m || m[1] == null || m[2] == null) return
      const overId = m[1]
      const zone = m[2] as DndZone

      if (itemsForReorder.length === 0) return
      const result = buildSpaceListReorder(itemsForReorder, activeId, overId, zone)
      if (!result.ok) {
        toast.error(getSpaceListDndInvalidToastMessage(result.reason))
        return
      }
      void (async () => {
        for (const u of result.updates) {
          onUpdateSubtask(u.id, {
            parent_item_id: u.parent_item_id,
            sort_order: u.sort_order,
          })
        }
      })()
    },
    [itemsForReorder, onUpdateSubtask],
  )

  /** Use canonical `status` from space schema so option colors always resolve (matches list). */
  const allFieldsForRows = useMemo(() => {
    const fromSchema =
      spaceSchema.fields.find((f) => f.id === 'status') ??
      DEFAULT_SPACE_SCHEMA.fields.find((f) => f.id === 'status')
    if (!fromSchema) return allFields
    const has = allFields.some((f) => f.id === 'status')
    if (!has) return [...allFields, fromSchema]
    return allFields.map((f) => (f.id === 'status' ? fromSchema : f))
  }, [allFields, spaceSchema.fields])

  const hasSubtaskRows = total > 0

  return (
    <div
      className="mt-spacing-4 w-full min-w-0 [--background:var(--color-card)]"
      onMouseUp={persistWidths}
    >
      <TaskSubtasksHeader
        collapsed={collapsed}
        doneCount={doneCount}
        total={total}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
      />

      {!collapsed && (
        <TaskSubtasksTable
          allFields={allFields}
          allFieldsForRows={allFieldsForRows}
          closedSubtasks={closedSubtasks}
          columnWidths={columnWidths}
          currentUserId={currentUserId}
          displayCols={displayCols}
          dndSensors={dndSensors}
          gridTemplateColumns={gridTemplateColumns}
          hasSubtaskRows={hasSubtaskRows}
          listDndActiveId={listDndActiveId}
          loading={loading}
          openSubtasks={openSubtasks}
          roster={roster}
          selectAllHeaderOn={selectAllHeaderOn}
          selectAllInTitleColumn={selectAllInTitleColumn}
          selectedIds={selectedIds}
          showClosed={showClosed}
          subtaskGridWidthPx={subtaskGridWidthPx}
          subtaskTableMinWidthPx={subtaskTableMinWidthPx}
          onColumnResize={handleColumnResize}
          onCreateOption={onCreateOption}
          onDeleteItem={onDeleteItem}
          onDeleteOption={onDeleteOption}
          onDragCancel={handleListDndCancel}
          onDragEnd={handleListDndEnd}
          onDragStart={handleListDndStart}
          onEditCategories={onEditCategories}
          onEditStatuses={onEditStatuses}
          onOpenFieldsMenu={openFieldsMenu}
          onOpenTaskDetail={onOpenTaskDetail}
          onPushToAgent={onPushToAgent}
          onReorderView={handleViewReorder}
          onSubmitSubtask={onCreateSubtask}
          onTagCustomSwatchesChange={onTagCustomSwatchesChange}
          onToggleShowClosed={() => setShowClosed((s) => !s)}
          onToggleSelect={toggleSelect}
          onUpdateItem={onUpdateSubtask}
          onUpdateOption={onUpdateOption}
        />
      )}

      <TaskSubtasksBulkActions
        selectedIds={selectedIds}
        items={subtasks}
        allFields={allFields}
        roster={roster}
        currentUserId={currentUserId}
        onUpdateSubtask={onUpdateSubtask}
        onDeleteItem={onDeleteItem}
        onClearSelection={clearSelection}
        onRefresh={onRefresh}
        onEditStatuses={onEditStatuses}
        onEditCategories={onEditCategories}
        onCreateOption={onCreateOption}
        onUpdateOption={onUpdateOption}
        onDeleteOption={onDeleteOption}
        onTagCustomSwatchesChange={onTagCustomSwatchesChange}
        onPushToAgent={onPushToAgent}
      />

      <TaskSubtasksFieldsMenu
        activeView={activeView}
        open={fieldsMenuOpen}
        position={fieldsMenuPos}
        spaceSchema={spaceSchema}
        onClose={() => setFieldsMenuOpen(false)}
        onViewPatch={onViewPatch}
      />
    </div>
  )
}
