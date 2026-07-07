'use client'

import { useMemo, useState } from 'react'
import type { TeamRosterEntry } from '@/lib/team'
import type { MissionSendOptions } from '../cells/MissionSendDropdown'
import type { SpaceItem } from '../../types'
import {
  DEFAULT_TASK_VISIBLE_FIELD_IDS,
  isSpaceFieldVisibleInUi,
  type FieldDef,
  type SelectOption,
  type SpaceSchema,
  type ViewDef,
} from '../../types/space-schema'
import { readFieldValue } from '../space-item-values'
import { TaskMetaCoreFields } from './TaskMetaCoreFields'
import { TaskMetaExtraFields } from './TaskMetaExtraFields'
import {
  CORE_FIELD_IDS,
  resolveAssignees,
  type TaskMetaAssigneeValue,
} from './task-meta-fields-helpers'

interface TaskMetaFieldsProps {
  item: SpaceItem
  activeView: ViewDef
  spaceSchema: SpaceSchema
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  onUpdateField: (patch: Partial<SpaceItem>) => void
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onPushToAgent?: (itemId: string, options?: MissionSendOptions) => Promise<void>
}

export function TaskMetaFields({
  item,
  activeView,
  allFields,
  roster,
  currentUserId,
  onUpdateField,
  onEditStatuses,
  onEditCategories,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onPushToAgent,
}: TaskMetaFieldsProps) {
  const [expanded, setExpanded] = useState(false)

  const statusField = useMemo(() => allFields.find((f) => f.id === 'status'), [allFields])
  const priorityField = useMemo(() => allFields.find((f) => f.id === 'priority'), [allFields])
  const categoryField = useMemo(() => allFields.find((f) => f.id === 'category'), [allFields])
  const tagsField = useMemo(() => allFields.find((f) => f.id === 'tags'), [allFields])

  const resolvedVisibleOrder = useMemo(() => {
    return activeView.visible_fields ?? [...DEFAULT_TASK_VISIBLE_FIELD_IDS]
  }, [activeView.visible_fields])

  const extraFields = useMemo(() => {
    const extras = allFields.filter((f) => !CORE_FIELD_IDS.has(f.id) && isSpaceFieldVisibleInUi(f))
    const orderIndex = new Map(resolvedVisibleOrder.map((id, i) => [id, i]))
    return extras.sort((a, b) => (orderIndex.get(a.id) ?? 9999) - (orderIndex.get(b.id) ?? 9999))
  }, [allFields, resolvedVisibleOrder])

  const statusValue = readFieldValue(item, 'status') as string
  const priorityValue = readFieldValue(item, 'priority') as string | null
  const categoryRaw = readFieldValue(item, 'category')
  const categoryValue = typeof categoryRaw === 'string' ? categoryRaw : null
  const assigneeValue = readFieldValue(item, 'assignee') as TaskMetaAssigneeValue[]
  const tagsValue = readFieldValue(item, 'tags')

  const statusOption = useMemo(
    () => statusField?.options?.find((o) => o.id === statusValue) ?? null,
    [statusField, statusValue],
  )
  const priorityOption = useMemo(
    () => (priorityField?.options ?? []).find((o) => o.id === priorityValue) ?? null,
    [priorityField, priorityValue],
  )
  const categoryOption = useMemo(
    () => (categoryField?.options ?? []).find((o) => o.id === categoryValue) ?? null,
    [categoryField, categoryValue],
  )
  const assigneeEntries = useMemo(
    () => resolveAssignees(assigneeValue, roster),
    [assigneeValue, roster],
  )
  const tagsArray = useMemo(() => {
    if (!Array.isArray(tagsValue)) return []
    const opts = tagsField?.options ?? []
    return (tagsValue as string[])
      .map((id) => opts.find((o) => o.id === id))
      .filter(Boolean) as SelectOption[]
  }, [tagsValue, tagsField])

  const hasDateOrRecurrence = Boolean(item.start_date || item.due_date || item.recurrence)

  return (
    <div className="group/meta relative flex-shrink-0">
      <TaskMetaCoreFields
        item={item}
        statusField={statusField}
        statusValue={statusValue}
        statusOption={statusOption}
        priorityField={priorityField}
        priorityValue={priorityValue}
        priorityOption={priorityOption}
        categoryField={categoryField}
        categoryValue={categoryValue}
        categoryOption={categoryOption}
        assigneeValue={assigneeValue}
        assigneeEntries={assigneeEntries}
        tagsField={tagsField}
        tagsValue={tagsValue}
        tagsArray={tagsArray}
        hasDateOrRecurrence={hasDateOrRecurrence}
        roster={roster}
        currentUserId={currentUserId}
        onUpdateField={onUpdateField}
        onEditStatuses={onEditStatuses}
        onEditCategories={onEditCategories}
        onCreateOption={onCreateOption}
        onUpdateOption={onUpdateOption}
        onDeleteOption={onDeleteOption}
        onTagCustomSwatchesChange={onTagCustomSwatchesChange}
      />

      <TaskMetaExtraFields
        expanded={expanded}
        extraFields={extraFields}
        item={item}
        allFields={allFields}
        roster={roster}
        currentUserId={currentUserId}
        onToggleExtraFields={() => setExpanded((e) => !e)}
        onUpdateField={onUpdateField}
        onEditStatuses={onEditStatuses}
        onEditCategories={onEditCategories}
        onCreateOption={onCreateOption}
        onUpdateOption={onUpdateOption}
        onDeleteOption={onDeleteOption}
        onTagCustomSwatchesChange={onTagCustomSwatchesChange}
        onPushToAgent={onPushToAgent}
      />
    </div>
  )
}
