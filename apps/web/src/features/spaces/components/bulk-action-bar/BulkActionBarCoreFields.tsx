'use client'

import { Calendar, LayoutList, Tags, Users } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { cn } from '@/lib/utils/cn'
import type { SpaceItem } from '../../types'
import type { FieldDef, SelectOption } from '../../types/space-schema'
import { AssigneeCell } from '../cells/AssigneeCell'
import { DueDateCell } from '../cells/DueDateCell'
import { MultiSelectCell } from '../cells/MultiSelectCell'
import { SelectCell } from '../cells/SelectCell'
import { readFieldValue, toFieldPatch } from '../space-item-values'
import { BTN, bulkApply, toastResult } from './bulk-action-helpers'

export function BulkActionBarCoreFields({
  selectedIds,
  items,
  roster,
  currentUserId,
  firstItem,
  statusField,
  tagsField,
  onUpdateItem,
  onEditStatuses,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  setBusy,
}: {
  selectedIds: Set<string>
  items: SpaceItem[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  firstItem: SpaceItem
  statusField?: FieldDef
  tagsField?: FieldDef
  onUpdateItem: (
    id: string,
    patch: Partial<SpaceItem>,
    options?: { skipSubtaskCompleteConfirm?: boolean },
  ) => Promise<void>
  onEditStatuses?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  setBusy: (v: boolean) => void
}) {
  return (
    <>
      {statusField && (
        <SelectCell
          field={statusField}
          value={readFieldValue(firstItem, 'status')}
          onChange={(v) => {
            const id = String(v ?? 'todo')
            void (async () => {
              setBusy(true)
              const { total, failed } = await bulkApply(
                selectedIds,
                () => ({ status: id as SpaceItem['status'] }),
                onUpdateItem,
                items,
              )
              toastResult('Updated status for', total, failed)
              setBusy(false)
            })()
          }}
          customTrigger={
            <span className={cn(BTN, 'shrink-0')}>
              <LayoutList className="h-3.5 w-3.5" />
              Status
            </span>
          }
          triggerInline
          onEditStatuses={onEditStatuses}
        />
      )}

      <AssigneeCell
        value={
          readFieldValue(firstItem, 'assignee') as Array<{ type: 'human' | 'agent'; id: string }>
        }
        roster={roster}
        currentUserId={currentUserId}
        onChange={(next) => {
          void (async () => {
            setBusy(true)
            const { total, failed } = await bulkApply(
              selectedIds,
              (item) => toFieldPatch(item, 'assignee', next) as Partial<SpaceItem>,
              onUpdateItem,
              items,
            )
            toastResult('Updated assignee for', total, failed)
            setBusy(false)
          })()
        }}
        customTrigger={
          <span className={cn(BTN, 'shrink-0')}>
            <Users className="h-3.5 w-3.5" />
            Assignees
          </span>
        }
      />

      <DueDateCell
        value={{
          start_date: firstItem.start_date,
          due_date: firstItem.due_date,
          recurrence: firstItem.recurrence,
        }}
        onChange={async (patch) => {
          setBusy(true)
          const { total, failed } = await bulkApply(
            selectedIds,
            () => {
              const u: Partial<SpaceItem> = {}
              if ('due_date' in patch) u.due_date = patch.due_date ?? null
              if ('start_date' in patch) u.start_date = patch.start_date ?? null
              if ('recurrence' in patch) u.recurrence = patch.recurrence ?? null
              return u
            },
            onUpdateItem,
            items,
          )
          toastResult('Updated dates for', total, failed)
          setBusy(false)
        }}
        customTrigger={
          <span className={cn(BTN, 'shrink-0')}>
            <Calendar className="h-3.5 w-3.5" />
            Dates
          </span>
        }
        statusField={statusField}
        onEditStatuses={onEditStatuses}
      />

      {tagsField && (
        <MultiSelectCell
          field={tagsField}
          value={readFieldValue(firstItem, 'tags')}
          onChange={(v) => {
            void (async () => {
              setBusy(true)
              const { total, failed } = await bulkApply(
                selectedIds,
                (item) => toFieldPatch(item, 'tags', v) as Partial<SpaceItem>,
                onUpdateItem,
                items,
              )
              toastResult('Updated tags for', total, failed)
              setBusy(false)
            })()
          }}
          onCreateOption={onCreateOption}
          onUpdateOption={onUpdateOption}
          onDeleteOption={onDeleteOption}
          onTagCustomSwatchesChange={onTagCustomSwatchesChange}
          customTrigger={
            <span className={cn(BTN, 'shrink-0')}>
              <Tags className="h-3.5 w-3.5" />
              Tags
            </span>
          }
        />
      )}
    </>
  )
}
