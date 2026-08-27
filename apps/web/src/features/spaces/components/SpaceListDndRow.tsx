'use client'

import { useCallback, type ReactNode } from 'react'
import {
  useDraggable,
  useDroppable,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { listRowStatusField } from '@/lib/spaces/space-item-values'
import { cn } from '@/lib/utils/cn'
import type { SpaceListDndDragHandleProps } from '../lib/space-list-dnd-types'
import { SelectCell } from './cells/SelectCell'
import { readFieldValue, toFieldPatch } from './space-item-values'
import { GroupedRowGripColumn, SPACE_LIST_ROW_SELECTED_TINT } from './space-list-group-chrome'
import { SpaceItemRow, type SpaceItemRowProps } from './SpaceItemRow'
import { TaskExecutionStatusIndicator } from './TaskExecutionStatusIndicator'

export type { SpaceListDndDragHandleProps }

export type SpaceListChatDragPayload = { id: string; type: string; label: string }

const DROP_HAIRLINE =
  'linear-gradient(90deg, transparent 0%, rgb(59 130 246) 8%, rgb(59 130 246) 92%, transparent 100%)'

function dropId(itemId: string, z: 'before' | 'after' | 'into') {
  return `dnd:drop:${itemId}:${z}`
}

type ZoneProps = {
  id: string
  showLine: 'top' | 'bottom' | 'into'
  className?: string
}

function DropZone({ id, showLine, className }: ZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'space-list-drop' } })
  return (
    <div ref={setNodeRef} className={cn('relative w-full', className)}>
      {isOver && showLine === 'top' && (
        <div
          className="pointer-events-none absolute -top-px left-0 right-0 z-30 h-[2px]"
          style={{ background: DROP_HAIRLINE }}
          aria-hidden
        />
      )}
      {isOver && showLine === 'into' && (
        <div
          className="pointer-events-none absolute inset-0 z-20 rounded-md ring-2 ring-inset ring-blue-500/55"
          aria-hidden
        />
      )}
      {isOver && showLine === 'bottom' && (
        <div
          className="pointer-events-none absolute -bottom-px left-0 right-0 z-30 h-[2px]"
          style={{ background: DROP_HAIRLINE }}
          aria-hidden
        />
      )}
    </div>
  )
}

type SpaceListDndShellProps = {
  itemId: string
  listActiveId: string | null
  allowInto: boolean
  chatDragPayload?: SpaceListChatDragPayload | null
  children: (dnd: SpaceListDndDragHandleProps) => ReactNode
}

export function SpaceListDndShell({
  itemId,
  listActiveId,
  allowInto,
  chatDragPayload,
  children,
}: SpaceListDndShellProps) {
  const { setNodeRef, setActivatorNodeRef, transform, isDragging, listeners, attributes } =
    useDraggable({
      id: itemId,
      data: { type: 'space-item' },
    })
  const listDragging = listActiveId != null
  const isSourceRow = listActiveId === itemId

  const showDropOverlay = listDragging && !isSourceRow

  const childDnd: SpaceListDndDragHandleProps = {
    setActivatorNodeRef: () => {},
    dndAttributes: {} as DraggableAttributes,
    dndListeners: {} as DraggableSyntheticListeners,
  }

  const setShellRef = useCallback(
    (el: HTMLElement | null) => {
      setNodeRef(el)
      setActivatorNodeRef(el)
    },
    [setNodeRef, setActivatorNodeRef],
  )

  return (
    <div
      ref={setShellRef}
      draggable={!!chatDragPayload}
      onDragStart={
        chatDragPayload
          ? (e) => {
              e.dataTransfer.effectAllowed = 'copyMove'
              e.dataTransfer.setData(
                'application/x-vibey-artifact',
                JSON.stringify(chatDragPayload),
              )
              e.dataTransfer.setData('text/plain', itemId)
            }
          : undefined
      }
      {...(listeners ?? {})}
      {...attributes}
      className={cn(
        'relative',
        isDragging && 'z-[100] cursor-grabbing opacity-10 shadow-md ring-1 ring-blue-500/25',
      )}
      style={transform != null ? { transform: CSS.Translate.toString(transform) } : undefined}
    >
      {showDropOverlay && (
        <div
          className="pointer-events-auto absolute inset-0 z-[25] flex min-h-full flex-col"
          aria-hidden
        >
          {allowInto ? (
            <>
              <DropZone id={dropId(itemId, 'before')} showLine="top" className="min-h-2 flex-1" />
              <DropZone id={dropId(itemId, 'into')} showLine="into" className="min-h-5 shrink" />
              <DropZone id={dropId(itemId, 'after')} showLine="bottom" className="min-h-2 flex-1" />
            </>
          ) : (
            <>
              <DropZone id={dropId(itemId, 'before')} showLine="top" className="min-h-2 flex-1" />
              <DropZone id={dropId(itemId, 'after')} showLine="bottom" className="min-h-2 flex-1" />
            </>
          )}
        </div>
      )}
      {children(childDnd)}
    </div>
  )
}

