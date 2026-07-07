'use client'

import { Bot } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team'
import { cn } from '@/lib/utils/cn'

function AgentAvatar({ entry, className }: { entry: TeamRosterEntry; className?: string }) {
  if (entry.avatar_url) {
    return (
      <img src={entry.avatar_url} alt="" className={cn('h-full w-full object-cover', className)} />
    )
  }
  return (
    <span
      className={cn(
        'bg-secondary text-muted-foreground flex h-full w-full items-center justify-center',
        className,
      )}
    >
      <Bot className="h-5 w-5" aria-hidden />
    </span>
  )
}

interface TeamHrChatAgentIdentityProps {
  entry: TeamRosterEntry
}

/** Static Jaime identity — same layout as SpaceChatAgentPicker, no dropdown. */
export function TeamHrChatAgentIdentity({ entry }: TeamHrChatAgentIdentityProps) {
  const roleLabel = entry.role_label?.trim() || 'HR Manager'

  return (
    <div
      className="rounded-spacing-2 gap-spacing-2 px-spacing-1 py-spacing-1 flex max-w-full shrink-0 items-center"
      aria-label={`Talking with ${entry.display_name}, ${roleLabel}`}
    >
      <div className="h-spacing-10 w-spacing-10 rounded-spacing-2 shrink-0 overflow-hidden">
        <AgentAvatar entry={entry} />
      </div>
      <div className="min-w-0 max-w-[10rem]">
        <div className="body-2 text-foreground truncate font-semibold leading-tight">
          {entry.display_name}
        </div>
        <div className="typo-caption text-muted-foreground truncate leading-tight">{roleLabel}</div>
      </div>
    </div>
  )
}
