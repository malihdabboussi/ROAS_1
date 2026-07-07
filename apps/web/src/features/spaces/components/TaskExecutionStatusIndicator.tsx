'use client'

import { cn } from '@/lib/utils/cn'
import { OptionDot } from './OptionBadge'

interface TaskExecutionStatusIndicatorProps {
  color?: string | null
  active: boolean
  size?: 'sm' | 'md'
}

export function TaskExecutionStatusIndicator({
  color,
  active,
  size = 'sm',
}: TaskExecutionStatusIndicatorProps) {
  const label = active ? 'Agent is working on this task' : undefined

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        active && 'animate-pulse',
      )}
      aria-label={label}
      title={label}
      data-agent-working={active ? 'true' : undefined}
    >
      <OptionDot color={color ?? undefined} size={size} />
    </span>
  )
}
