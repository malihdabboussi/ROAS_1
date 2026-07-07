import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function AccessSectionHeader({
  title,
  collapsed,
  onToggle,
  first,
  trailing,
}: {
  title: string
  collapsed: boolean
  onToggle: () => void
  first: boolean
  trailing?: ReactNode
}) {
  return (
    <div
      className={cn(
        'gap-spacing-1 flex w-full items-center rounded-lg px-2 pb-1',
        first ? 'pt-1' : 'pt-4',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="group/section typo-xs text-muted-foreground hover:text-foreground gap-spacing-1 flex min-w-0 flex-1 items-center text-left font-semibold uppercase tracking-wide transition-colors"
      >
        <span>{title}</span>
        <ChevronRight
          className={cn(
            'icon-sm shrink-0 opacity-0 transition-all duration-200 group-hover/section:opacity-100 group-focus-visible/section:opacity-100',
            collapsed ? 'rotate-0' : 'rotate-90',
          )}
          aria-hidden
        />
      </button>
      {trailing}
    </div>
  )
}
