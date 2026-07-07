'use client'

import { useCallback, useMemo } from 'react'
import { FileText, Users } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { cn } from '@/lib/utils/cn'
import { rosterEntryForItemAssignee } from '../../../lib/apply-space-toolbar-filters'
import { useSpacesStore } from '../../../store/use-spaces-store'
import type { DocSubpagesDisplayMode } from '../types/doc-editor.types'
import { DocSubpagesAddRow } from './DocSubpagesAddRow'
import { DocSubpagesAvatar } from './DocSubpagesAvatar'

export function DocSubpagesEmbedded({
  parentItemId,
  mode,
  roster,
  docLocked,
  onOpenChild,
}: {
  parentItemId: string
  mode: Exclude<DocSubpagesDisplayMode, 'off'>
  roster: TeamRosterEntry[]
  docLocked: boolean
  onOpenChild?: (itemId: string) => void
}) {
  const spaceItems = useSpacesStore((s) => s.items)
  const createItem = useSpacesStore((s) => s.createItem)

  const children = useMemo(() => {
    return spaceItems
      .filter((i) => {
        if (i.parent_item_id !== parentItemId) return false
        const vt = (i.custom_data as Record<string, unknown> | undefined)?._view_type
        return vt === 'doc'
      })
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }, [spaceItems, parentItemId])

  const gridCols =
    mode === 'grid_sm'
      ? 'grid grid-cols-2 gap-2 sm:grid-cols-3'
      : mode === 'grid_md'
        ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'
        : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'

  const iconBox = mode === 'grid_sm' ? 'h-9 w-9' : mode === 'grid_md' ? 'h-11 w-11' : 'h-14 w-14'
  const iconGlyph = mode === 'grid_sm' ? 'h-4 w-4' : mode === 'grid_md' ? 'h-5 w-5' : 'h-7 w-7'

  const handleAdd = useCallback(async () => {
    await createItem('Untitled', {
      parent_item_id: parentItemId,
      custom_data: { _view_type: 'doc' },
    })
  }, [createItem, parentItemId])

  if (mode === 'table') {
    return (
      <div className="group/doc-subpages mt-4 border-t border-[var(--border)] pt-4">
        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 px-0.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Subpages
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Owner
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Contributors
          </span>
        </div>
        <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
          {children.map((child) => {
            const owner = rosterEntryForItemAssignee(child, roster)
            return (
              <button
                key={child.id}
                type="button"
                disabled={!onOpenChild}
                onClick={() => onOpenChild?.(child.id)}
                className={cn(
                  'grid min-h-[40px] w-full grid-cols-[minmax(0,1fr)_auto_auto] gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--color-hover-subtle)]',
                  !onOpenChild && 'cursor-default',
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="truncate text-sm text-[var(--foreground)]">
                    {child.title?.trim() || 'Untitled'}
                  </span>
                </span>
                <span className="flex items-center justify-center">
                  {owner ? (
                    <DocSubpagesAvatar entry={owner} size={22} />
                  ) : (
                    <span className="text-[var(--color-muted-foreground)]">—</span>
                  )}
                </span>
                <span className="flex items-center justify-center text-[var(--color-muted-foreground)]">
                  <Users className="h-4 w-4 opacity-50" aria-hidden />
                </span>
              </button>
            )
          })}
        </div>
        <DocSubpagesAddRow docLocked={docLocked} onAdd={handleAdd} />
      </div>
    )
  }

  return (
    <div className="group/doc-subpages mt-4 border-t border-[var(--border)] pt-4">
      <div className={cn(gridCols)}>
        {children.map((child) => (
          <button
            key={child.id}
            type="button"
            disabled={!onOpenChild}
            onClick={() => onOpenChild?.(child.id)}
            className={cn(
              'flex flex-col items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-left transition-colors hover:bg-[var(--color-hover-subtle)]',
              !onOpenChild && 'cursor-default opacity-80',
            )}
          >
            <div
              className={cn(
                'bg-[var(--color-muted)]/25 flex shrink-0 items-center justify-center rounded-lg text-[var(--color-muted-foreground)]',
                iconBox,
              )}
            >
              <FileText className={iconGlyph} />
            </div>
            <span className="line-clamp-2 w-full text-xs font-medium leading-snug text-[var(--foreground)]">
              {child.title?.trim() || 'Untitled'}
            </span>
          </button>
        ))}
      </div>
      <DocSubpagesAddRow docLocked={docLocked} onAdd={handleAdd} className="mt-3" />
    </div>
  )
}
