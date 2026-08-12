import type { AssigneeType } from '@/lib/spaces'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'

export interface AssigneeValue {
  type: Exclude<AssigneeType, 'unassigned'>
  id: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
}

export function matchEntry(entry: TeamRosterEntry, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    entry.display_name.toLowerCase().includes(q) ||
    (entry.email?.toLowerCase().includes(q) ?? false) ||
    (entry.role_label?.toLowerCase().includes(q) ?? false) ||
    (entry.agent_key?.toLowerCase().includes(q) ?? false)
  )
}

function resolveSelected(value: AssigneeValue, roster: TeamRosterEntry[]): TeamRosterEntry | null {
  if (value.type === 'agent') {
    return roster.find((entry) => entry.kind === 'agent' && entry.agent_key === value.id) ?? null
  }
  if (value.type === 'human') {
    return roster.find((entry) => entry.kind === 'human' && entry.user_id === value.id) ?? null
  }
  return null
}

export function resolveSelectedEntries(
  value: AssigneeValue[],
  roster: TeamRosterEntry[],
): TeamRosterEntry[] {
  return value
    .map((assignee) => resolveSelected(assignee, roster))
    .filter((entry): entry is TeamRosterEntry => entry != null)
}

export function RosterMemberAvatar({
  entry,
  size = 24,
}: {
  entry: TeamRosterEntry
  size?: number
}) {
  const initials = getInitials(entry.display_name)
  if (entry.avatar_url) {
    return (
      <img
        src={entry.avatar_url}
        alt={entry.display_name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-[10px] font-semibold text-[var(--foreground)]"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  )
}
