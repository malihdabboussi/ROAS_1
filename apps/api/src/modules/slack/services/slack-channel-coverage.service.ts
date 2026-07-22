import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackObservationRepository } from '../repositories/slack-observation.repository'
import { SlackPeopleRepository } from '../repositories/slack-people.repository'

@Injectable()
export class SlackChannelCoverageService {
  constructor(
    private readonly observation: SlackObservationRepository,
    private readonly people: SlackPeopleRepository,
  ) {}

  async getCoverage(supabase: SupabaseClient, orgId: string) {
    const integration = await this.people.findOrgSlackIntegration(supabase, orgId)
    if (!integration) return { summary: this.emptySummary(), channels: [] }
    const slackTeamId = String(integration.metadata.team_id ?? '')
    if (!slackTeamId) return { summary: this.emptySummary(), channels: [] }
    const channels = await this.observation.listChannelSettings(supabase, { orgId, slackTeamId })
    return {
      summary: {
        discovered: channels.length,
        joined: channels.filter((channel) => channel.is_member && !channel.is_excluded).length,
        observed: channels.filter((channel) => channel.join_status === 'observed').length,
        excluded: channels.filter((channel) => channel.is_excluded).length,
        inaccessible: channels.filter((channel) => channel.join_status === 'inaccessible').length,
      },
      channels,
    }
  }

  async setExclusion(
    supabase: SupabaseClient,
    input: { orgId: string; channelId: string; excluded: boolean; reason?: string | null },
  ) {
    if (!input.channelId.trim()) throw new BadRequestException('Slack channel is required')
    await this.observation.updateChannelExclusion(supabase, input)
    return this.getCoverage(supabase, input.orgId)
  }

  private emptySummary() {
    return { discovered: 0, joined: 0, observed: 0, excluded: 0, inaccessible: 0 }
  }
}
