'use client'

import { LucideIcon } from '@/components/ui/IconPicker'
import { cn } from '@/lib/utils/cn'

export interface HierarchyViewTab {
  id: string
  label: string
  icon: string
  glassClass?: string
  textClass?: string
}

interface HierarchyViewBarProps {
  tabs: readonly HierarchyViewTab[]
  activeViewId: string
  onSelectView: (viewId: string) => void
  rightSlot?: React.ReactNode
}

export function HierarchyViewBar({
  tabs,
  activeViewId,
  onSelectView,
  rightSlot,
}: HierarchyViewBarProps) {
  return (
    <div className="border-border flex w-full min-w-0 items-center gap-1 border-b px-4">
      <div className="scrollbar-thin flex min-h-0 min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain">
        {tabs.map((tab) => {
          const selected = tab.id === activeViewId
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectView(tab.id)}
              className={cn(
                'relative flex min-w-0 shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors',
                'hover:bg-hover-subtle',
                selected
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
                  tab.glassClass ?? 'chip-glass-neutral',
                )}
              >
                <LucideIcon
                  name={tab.icon}
                  className={cn('h-3 w-3', tab.textClass ?? 'text-muted-foreground')}
                />
              </span>
              <span className="max-w-36 truncate">{tab.label}</span>
              {selected ? (
                <span className="bg-foreground absolute bottom-0 left-2 right-2 h-0.5 rounded-full" />
              ) : null}
            </button>
          )
        })}
      </div>
      {rightSlot ? <div className="ml-auto flex shrink-0 items-center gap-1">{rightSlot}</div> : null}
    </div>
  )
}
