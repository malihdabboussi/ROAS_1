import type { ChannelMention } from '@/lib/channels'
import type { TeamRosterEntry } from '@/lib/team'

export function getMissingMentionRosterEntries(
  mentions: ChannelMention[],
  roster: TeamRosterEntry[],
  existingMemberKeys: Set<string>,
): TeamRosterEntry[] {
  const missing = new Map<string, TeamRosterEntry>()

  for (const mention of mentions) {
    const entry =
      mention.type === 'agent' && mention.agent_key
        ? roster.find(
            (candidate) => candidate.kind === 'agent' && candidate.agent_key === mention.agent_key,
          )
        : (mention.type === 'user' || mention.type === 'person') &&
            (mention.user_id || mention.entity_id)
          ? roster.find(
              (candidate) =>
                candidate.kind === 'human' &&
                candidate.user_id === (mention.user_id ?? mention.entity_id),
            )
          : undefined
    if (!entry) continue

    const key =
      entry.kind === 'agent' && entry.agent_key
        ? `agent:${entry.agent_key}`
        : entry.kind === 'human' && entry.user_id
          ? `human:${entry.user_id}`
          : null
    if (key && !existingMemberKeys.has(key)) missing.set(key, entry)
  }

  return [...missing.values()]
}
