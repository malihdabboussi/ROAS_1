'use client'

import { SHELL_EMPTY_CHAT_QUICK_STARTS } from '@/components/shell/shell-empty-chat-prompts.config'
import type { ShellChatQuickStart } from '@/components/shell/shell-empty-chat-prompts.config'
import { cn } from '@/lib/utils/cn'

export function ShellEmptyChatQuickStartPills({
  onSelect,
  className,
}: {
  onSelect: (quickStart: ShellChatQuickStart) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-spacing-2 gap-spacing-2 flex w-full max-w-3xl flex-nowrap items-center justify-center overflow-x-auto',
        className,
      )}
      role="group"
      aria-label="Quick starts"
    >
      {SHELL_EMPTY_CHAT_QUICK_STARTS.map((quickStart) => {
        const Icon = quickStart.icon
        return (
          <button
            key={quickStart.id}
            type="button"
            onClick={() => onSelect(quickStart)}
            className="body-4 text-muted-foreground hover:text-foreground hover:bg-hover-subtle border-border gap-spacing-1 px-spacing-2 py-spacing-1 inline-flex shrink-0 items-center rounded-full border bg-transparent transition-colors"
          >
            <Icon className="icon-sm shrink-0" aria-hidden />
            <span>{quickStart.label}</span>
          </button>
        )
      })}
    </div>
  )
}
