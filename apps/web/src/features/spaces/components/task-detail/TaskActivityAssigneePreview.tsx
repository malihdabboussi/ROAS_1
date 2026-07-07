'use client'

import { useMemo } from 'react'
import { Bot } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import {
  extractAssigneesFromActivitySide,
  resolveAssigneeDisplayName,
  resolveAssigneeRosterEntries,
  shouldRenderAssigneeActivityPreview,
} from '../../lib/format-assignee-change-activity'
import { RosterMemberAvatar } from '../cells/AssigneeCell'

export { shouldRenderAssigneeActivityPreview }

function AssigneeNameLabel({
  entry,
  currentUserId,
}: {
  entry: TeamRosterEntry
  currentUserId: string | null
}) {
  const isMe = entry.kind === 'human' && currentUserId != null && entry.user_id === currentUserId
  return (
    <span className="body-3 min-w-0 truncate font-medium text-[var(--color-foreground)]">
      {isMe ? 'Me' : entry.display_name}
    </span>
  )
}

function LegacyAssigneeNamePreview({ name }: { name: string }) {
  return (
    <span className="gap-spacing-2 flex min-w-0 items-center">
      <span className="bg-muted text-muted-foreground inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase">
        {name.charAt(0) || '?'}
      </span>
      <span className="body-3 min-w-0 truncate font-medium text-[var(--color-foreground)]">
        {name}
      </span>
    </span>
  )
}

function RosterAssigneeRow({
  entry,
  currentUserId,
}: {
  entry: TeamRosterEntry
  currentUserId: string | null
}) {
  return (
    <span className="gap-spacing-2 flex min-w-0 items-center">
      {entry.kind === 'agent' && !entry.avatar_url ? (
        <span className="bg-muted text-muted-foreground inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
          <Bot className="h-3 w-3" />
        </span>
      ) : (
        <RosterMemberAvatar entry={entry} size={24} />
      )}
      <AssigneeNameLabel entry={entry} currentUserId={currentUserId} />
    </span>
  )
}

export function TaskActivityAssigneePreview({
  to,
  roster,
  currentUserId,
}: {
  to?: unknown
  roster: TeamRosterEntry[]
  currentUserId: string | null
}) {
  const content = useMemo(() => {
    if (typeof to === 'string') {
      const name = to.trim()
      if (!name) return null
      return <LegacyAssigneeNamePreview name={name} />
    }

    const refs = extractAssigneesFromActivitySide(to)
    const entries = resolveAssigneeRosterEntries(to, roster)

    if (entries.length > 0) {
      return (
        <div className="gap-spacing-2 flex min-w-0 flex-col">
          {entries.map((entry) => (
            <RosterAssigneeRow
              key={entry.participant_id}
              entry={entry}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )
    }

    if (refs.length > 0) {
      return (
        <div className="gap-spacing-2 flex min-w-0 flex-col">
          {refs.map((ref) => (
            <span
              key={`${ref.type}:${ref.id}`}
              className="body-3 min-w-0 truncate font-medium text-[var(--color-foreground)]"
            >
              {resolveAssigneeDisplayName(ref, roster)}
            </span>
          ))}
        </div>
      )
    }

    return null
  }, [to, roster, currentUserId])

  if (!content) return null

  return <div className="mt-spacing-1 flex min-w-0">{content}</div>
}
