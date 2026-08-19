'use client'

import { Calendar, Flag, Tag, User, X } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team'
import type { SpaceItem } from '../../types'
import type { FieldDef, SelectOption } from '../../types/space-schema'
import { AssigneeCell } from '../cells/AssigneeCell'
import { DueDateCell } from '../cells/DueDateCell'
import { MultiSelectCell } from '../cells/MultiSelectCell'
import { ResponsiveTagChips } from '../cells/ResponsiveTagChips'
import { SelectCell } from '../cells/SelectCell'
import { OptionDot } from '../OptionBadge'
import { toFieldPatch } from '../space-item-values'
import { TaskMetaStatusField } from './TaskMetaStatusField'
import {
  CELL,
  CELL_CLEAR,
  CELL_EMPTY,
  FLAG_COLOR,
  TASK_META_GRID_STYLE,
  type TaskMetaAssigneeValue,
} from './task-meta-fields-helpers'

interface TaskMetaCoreFieldsProps {
  item: SpaceItem
  statusField: FieldDef | undefined
  statusValue: string
  statusOption: SelectOption | null
  priorityField: FieldDef | undefined
  priorityValue: string | null
  priorityOption: SelectOption | null
  categoryField: FieldDef | undefined
  categoryValue: string | null
  categoryOption: SelectOption | null
  assigneeValue: TaskMetaAssigneeValue[]
  assigneeEntries: TeamRosterEntry[]
  tagsField: FieldDef | undefined
  tagsValue: unknown
  tagsArray: SelectOption[]
  hasDateOrRecurrence: boolean
  roster: TeamRosterEntry[]
  currentUserId: string | null
  onUpdateField: (patch: Partial<SpaceItem>) => void
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
}

