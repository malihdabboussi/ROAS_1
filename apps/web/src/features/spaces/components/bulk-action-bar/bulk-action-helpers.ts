import { toast } from 'sonner'
import type { DuplicateSpaceItemInclude } from '../../services/spaces.service'
import type { SpaceItem } from '../../types'
import type { FieldDef } from '../../types/space-schema'

export async function bulkApply(
  ids: Set<string>,
  patchFn: (item: SpaceItem) => Partial<SpaceItem>,
  onUpdate: (
    id: string,
    patch: Partial<SpaceItem>,
    options?: { skipSubtaskCompleteConfirm?: boolean },
  ) => Promise<void>,
  items: SpaceItem[],
) {
  const targets = items.filter((i) => ids.has(i.id))
  const results = await Promise.allSettled(
    targets.map((item) => onUpdate(item.id, patchFn(item), { skipSubtaskCompleteConfirm: true })),
  )
  const failed = results.filter((r) => r.status === 'rejected').length
  return { total: targets.length, failed }
}

export function toastResult(action: string, total: number, failed: number, itemLabel = 'task') {
  const noun = total > 1 ? `${itemLabel}s` : itemLabel
  if (failed === 0) toast.success(`${action} ${total} ${noun}`)
  else toast.error(`${action} failed for ${failed} of ${total}`)
}

export function isSyntheticDocId(id: string): boolean {
  return id.startsWith('cdoc:') || id.startsWith('mdel:')
}

export const BTN =
  'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'

export const CORE_FIELD_IDS = new Set([
  'title',
  'status',
  'priority',
  'assignee',
  'due_date',
  'start_date',
  'tags',
  'mission',
  'created_at',
  'updated_at',
])

export function bulkDuplicateInclude(
  item: SpaceItem,
  schemaFields: FieldDef[],
): DuplicateSpaceItemInclude {
  const customData = (item.custom_data ?? {}) as Record<string, unknown>
  const custom_field_ids = schemaFields
    .filter((f) => !CORE_FIELD_IDS.has(f.id))
    .map((f) => f.id)
    .filter((id) => Object.prototype.hasOwnProperty.call(customData, id))
  const include: DuplicateSpaceItemInclude = {
    status: true,
    priority: true,
    assignees: true,
    start_date: true,
    due_date: true,
    description: true,
    notes: true,
    recurrence: true,
    mission: true,
    subtasks: true,
    comments: true,
    documents: true,
    deliverables: true,
  }
  if (custom_field_ids.length > 0) include.custom_field_ids = custom_field_ids
  return include
}
