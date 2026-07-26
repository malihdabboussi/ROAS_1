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
  // Duplicate the track so the CSS marquee can loop seamlessly.
  const track = SHELL_EMPTY_CHAT_CAPABILITIES

  return (
    <div className={cn('shell-empty-capability-scroller-frame', className)}>
      <div
        className="shell-empty-capability-scroller"
        role="group"
        aria-label="Suggested capabilities"
      >
        <div className="shell-empty-capability-marquee" aria-hidden={false}>
          <div className="shell-empty-capability-marquee-track">
            {track.map((capability) => (
              <CapabilityChip
                key={`a-${capability.id}`}
                id={capability.id}
                label={capability.label}
                icon={capability.icon}
                quickStart={capability}
                onSelect={onSelect}
              />
            ))}
            {track.map((capability) => (
              <CapabilityChip
                key={`b-${capability.id}`}
                id={capability.id}
                label={capability.label}
                icon={capability.icon}
                quickStart={capability}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
