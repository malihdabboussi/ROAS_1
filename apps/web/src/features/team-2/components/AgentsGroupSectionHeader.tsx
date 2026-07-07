'use client'

import { ChevronRight } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { spaceGroupBadgeChipProps } from '@/lib/ui/group-badge-glass'
import type { AgentsListGroup } from './AgentsListView'

export function AgentsGroupSectionHeader({
  group,
  expanded,
  onToggle,
  sticky = false,
  itemCount,
}: {
  group: AgentsListGroup
  expanded: boolean
  onToggle: () => void
  sticky?: boolean
  itemCount?: number
}) {
  const chip = spaceGroupBadgeChipProps(group.color)
  const palette = getIconColor(group.color)

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
      {group.modelChipClass ? (
        <span
          className={`${group.modelChipClass} typo-caption inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-medium`}
        >
          {group.label}
        </span>
      ) : (
        <>
          {group.icon ? (
            <span
              className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${palette.glassClass}`}
            >
              <LucideIcon name={group.icon} className={`h-3 w-3 ${palette.textColor}`} />
            </span>
          ) : null}
          <span
            className={`rounded-spacing-2 inline-flex shrink-0 items-center px-2.5 py-0.5 text-xs font-normal uppercase tracking-wider ${chip.chipClassName}`}
            style={chip.style}
          >
            {group.label}
          </span>
        </>
      )}
      <span className="body-4 text-muted-foreground shrink-0 tabular-nums">
        {itemCount ?? group.items.length}
      </span>
    </button>
  )
}
