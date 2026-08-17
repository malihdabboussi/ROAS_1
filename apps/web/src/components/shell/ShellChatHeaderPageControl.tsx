'use client'

import { PanelRight } from 'lucide-react'
import { useShellStore } from './use-shell-store'

/** Page restore control that sits in the chat header beside the summary toggle. */
export function ShellChatHeaderPageControl() {
  const setWorkAreaOpen = useShellStore((state) => state.setWorkAreaOpen)

  return (
    <button
      type="button"
      onClick={() => setWorkAreaOpen(true)}
      className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
      aria-label="Show page"
      title="Show page"
    >
      <PanelRight className="icon-sm" aria-hidden />
    </button>
  )
}
