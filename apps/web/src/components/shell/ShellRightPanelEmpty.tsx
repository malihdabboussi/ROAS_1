'use client'

import type { LucideIcon } from 'lucide-react'

/**
 * The panel's one empty state.
 *
 * Every section had its own bare paragraph, which read as a gap rather than a
 * deliberate "nothing here yet". A centred icon over the message gives the
 * empty section the same weight as a populated one, so the card keeps its
 * rhythm whether or not there is content.
 */
export function ShellRightPanelEmpty({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="gap-spacing-2 py-spacing-3 px-spacing-3 flex flex-col items-center text-center">
      <span
        className="bg-secondary text-muted-foreground p-spacing-2 flex items-center justify-center rounded-full"
        aria-hidden
      >
        <Icon className="icon-sm" />
      </span>
      <p className="body-4 text-muted-foreground max-w-[22ch]">{message}</p>
    </div>
  )
}
