import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { CommsSectionHeaderProps } from './team-communication-tab.types'

export function CommsSectionHeader({
  title,
  collapsed,
  onToggle,
  first,
  trailing,
}: CommsSectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex w-full items-center gap-spacing-1 rounded-lg px-2 pb-1',
        first ? 'pt-1' : 'pt-4',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="group/section typo-xs text-muted-foreground hover:text-foreground flex min-w-0 flex-1 items-center gap-spacing-1 text-left font-semibold uppercase tracking-wide transition-colors"
      >
        <span>{title}</span>
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 shrink-0 opacity-0 transition-[opacity,transform] duration-200 group-hover/section:opacity-100 group-focus-visible/section:opacity-100',
            collapsed ? 'rotate-0' : 'rotate-90',
          )}
          aria-hidden
        />
      </button>
      {trailing}
    </div>
  )
}
