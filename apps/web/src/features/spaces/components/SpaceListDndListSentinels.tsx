'use client'

import { useDroppable } from '@dnd-kit/core'
import { emptyGroupDropId, groupTopDropId, LIST_TOP_DROP_ID } from '../lib/space-list-dnd-ids'

const DROP_HAIRLINE =
  'linear-gradient(90deg, transparent 0%, rgb(59 130 246) 8%, rgb(59 130 246) 92%, transparent 100%)'

/** Fills the dead zone under the list header (border line) with a droppable that maps to “before first row”. */
export function ListTopListSentinel({ listActiveId }: { listActiveId: string | null }) {
  const { setNodeRef, isOver } = useDroppable({
    id: LIST_TOP_DROP_ID,
    data: { type: 'space-list-top' },
    disabled: !listActiveId,
  })
  if (!listActiveId) return null
  return (
    <div
      ref={setNodeRef}
      className="relative z-[19] -mt-px h-2.5 w-full min-w-0 shrink-0 touch-none"
      aria-hidden
    >
      {isOver && (
        <div
          className="pointer-events-none absolute -bottom-px left-0 right-0 z-10 h-[2px]"
          style={{ background: DROP_HAIRLINE }}
        />
      )}
    </div>
  )
}

export function GroupTopListSentinel({
  listActiveId,
  firstItemId,
}: {
  listActiveId: string | null
  firstItemId: string
}) {
  const id = groupTopDropId(firstItemId)
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'space-group-top' },
    disabled: !listActiveId,
  })
  if (!listActiveId) return null
  return (
    <div
      ref={setNodeRef}
      className="relative z-[19] -mt-px h-2.5 w-full min-w-0 shrink-0 touch-none"
      aria-hidden
    >
      {isOver && (
        <div
          className="pointer-events-none absolute -bottom-px left-0 right-0 z-10 h-[2px]"
          style={{ background: DROP_HAIRLINE }}
        />
      )}
    </div>
  )
}

/** Same hairline droppable as group top when a section has no rows (distinct id → empty-group move). */
export function EmptyGroupListSentinel({
  listActiveId,
  groupKey,
}: {
  listActiveId: string | null
  groupKey: string
}) {
  const id = emptyGroupDropId(groupKey)
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'space-group-empty' },
    disabled: !listActiveId,
  })
  if (!listActiveId) return null
  return (
    <div
      ref={setNodeRef}
      className="relative z-[19] -mt-px h-2.5 w-full min-w-0 shrink-0 touch-none"
      aria-hidden
    >
      {isOver && (
        <div
          className="pointer-events-none absolute -bottom-px left-0 right-0 z-10 h-[2px]"
          style={{ background: DROP_HAIRLINE }}
        />
      )}
    </div>
  )
}
