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
    const mapped = await this.brainSync.authorizeWebhookClient(secret, payload.client_id)
    const results: Array<Record<string, unknown>> = []

    for (const mapping of mapped) {
      if (!mapping.orgId) {
        results.push({ user_id: mapping.userId, skipped: true, reason: 'organization_required' })
        continue
      }
      const slackTeamId = await this.resolveSlackTeamId(mapping.orgId)
      if (!slackTeamId) {
        results.push({
          user_id: mapping.userId,
          org_id: mapping.orgId,
          skipped: true,
          reason: 'slack_not_connected',
        })
        continue
      }

      const settings = await this.observations.listChannelSettings(this.svc.client, {
        orgId: mapping.orgId,
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
            orgId: mapping.orgId,
            slackTeamId,
            channelId: payload.channel_id,
            channelName,
            isPrivate: false,
            isMember: true,
          },
        ])
      }

      const events: SlackObservationEventInput[] = payload.messages.map((message) => ({
        orgId: mapping.orgId!,
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
          page_grader_campaign_id: mapping.entry.campaign_id,
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
        org_id: mapping.orgId,
        slack_team_id: slackTeamId,
        channel_id: payload.channel_id,
        accepted: events.length,
        upserted: stored.inserted,
      })
    }
    return { success: true, client_id: payload.client_id, results }
  }

  private async resolveSlackTeamId(orgId: string): Promise<string | null> {
    const { data, error } = await this.svc.client
      .from('user_integrations')
      .select('metadata')
      .eq('integration_id', 'slack')
      .eq('status', 'connected')
      .eq('org_id', orgId)
      .order('connected_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new BadRequestException(`Could not resolve Slack workspace: ${error.message}`)
    const metadata =
      data?.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : {}
    return typeof metadata.team_id === 'string' && metadata.team_id.trim()
      ? metadata.team_id.trim()
      : null
  }
}
