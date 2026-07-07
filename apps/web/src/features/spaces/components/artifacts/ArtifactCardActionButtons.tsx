'use client'

import type { Dispatch, MouseEvent, RefObject, SetStateAction } from 'react'
import { Fullscreen, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ArtifactListRow } from './artifact-display'

export type ArtifactCardActionPointer = { x: number; y: number } | null

export interface ArtifactCardActionMenuButton {
  key: string
  label: string
  open: boolean
  anchorRef: RefObject<HTMLButtonElement | null>
  setPointer: Dispatch<SetStateAction<ArtifactCardActionPointer>>
  setOpen: Dispatch<SetStateAction<boolean>>
}

interface ArtifactCardActionButtonsProps {
  row: ArtifactListRow
  menus: ArtifactCardActionMenuButton[]
  onOpenFull: (row: ArtifactListRow, e: MouseEvent) => void
}

export function ArtifactCardActionButtons({
  row,
  menus,
  onOpenFull,
}: ArtifactCardActionButtonsProps) {
  const anyMenuOpen = menus.some((menu) => menu.open)

  return (
    <div
      className={cn(
        'absolute right-2 top-2 z-10 flex shrink-0 items-center gap-1 transition-opacity',
        (anyMenuOpen ? 'opacity-100' : 'opacity-0') + ' group-hover/artifact:opacity-100',
      )}
    >
      {menus.map((menu) => (
        <button
          key={menu.key}
          ref={menu.anchorRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            menu.setPointer(null)
            menu.setOpen((open) => !open)
          }}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--color-muted-foreground)] shadow-sm transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          aria-label={menu.label}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      ))}
      <button
        type="button"
        onClick={(e) => onOpenFull(row, e)}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--color-muted-foreground)] shadow-sm transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        aria-label="Open full view"
      >
        <Fullscreen className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
