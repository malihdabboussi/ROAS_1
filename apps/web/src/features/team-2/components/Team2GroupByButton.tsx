'use client'

import { Layers } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { Team2GroupBy } from './Team2Toolbar'

const GROUP_BY_LABELS: Record<Exclude<Team2GroupBy, 'none'>, string> = {
  team: 'Team',
  level: 'Level',
  model: 'Model',
}

interface Team2GroupByButtonProps {
  groupBy: Team2GroupBy
  btnRef: React.RefObject<HTMLElement | null>
  onToggle: () => void
}

export function Team2GroupByButton({ groupBy, btnRef, onToggle }: Team2GroupByButtonProps) {
  const activeLabel = groupBy === 'none' ? null : GROUP_BY_LABELS[groupBy]
  const display = activeLabel ?? 'Group by'

  return (
    <Tooltip label="Group by" side="bottom">
      <span ref={btnRef} className="inline-flex shrink-0 items-center">
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors ${
            activeLabel
              ? 'badge-glass-purple'
              : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
          }`}
        >
          <Layers className="h-3 w-3" />
          {display}
        </button>
      </span>
    </Tooltip>
  )
}