type SpaceListDndRowProps = Omit<SpaceItemRowProps, 'dndDrag'> & {
  listActiveId: string | null
  allowInto: boolean
  readOnly?: boolean
  chatDragPayload?: SpaceListChatDragPayload | null
}

export function SpaceListDndRow({
  listActiveId,
  allowInto,
  readOnly,
  chatDragPayload,
  ...row
}: SpaceListDndRowProps) {
  if (readOnly) {
    return <SpaceItemRow {...row} readOnly dndDrag={undefined} />
  }
  return (
    <SpaceListDndShell
      itemId={row.item.id}
      listActiveId={listActiveId}
      allowInto={allowInto}
      chatDragPayload={chatDragPayload}
    >
      {(dnd) => <SpaceItemRow {...row} dndDrag={dnd} />}
    </SpaceListDndShell>
  )
}

/**
 * Same list chrome as grouped-by-field views: 40px grip + checkbox column, `SpaceItemRow` with
 * `groupColor` (title uses `left-10` + chevron row). Use for ungrouped list so subtasks match grouped alignment.
 */
type SpaceListDndGroupChromeRowProps = SpaceListDndRowProps & {
  groupColor?: string
  surface?: 'list' | 'table'
  tableRowLabel?: string | number | null
}

export function SpaceListDndGroupChromeRow({
  listActiveId,
  allowInto,
  groupColor = 'muted',
  surface = 'list',
  tableRowLabel,
  readOnly,
  chatDragPayload,
  ...row
}: SpaceListDndGroupChromeRowProps) {
  const isSelected = row.selected === true
  const statusField = listRowStatusField(row.allFields)
  const statusValue = readFieldValue(row.item, statusField?.id ?? 'status')
  const statusOption = statusField?.options?.find((option) => option.id === statusValue)
  const statusTrigger = (
    <TaskExecutionStatusIndicator
      color={statusOption?.color}
      active={row.item.task_execution_status === 'running'}
      size="sm"
    />
  )
  const statusControl = statusField ? (
    readOnly ? (
      statusTrigger
    ) : (
      <SelectCell
        field={statusField}
        value={statusValue}
        onChange={(next) => {
          const patch = toFieldPatch(row.item, statusField.id, next)
          void row.onUpdateItem(row.item.id, patch)
        }}
        onEditStatuses={row.onEditStatuses}
        triggerInline
        customTrigger={statusTrigger}
      />
    )
  ) : null

  const rowInner = (dnd: SpaceListDndDragHandleProps | undefined) => (
    <div className="group/row relative">
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-none',
          isSelected
            ? SPACE_LIST_ROW_SELECTED_TINT
            : surface !== 'table' && 'group-hover/row:bg-[var(--color-hover-subtle)]',
        )}
        aria-hidden
      />
      <div
        className={cn(
          'relative flex min-w-0 items-stretch',
          surface === 'table' && 'border-b border-[var(--border)]',
        )}
      >
        <GroupedRowGripColumn
          itemId={row.item.id}
          isSelected={isSelected}
          onToggleSelect={readOnly ? undefined : row.onToggleSelect}
          dndDrag={readOnly ? undefined : dnd}
          surface={surface}
          tableRowLabel={tableRowLabel}
          hideGrip={readOnly}
          reserveLayoutOnly={readOnly}
          showChevron={!row.isSubtask && !row.suppressSubtaskChevron}
          chevronAlwaysVisible={(row.subtaskCount ?? 0) > 0 || row.expanded}
          expanded={row.expanded}
          onToggleExpand={row.onToggleExpand}
          statusControl={statusControl}
        />
        <div className={cn('min-w-0 flex-1', surface !== 'table' && 'pr-4')}>
          <SpaceItemRow
            {...row}
            readOnly={readOnly}
            groupColor={groupColor}
            dndDrag={undefined}
            onToggleSelect={undefined}
            surface={surface}
            externalRowControls
          />
        </div>
      </div>
    </div>
  )

  if (readOnly) {
    return rowInner(undefined)
  }

  return (
    <SpaceListDndShell
      itemId={row.item.id}
      listActiveId={listActiveId}
      allowInto={allowInto}
      chatDragPayload={chatDragPayload}
    >
      {(dnd) => rowInner(dnd)}
    </SpaceListDndShell>
  )
}
