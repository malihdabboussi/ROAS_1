import type { ConversationShareRosterEntry } from './ConversationShareTypes'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
}

export function ConversationShareMemberAvatar({
  entry,
  size = 'md',
}: {
  entry: ConversationShareRosterEntry
  size?: 'sm' | 'md'
}) {
  const sizeClass = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'

  if (entry.avatar_url) {
    return (
      <img
        src={entry.avatar_url}
        alt={entry.display_name}
        className={`${sizeClass} rounded-full object-cover`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} bg-secondary text-foreground typo-caption flex shrink-0 items-center justify-center rounded-full font-semibold`}
    >
      {getInitials(entry.display_name)}
    </div>
  )
}