export function TaskMetaCoreFields({
  item,
  statusField,
  statusValue,
  statusOption,
  priorityField,
  priorityValue,
  priorityOption,
  categoryField,
  categoryValue,
  categoryOption,
  assigneeValue,
  assigneeEntries,
  tagsField,
  tagsValue,
  tagsArray,
  hasDateOrRecurrence,
  roster,
  currentUserId,
  onUpdateField,
  onEditStatuses,
  onEditCategories,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
}: TaskMetaCoreFieldsProps) {
  return (
    <div className="grid gap-x-3 gap-y-0.5" style={TASK_META_GRID_STYLE}>
      <span className="body-2 flex items-center text-[var(--color-muted-foreground)]">
        Status
      </span>
      <div className="flex items-center">
        <TaskMetaStatusField
          item={item}
          statusField={statusField}
          statusValue={statusValue}
          statusOption={statusOption}
          onUpdateField={onUpdateField}
          onEditStatuses={onEditStatuses}
        />
      </div>

      <span className="body-2 flex items-center text-[var(--color-muted-foreground)]">
        Assignee
      </span>
      <div className="flex items-center">
        {assigneeEntries.length > 0 ? (
          <div className={CELL}>
            <AssigneeCell
              value={assigneeValue}
              roster={roster}
              currentUserId={currentUserId}
              onChange={(next) => onUpdateField(toFieldPatch(item, 'assignee', next))}
              customTrigger={
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex shrink-0 -space-x-1">
                    {assigneeEntries.slice(0, 3).map((assigneeEntry) =>
                      assigneeEntry.avatar_url ? (
                        <img
                          key={assigneeEntry.participant_id}
                          src={assigneeEntry.avatar_url}
                          alt={assigneeEntry.display_name}
                          className="h-5 w-5 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          key={assigneeEntry.participant_id}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-[9px] font-semibold text-[var(--foreground)]"
                        >
                          {assigneeEntry.display_name.charAt(0).toUpperCase()}
                        </span>
                      ),
                    )}
                  </span>
                  <span className="body-2 truncate text-[var(--color-foreground)]">
                    {assigneeEntries.length === 1
                      ? currentUserId && assigneeEntries[0]!.user_id === currentUserId
                        ? 'Me'
                        : assigneeEntries[0]!.display_name
                      : `${assigneeEntries.length} assignees`}
                  </span>
                </span>
              }
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onUpdateField(toFieldPatch(item, 'assignee', []))
              }}
              className={CELL_CLEAR}
              aria-label="Clear assignee"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <AssigneeCell
            value={assigneeValue}
            roster={roster}
            currentUserId={currentUserId}
            onChange={(next) => onUpdateField(toFieldPatch(item, 'assignee', next))}
            customTrigger={
              <span className={CELL_EMPTY}>
                <User className="h-3.5 w-3.5" />
                <span className="body-2">Empty</span>
              </span>
            }
          />
        )}
      </div>

      <span className="body-2 flex items-center text-[var(--color-muted-foreground)]">
        Priority
      </span>
      <div className="flex items-center">
        {priorityField &&
          (priorityOption ? (
            <div
              className={`${CELL} ${FLAG_COLOR[priorityOption.color ?? ''] ?? 'text-[var(--color-muted-foreground)]'}`}
            >
              <SelectCell
                field={priorityField}
                value={priorityValue}
                onChange={(next) => onUpdateField(toFieldPatch(item, 'priority', next))}
                customTrigger={
                  <span className="flex min-w-0 items-center gap-2">
                    <Flag className="h-3.5 w-3.5" />
                    <span className="body-2 truncate">{priorityOption.label}</span>
                  </span>
                }
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdateField({ priority: null })
                }}
                className={CELL_CLEAR}
                aria-label="Clear priority"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <SelectCell
              field={priorityField}
              value={priorityValue}
              onChange={(next) => onUpdateField(toFieldPatch(item, 'priority', next))}
              customTrigger={
                <span className={CELL_EMPTY}>
                  <Flag className="h-3.5 w-3.5" />
                  <span className="body-2">Empty</span>
                </span>
              }
            />
          ))}
      </div>

      <span className="body-2 flex items-center text-[var(--color-muted-foreground)]">Dates</span>
      <div className="flex items-center">
        <div className={hasDateOrRecurrence ? CELL : 'flex w-full min-w-0 items-center'}>
          <DueDateCell
            value={{
              start_date: item.start_date,
              due_date: item.due_date,
              recurrence: item.recurrence,
            }}
            onChange={(patch) => {
              const updates: Partial<SpaceItem> = {}
              if ('due_date' in patch) updates.due_date = patch.due_date ?? null
              if ('start_date' in patch) updates.start_date = patch.start_date ?? null
              if ('recurrence' in patch) updates.recurrence = patch.recurrence ?? null
              onUpdateField(updates)
            }}
            statusField={statusField}
            onEditStatuses={onEditStatuses}
            customTrigger={
              hasDateOrRecurrence ? undefined : (
                <span className={CELL_EMPTY}>
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="body-2">Empty</span>
                </span>
              )
            }
          />
          {hasDateOrRecurrence && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onUpdateField({ start_date: null, due_date: null, recurrence: null })
              }}
              aria-label="Clear dates"
              className={CELL_CLEAR}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <span className="body-2 flex items-center text-[var(--color-muted-foreground)]">Tags</span>
      <div className="flex items-center">
        {tagsField ? (
          tagsArray.length > 0 ? (
            <div className={CELL}>
              <MultiSelectCell
                field={tagsField}
                value={tagsValue}
                onChange={(next) => onUpdateField(toFieldPatch(item, 'tags', next))}
                onCreateOption={onCreateOption}
                onUpdateOption={onUpdateOption}
                onDeleteOption={onDeleteOption}
                onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                customTrigger={<ResponsiveTagChips options={tagsArray} />}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdateField(toFieldPatch(item, 'tags', []))
                }}
                aria-label="Clear tags"
                className={CELL_CLEAR}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <MultiSelectCell
              field={tagsField}
              value={tagsValue}
              onChange={(next) => onUpdateField(toFieldPatch(item, 'tags', next))}
              onCreateOption={onCreateOption}
              onUpdateOption={onUpdateOption}
              onDeleteOption={onDeleteOption}
              onTagCustomSwatchesChange={onTagCustomSwatchesChange}
              customTrigger={
                <span className={CELL_EMPTY}>
                  <Tag className="h-3.5 w-3.5" />
                  <span className="body-2">Empty</span>
                </span>
              }
            />
          )
        ) : (
          <span className={CELL_EMPTY}>
            <Tag className="h-3.5 w-3.5" />
            <span className="body-2">Empty</span>
          </span>
        )}
      </div>

      <span className="body-2 flex items-center text-[var(--color-muted-foreground)]">
        Category
      </span>
      <div className="flex items-center">
        {categoryField ? (
          categoryOption ? (
            <div className={CELL}>
              <SelectCell
                field={categoryField}
                value={categoryValue}
                onChange={(next) => onUpdateField(toFieldPatch(item, 'category', next))}
                onEditCategories={onEditCategories}
                customTrigger={
                  <span className="flex min-w-0 items-center gap-2">
                    <OptionDot color={categoryOption.color} />
                    <span className="body-2 min-w-0 truncate text-[var(--color-foreground)]">
                      {categoryOption.label}
                    </span>
                  </span>
                }
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdateField(toFieldPatch(item, 'category', null))
                }}
                className={CELL_CLEAR}
                aria-label="Clear category"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <SelectCell
              field={categoryField}
              value={categoryValue}
              onChange={(next) => onUpdateField(toFieldPatch(item, 'category', next))}
              onEditCategories={onEditCategories}
              customTrigger={
                <span className={CELL_EMPTY}>
                  <OptionDot />
                  <span className="body-2">Empty</span>
                </span>
              }
            />
          )
        ) : (
          <span className={CELL_EMPTY}>
            <span className="body-2 text-[var(--color-muted-foreground)]">—</span>
          </span>
        )}
      </div>
    </div>
  )
}
