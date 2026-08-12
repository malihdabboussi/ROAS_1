'use client'

import { Video } from 'lucide-react'
// TODO(shared-list): last feature dependency in the shared cells — replace the
// store read with an injected items lookup so cells are fully feature-free.
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { SpaceItem } from '@/lib/spaces'
import { readSourceCallMeta } from '@/lib/spaces/source-call'
import { cn } from '@/lib/utils/cn'
import type { BaseCellProps } from './cell-types'

type SourceCallCellProps = BaseCellProps & {
  spaceItem?: SpaceItem
  fieldRowVariant?: 'default' | 'kanban'
  onOpenDetail?: (item: SpaceItem) => void
}

export function SourceCallCell({
  value,
  spaceItem,
  fieldRowVariant = 'default',
  onOpenDetail,
}: SourceCallCellProps) {
  const items = useSpacesStore((s) => s.items)
  const meta = readSourceCallMeta(spaceItem, value)
  const linked = meta.itemId ? items.find((i) => i.id === meta.itemId) : undefined
  const label =
    meta.title ||
    linked?.title?.replace(/^Fathom meeting:\s*/i, '').replace(/^Meeting:\s*/i, '') ||
    null

  if (!label) {
    return fieldRowVariant === 'kanban' ? (
      <span className="text-muted-foreground inline-flex h-6 w-6 items-center justify-center">
        <Video className="h-3.5 w-3.5 opacity-40" />
      </span>
    ) : (
      <span className="text-muted-foreground">—</span>
    )
  }

  const canOpen = Boolean(linked && onOpenDetail)

  return (
    <button
      type="button"
      data-cell
      disabled={!canOpen}
      title={canOpen ? 'Open source call' : label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        if (linked && onOpenDetail) onOpenDetail(linked)
      }}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 text-left',
        canOpen
          ? 'text-foreground hover:text-primary cursor-pointer'
          : 'text-muted-foreground cursor-default',
        fieldRowVariant === 'kanban' && 'text-xs',
      )}
    >
      <Video className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </button>
  )
}
