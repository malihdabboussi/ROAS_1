'use client'

import { ChevronRight, Workflow } from 'lucide-react'

export function FlowComposerLinkedFlowButton({
  status,
  onOpen,
  disabled,
}: {
  status: 'open' | 'no-loop'
  onOpen?: () => void
  disabled?: boolean
}) {
  if (status === 'no-loop') {
    return (
      <span
        className="chip-glass-neutral body-4 gap-spacing-1 h-spacing-8 px-spacing-2 inline-flex max-w-full items-center rounded-full font-medium opacity-70"
        aria-label="No Loop"
      >
        <Workflow className="icon-xs shrink-0" />
        <span className="min-w-0 truncate">No loop</span>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      className="chip-glass-blue body-4 gap-spacing-1 h-spacing-8 px-spacing-2 hover:bg-hover-subtle inline-flex max-w-full items-center rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Open Loop"
    >
      <Workflow className="icon-xs shrink-0" />
      <span className="min-w-0 truncate">Open Loop</span>
      <ChevronRight className="icon-xs shrink-0 opacity-70" />
    </button>
  )
}
