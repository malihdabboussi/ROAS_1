'use client'

import { SHELL_EMPTY_CHAT_CAPABILITIES } from '@/components/shell/shell-empty-chat-prompts.config'
import type { ShellChatQuickStart } from '@/components/shell/shell-empty-chat-prompts.config'
import { cn } from '@/lib/utils/cn'

function CapabilityChip({
  id,
  label,
  icon: Icon,
  quickStart,
  onSelect,
}: {
  id: string
  label: string
  icon: (typeof SHELL_EMPTY_CHAT_CAPABILITIES)[number]['icon']
  quickStart: ShellChatQuickStart
  onSelect: (quickStart: ShellChatQuickStart) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(quickStart)}
      className="shell-empty-capability-chip"
      data-capability-id={id}
    >
      <Icon className="icon-sm shrink-0" aria-hidden />
      <span>{label}</span>
    </button>
  )
}

export function ShellEmptyChatCapabilityScroller({
  onSelect,
  className,
}: {
  onSelect: (quickStart: ShellChatQuickStart) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'gap-x-spacing-3 gap-y-spacing-2 flex w-full flex-wrap items-center justify-center',
        className,
      )}
      role="group"
      aria-label="Suggested capabilities"
    >
      {SHELL_EMPTY_CHAT_CAPABILITIES.map((capability) => (
        <CapabilityChip
          key={capability.id}
          id={capability.id}
          label={capability.label}
          icon={capability.icon}
          quickStart={capability}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
