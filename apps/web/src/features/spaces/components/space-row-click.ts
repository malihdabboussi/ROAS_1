import type { MouseEvent } from 'react'
import type { SpaceItem } from '../types'

export function handleSpaceRowClick(
  event: MouseEvent<HTMLElement>,
  readOnly: boolean,
  onOpenDetail: ((item: SpaceItem) => void) | undefined,
  item: SpaceItem,
) {
  if (readOnly || !onOpenDetail) return
  const target = event.target as HTMLElement
  const ignored = Boolean(
    target.closest('button, a, input, select, [data-dropdown]') ||
    (target.closest('[data-cell]') && !target.closest('[data-row-title-open-target]')),
  )
  if (!ignored) onOpenDetail(item)
}
