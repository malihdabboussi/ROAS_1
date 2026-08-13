import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { SlackObservationRepository } from '../../../slack/repositories/slack-observation.repository'
import type { SlackObservationEventInput } from '../../../slack/types/slack-observation.types'
import { PageGraderSlackMessagesWebhookSchema } from '../dto/page-grader.dto'
import { PageGraderBrainSyncService } from './page-grader-brain-sync.service'

@Injectable()
export class PageGraderSlackIngestService {
  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly brainSync: PageGraderBrainSyncService,
    private readonly observations: SlackObservationRepository,
  ) {}

  async processWebhook(rawBody: string, signature: string) {
    const secret = signature.trim()
    if (!secret) throw new UnauthorizedException('Missing webhook signature')
    let raw: unknown
    try {
      raw = JSON.parse(rawBody)
    } catch {
      throw new BadRequestException('Invalid JSON body')
    }
    const parsed = PageGraderSlackMessagesWebhookSchema.safeParse(raw)
    if (!parsed.success) throw new BadRequestException('Invalid Slack messages payload')
    const payload = parsed.data
    const mapped = await this.brainSync.authorizeWebhookClient(
      secret,
      payload.client_id,
      payload.client_name,
    )
    const results: Array<Record<string, unknown>> = []

    for (const mapping of mapped) {
      const destination = await this.resolveSlackDestination(mapping.userId, mapping.orgId)
      if (!destination) {
        results.push({
          user_id: mapping.userId,
          org_id: mapping.orgId ?? null,
          skipped: true,
          reason: 'slack_not_connected',
        })
        continue
      }
      const { orgId, slackTeamId } = destination

      const settings = await this.observations.listChannelSettings(this.svc.client, {
        orgId,
        slackTeamId,
      })
      const existingChannel = settings.find((row) => row.channel_id === payload.channel_id)
      const channelName =
        existingChannel?.channel_name ||
        payload.channel_name ||
        `page-grader-${payload.client_name}`
      if (!existingChannel) {
        await this.observations.upsertChannels(this.svc.client, [
          {
            orgId,
            slackTeamId,
            channelId: payload.channel_id,
            channelName,
            isPrivate: false,
            isMember: true,
          },
        ])
      }

      const events: SlackObservationEventInput[] = payload.messages.map((message) => ({
        orgId,
        slackTeamId,
        channelId: payload.channel_id,
        channelName,
        messageTs: message.ts,
        threadTs: message.thread_ts ?? null,
        senderSlackUserId: message.sender_slack_user_id ?? null,
        text: message.text.trim(),
        isBot: message.is_bot,
        source: 'reconciliation',
        metadata: {
          ingest_source: 'page_grader',
          page_grader_client_id: payload.client_id,
          page_grader_client_name: payload.client_name,
          page_grader_campaign_id: mapping.entry.campaign_id || null,
          page_grader_campaign_name: mapping.entry.campaign_name ?? null,
          page_grader_author_name: message.author_name ?? null,
          page_grader_message_date: message.date ?? null,
          page_grader_synced_at: payload.synced_at ?? null,
          ingest_contract_version: '1',
        },
      }))
      const stored = await this.observations.upsertEvents(this.svc.client, events, {
        replaceDuplicates: true,
      })
      results.push({
        user_id: mapping.userId,
        org_id: orgId,
        slack_team_id: slackTeamId,
        channel_id: payload.channel_id,
        accepted: events.length,
        upserted: stored.inserted,
      })
    }
    return { success: true, client_id: payload.client_id, results }
  }

  private async resolveSlackDestination(
    userId: string,
    mappedOrgId: string | null,
  ): Promise<{ orgId: string; slackTeamId: string } | null> {
    let query = this.svc.client
      .from('user_integrations')
      .select('org_id, metadata')
      .eq('integration_id', 'slack')
      .eq('status', 'connected')
    query = mappedOrgId
      ? query.eq('org_id', mappedOrgId)
      : query.eq('user_id', userId).not('org_id', 'is', null)
    const { data, error } = await query
      .order('connected_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new BadRequestException(`Could not resolve Slack workspace: ${error.message}`)
    const metadata =
      data?.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : {}
    const orgId = mappedOrgId || (typeof data?.org_id === 'string' ? data.org_id.trim() : '')
    const slackTeamId =
      typeof metadata.team_id === 'string' && metadata.team_id.trim() ? metadata.team_id.trim() : ''
    return orgId && slackTeamId ? { orgId, slackTeamId } : null
  }
}
