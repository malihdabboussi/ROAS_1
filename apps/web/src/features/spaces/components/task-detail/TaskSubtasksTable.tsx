'use client'

import type { MouseEvent } from 'react'
import {
  DndContext,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import type { SpaceItem } from '../../types'
import type { FieldDef, SelectOption } from '../../types/space-schema'
import type { MissionSendOptions } from '../cells/MissionSendDropdown'
import {
  DraggableColumnHeaders,
  SpaceListHeaderCheckbox,
  type TitleColumnSelectAll,
} from '../DraggableColumnHeaders'
import { SpaceListDndGroupChromeRow } from '../SpaceListDndRow'
import { SpaceQuickAdd } from '../SpaceQuickAdd'

type DndSensors = React.ComponentProps<typeof DndContext>['sensors']

interface TaskSubtasksTableProps {
  allFields: FieldDef[]
  allFieldsForRows: FieldDef[]
  closedSubtasks: SpaceItem[]
  columnWidths: Record<string, number>
  currentUserId: string | null
  displayCols: FieldDef[]
  dndSensors: DndSensors
  gridTemplateColumns: string
  hasSubtaskRows: boolean
  listDndActiveId: string | null
  loading?: boolean
  openSubtasks: SpaceItem[]
  roster: TeamRosterEntry[]
  selectAllHeaderOn: boolean
  selectAllInTitleColumn: TitleColumnSelectAll | null
  selectedIds: Set<string>
  showClosed: boolean
  subtaskGridWidthPx: number
  subtaskTableMinWidthPx: number
  onColumnResize: (fieldId: string, width: number) => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onDeleteItem: (itemId: string) => void | Promise<void>
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onDragCancel: () => void
  onDragEnd: (event: DragEndEvent) => void
  onDragStart: (event: DragStartEvent) => void
  onEditCategories?: () => void
  onEditStatuses?: () => void
  onOpenFieldsMenu: (event: MouseEvent<HTMLButtonElement>) => void
  onOpenTaskDetail?: (item: SpaceItem) => void
  onPushToAgent: (itemId: string, options?: MissionSendOptions) => Promise<void>
  onReorderView: (newIds: string[]) => Promise<void>
  onSubmitSubtask: (title: string, extra: Record<string, unknown>) => void | Promise<void>
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onToggleShowClosed: () => void
  onToggleSelect: (id: string) => void
  onUpdateItem: (itemId: string, patch: Partial<SpaceItem>) => void | Promise<void>
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
}

export function TaskSubtasksTable({
  allFields,
  allFieldsForRows,
  closedSubtasks,
  columnWidths,
  currentUserId,
  displayCols,
  dndSensors,
  gridTemplateColumns,
  hasSubtaskRows,
  listDndActiveId,
  loading,
  openSubtasks,
  roster,
  selectAllHeaderOn,
  selectAllInTitleColumn,
  selectedIds,
  showClosed,
  subtaskGridWidthPx,
  subtaskTableMinWidthPx,
  onColumnResize,
  onCreateOption,
  onDeleteItem,
  onDeleteOption,
  onDragCancel,
  onDragEnd,
  onDragStart,
  onEditCategories,
  onEditStatuses,
  onOpenFieldsMenu,
  onOpenTaskDetail,
  onPushToAgent,
  onReorderView,
  onSubmitSubtask,
  onTagCustomSwatchesChange,
  onToggleShowClosed,
  onToggleSelect,
  onUpdateItem,
  onUpdateOption,
}: TaskSubtasksTableProps) {
  const handleSubmitSubtask = async (title: string, extra: Record<string, unknown>) => {
    await onSubmitSubtask(title, extra)
  }

  const handleUpdateItem = async (itemId: string, patch: Partial<SpaceItem>) => {
    await onUpdateItem(itemId, patch)
  }

  const renderSubtaskRow = (subtask: SpaceItem) => (
    <SpaceListDndGroupChromeRow
      key={subtask.id}
      listActiveId={listDndActiveId}
      allowInto={false}
      surface="list"
      tableRowLabel={null}
      item={subtask}
      visibleFields={displayCols}
      allFields={allFieldsForRows}
      roster={roster}
      currentUserId={currentUserId}
      onUpdateItem={handleUpdateItem}
      onPushToAgent={onPushToAgent}
      onEditStatuses={onEditStatuses}
      onEditCategories={onEditCategories}
      onOpenDetail={onOpenTaskDetail}
      selected={selectedIds.has(subtask.id)}
      onToggleSelect={onToggleSelect}
      gridTemplateColumns={gridTemplateColumns}
      isSubtask
      subtaskPanelRow
      onCreateOption={onCreateOption}
      onUpdateOption={onUpdateOption}
      onDeleteOption={onDeleteOption}
      onTagCustomSwatchesChange={onTagCustomSwatchesChange}
      onDeleteItem={onDeleteItem}
    />
  )

  const subtaskQuickAdd = (
    <div className="w-full min-w-0">
      <SpaceQuickAdd
        roster={roster}
        currentUserId={currentUserId}
        allFields={allFields}
        displayCols={displayCols}
        gridTemplateColumns={gridTemplateColumns}
        onEditStatuses={onEditStatuses}
        addTaskLabel="Add subtask"
        inputPlaceholder="Subtask name"
        addRowAriaLabel="Add subtask"
        surface="subtaskPanel"
        onSubmitItem={handleSubmitSubtask}
      />
    </div>
  )

  return (
    <>
      {loading && openSubtasks.length === 0 && closedSubtasks.length === 0 && (
        <div className="py-2">
          <ListSkeleton rows={3} label="Loading..." />
        </div>
      )}

      <div className="scrollbar-thin w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
        <div className="flex flex-col" style={{ minWidth: subtaskTableMinWidthPx }}>
          {hasSubtaskRows && (
            <div className="sticky top-0 z-20 shrink-0 bg-[var(--color-card)]">
              <div className="group/spacehead flex min-w-max flex-col bg-[var(--color-card)]">
                <div className="flex min-w-max items-stretch">
                  <div className="relative sticky left-0 z-30 flex w-10 shrink-0 items-center self-stretch pb-1.5 pl-[21px] pt-1">
                    <div
                      className="pointer-events-none absolute inset-0 z-0 bg-[var(--color-card)]"
                      aria-hidden
                    />
                    {selectAllHeaderOn && selectAllInTitleColumn ? (
                      <div className="relative z-[1] shrink-0 opacity-100">
                        <SpaceListHeaderCheckbox
                          checked={selectAllInTitleColumn.checked}
                          indeterminate={selectAllInTitleColumn.indeterminate}
                          onToggle={selectAllInTitleColumn.onToggle}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 pr-4" style={{ width: subtaskGridWidthPx }}>
                    <DraggableColumnHeaders
                      visibleFields={displayCols}
                      columnWidths={columnWidths}
                      onColumnResize={onColumnResize}
                      onReorder={onReorderView}
                      onAddField={onOpenFieldsMenu}
                      listLayout="grouped"
                      compact
                      indented
                    />
                  </div>
                </div>
                <div className="flex min-w-max" aria-hidden>
                  <div className="sticky left-0 z-[35] h-[0.5px] w-10 shrink-0 bg-[var(--color-card)]" />
                  <div
                    className="mr-4 h-[0.5px] min-h-[0.5px] shrink-0 bg-[var(--border)]"
                    style={{ width: subtaskGridWidthPx }}
                  />
                </div>
              </div>
            </div>
          )}

          <DndContext
            sensors={dndSensors}
            collisionDetection={pointerWithin}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
          >
            <div
              className={
                hasSubtaskRows
                  ? 'flex-1 divide-y divide-[var(--border)]'
                  : 'flex flex-1 flex-col'
              }
              style={{ width: subtaskTableMinWidthPx }}
            >
              {openSubtasks.map((subtask) => renderSubtaskRow(subtask))}
              {subtaskQuickAdd}
            </div>

            {closedSubtasks.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={onToggleShowClosed}
                  className="body-3 mt-1 flex w-full min-w-0 items-center gap-1.5 px-4 py-1.5 text-left text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                >
                  {showClosed ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {showClosed ? 'Hide' : 'Show'} {closedSubtasks.length} closed
                </button>
                {showClosed && (
                  <div
                    className="flex-1 divide-y divide-[var(--border)]"
                    style={{ width: subtaskTableMinWidthPx }}
                  >
                    {closedSubtasks.map((subtask) => renderSubtaskRow(subtask))}
                  </div>
                )}
              </>
            )}
          </DndContext>
        </div>
      </div>
    </>
  )
}
