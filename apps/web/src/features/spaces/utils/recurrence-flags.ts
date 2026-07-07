import type { RecurrenceCloneInclude, RecurrenceSpec } from '../types'

export const DEFAULT_CLONE_INCLUDE: RecurrenceCloneInclude = {
  include_everything: true,
  description: true,
  assignee: true,
  priority: true,
  tags: true,
  custom_fields: true,
  subtasks: false,
}

export function isCreateNewTask(r: RecurrenceSpec): boolean {
  if (r.create_new_task !== undefined) return r.create_new_task
  return r.mode !== 'update_status'
}

export function isUpdateSameItem(r: RecurrenceSpec): boolean {
  if (r.update_same_item !== undefined) return r.update_same_item
  return r.mode === 'update_status'
}

export function forSave(r: RecurrenceSpec): RecurrenceSpec {
  const create_new_task = isCreateNewTask(r)
  const update_same_item = isUpdateSameItem(r)
  const { mode: _legacyMode, ...rest } = r
  return {
    ...rest,
    create_new_task,
    update_same_item,
  }
}

export function normalizeRecurrenceForEditor(
  r: RecurrenceSpec,
  defaultStatusId: string,
): RecurrenceSpec {
  const create_new_task = isCreateNewTask(r)
  const update_same_item = isUpdateSameItem(r)
  return {
    ...r,
    create_new_task,
    update_same_item,
    reset_status: r.reset_status ?? (update_same_item ? defaultStatusId : undefined),
    clone_include: r.clone_include ?? (create_new_task ? { ...DEFAULT_CLONE_INCLUDE } : undefined),
  }
}

export function withCloneIncludeEverything(
  c: RecurrenceCloneInclude,
  on: boolean,
): RecurrenceCloneInclude {
  if (!on) {
    return {
      include_everything: false,
      description: c.description,
      assignee: c.assignee,
      priority: c.priority,
      tags: c.tags,
      custom_fields: c.custom_fields,
      subtasks: c.subtasks,
    }
  }
  return {
    include_everything: true,
    description: true,
    assignee: true,
    priority: true,
    tags: true,
    custom_fields: true,
    subtasks: true,
  }
}
