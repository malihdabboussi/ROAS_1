import { isTerminalStatusOption } from '@/lib/spaces/status-categories'
import { isSpaceItemConsideredClosed } from '../lib/apply-space-toolbar-filters'
import type { SpaceItem } from '../types'
import type { FieldDef } from '../types/space-schema'

export type SpaceItemUpdateOptions = {
  /** Skip the “also complete open subtasks?” confirm (bulk edits, internal cascades). */
  skipSubtaskCompleteConfirm?: boolean
}

export type SpaceItemUpdateFn = (
  itemId: string,
  payload: Partial<SpaceItem>,
  options?: SpaceItemUpdateOptions,
) => Promise<void>

/** True when this status id is a terminal (done/closed) option on the space schema. */
export function isTerminalStatusId(
  statusId: string | undefined,
  statusField: FieldDef | undefined,
): boolean {
  if (!statusId || !statusField?.options?.length) return false
  const option = statusField.options.find((o) => o.id === statusId)
  return option ? isTerminalStatusOption(option) : false
}

/** Open (non-terminal) direct children of `parentId`. */
export function listOpenSubtasks(
  items: SpaceItem[],
  parentId: string,
  statusField: FieldDef | undefined,
): SpaceItem[] {
  return items.filter(
    (item) =>
      item.parent_item_id === parentId && !isSpaceItemConsideredClosed(item, statusField),
  )
}

/**
 * Whether completing `parent` to `nextStatus` should ask about cascading to open subtasks.
 * Subtasks themselves never cascade (one-level tree).
 */
export function shouldConfirmCompleteOpenSubtasks(args: {
  parent: SpaceItem | undefined
  nextStatus: string | undefined
  openSubtasks: SpaceItem[]
  statusField: FieldDef | undefined
  skip?: boolean
}): boolean {
  const { parent, nextStatus, openSubtasks, statusField, skip } = args
  if (skip) return false
  if (!parent || parent.parent_item_id) return false
  if (!isTerminalStatusId(nextStatus, statusField)) return false
  return openSubtasks.length > 0
}

export function buildParentAndSubtaskStatusUpdates(
  parentId: string,
  parentPayload: Partial<SpaceItem>,
  openSubtaskIds: string[],
  alsoCompleteSubtasks: boolean,
): Array<{ itemId: string; payload: Partial<SpaceItem> }> {
  const updates: Array<{ itemId: string; payload: Partial<SpaceItem> }> = [
    { itemId: parentId, payload: parentPayload },
  ]
  if (!alsoCompleteSubtasks) return updates
  const status = parentPayload.status
  if (typeof status !== 'string') return updates
  for (const id of openSubtaskIds) {
    updates.push({ itemId: id, payload: { status } })
  }
  return updates
}
