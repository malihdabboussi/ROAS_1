'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import { cn } from '@/lib/utils/cn'
import type { GroupData } from '../lib/group-items'
import { spaceGroupBadgeChipProps } from '../lib/space-group-badge-glass'
import type { SpaceItem } from '../types'
import type {
  DateDisplayFormat,
  DateDisplayFormats,
  FieldDef,
  SelectOption,
  SubtasksDisplayMode,
} from '../types/space-schema'
import { AssigneeGroupHeaderTitle } from './AssigneeGroupHeaderTitle'
import { DraggableColumnHeaders, SpaceListHeaderCheckbox } from './DraggableColumnHeaders'
import type { ListColumnHeaderMenuConfig } from './list-column-header-menu'
import { OptionDot } from './OptionBadge'
import {
  GriplessHairline,
  GroupedRowGripColumn,
  SPACE_LIST_ROW_SELECTED_TINT,
} from './space-list-group-chrome'
import { SpaceItemRow } from './SpaceItemRow'
import { EmptyGroupListSentinel, GroupTopListSentinel } from './SpaceListDndListSentinels'
import { SpaceListDndShell, type SpaceListChatDragPayload } from './SpaceListDndRow'
import { SpaceQuickAdd } from './SpaceQuickAdd'

interface GroupSectionProps {
  group: GroupData
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
  onAddItem: (title: string, extra?: Record<string, unknown>) => Promise<void>
  groupByFieldId?: string
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onReorderColumns?: (newIds: string[]) => Promise<void>
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectGroupItems?: (itemIds: string[], select: boolean) => void
  columnWidths: Record<string, number>
  onColumnResize?: (fieldId: string, width: number) => void
  gridTemplateColumns: string
  subtaskCountMap: Record<string, number>
  expandedItems: Set<string>
  subtaskCache: Record<string, SpaceItem[]>
  onToggleExpand: (itemId: string) => void
  onCreateSubtask: (parentId: string, title: string) => Promise<void>
  onAddField?: () => void
  listDndActiveId: string | null
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onDeleteItem: (itemId: string) => void | Promise<void>
  surface?: 'list' | 'table'
  sharedTableHeader?: boolean
  /** Only the first group should be true: focuses inline add when space toolbar **+ Task** is used. */
  primaryToolbarFocusTarget?: boolean
  quickAddLabels?: { addTaskLabel?: string; inputPlaceholder?: string }
  quickAddInactiveAction?: (trigger: HTMLElement) => void
  subtasksDisplayMode?: SubtasksDisplayMode
  readOnly?: boolean
  listColumnHeaderMenu?: ListColumnHeaderMenuConfig
  /**
   * If provided, replaces each row's leading status dot with this node and keeps the `status`
   * field visible inside the columns area. Used by the Docs list view.
   */
  renderLeadingItemSlot?: (item: SpaceItem) => React.ReactNode
  getRowChatDragPayload?: (item: SpaceItem) => SpaceListChatDragPayload | null
  onRowContextMenu?: (item: SpaceItem, position: { x: number; y: number }) => void
  dateDisplayFormat?: DateDisplayFormat
  dateDisplayFormats?: DateDisplayFormats
}

