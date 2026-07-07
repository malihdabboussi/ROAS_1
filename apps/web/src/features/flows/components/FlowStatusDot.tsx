'use client'

import { Tooltip } from '@/components/ui/tooltip'
import { flowStatusKey, flowStatusLabel } from '../lib/describe-flow-trigger'
import type { FlowAutomationStatusSummary } from '../types/flow-automation.types'

const FLOW_STATUS_DOT_CLASS = {
  draft: 'indicator-dot-glass-sm indicator-dot-glass-muted',
  published: 'indicator-dot-glass-sm indicator-dot-glass-green',
  paused: 'indicator-dot-glass-sm indicator-dot-glass-orange',
} as const

export const FLOW_DRAFT_STATUS: FlowAutomationStatusSummary = {
  is_draft: true,
  enabled: false,
}

export function FlowStatusDot({ flow }: { flow: FlowAutomationStatusSummary }) {
  const key = flowStatusKey(flow)
  const label = flowStatusLabel(flow)

  return (
    <Tooltip label={label} side="top" triggerClassName="inline-flex shrink-0">
      <span className={`${FLOW_STATUS_DOT_CLASS[key]} shrink-0`} aria-label={label} />
    </Tooltip>
  )
}

export function FlowTitleWithStatusDot({
  title,
  flow,
  className,
}: {
  title: string
  flow: FlowAutomationStatusSummary
  className?: string
}) {
  return (
    <span className={`gap-spacing-2 inline-flex min-w-0 max-w-full items-center ${className ?? ''}`}>
      <span className="truncate">{title}</span>
      <FlowStatusDot flow={flow} />
    </span>
  )
}
