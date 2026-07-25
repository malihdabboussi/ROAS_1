'use client'

import { CalendarDays, Columns3, List } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { TASK_WORK_VIEW_IDS, WORK_VIEW_LABELS, type TaskWorkViewId } from '@/lib/work-views'

const ICONS = {
  list: List,
  board: Columns3,
  calendar: CalendarDays,
} satisfies Record<TaskWorkViewId, typeof List>

interface WorkViewTabsProps {
  value: TaskWorkViewId
  onChange: (view: TaskWorkViewId) => void
  views?: readonly TaskWorkViewId[]
}

export function WorkViewTabs({ value, onChange, views = TASK_WORK_VIEW_IDS }: WorkViewTabsProps) {
  return (
    <div className="tabs-liquid-glass gap-spacing-1 flex w-fit items-center rounded-lg p-1">
      {views.map((viewId) => {
        const Icon = ICONS[viewId]
        const active = value === viewId
        return (
          <button
            key={viewId}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(viewId)}
            className={cn(
              'body-3 gap-spacing-1-5 rounded-spacing-2 px-spacing-3 py-spacing-1-5 flex items-center font-medium transition-colors',
              active
                ? 'button-glass-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="icon-sm" />
            {WORK_VIEW_LABELS[viewId]}
          </button>
        )
      })}
    </div>
  )
}
