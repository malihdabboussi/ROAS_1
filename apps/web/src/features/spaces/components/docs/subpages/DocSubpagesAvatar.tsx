'use client'

import { Bot } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'

export function DocSubpagesAvatar({ entry, size }: { entry: TeamRosterEntry; size: number }) {
  const parts = entry.display_name?.trim()?.split(/\s+/).filter(Boolean) ?? []
  const initials =
    parts.length >= 2
      ? `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase()
      : (parts[0]?.slice(0, 2).toUpperCase() ?? '?')
  if (entry.avatar_url) {
    return (
      <img
        src={entry.avatar_url}
        alt=""
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-[10px] font-semibold text-[var(--foreground)]"
      style={{ width: size, height: size }}
    >
      {entry.kind === 'agent' ? <Bot className="h-3 w-3" /> : initials.slice(0, 2)}
    </span>
  )
}
