import type { ChannelMember } from '@/lib/channels/channel-types'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'

/** Build @-mention member list for task activity / send-to-agent composers from org roster. */
export function buildTaskComposerMembersFromRoster(
  roster: TeamRosterEntry[],
  currentUserId?: string | null,
  options?: { selfDisplayName?: string | null; selfAvatarUrl?: string | null },
): ChannelMember[] {
  const rosterHasMe =
    currentUserId != null && roster.some((e) => e.kind === 'human' && e.user_id === currentUserId)
  const selfHuman: ChannelMember[] =
    currentUserId && !rosterHasMe
      ? [
          {
            id: `task-auth-user-${currentUserId}`,
            channel_id: '',
            member_type: 'user' as const,
            user_id: currentUserId,
            agent_key: null,
            role: 'view' as const,
            added_by: null,
            joined_at: '',
            created_at: '',
            profile: {
              id: currentUserId,
              full_name: options?.selfDisplayName?.trim() || 'Me',
              avatar_url: options?.selfAvatarUrl ?? null,
            },
          },
        ]
      : []
  const fromRosterHumans: ChannelMember[] = roster
    .filter((e) => e.kind === 'human' && e.user_id)
    .map((e) => ({
      id: `task-roster-user-${e.user_id}`,
      channel_id: '',
      member_type: 'user' as const,
      user_id: e.user_id,
      agent_key: null,
      role: 'view' as const,
      added_by: null,
      joined_at: '',
      created_at: e.created_at ?? '',
      profile: {
        id: e.user_id!,
        full_name: e.display_name,
        avatar_url: e.avatar_url,
      },
    }))
  const fromRosterAgents: ChannelMember[] = roster
    .filter((e) => e.kind === 'agent' && e.agent_key)
    .map((e) => ({
      id: `task-roster-agent-${e.agent_key}`,
      channel_id: '',
      member_type: 'agent' as const,
      user_id: null,
      agent_key: e.agent_key,
      role: 'view' as const,
      added_by: null,
      joined_at: '',
      created_at: e.created_at ?? '',
      profile: {
        id: e.agent_key!,
        full_name: e.display_name || e.agent_key!,
        avatar_url: e.avatar_url,
      },
    }))
  return [...selfHuman, ...fromRosterHumans, ...fromRosterAgents]
}
