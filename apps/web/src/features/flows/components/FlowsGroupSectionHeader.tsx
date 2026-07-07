'use client'

import { ChevronRight } from 'lucide-react'
import { spaceGroupBadgeChipProps } from '@/lib/ui/group-badge-glass'
import type { FlowsListGroup } from '../types/flows-page.types'

export function FlowsGroupSectionHeader({
  group,
  expanded,
  onToggle,
  sticky = false,
}: {
  group: FlowsListGroup
  expanded: boolean
  onToggle: () => void
  sticky?: boolean
}) {
  const chip = spaceGroupBadgeChipProps(group.color)

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={`rounded-spacing-2 px-spacing-2 pb-spacing-1 pt-spacing-2 gap-spacing-2 flex w-full min-w-0 items-center text-left transition-colors hover:bg-[var(--color-hover-subtle)] ${
        sticky ? 'border-border bg-background sticky top-0 z-[1] border-b' : ''
      }`}
    >
      <ChevronRight
        className={`icon-xs text-muted-foreground shrink-0 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
      />
      <span
        className={`rounded-spacing-2 inline-flex shrink-0 items-center px-2.5 py-0.5 text-xs font-normal uppercase tracking-wider ${chip.chipClassName}`}
        style={chip.style}
      >
        {group.label}
      </span>
      <span className="body-4 text-muted-foreground shrink-0 tabular-nums">
        {group.itemCount ?? group.items.length}
      </span>
    </button>
  )
}
