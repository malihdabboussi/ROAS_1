'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import {
  TEAM_DETAIL_TAB_META,
  TEAM_DETAIL_TABS,
  type TeamDetailTab,
} from './team-detail-view-types'

interface TeamViewTabsProps {
  active: TeamDetailTab
  onChange: (tab: TeamDetailTab) => void
  trailing?: ReactNode
}

export function TeamViewTabs({ active, onChange, trailing }: TeamViewTabsProps) {
  return (
    <div className="gap-spacing-2 px-spacing-4 py-spacing-1 flex w-full min-w-0 shrink-0 items-center">
      <div className="scrollbar-thin flex min-h-0 min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain">
        {TEAM_DETAIL_TABS.map((id) => {
          const meta = TEAM_DETAIL_TAB_META[id]
          const isActive = active === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                'relative flex min-w-0 shrink-0 items-center rounded-md px-2 py-2 text-xs font-medium transition-colors hover:bg-[var(--color-hover-subtle)]',
                isActive
                  ? 'text-[var(--foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
              )}
              aria-pressed={isActive}
              aria-label={meta.label}
            >
              <span className="max-w-[140px] truncate">{meta.label}</span>
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--foreground)]"
                />
              ) : null}
            </button>
          )
        })}
      </div>
      {trailing ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">{trailing}</div>
      ) : null}
    </div>
  )
}
