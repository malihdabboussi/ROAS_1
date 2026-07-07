import type { TeamRosterEntry } from '@/lib/team'
import { channelsService } from './channels-api'

export async function addRosterEntriesToChannel(
  channelId: string,
  entries: TeamRosterEntry[],
): Promise<void> {
  for (const entry of entries) {
    if (entry.kind === 'human' && entry.user_id) {
      await channelsService.addMember(channelId, {
        member_type: 'user',
        user_id: entry.user_id,
        role: 'edit',
      })
    }

    if (entry.kind === 'agent' && entry.agent_key) {
      await channelsService.addMember(channelId, {
        member_type: 'agent',
        agent_key: entry.agent_key,
        role: 'edit',
      })
    }
  }
}
