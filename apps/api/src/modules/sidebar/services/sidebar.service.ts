import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { AgentTeamsService } from '../../agent-teams/services/agent-teams.service'
import { ChannelsService } from '../../channels/services/channels.service'
import { DmService } from '../../dm/services/dm.service'
import { MissionsAgentOperationsService } from '../../missions/services/missions-agent-operations.service'
import { TeamRosterService } from '../../team-roster/services/team-roster.service'

export interface SidebarPerson {
  user_id: string
  display_name: string
  avatar_url: string | null
  status_emoji: string | null
  status_text: string | null
  org_role: string | null
  last_dm_at: string | null
}

@Injectable()
export class SidebarService {
  constructor(
    private readonly agentTeamsService: AgentTeamsService,
    private readonly channelsService: ChannelsService,
    private readonly dmService: DmService,
    private readonly missionsAgentOperationsService: MissionsAgentOperationsService,
    private readonly teamRosterService: TeamRosterService,
  ) {}

  async getTeam2Bootstrap(supabase: SupabaseClient, userId: string, scope: RequestScope) {
    const [teams, agents, channelsResponse, unreadCountsResponse, dmUnreadCountsResponse, people] =
      await Promise.all([
        this.agentTeamsService.listTeams(supabase, scope),
        this.missionsAgentOperationsService.listAgentsSlim(supabase, userId, scope.orgId),
        this.channelsService.listChannels(supabase, scope),
        this.channelsService.getUnreadCounts(supabase, scope),
        this.dmService.getUnreadCounts(supabase, scope),
        this.getPeople(supabase, userId, scope),
      ])

    return {
      teams,
      agents,
      channels: channelsResponse.channels,
      unread_counts: unreadCountsResponse.counts,
      dm_unread_counts: dmUnreadCountsResponse.counts,
      people,
    }
  }

  async getPeople(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
  ): Promise<SidebarPerson[]> {
    const [roster, dms] = await Promise.all([
      this.teamRosterService.list(supabase, userId, scope.orgId, {
        kind: 'human',
        ready_only: false,
      }),
      this.dmService.listDms(supabase, scope),
    ])

    const dmByUser = new Map<
      string,
      { lastAt: string | null; statusEmoji: string | null; statusText: string | null }
    >()
    for (const dm of dms) {
      dmByUser.set(dm.partner.id, {
        lastAt: dm.last_message_at,
        statusEmoji: dm.partner.status_emoji,
        statusText: dm.partner.status_text,
      })
    }

    const people: SidebarPerson[] = []
    for (const entry of roster) {
      if (!entry.user_id) continue
      if (entry.user_id === userId) continue
      const dmInfo = dmByUser.get(entry.user_id)
      people.push({
        user_id: entry.user_id,
        display_name: entry.display_name,
        avatar_url: entry.avatar_url,
        status_emoji: dmInfo?.statusEmoji ?? null,
        status_text: dmInfo?.statusText ?? null,
        org_role: entry.org_role,
        last_dm_at: dmInfo?.lastAt ?? null,
      })
    }

    people.sort((a, b) => {
      const at = a.last_dm_at ? new Date(a.last_dm_at).getTime() : 0
      const bt = b.last_dm_at ? new Date(b.last_dm_at).getTime() : 0
      if (at !== bt) return bt - at
      return a.display_name.localeCompare(b.display_name)
    })

    return people
  }
}
