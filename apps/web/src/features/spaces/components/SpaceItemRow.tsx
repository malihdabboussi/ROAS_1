'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bot,
  ChevronRight,
  GitBranch,
  GripVertical,
  Link2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/tooltip'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import { ConfirmDialog } from '@/features/settings/components/settings-content/ConfirmDialog'
import { cn } from '@/lib/utils/cn'
import type { SpaceListDndDragHandleProps } from '../lib/space-list-dnd-types'
import type { SpaceItem } from '../types'
import type {
  DateDisplayFormat,
  DateDisplayFormats,
  FieldDef,
  SelectOption,
} from '../types/space-schema'
import { SelectCell } from './cells/SelectCell'
import { SpaceCell } from './cells/SpaceCell'
import { buildSpaceTaskChatDragPayload, readFieldValue, toFieldPatch } from './space-item-values'
import { SendTaskToAgentModal } from './task-detail/SendTaskToAgentModal'
import { TaskMenuDropdown } from './task-menu/TaskMenuDropdown'
import { TaskExecutionStatusIndicator } from './TaskExecutionStatusIndicator'

/** Same right-edge mask as `DraggableColumnHeaders` name column. */
const NAME_COL_RIGHT_MASK = {
  base: 'linear-gradient(to right, var(--background) 0, var(--background) max(0px, calc(100% - 4rem)), transparent 100%)',
  hover:
    'linear-gradient(to right, var(--color-hover-subtle) 0, var(--color-hover-subtle) max(0px, calc(100% - 4rem)), transparent 100%)',
  selected:
    'linear-gradient(to right, rgba(16, 185, 129, 0.18) 0, rgba(16, 185, 129, 0.18) max(0px, calc(100% - 4rem)), transparent 100%)',
} as const

/** Subtle green tint for the table cell the user last clicked (working focus). */
const TABLE_CELL_ACTIVE_BG = 'bg-emerald-500/10'

export interface SpaceItemRowProps {
  item: SpaceItem
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
  groupColor?: string
  onEditStatuses?: () => void
  onEditCategories?: () => void
  selected?: boolean
  onToggleSelect?: (itemId: string) => void
  gridTemplateColumns?: string
  subtaskCount?: number
  expanded?: boolean
  onToggleExpand?: () => void
  /** List grouped/ungrouped: hide chevron when subtasks are always shown (separate mode). */
  suppressSubtaskChevron?: boolean
  isSubtask?: boolean
  /** Interleaved separate subtasks: same left chrome as tasks (no indent, no branch column). */
  separateSubtaskFlushRow?: boolean
  /** Task modal subtasks panel: external grip column — skip nested subtask pl-5 indent. */
  subtaskPanelRow?: boolean
  onAddSubtask?: () => void
  dndDrag?: SpaceListDndDragHandleProps
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onDeleteItem?: (itemId: string) => void | Promise<void>
  /**
   * Task detail subtasks: keep the title + row action icons in a `w-fit` cluster so they
   * are not shoved to the right edge of a wide name column. List view must not set this.
   */
  taskPanelTightNameRow?: boolean
  surface?: 'list' | 'table'
  /** Public shared space: no edit, no DnD, no row actions. */
  readOnly?: boolean
  /**
   * If provided, replaces the leading status dot with this node and keeps the `status`
   * field visible inside the columns area (instead of filtering it out).
   * Used by the Docs list view to lead with the doc/file icon.
   */
  leadingItemSlot?: React.ReactNode
  /** When set (e.g. Docs list), row menu is delegated to the parent instead of TaskMenuDropdown. */
  onRowContextMenu?: (item: SpaceItem, position: { x: number; y: number }) => void
  dateDisplayFormat?: DateDisplayFormat
  dateDisplayFormats?: DateDisplayFormats
}