export function GroupSection({
  group,
  visibleFields,
  allFields,
  roster,
  currentUserId,
  onUpdateItem,
  onPushToAgent,
  onOpenDetail,
  onAddItem,
  groupByFieldId,
  onEditStatuses,
  onEditCategories,
  onReorderColumns,
  selectedIds,
  onToggleSelect,
  onSelectGroupItems,
  columnWidths,
  onColumnResize,
  gridTemplateColumns,
  subtaskCountMap,
  expandedItems,
  subtaskCache,
  onToggleExpand,
  onCreateSubtask,
  onAddField,
  listDndActiveId,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onDeleteItem,
  surface = 'list',
  sharedTableHeader = false,
  primaryToolbarFocusTarget = false,
  quickAddLabels,
  quickAddInactiveAction,
  subtasksDisplayMode = 'collapsed',
  readOnly = false,
  listColumnHeaderMenu,
  renderLeadingItemSlot,
  getRowChatDragPayload,
  onRowContextMenu,
  dateDisplayFormat,
  dateDisplayFormats,
}: GroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [addingSubtaskId, setAddingSubtaskId] = useState<string | null>(null)

  const groupItemIds = useMemo(() => group.items.map((i) => i.id), [group.items])
  const groupAllSelected =
    groupItemIds.length > 0 && groupItemIds.every((id) => selectedIds?.has(id))
  const gSelCount = useMemo(
    () => groupItemIds.filter((id) => selectedIds?.has(id)).length,
    [groupItemIds, selectedIds],
  )
  const groupSomeSelected = gSelCount > 0 && !groupAllSelected

  /** Wrapper so SpaceQuickAdd can be reused inside groups: forwards both title and toolbar extras to onAddItem. */
  const handleQuickAddSubmit = useMemo(
    () => async (title: string, extra: Record<string, unknown>) => {
      await onAddItem(title, extra)
    },
    [onAddItem],
  )

  const groupChip = spaceGroupBadgeChipProps(group.color)
  const showGroupByFieldOptionsMenu =
    (groupByFieldId === 'status' && !!onEditStatuses) ||
    (groupByFieldId === 'category' && !!onEditCategories)

  return (
    <div
      className={cn(
        surface === 'table' &&
          cn(
            'rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm dark:shadow-none',
            sharedTableHeader ? 'px-0 py-0' : 'p-2',
          ),
      )}
    >
      {sharedTableHeader && surface === 'table' ? (
        <div
          className={cn(
            'group/header card-glass sticky top-[2.25rem] z-[15] flex min-h-[2.25rem] w-full min-w-0 shrink-0 items-center gap-2 px-2',
            'rounded-b-none rounded-t-xl border-x-0 border-b border-t-0 border-[var(--border)] shadow-none',
          )}
        >
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform duration-150 ${collapsed ? '' : 'rotate-90'}`}
            />
          </button>
          {groupByFieldId === 'assignee' ? (
            <AssigneeGroupHeaderTitle
              label={group.label}
              avatarUrl={group.assigneeAvatarUrl}
              isUnassigned={group.key === '__unassigned__'}
            />
          ) : (
            <span
              className={`rounded-spacing-2 inline-flex shrink-0 items-center px-2.5 py-0.5 text-xs font-normal uppercase tracking-wider ${groupChip.chipClassName}`}
              style={groupChip.style}
            >
              {group.label}
            </span>
          )}
          <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
            {group.items.length}
          </span>
          {showGroupByFieldOptionsMenu && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (groupByFieldId === 'status') onEditStatuses?.()
                else onEditCategories?.()
              }}
              className="ml-auto shrink-0 rounded p-1 text-[var(--color-muted-foreground)] opacity-0 transition-opacity hover:text-[var(--foreground)] group-hover/header:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'group/header sticky left-0 top-0 z-10 flex w-full min-w-0 shrink-0 items-center gap-2 bg-[var(--background)] py-2',
            surface === 'table' ? 'px-0' : 'px-4',
          )}
        >
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="shrink-0 rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform duration-150 ${collapsed ? '' : 'rotate-90'}`}
            />
          </button>
          {groupByFieldId === 'assignee' ? (
            <AssigneeGroupHeaderTitle
              label={group.label}
              avatarUrl={group.assigneeAvatarUrl}
              isUnassigned={group.key === '__unassigned__'}
            />
          ) : (
            <span
              className={`rounded-spacing-2 inline-flex items-center px-2.5 py-0.5 text-xs font-normal uppercase tracking-wider ${groupChip.chipClassName}`}
              style={groupChip.style}
            >
              {group.label}
            </span>
          )}
          <span className="text-xs text-[var(--color-muted-foreground)]">{group.items.length}</span>

          {showGroupByFieldOptionsMenu && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (groupByFieldId === 'status') onEditStatuses?.()
                else onEditCategories?.()
              }}
              className="ml-auto shrink-0 rounded p-1 text-[var(--color-muted-foreground)] opacity-0 transition-opacity hover:text-[var(--foreground)] group-hover/header:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {!collapsed && (
        <div className="flex flex-col">
          {!(sharedTableHeader && surface === 'table') && (
            <div className="group/spacehead sticky left-0 z-30 flex w-full min-w-0 flex-col bg-[var(--background)]">
              <div
                className={cn(
                  'flex w-full min-w-0 items-stretch',
                  surface === 'table' && 'border-b border-[var(--border)]',
                )}
              >
                <div
                  className={cn(
                    'relative sticky left-0 z-30 flex w-10 shrink-0 items-center pb-1.5 pl-[21px] pt-1',
                    surface === 'table' &&
                      'bg-[var(--color-hover-subtle)]/45 box-border min-h-[2.25rem] justify-center py-0 pl-0',
                  )}
                >
                  <div
                    className="pointer-events-none absolute inset-0 z-0 bg-[var(--background)]"
                    aria-hidden
                  />
                  {surface === 'table' && (
                    <div
                      className="bg-[var(--color-hover-subtle)]/45 pointer-events-none absolute inset-0 z-0"
                      aria-hidden
                    />
                  )}
                  {onSelectGroupItems && groupItemIds.length > 0 && (
                    <div
                      className={cn(
                        'relative z-[1] shrink-0 transition-opacity duration-0',
                        groupAllSelected || groupSomeSelected
                          ? 'opacity-100'
                          : surface === 'table'
                            ? 'opacity-100'
                            : 'opacity-0 group-hover/spacehead:opacity-100',
                      )}
                    >
                      <SpaceListHeaderCheckbox
                        checked={groupAllSelected}
                        indeterminate={groupSomeSelected}
                        onToggle={() => {
                          if (groupAllSelected) onSelectGroupItems(groupItemIds, false)
                          else onSelectGroupItems(groupItemIds, true)
                        }}
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
                    visibleFields={visibleFields}
                    listLayout="grouped"
                    compact
                    indented
                    columnWidths={columnWidths}
                    onColumnResize={onColumnResize}
                    onReorder={async (newIds) => {
                      await onReorderColumns?.(newIds)
                    }}
                    onAddField={onAddField}
                    surface={surface}
                    readOnly={readOnly}
                    listColumnHeaderMenu={listColumnHeaderMenu}
                  />
                </div>
              </div>
              {surface !== 'table' && (
                <div className="flex w-full min-w-0" aria-hidden>
                  <div className="sticky left-0 z-[35] h-[0.5px] w-10 shrink-0 bg-[var(--background)]" />
                  <div className="mr-4 h-[0.5px] min-h-[0.5px] min-w-0 flex-1 bg-[var(--border)]" />
                </div>
              )}
            </div>
          )}

          {group.items.length > 0 && (
            <GroupTopListSentinel listActiveId={listDndActiveId} firstItemId={group.items[0]!.id} />
          )}

          {group.items.length === 0 && listDndActiveId && (
            <EmptyGroupListSentinel listActiveId={listDndActiveId} groupKey={group.key} />
          )}

          <div className="flex flex-col">
            {group.items.map((item, index) => {
              const isFirst = index === 0
              const isSelected = selectedIds?.has(item.id) ?? false
              const isExpanded = expandedItems.has(item.id)
              const subCount = subtaskCountMap[item.id] ?? 0
              const subtasks = subtaskCache[item.id] ?? []
              const subBlockOpen =
                subtasksDisplayMode === 'separate' && subCount > 0 ? true : isExpanded
              const suppressSubtaskChevron = subtasksDisplayMode === 'separate' && subCount > 0

              return (
                <div key={item.id}>
                  <SpaceListDndShell
                    itemId={item.id}
                    listActiveId={listDndActiveId}
                    allowInto
                    chatDragPayload={getRowChatDragPayload?.(item)}
                  >
                    {(dnd) => (
                      <div className="group/row relative">
                        <div
                          className={cn(
                            'pointer-events-none absolute inset-0 transition-none',
                            isSelected
                              ? SPACE_LIST_ROW_SELECTED_TINT
                              : surface !== 'table' &&
                                  'group-hover/row:bg-[var(--color-hover-subtle)]',
                          )}
                        />

                        {surface !== 'table' && (
                          <>
                            <GriplessHairline
                              edge="top"
                              isSelected={isSelected}
                              group="row"
                              className={cn(
                                'transition-none',
                                isFirst && 'opacity-0 group-hover/row:opacity-100',
                              )}
                            />
                            <GriplessHairline
                              edge="bottom"
                              isSelected={isSelected}
                              group="row"
                              className="transition-none"
                            />
                          </>
                        )}

                        <div
                          className={cn(
                            'relative flex items-stretch',
                            surface === 'table' && 'border-b border-[var(--border)]',
                          )}
                        >
                          <GroupedRowGripColumn
                            itemId={item.id}
                            isSelected={isSelected}
                            onToggleSelect={readOnly ? undefined : onToggleSelect}
                            dndDrag={dnd}
                            surface={surface}
                            tableRowLabel={surface === 'table' ? index + 1 : null}
                            hideGrip={readOnly}
                            reserveLayoutOnly={readOnly}
                          />

                          <div className={cn('flex-1', surface !== 'table' && 'pr-4')}>
                            <SpaceItemRow
                              item={item}
                              visibleFields={visibleFields}
                              allFields={allFields}
                              roster={roster}
                              currentUserId={currentUserId}
                              onUpdateItem={onUpdateItem}
                              onPushToAgent={onPushToAgent}
                              onOpenDetail={onOpenDetail}
                              groupColor={group.color}
                              onEditStatuses={onEditStatuses}
                              onEditCategories={onEditCategories}
                              selected={isSelected}
                              onToggleSelect={onToggleSelect}
                              gridTemplateColumns={gridTemplateColumns}
                              subtaskCount={subCount}
                              expanded={subBlockOpen}
                              suppressSubtaskChevron={suppressSubtaskChevron}
                              onToggleExpand={() => void onToggleExpand(item.id)}
                              onAddSubtask={() => {
                                setAddingSubtaskId(item.id)
                                if (!isExpanded && subtasksDisplayMode !== 'separate')
                                  void onToggleExpand(item.id)
                              }}
                              onCreateOption={onCreateOption}
                              onUpdateOption={onUpdateOption}
                              onDeleteOption={onDeleteOption}
                              onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                              onDeleteItem={onDeleteItem}
                              surface={surface}
                              readOnly={readOnly}
                              leadingItemSlot={renderLeadingItemSlot?.(item)}
                              onRowContextMenu={onRowContextMenu}
                              dateDisplayFormat={dateDisplayFormat}
                              dateDisplayFormats={dateDisplayFormats}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </SpaceListDndShell>

                  {subBlockOpen && (
                    <SubtaskBlock
                      parentId={item.id}
                      subtasks={subtasks}
                      visibleFields={visibleFields}
                      allFields={allFields}
                      roster={roster}
                      currentUserId={currentUserId}
                      onUpdateItem={onUpdateItem}
                      onPushToAgent={onPushToAgent}
                      onOpenDetail={onOpenDetail}
                      groupColor={group.color}
                      onEditStatuses={onEditStatuses}
                      onEditCategories={onEditCategories}
                      selectedIds={selectedIds}
                      onToggleSelect={onToggleSelect}
                      gridTemplateColumns={gridTemplateColumns}
                      onCreateSubtask={onCreateSubtask}
                      addingSubtask={addingSubtaskId === item.id}
                      onDoneAdding={() => setAddingSubtaskId(null)}
                      listDndActiveId={listDndActiveId}
                      onCreateOption={onCreateOption}
                      onUpdateOption={onUpdateOption}
                      onDeleteOption={onDeleteOption}
                      onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                      onDeleteItem={onDeleteItem}
                      surface={surface}
                      subtasksDisplayMode={subtasksDisplayMode}
                      readOnly={readOnly}
                      renderLeadingItemSlot={renderLeadingItemSlot}
                      getRowChatDragPayload={getRowChatDragPayload}
                      onRowContextMenu={onRowContextMenu}
                      dateDisplayFormat={dateDisplayFormat}
                      dateDisplayFormats={dateDisplayFormats}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {!readOnly && (
            <div className="group/add relative w-full min-w-0">
              {surface !== 'table' && (
                <GriplessHairline edge="top" group="add" className="transition-none" />
              )}
              <SpaceQuickAdd
                roster={roster}
                currentUserId={currentUserId}
                allFields={allFields}
                displayCols={visibleFields}
                gridTemplateColumns={gridTemplateColumns}
                onEditStatuses={onEditStatuses}
                surface={surface}
                acceptToolbarFocus={primaryToolbarFocusTarget}
                onSubmitItem={handleQuickAddSubmit}
                addTaskLabel={quickAddLabels?.addTaskLabel}
                inputPlaceholder={quickAddLabels?.inputPlaceholder}
                onInactiveActivate={quickAddInactiveAction}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SubtaskBlock({
  parentId,
  subtasks,
  visibleFields,
  allFields,
  roster,
  currentUserId,
  onUpdateItem,
  onPushToAgent,
  onOpenDetail,
  groupColor,
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
  subtasksDisplayMode = 'collapsed',
  readOnly: _readOnly = false,
  renderLeadingItemSlot,
  getRowChatDragPayload,
  onRowContextMenu,
  dateDisplayFormat,
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
  groupColor: string
  onEditStatuses?: () => void
  onEditCategories?: () => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
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
  subtasksDisplayMode?: SubtasksDisplayMode
  readOnly?: boolean
  renderLeadingItemSlot?: (item: SpaceItem) => React.ReactNode
  getRowChatDragPayload?: (item: SpaceItem) => SpaceListChatDragPayload | null
  onRowContextMenu?: (item: SpaceItem, position: { x: number; y: number }) => void
  dateDisplayFormat?: DateDisplayFormat
  dateDisplayFormats?: DateDisplayFormats
}) {
  const [value, setValue] = useState('')
  const [showInput, setShowInput] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayFields = useMemo(
    () => visibleFields.filter((f) => f.id !== 'status'),
    [visibleFields],
  )

  useEffect(() => {
    if (addingSubtask) {
      setShowInput(true)
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
    if (!value.trim()) {
      setShowInput(false)
      onDoneAdding?.()
    }
  }

  return (
    <>
      {subtasks.map((sub) => {
        const isSubSelected = selectedIds?.has(sub.id) ?? false
        return (
          <SpaceListDndShell
            key={sub.id}
            itemId={sub.id}
            listActiveId={listDndActiveId}
            allowInto={false}
            chatDragPayload={getRowChatDragPayload?.(sub)}
          >
            {(dnd) => (
              <div className="group/row relative">
                <div
                  className={cn(
                    'pointer-events-none absolute inset-0 transition-none',
                    isSubSelected
                      ? SPACE_LIST_ROW_SELECTED_TINT
                      : surface !== 'table' && 'group-hover/row:bg-[var(--color-hover-subtle)]',
                  )}
                />
                {surface !== 'table' && (
                  <>
                    <GriplessHairline
                      edge="top"
                      isSelected={isSubSelected}
                      group="row"
                      className="transition-none"
                    />
                    <GriplessHairline
                      edge="bottom"
                      isSelected={isSubSelected}
                      group="row"
                      className="transition-none"
                    />
                  </>
                )}
                <div
                  className={cn(
                    'relative flex items-stretch',
                    surface === 'table' && 'border-b border-[var(--border)]',
                  )}
                >
                  <GroupedRowGripColumn
                    itemId={sub.id}
                    isSelected={isSubSelected}
                    onToggleSelect={onToggleSelect}
                    dndDrag={dnd}
                    surface={surface}
                    tableRowLabel={null}
                  />
                  <div className={cn('flex-1', surface !== 'table' && 'pr-4')}>
                    <SpaceItemRow
                      item={sub}
                      visibleFields={visibleFields}
                      allFields={allFields}
                      roster={roster}
                      currentUserId={currentUserId}
                      onUpdateItem={onUpdateItem}
                      onPushToAgent={onPushToAgent}
                      onOpenDetail={onOpenDetail}
                      groupColor={groupColor}
                      onEditStatuses={onEditStatuses}
                      onEditCategories={onEditCategories}
                      selected={isSubSelected}
                      onToggleSelect={onToggleSelect}
                      gridTemplateColumns={gridTemplateColumns}
                      isSubtask
                      separateSubtaskFlushRow={subtasksDisplayMode === 'separate'}
                      onCreateOption={onCreateOption}
                      onUpdateOption={onUpdateOption}
                      onDeleteOption={onDeleteOption}
                      onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                      onDeleteItem={onDeleteItem}
                      surface={surface}
                      leadingItemSlot={renderLeadingItemSlot?.(sub)}
                      onRowContextMenu={onRowContextMenu}
                      dateDisplayFormat={dateDisplayFormat}
                      dateDisplayFormats={dateDisplayFormats}
                    />
                  </div>
                </div>
              </div>
            )}
          </SpaceListDndShell>
        )
      })}

      {showInput && (
        <div className="group/row relative">
          {surface !== 'table' && (
            <div className="pointer-events-none absolute inset-0 transition-none group-hover/row:bg-[var(--color-hover-subtle)]" />
          )}
          {surface !== 'table' && (
            <>
              <GriplessHairline edge="top" group="row" className="transition-none" />
              <GriplessHairline edge="bottom" group="row" className="transition-none" />
            </>
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
            <div className={cn('flex-1', surface !== 'table' && 'pr-4')}>
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
