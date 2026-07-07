'use client'

import type { RefObject } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'

export type ReportingTimeRangeSelectorVariant = 'chip' | 'calendar' | 'badge'

interface ReportingTimeRangeTriggerProps {
  variant: ReportingTimeRangeSelectorVariant
  tooltipLabel: string
  badgeLabel: string
  isAllTime: boolean
  open: boolean
  buttonRef: RefObject<HTMLButtonElement | null>
  onToggle: () => void
  onClearToAll: () => void
}

export function ReportingTimeRangeTrigger({
  variant,
  tooltipLabel,
  badgeLabel,
  isAllTime,
  open,
  buttonRef,
  onToggle,
  onClearToAll,
}: ReportingTimeRangeTriggerProps) {
  if (variant === 'badge') {
    return (
      <Tooltip label={tooltipLabel} side="bottom">
        <span className="inline-flex shrink-0 items-center">
          {isAllTime ? (
            <button
              ref={buttonRef}
              type="button"
              onClick={onToggle}
              className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground inline-flex h-spacing-7 aspect-square shrink-0 cursor-pointer items-center justify-center rounded-spacing-2 transition-colors"
              aria-label={tooltipLabel}
            >
              <Calendar className="icon-sm shrink-0" />
            </button>
          ) : (
            <button
              ref={buttonRef}
              type="button"
              onClick={onToggle}
              className="badge-glass badge-glass-blue body-3 rounded-spacing-2 group inline-flex shrink-0 cursor-pointer items-center gap-spacing-1 border-0 px-spacing-2 py-spacing-1 font-medium shadow-none transition-opacity hover:opacity-90"
              aria-label={tooltipLabel}
            >
              <span className="relative flex items-center gap-spacing-1">
                <span className="flex items-center gap-spacing-1 transition-opacity group-hover:opacity-0">
                  <Calendar className="icon-xs shrink-0" />
                  <span className="body-4 whitespace-nowrap">{badgeLabel}</span>
                </span>
                <X
                  className="icon-sm absolute inset-0 m-auto opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClearToAll()
                  }}
                />
              </span>
            </button>
          )}
        </span>
      </Tooltip>
    )
  }

  if (variant === 'calendar') {
    return (
      <Tooltip label={tooltipLabel} side="bottom">
        <span className="inline-flex">
          <button
            ref={buttonRef}
            type="button"
            onClick={onToggle}
            className={cn(
              'inline-flex h-spacing-7 aspect-square cursor-pointer items-center justify-center rounded-spacing-2 transition-colors',
              open
                ? 'bg-hover-subtle text-foreground'
                : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
            )}
            aria-label={tooltipLabel}
          >
            <Calendar className="icon-sm shrink-0" />
          </button>
        </span>
      </Tooltip>
    )
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onToggle}
      className="chip-glass-neutral body-4 flex h-spacing-8 cursor-pointer items-center gap-spacing-1 rounded-spacing-2 px-spacing-3 text-muted-foreground"
    >
      {tooltipLabel}
      <ChevronDown className="icon-xs" />
    </button>
  )
}
