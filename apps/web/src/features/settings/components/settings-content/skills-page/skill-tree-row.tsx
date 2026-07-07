'use client'

import type { MouseEvent, ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function SkillTreeRow({
  selected = false,
  menuOpen = false,
  onSelect,
  onContextMenu,
  onOpenMenu,
  title,
  children,
  leading,
}: {
  selected?: boolean
  menuOpen?: boolean
  onSelect: () => void
  onContextMenu: (e: MouseEvent<HTMLDivElement>) => void
  onOpenMenu: (e: MouseEvent<HTMLButtonElement>) => void
  title?: string
  children: ReactNode
  leading?: ReactNode
}) {
  return (
    <div
      onContextMenu={onContextMenu}
      className={cn(
        'group/row rounded-spacing-2 px-spacing-2 py-spacing-1 gap-spacing-1 flex w-full min-w-0 items-center transition-colors',
        selected || menuOpen
          ? 'text-foreground bg-[var(--color-hover-subtle)]'
          : 'text-muted-foreground hover:text-foreground hover:bg-[var(--color-hover-subtle)]',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="body-3 gap-spacing-1 flex min-w-0 flex-1 items-center text-left"
        title={title}
      >
        {leading}
        <span className="min-w-0 truncate">{children}</span>
      </button>
      <button
        type="button"
        data-skill-tree-row-menu-trigger
        onClick={onOpenMenu}
        className={cn(
          'text-muted-foreground hover:text-foreground rounded-spacing-1 h-spacing-7 px-spacing-1 flex shrink-0 items-center justify-center transition-opacity hover:bg-[var(--color-hover-subtle)]',
          menuOpen ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100',
        )}
        aria-label="Row actions"
        aria-haspopup="menu"
      >
        <MoreHorizontal className="icon-sm" aria-hidden />
      </button>
    </div>
  )
}
