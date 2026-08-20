'use client'

import { ChevronLeft, Plus } from 'lucide-react'
import { SHELL_RIGHT_PANEL_MESSAGES } from './shell-right-panel.messages.config'

export function ShellRightPanelCreateHeader({
  createOpen,
  onOpenCreate,
  onBack,
}: {
  createOpen: boolean
  onOpenCreate: () => void
  onBack: () => void
}) {
  if (createOpen) {
    return (
      <div className="border-border px-spacing-3 py-spacing-2 border-b">
        <button
          type="button"
          onClick={onBack}
          className="body-3 text-muted-foreground hover:text-foreground gap-spacing-1 flex w-full items-center transition-colors"
          aria-label={SHELL_RIGHT_PANEL_MESSAGES.createBack}
        >
          <ChevronLeft className="icon-sm" aria-hidden />
          {SHELL_RIGHT_PANEL_MESSAGES.createBack}
        </button>
      </div>
    )
  }

  return (
    <div className="border-border px-spacing-3 py-spacing-2 border-b">
      <button
        type="button"
        onClick={onOpenCreate}
        className="body-3 bg-secondary text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center justify-center rounded-lg transition-colors"
        aria-label={SHELL_RIGHT_PANEL_MESSAGES.create}
        aria-expanded={false}
      >
        <Plus className="icon-sm" aria-hidden />
        {SHELL_RIGHT_PANEL_MESSAGES.create}
      </button>
    </div>
  )
}
