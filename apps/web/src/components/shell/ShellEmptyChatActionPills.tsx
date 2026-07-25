'use client'

import { SHELL_EMPTY_CHAT_ACTIONS } from '@/components/shell/shell-empty-chat-prompts.config'
import { cn } from '@/lib/utils/cn'

export function ShellEmptyChatActionPills({
  onSelect,
  className,
}: {
  onSelect: (prompt: string) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-spacing-2 gap-spacing-2 flex w-full max-w-3xl flex-wrap items-center justify-center',
        className,
      )}
      role="group"
      aria-label="Quick actions"
    >
      {SHELL_EMPTY_CHAT_ACTIONS.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onSelect(action.prompt)}
            className="body-4 text-muted-foreground hover:text-foreground hover:bg-hover-subtle border-border gap-spacing-1 px-spacing-2 py-spacing-1 inline-flex items-center rounded-full border bg-transparent transition-colors"
          >
            <Icon className="icon-sm shrink-0" aria-hidden />
            <span>{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}
