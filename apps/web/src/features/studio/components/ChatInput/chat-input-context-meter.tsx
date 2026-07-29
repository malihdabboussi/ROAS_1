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
    filledSegments: Math.max(1, Math.ceil(usedPct / 25)),
  }
}

function ContextMeterLine({
  state,
}: {
  state: NonNullable<ReturnType<typeof getContextMeterRingState>>
}) {
  return (
    <span className="gap-spacing-1 w-spacing-16 flex" aria-hidden>
      {[0, 1, 2, 3].map((segment) => (
        <span key={segment} className="progress-bar-track flex-1">
          {segment < state.filledSegments ? (
            <span className="progress-bar-fill block w-full" />
          ) : null}
        </span>
      ))}
    </span>
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
  const line = <ContextMeterLine state={state} />

  if (!breakdownPanelEnabled) {
    return (
      <Tooltip label={state.label}>
        <div className="py-spacing-1 flex items-center justify-center">{line}</div>
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
          className="py-spacing-1 flex items-center justify-center"
        >
          {line}
        </button>
      </Tooltip>
    </>
  )
}
