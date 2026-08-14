'use client'

import { useState } from 'react'
import { QuickMissionsHubHost } from '@/components/global-chat/components/QuickMissionsHubHost'
import {
  isShellMissionCreateItem,
  SHELL_CREATE_QUICK_STARTS,
  type ShellCreateMenuItem,
} from '@/components/shell/shell-create-menu.config'
import { cn } from '@/lib/utils/cn'

export function ShellEmptyChatQuickStartPills({
  onSelect,
  className,
  variant = 'standalone',
}: {
  onSelect: (quickStart: ShellCreateMenuItem) => void
  className?: string
  variant?: 'standalone' | 'shelf'
}) {
  const [missionOpen, setMissionOpen] = useState(false)

  return (
    <>
      <QuickMissionsHubHost
        open={missionOpen ? true : undefined}
        onClose={() => setMissionOpen(false)}
      />
      <div
        className={cn(
          variant === 'shelf'
            ? 'gap-spacing-1 flex min-w-0 flex-1 flex-wrap items-center justify-end'
            : 'mb-spacing-2 gap-spacing-2 flex w-full max-w-3xl flex-nowrap items-center justify-center overflow-x-auto',
          className,
        )}
        role="group"
        aria-label="Quick starts"
      >
        {SHELL_CREATE_QUICK_STARTS.map((quickStart) => {
          const Icon = quickStart.icon
          const isMission = isShellMissionCreateItem(quickStart)
          return (
            <button
              key={quickStart.id}
              type="button"
              onClick={() => {
                if (isMission) {
                  setMissionOpen(true)
                  return
                }
                onSelect(quickStart)
              }}
              aria-haspopup={isMission ? 'dialog' : undefined}
              aria-expanded={isMission ? missionOpen : undefined}
              className={cn(
                'body-4 text-muted-foreground hover:text-foreground hover:bg-hover-subtle gap-spacing-1 px-spacing-2 py-spacing-1 inline-flex shrink-0 items-center bg-transparent transition-colors',
                variant === 'shelf' ? 'rounded-spacing-2' : 'border-border rounded-full border',
              )}
            >
              <Icon className="icon-sm shrink-0" aria-hidden />
              <span>{quickStart.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
