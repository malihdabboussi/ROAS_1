'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function ShellAiChatsButton({
  active = false,
  compact = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className,
}: {
  active?: boolean
  /** Shrink the pill so it fits the collapsed rail when the chat drawer is open. */
  compact?: boolean
  onClick: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  className?: string
}) {
  const label = active ? 'Collapse AI Chats' : 'Open AI Chats'
  const Chevron = active ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'shell-ai-chats-button body-4 font-semibold',
        active && 'shell-ai-chats-button-active',
        compact && 'shell-ai-chats-button-compact',
        className,
      )}
    >
      <span className={cn(compact && 'shell-ai-chats-button-label-compact')}>AI Chats</span>
      <Chevron className="icon-sm shrink-0" aria-hidden />
    </button>
  )
}
