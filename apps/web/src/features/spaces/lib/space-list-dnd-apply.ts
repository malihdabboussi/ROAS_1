import type { SpaceItem } from '../types'

function bySortOrder(a: SpaceItem, b: SpaceItem): number {
  return (a.sort_order ?? 0) - (b.sort_order ?? 0)
}

/** Next sort_order for a new sibling (top-level when parent is null). */
export function nextSpaceItemSortOrder(
  items: SpaceItem[],
  parentItemId: string | null | undefined,
  explicit?: number,
): number {
  if (explicit !== undefined) return explicit
  const parent = parentItemId ?? null
  const siblings = items.filter((i) => (i.parent_item_id ?? null) === parent)
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map((i) => i.sort_order ?? 0)) + 1
}

function isDescendantOf(items: SpaceItem[], nodeId: string, ancestorId: string): boolean {
  const node = items.find((i) => i.id === nodeId)
  if (!node) return false
  if (node.id === ancestorId) return true
  if (!node.parent_item_id) return false
  if (node.parent_item_id === ancestorId) return true
  return isDescendantOf(items, node.parent_item_id, ancestorId)
}

/** `nodeId` is `ancestorId` or any item under it (any depth). */
function isInSubtreeOf(items: SpaceItem[], nodeId: string, ancestorId: string): boolean {
  if (nodeId === ancestorId) return true
  return isDescendantOf(items, nodeId, ancestorId)
}

function hasSubtasks(items: SpaceItem[], itemId: string): boolean {
  return items.some((i) => i.parent_item_id === itemId)
}

/** True if newParentId is the dragged item or any of its descendants (invalid nest target). */
export function wouldNestIntoDescendant(
  items: SpaceItem[],
  activeId: string,
  newParentId: string,
): boolean {
  if (newParentId === activeId) return true
  return isDescendantOf(items, newParentId, activeId)
}

export type DndZone = 'before' | 'after' | 'into'

function buildParentToChildIds(items: SpaceItem[]): Map<string | null, string[]> {
  const m = new Map<string | null, string[]>()
  for (const it of items) {
    const p = it.parent_item_id ?? null
    if (!m.has(p)) m.set(p, [])
    m.get(p)!.push(it.id)
  }
  for (const ids of m.values()) {
    ids.sort((a, b) => {
      const ia = items.find((i) => i.id === a)!
      const ib = items.find((i) => i.id === b)!
      return bySortOrder(ia, ib)
    })
  }
  return m
}

function renumberChildLists(
  m: Map<string | null, string[]>,
  touchedParents: Set<string | null>,
): { id: string; parent_item_id: string | null; sort_order: number }[] {
  const out: { id: string; parent_item_id: string | null; sort_order: number }[] = []
  for (const p of touchedParents) {
    const ids = m.get(p) ?? []
    ids.forEach((id, j) => {
      out.push({ id, parent_item_id: p, sort_order: j })
    })
  }
  return out
}

/**
 * Produces one update per item whose parent or sort_order changes vs `items` snapshot.
 */
export function buildSpaceListReorder(
  items: SpaceItem[],
  activeId: string,
  overId: string,
  zone: DndZone,
):
  | { ok: true; updates: { id: string; parent_item_id: string | null; sort_order: number }[] }
  | { ok: false; reason: string } {
  if (activeId === overId) return { ok: false, reason: 'same' }
  const active = items.find((i) => i.id === activeId)
  const over = items.find((i) => i.id === overId)
  if (!active || !over) return { ok: false, reason: 'not-found' }

  const m = buildParentToChildIds(items)
  const fromParent = active.parent_item_id ?? null

  const removeActive = (map: Map<string | null, string[]>) => {
    const list = (map.get(fromParent) ?? []).filter((id) => id !== activeId)
    map.set(fromParent, list)
  }

  if (zone === 'into') {
    if (over.parent_item_id) {
      return { ok: false, reason: 'into-subtask' }
    }
    if (hasSubtasks(items, activeId)) {
      return { ok: false, reason: 'into-has-children' }
    }
    if (wouldNestIntoDescendant(items, activeId, overId)) {
      return { ok: false, reason: 'into-descendant' }
    }
    const next = new Map(m)
    removeActive(next)
    const ch = [...(next.get(overId) ?? [])]
    if (ch.includes(activeId)) {
      return { ok: false, reason: 'already-child' }
    }
    ch.push(activeId)
    next.set(overId, ch)
    const touched = new Set<string | null>([fromParent, overId])
    const updates = diffUpdates(items, renumberChildLists(next, touched))
    return { ok: true, updates }
  }

  // before / after: same parent list as `over` after the move
  const toParent: string | null = over.parent_item_id ?? null
  if (toParent != null && isInSubtreeOf(items, toParent, activeId)) {
    return { ok: false, reason: 'before-after-under-self' }
  }
  if (toParent != null) {
    const parentListOwner = items.find((i) => i.id === toParent)
    // API: a subtask’s parent must be a root. Refuse joining the list of children of a subtask.
    if (parentListOwner?.parent_item_id) {
      return { ok: false, reason: 'before-after-nested-subtask' }
    }
  }

  const next = new Map(m)
  removeActive(next)
  const list = [...(next.get(toParent) ?? [])]
  const oi = list.indexOf(overId)
  if (oi < 0) return { ok: false, reason: 'over-not-in-list' }
  const insertAt = zone === 'before' ? oi : oi + 1
  list.splice(insertAt, 0, activeId)
  next.set(toParent, list)
  const touched = new Set<string | null>([fromParent, toParent])
  const flat = renumberChildLists(next, touched)
  const updates = diffUpdates(items, flat)
  return { ok: true, updates }
}

/**
 * Move a task into an empty group: promote to top-level and append to the end of the root list.
 * Field / bucket updates are applied by the caller via `getFieldPatchForEmptyGroup`.
 */
export function buildMoveItemToEmptyGroup(
  items: SpaceItem[],
  activeId: string,
):
  | { ok: true; updates: { id: string; parent_item_id: string | null; sort_order: number }[] }
  | { ok: false; reason: string } {
  const active = items.find((i) => i.id === activeId)
  if (!active) return { ok: false, reason: 'not-found' }

  const m = buildParentToChildIds(items)
  const fromParent = active.parent_item_id ?? null
  const next = new Map(m)
  const fromList = (next.get(fromParent) ?? []).filter((id) => id !== activeId)
  next.set(fromParent, fromList)
  const roots = [...(next.get(null) ?? [])]
  if (roots.includes(activeId)) {
    const idx = roots.indexOf(activeId)
    if (idx >= 0) {
      roots.splice(idx, 1)
    }
  }
  roots.push(activeId)
  next.set(null, roots)
  const touched = new Set<string | null>([fromParent, null])
  const flat = renumberChildLists(next, touched)
  const updates = diffUpdates(items, flat)
  return { ok: true, updates }
}

function diffUpdates(
  before: SpaceItem[],
  afterRows: { id: string; parent_item_id: string | null; sort_order: number }[],
): { id: string; parent_item_id: string | null; sort_order: number }[] {
  const byId = new Map(before.map((i) => [i.id, i] as const))
  return afterRows.filter((r) => {
    const o = byId.get(r.id)
    if (!o) return true
    const p = o.parent_item_id ?? null
    return p !== (r.parent_item_id ?? null) || (o.sort_order ?? 0) !== r.sort_order
  })
}
