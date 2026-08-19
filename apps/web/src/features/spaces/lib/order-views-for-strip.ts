import type { ViewDef } from '../types/space-schema'

/**
 * Display order for the view-tab strip.
 *
 * `pinned_to_start` is a display concern, not a storage position: pinned views always
 * render first (in their schema order), regardless of where they sit in `schema.views`.
 * An optional `leadingViewId` (e.g. Meetings → `all-meetings`) is forced ahead of pins.
 * The sort is stable, so unpinned views keep their relative schema order.
 */
export function orderViewsForStrip<T extends Pick<ViewDef, 'id' | 'pinned_to_start'>>(
  views: readonly T[],
  leadingViewId?: string | null,
): T[] {
  const rank = (view: T): number => {
    if (leadingViewId && view.id === leadingViewId) return 0
    if (view.pinned_to_start) return 1
    return 2
  }
  return views
    .map((view, index) => ({ view, index, rank: rank(view) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.view)
}

/**
 * Reconcile pin flags after a drag-reorder of the strip.
 *
 * Because pinned tabs always render first, dropping a tab *into* the pinned zone
 * (before another pinned tab) pins it, and dragging a pinned tab *out* of the zone
 * (after an unpinned tab) unpins it. Every other pin flag is left untouched — a manual
 * reorder must never silently clear the user's pins.
 */
export function reconcilePinsAfterReorder<T extends Pick<ViewDef, 'id' | 'pinned_to_start'>>(
  reorderedViews: readonly T[],
  movedViewId: string | null | undefined,
  leadingViewId?: string | null,
): T[] {
  if (!movedViewId) return [...reorderedViews]
  const movedIdx = reorderedViews.findIndex((view) => view.id === movedViewId)
  if (movedIdx === -1) return [...reorderedViews]
  const moved = reorderedViews[movedIdx]!
  const others = reorderedViews.filter((view) => view.id !== movedViewId && view.id !== leadingViewId)
  const before = reorderedViews
    .slice(0, movedIdx)
    .filter((view) => view.id !== leadingViewId)
  const after = reorderedViews.slice(movedIdx + 1).filter((view) => view.id !== leadingViewId)
  const hasPinnedAfter = after.some((view) => view.pinned_to_start)
  const hasUnpinnedBefore = before.some((view) => !view.pinned_to_start)
  let nextPinned = moved.pinned_to_start ?? false
  if (!nextPinned && hasPinnedAfter && others.some((view) => view.pinned_to_start)) {
    nextPinned = true
  } else if (nextPinned && hasUnpinnedBefore) {
    nextPinned = false
  }
  if (nextPinned === (moved.pinned_to_start ?? false)) return [...reorderedViews]
  return reorderedViews.map((view) =>
    view.id === movedViewId ? { ...view, pinned_to_start: nextPinned } : view,
  )
}

/**
 * Surface-level default pins (e.g. Meetings pins `agenda`). Only applies while the user has
 * never touched the pin for that view (`pinned_to_start === undefined`); an explicit true/false
 * always wins so "Unpin" sticks.
 */
export function applyDefaultPins<T extends Pick<ViewDef, 'id' | 'pinned_to_start'>>(
  views: readonly T[],
  defaultPinnedViewIds?: readonly string[] | null,
): T[] {
  if (!defaultPinnedViewIds || defaultPinnedViewIds.length === 0) return [...views]
  const defaults = new Set(defaultPinnedViewIds)
  return views.map((view) =>
    view.pinned_to_start === undefined && defaults.has(view.id)
      ? { ...view, pinned_to_start: true }
      : view,
  )
}
