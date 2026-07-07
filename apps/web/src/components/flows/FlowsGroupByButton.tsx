'use client'

import type { RefObject } from 'react'
import { Layers } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { FlowsGroupBy } from '@/lib/flows/flow-grouping-types'
import { cn } from '@/lib/utils/cn'

const GROUP_BY_LABELS: Record<Exclude<FlowsGroupBy, 'none'>, string> = {
  status: 'Status',
  trigger: 'Trigger',
  enabled: 'On / off',
  space: 'Space',
  campaign: 'Campaign',
}

interface FlowsGroupByButtonProps<TValue extends string = Exclude<FlowsGroupBy, 'none'>> {
  groupBy: TValue | 'none'
  labels?: Partial<Record<TValue, string>>
  ariaLabel?: string
  btnRef: RefObject<HTMLElement | null>
  onToggle: () => void
}

export function FlowsGroupByButton<TValue extends string = Exclude<FlowsGroupBy, 'none'>>({
  groupBy,
  labels = GROUP_BY_LABELS as Partial<Record<TValue, string>>,
  ariaLabel = 'Group flows',
  btnRef,
  onToggle,
}: FlowsGroupByButtonProps<TValue>) {
  const activeLabel = groupBy === 'none' ? null : labels[groupBy]
  const display = activeLabel ?? 'Group by'

  return (
    <Tooltip label="Group by" side="bottom">
      <span ref={btnRef} className="inline-flex shrink-0 items-center">
        <button
          type="button"
          onClick={onToggle}
          aria-label={ariaLabel}
          className={cn(
            'h-spacing-7 gap-spacing-1 rounded-spacing-4 px-spacing-2 body-4 inline-flex shrink-0 items-center font-medium transition-colors',
            activeLabel
              ? 'badge-glass badge-glass-purple'
              : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
          )}
        >
          <Layers className="icon-xs shrink-0" />
          {display}
        </button>
      </span>
    </Tooltip>
  )
}