export const SpaceItemRow = memo(function SpaceItemRow({
  item,
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
  selected,
  onToggleSelect,
  gridTemplateColumns,
  subtaskCount = 0,
  expanded,
  onToggleExpand,
  suppressSubtaskChevron = false,
  isSubtask,
  separateSubtaskFlushRow = false,
  subtaskPanelRow = false,
  onAddSubtask,
  dndDrag,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onDeleteItem,
  taskPanelTightNameRow = false,
  surface = 'list',
  readOnly = false,
  leadingItemSlot,
  onRowContextMenu,
  dateDisplayFormat,
  dateDisplayFormats,
}: SpaceItemRowProps) {
  const [editingTitleInline, setEditingTitleInline] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sendToAgentOpen, setSendToAgentOpen] = useState(false)
  const [tableActiveFieldId, setTableActiveFieldId] = useState<string | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const titleCellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTableActiveFieldId(null)
  }, [item.id])

  useEffect(() => {
    if (surface !== 'table') return
    const onDocPointerDown = (e: PointerEvent) => {
      const root = rowRef.current
      if (!root || !(e.target instanceof Node)) return
      if (!root.contains(e.target)) setTableActiveFieldId(null)
    }
    document.addEventListener('pointerdown', onDocPointerDown, true)
    return () => document.removeEventListener('pointerdown', onDocPointerDown, true)
  }, [surface])
  const statusField = useMemo(() => allFields.find((f) => f.id === 'status'), [allFields])
  const statusValue = readFieldValue(item, 'status')
  const statusOption = useMemo(
    () => statusField?.options?.find((o) => o.id === statusValue) ?? null,
    [statusField, statusValue],
  )
  const isAgentWorking = item.task_execution_status === 'running'
  const statusTrigger = (
    <TaskExecutionStatusIndicator color={statusOption?.color} active={isAgentWorking} size="sm" />
  )

  const displayFields = useMemo(
    () => (leadingItemSlot ? visibleFields : visibleFields.filter((f) => f.id !== 'status')),
    [visibleFields, leadingItemSlot],
  )

  const listRow = 'bg-gradient-to-br from-emerald-500/15 via-emerald-400/18 to-emerald-600/10'

  const showChevron = !isSubtask && !suppressSubtaskChevron
  const chevronAlwaysVisible = subtaskCount > 0 || expanded

  const titleCellReadonly = readOnly || (!!onOpenDetail && !editingTitleInline)

  const showNameColBaseMask = groupColor || !selected

  return (
    <>
      <div
        ref={rowRef}
        className={cn(
          'group grid items-stretch gap-0',
          groupColor ? '' : 'transition-colors',
          groupColor ? 'min-w-0 flex-1' : surface === 'table' ? 'min-w-0 flex-1' : 'px-4',
          !groupColor && !selected && surface !== 'table'
            ? 'hover:bg-[var(--color-hover-subtle)]'
            : '',
          !groupColor && selected ? listRow : '',
          onOpenDetail ? 'cursor-pointer' : '',
        )}
        style={{
          gridTemplateColumns:
            gridTemplateColumns ??
            `${displayFields.map(() => 'minmax(0,1fr)').join(' ')} minmax(2rem, 1fr)`,
        }}
        onClick={(e) => {
          if (readOnly || !onOpenDetail) return
          const target = e.target as HTMLElement
          if (target.closest('button, a, input, select, [data-dropdown], [data-cell]')) return
          onOpenDetail(item)
        }}
        onContextMenu={(e) => {
          if (readOnly) return
          e.preventDefault()
          if (onRowContextMenu) {
            onRowContextMenu(item, { x: e.clientX, y: e.clientY })
            return
          }
          setContextMenuPos({ x: e.clientX, y: e.clientY })
        }}
      >
        {displayFields.map((field) => {
          if (field.id === 'title') {
            const actionButtonGroup =
              !readOnly &&
              (onRowContextMenu ? (
                <Tooltip label="Doc options" side="top">
                  <span className="inline-flex">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        onRowContextMenu(item, { x: rect.right, y: rect.bottom })
                      }}
                      className="btn-icon-glass-sm !h-[18px] !w-[18px] !rounded-[4px]"
                      aria-label="Doc options"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </button>
                  </span>
                </Tooltip>
              ) : (
                <>
                  {onAddSubtask && !isSubtask && (
                    <Tooltip label="Add subtask" side="top">
                      <span className="inline-flex">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAddSubtask()
                          }}
                          className="btn-icon-glass-sm !h-[18px] !w-[18px] !rounded-[4px]"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </span>
                    </Tooltip>
                  )}
                  <Tooltip label="Attach to ROAS chat" side="top">
                    <span className="inline-flex">
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          const { id, label } = buildSpaceTaskChatDragPayload(item)
                          window.dispatchEvent(
                            new CustomEvent('space-vibey:attach-task', { detail: { id, label } }),
                          )
                        }}
                        className="btn-icon-glass-sm !h-[18px] !w-[18px] !rounded-[4px]"
                        aria-label="Attach to ROAS chat"
                      >
                        <Link2 className="h-3 w-3" />
                      </button>
                    </span>
                  </Tooltip>
                  <Tooltip label="Send to agent" side="top">
                    <span className="inline-flex">
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSendToAgentOpen(true)
                        }}
                        className="btn-icon-glass-sm !h-[18px] !w-[18px] !rounded-[4px]"
                        aria-label="Send to agent"
                      >
                        <Bot className="h-3 w-3" />
                      </button>
                    </span>
                  </Tooltip>
                  <Tooltip label="Edit name" side="top">
                    <span className="inline-flex">
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingTitleInline(true)
                        }}
                        className="btn-icon-glass-sm !h-[18px] !w-[18px] !rounded-[4px]"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </span>
                  </Tooltip>
                  {onDeleteItem && (
                    <Tooltip label={isSubtask ? 'Delete subtask' : 'Delete task'} side="top">
                      <span className="inline-flex">
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteOpen(true)
                          }}
                          className="btn-icon-glass-sm !h-[18px] !w-[18px] !rounded-[4px] text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    </Tooltip>
                  )}
                </>
              ))
            return (
              <div
                key={`${item.id}:title`}
                className={cn(
                  'sticky flex min-w-0 items-stretch py-0.5',
                  surface === 'table'
                    ? cn(
                        'relative left-0 z-30 box-border min-h-[2.25rem] w-full min-w-0 border-r border-[var(--border)] px-2 py-1',
                        tableActiveFieldId === 'title'
                          ? cn(TABLE_CELL_ACTIVE_BG, 'transition-colors')
                          : !selected && 'transition-colors hover:bg-[var(--color-hover-subtle)]',
                      )
                    : groupColor
                      ? 'relative left-10 z-30 w-full min-w-0'
                      : 'left-0 z-30 w-full min-w-0',
                )}
                onPointerDown={(e) => {
                  if (surface !== 'table') return
                  if ((e.target as HTMLElement).closest('button, a, input, [data-dropdown]')) return
                  setTableActiveFieldId('title')
                }}
              >
                {surface !== 'table' && showNameColBaseMask && (
                  <div
                    className="pointer-events-none absolute inset-0 z-0 transition-none"
                    style={{ background: NAME_COL_RIGHT_MASK.base }}
                    aria-hidden
                  />
                )}
                {surface !== 'table' && !selected && (
                  <div
                    className={cn(
                      'pointer-events-none absolute inset-0 z-[1] opacity-0 transition-none',
                      groupColor ? 'group-hover/row:opacity-100' : 'group-hover:opacity-100',
                    )}
                    style={{ background: NAME_COL_RIGHT_MASK.hover }}
                    aria-hidden
                  />
                )}
                {surface !== 'table' && selected && (
                  <div
                    className="pointer-events-none absolute inset-0 z-[1] transition-none"
                    style={{ background: NAME_COL_RIGHT_MASK.selected }}
                    aria-hidden
                  />
                )}
                <div className={cn('relative z-[2] flex min-w-0 flex-1 items-center')}>
                  {/* Grouped: chevron -> gap -> status -> gap -> title */}
                  {groupColor && (
                    <div
                      className={`flex shrink-0 items-center gap-2.5 ${
                        isSubtask && !separateSubtaskFlushRow && !subtaskPanelRow
                          ? 'pl-5'
                          : 'pl-1.5'
                      }`}
                    >
                      {showChevron ? (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleExpand?.()
                          }}
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[var(--color-muted-foreground)] transition-all hover:text-[var(--foreground)] ${
                            chevronAlwaysVisible
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <ChevronRight
                            className={`h-3.5 w-3.5 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                          />
                        </button>
                      ) : (
                        <span className="inline-block w-4 shrink-0" />
                      )}
                    </div>
                  )}
                  {/* Flat: grip (dnd) -> checkbox -> chevron */}
                  {!groupColor && !readOnly && (onToggleSelect || dndDrag) && (
                    <div
                      className={`flex shrink-0 items-center gap-2.5 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                    >
                      {dndDrag ? (
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
                      )}
                      {onToggleSelect && (
                        <input
                          type="checkbox"
                          checked={selected}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation()
                            onToggleSelect(item.id)
                          }}
                          className="checkbox-glass-green shrink-0"
                          aria-label="Select row"
                        />
                      )}
                      {showChevron && (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleExpand?.()
                          }}
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[var(--color-muted-foreground)] transition-all hover:text-[var(--foreground)] ${
                            chevronAlwaysVisible
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <ChevronRight
                            className={`h-3.5 w-3.5 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                          />
                        </button>
                      )}
                      {/* Ungrouped nested subtasks: extra chevron-width spacers vs parent row. */}
                      {!showChevron && isSubtask && !separateSubtaskFlushRow && !onToggleSelect && (
                        <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
                      )}
                      {!showChevron && isSubtask && !separateSubtaskFlushRow && (
                        <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
                      )}
                    </div>
                  )}
                  {/* Flat nested subtask indent (not interleaved separate rows). */}
                  {!groupColor && isSubtask && !separateSubtaskFlushRow && (
                    <div className="inline-block w-1 shrink-0" />
                  )}
                  {taskPanelTightNameRow && !groupColor ? (
                    <div
                      ref={titleCellRef}
                      className="ml-2.5 flex min-h-0 w-full min-w-0 flex-1 items-center justify-start gap-2.5 self-stretch"
                    >
                      {leadingItemSlot ? (
                        <div className="shrink-0">{leadingItemSlot}</div>
                      ) : statusField ? (
                        <div className="shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                          {readOnly ? (
                            statusTrigger
                          ) : (
                            <SelectCell
                              field={statusField}
                              value={statusValue}
                              onChange={(next) => {
                                const patch = toFieldPatch(item, 'status', next)
                                void onUpdateItem(item.id, patch)
                              }}
                              onEditStatuses={onEditStatuses}
                              triggerInline
                              customTrigger={statusTrigger}
                            />
                          )}
                        </div>
                      ) : null}
                      <div className="flex w-max min-w-0 max-w-full items-center gap-1.5 self-stretch">
                        {isSubtask && separateSubtaskFlushRow && (
                          <GitBranch
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
                            aria-hidden
                          />
                        )}
                        <div className="min-w-0 max-w-full self-center overflow-hidden">
                          <SpaceCell
                            field={field}
                            value={readFieldValue(item, field.id)}
                            roster={roster}
                            currentUserId={currentUserId}
                            readonly={titleCellReadonly}
                            nameAsListOpenTarget={
                              !readOnly && !!onOpenDetail && !editingTitleInline
                            }
                            nameListHoverGroup={groupColor ? 'row' : 'self'}
                            listInlineEditActive={editingTitleInline}
                            onListInlineTitleEditEnd={() => setEditingTitleInline(false)}
                            onCreateOption={onCreateOption}
                            onUpdateOption={onUpdateOption}
                            onDeleteOption={onDeleteOption}
                            onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                            spaceItem={item}
                            onItemPatch={(p) => void onUpdateItem(item.id, p)}
                            statusField={statusField}
                            onEditStatuses={onEditStatuses}
                            onEditCategories={onEditCategories}
                            onOpenDetail={onOpenDetail}
                            onChange={(next) => {
                              const patch = toFieldPatch(item, field.id, next)
                              void onUpdateItem(item.id, patch)
                            }}
                            dateDisplayFormat={dateDisplayFormat}
                            dateDisplayFormats={dateDisplayFormats}
                          />
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5 pl-0.5 pr-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          {actionButtonGroup}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Status dot + title — consistent gap-2.5 */}
                      <div
                        ref={titleCellRef}
                        className="ml-2.5 flex w-full min-w-0 flex-1 items-center gap-2.5 self-stretch"
                      >
                        {leadingItemSlot ? (
                          <div className="shrink-0">{leadingItemSlot}</div>
                        ) : statusField ? (
                          <div onPointerDown={(e) => e.stopPropagation()}>
                            {readOnly ? (
                              statusTrigger
                            ) : (
                              <SelectCell
                                field={statusField}
                                value={statusValue}
                                onChange={(next) => {
                                  const patch = toFieldPatch(item, 'status', next)
                                  void onUpdateItem(item.id, patch)
                                }}
                                onEditStatuses={onEditStatuses}
                                triggerInline
                                customTrigger={statusTrigger}
                              />
                            )}
                          </div>
                        ) : null}
                        <div className="flex min-w-0 flex-1 items-center gap-1.5 self-center">
                          {isSubtask && separateSubtaskFlushRow && (
                            <GitBranch
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
                              aria-hidden
                            />
                          )}
                          <div className="min-w-0 flex-1 self-center">
                            <SpaceCell
                              field={field}
                              value={readFieldValue(item, field.id)}
                              roster={roster}
                              currentUserId={currentUserId}
                              readonly={titleCellReadonly}
                              nameAsListOpenTarget={
                                !readOnly && !!onOpenDetail && !editingTitleInline
                              }
                              nameListHoverGroup={groupColor ? 'row' : 'self'}
                              listInlineEditActive={editingTitleInline}
                              onListInlineTitleEditEnd={() => setEditingTitleInline(false)}
                              onCreateOption={onCreateOption}
                              onUpdateOption={onUpdateOption}
                              onDeleteOption={onDeleteOption}
                              onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                              spaceItem={item}
                              onItemPatch={(p) => void onUpdateItem(item.id, p)}
                              statusField={statusField}
                              onEditStatuses={onEditStatuses}
                              onEditCategories={onEditCategories}
                              onOpenDetail={onOpenDetail}
                              onChange={(next) => {
                                const patch = toFieldPatch(item, field.id, next)
                                void onUpdateItem(item.id, patch)
                              }}
                              dateDisplayFormat={dateDisplayFormat}
                              dateDisplayFormats={dateDisplayFormats}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-2 pr-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {actionButtonGroup}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          }
          return (
            <div
              key={`${item.id}:${field.id}`}
              className={cn(
                'min-w-0 cursor-pointer overflow-hidden',
                surface !== 'table' && 'space-cell-hover',
                surface === 'table' &&
                  cn(
                    'box-border flex min-h-[2.25rem] items-center border-r border-[var(--border)] px-2 py-1',
                    tableActiveFieldId === field.id
                      ? cn(TABLE_CELL_ACTIVE_BG, 'transition-colors')
                      : !selected && 'transition-colors hover:bg-[var(--color-hover-subtle)]',
                  ),
              )}
              data-cell
              onPointerDown={(e) => {
                e.stopPropagation()
                if (surface === 'table') setTableActiveFieldId(field.id)
              }}
              onClick={(e) => {
                e.stopPropagation()
                const btn = (e.currentTarget as HTMLElement).querySelector('button')
                if (btn && e.target === e.currentTarget) btn.click()
              }}
            >
              <SpaceCell
                field={field}
                value={readFieldValue(item, field.id)}
                roster={roster}
                currentUserId={currentUserId}
                readonly={readOnly}
                onEditStatuses={onEditStatuses}
                onEditCategories={onEditCategories}
                onCreateOption={onCreateOption}
                onUpdateOption={onUpdateOption}
                onDeleteOption={onDeleteOption}
                onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                spaceItem={item}
                onItemPatch={(p) => void onUpdateItem(item.id, p)}
                statusField={statusField}
                onPushToAgent={onPushToAgent}
                onOpenDetail={onOpenDetail}
                allFields={allFields}
                onChange={(next) => {
                  const patch = toFieldPatch(item, field.id, next)
                  void onUpdateItem(item.id, patch)
                }}
                dateDisplayFormat={dateDisplayFormat}
                dateDisplayFormats={dateDisplayFormats}
              />
            </div>
          )
        })}
        {surface === 'table' && (
          <div
            key={`${item.id}:grid-trail`}
            className={cn(
              'box-border min-h-[2.25rem] border-r border-[var(--border)] bg-[var(--background)]',
              tableActiveFieldId === '__trail__'
                ? cn(TABLE_CELL_ACTIVE_BG, 'transition-colors')
                : !selected && 'transition-colors hover:bg-[var(--color-hover-subtle)]',
            )}
            aria-hidden
            onPointerDown={(e) => {
              e.stopPropagation()
              setTableActiveFieldId('__trail__')
            }}
          />
        )}
      </div>
      {contextMenuPos && !readOnly && !onRowContextMenu ? (
        <TaskMenuDropdown
          task={item}
          pointerPosition={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
          onOpenDetail={onOpenDetail ? () => onOpenDetail(item) : undefined}
          onAddSubtask={onAddSubtask}
          subtaskCount={subtaskCount}
          onDelete={onDeleteItem ? () => setDeleteOpen(true) : undefined}
          roster={roster}
          allFields={allFields}
        />
      ) : null}
      {!readOnly && !onRowContextMenu && sendToAgentOpen ? (
        <SendTaskToAgentModal
          open={sendToAgentOpen}
          onClose={() => setSendToAgentOpen(false)}
          spaceItem={item}
          allFields={allFields}
          roster={roster}
          currentUserId={currentUserId}
          onSent={() => setSendToAgentOpen(false)}
        />
      ) : null}
      {onDeleteItem && !readOnly && !onRowContextMenu && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={isSubtask ? 'Delete subtask?' : 'Delete task?'}
          description={`Are you sure you want to delete "${item.title}"? This cannot be undone.`}
          confirmText="Delete"
          confirmDisabled={isDeleting}
          confirmingText="Deleting…"
          onConfirm={async () => {
            setIsDeleting(true)
            try {
              await Promise.resolve(onDeleteItem(item.id))
              setDeleteOpen(false)
              toast.success(isSubtask ? 'Subtask deleted' : 'Task deleted')
            } catch {
              toast.error('Failed to delete')
            } finally {
              setIsDeleting(false)
            }
          }}
        />
      )}
    </>
  )
})
