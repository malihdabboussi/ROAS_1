import type { Ref } from 'react'
import { Tooltip } from '@/components/ui/tooltip'
import { formatTokenK } from './chat-input-format'

export interface ChatInputContextMeterValue {
  totalTokens: number
  contextWindow: number
}

export function getContextMeterRingState(meter: ChatInputContextMeterValue) {
  if (meter.contextWindow <= 0) return null
  const usedPct = Math.min((meter.totalTokens / meter.contextWindow) * 100, 100)
  const remainPct = 100 - usedPct
  const stroke =
    usedPct >= 80
      ? 'var(--color-destructive)'
      : usedPct >= 50
        ? 'var(--color-warning)'
        : 'var(--color-success)'
  const radius = 9
  const circumference = 2 * Math.PI * radius
  return {
    usedPct,
    remainPct,
    stroke,
    radius,
    circumference,
    dashOffset: circumference * (1 - remainPct / 100),
    label: `Context: ${formatTokenK(meter.totalTokens)} / ${formatTokenK(meter.contextWindow)} (${Math.round(remainPct)}% remaining)`,
  }
}

function ContextMeterRing({ state }: { state: NonNullable<ReturnType<typeof getContextMeterRingState>> }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90">
      <circle
        cx="11"
        cy="11"
        r={state.radius}
        fill="none"
        stroke="var(--color-muted)"
        strokeWidth="2.5"
      />
      <circle
        cx="11"
        cy="11"
        r={state.radius}
        fill="none"
        stroke={state.stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={state.circumference}
        strokeDashoffset={state.dashOffset}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  )
}

export function ChatInputContextMeter({
  meter,
  breakdownPanelEnabled,
  popoverOpen,
  anchorRef,
  triggerRef,
  onOpenBeforeToggle,
  onToggle,
}: {
  meter: ChatInputContextMeterValue
  breakdownPanelEnabled: boolean
  popoverOpen: boolean
  anchorRef: Ref<HTMLSpanElement>
  triggerRef: Ref<HTMLButtonElement>
  onOpenBeforeToggle: () => void
  onToggle: () => void
}) {
  const state = getContextMeterRingState(meter)
  if (!state) return null
  const ring = <ContextMeterRing state={state} />

  if (!breakdownPanelEnabled) {
    return (
      <Tooltip label={state.label}>
        <div className="flex h-8 w-8 items-center justify-center">{ring}</div>
      </Tooltip>
    )
  }

  return (
    <>
      <span
        ref={anchorRef}
        aria-hidden="true"
        className="left-spacing-2 right-spacing-2 h-spacing-1 pointer-events-none absolute top-0"
      />
      <Tooltip label={state.label}>
        <button
          ref={triggerRef}
          type="button"
          aria-label="Open context breakdown"
          aria-expanded={popoverOpen}
          aria-haspopup="dialog"
          onClick={() => {
            if (!popoverOpen) onOpenBeforeToggle()
            onToggle()
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full"
        >
          {ring}
        </button>
      </Tooltip>
    </>
  )
}
