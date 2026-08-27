import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { SlackApiIntegration } from '../../../slack/integrations/slack-api.integration'
import { SlackAgentToolsService } from '../../../slack/services/slack-agent-tools.service'
import type { SlackBlock } from '../../../slack/types/slack.types'
import { SlackOpenItemsService } from '../../../spaces/services/slack-open-items.service'
import { PageGraderQcNotificationWebhookSchema } from '../dto/page-grader.dto'
import { PageGraderApiService } from './page-grader-api.service'
import { PageGraderBrainSyncService } from './page-grader-brain-sync.service'
import { resolveQcConnectionOrg } from './page-grader-qc-connection-org'
import {
  decideQcSlackDelivery,
  fingerprintFindings,
  QC_CASE_TYPES,
  QC_SLACK_ANCHOR_LOOKBACK_MS,
  qcSlackAnchorFromCase,
  uniqueFindingSummaries,
} from './page-grader-qc-follow-up'

type QcActionContext = {
  source: 'page_grader_qc'
  finding_id: string
  page_grader_user_id: string
  page_grader_org_id: string | null
}

type SlackInteractionPayload = {
  user?: { id?: string; name?: string }
  actions?: Array<{ action_id?: string; value?: string }>
  response_url?: string
}

@Injectable()
export class PageGraderQcSlackBridgeService {
  private readonly logger = new Logger(PageGraderQcSlackBridgeService.name)

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly sync: PageGraderBrainSyncService,
    private readonly pageGraderApi: PageGraderApiService,
    private readonly slackTools: SlackAgentToolsService,
    private readonly slackApi: SlackApiIntegration,
    private readonly cases: SlackOpenItemsService,
  ) {}

  async deliverNotification(rawBody: string, signature: string) {
    let raw: unknown
    try {
      raw = JSON.parse(rawBody)
    } catch {
      throw new BadRequestException('Invalid JSON body')
    }
    const parsed = PageGraderQcNotificationWebhookSchema.safeParse(raw)
    if (!parsed.success) throw new BadRequestException('Invalid QC notification payload')
    const payload = parsed.data
    const connections = await this.sync.authorizeWebhookSecret(signature)
    const errors: string[] = []

    for (const rawConnection of connections) {
      try {
        const connection = await this.withResolvedOrg(rawConnection, payload)
        const findings = await this.recordCases(connection, payload)
        const delivered = await this.deliverSlack(connection, payload, findings)
        return {
          success: true,
          notification_id: payload.notification_id,
          channel: delivered.channel,
          ts: delivered.ts,
          sender: 'roas_platform',
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error))
      }
    }

    throw new BadRequestException(
      `ROAS Platform could not deliver the QC notification: ${errors.join('; ')}`,
    )
  }

  beginInteractionProcessing(input: {
    rawBody?: Buffer
    signature?: string
    timestamp?: string
  }): Promise<void> | null {
    const signingSecret = process.env.SLACK_SIGNING_SECRET
    if (!signingSecret) throw new UnauthorizedException('Slack signing is not configured')
    if (!input.rawBody || !input.signature || !input.timestamp) {
      throw new UnauthorizedException('Missing Slack signature headers or raw body')
    }
    if (
      !this.slackApi.verifyRequestSignature(
        input.rawBody,
        input.timestamp,
        input.signature,
        signingSecret,
      )
    ) {
      throw new UnauthorizedException('Invalid Slack request signature')
    }

    const payloadText = new URLSearchParams(input.rawBody.toString('utf8')).get('payload')
    if (!payloadText) throw new BadRequestException('Missing Slack interaction payload')
    let payload: SlackInteractionPayload
    try {
      payload = JSON.parse(payloadText) as SlackInteractionPayload
    } catch {
      throw new BadRequestException('Invalid Slack interaction payload')
    }
    const action = payload.actions?.[0]
    if (!action?.action_id?.startsWith('qc_')) return null
    if (action.action_id === 'qc_open_finding' || action.action_id === 'qc_open_dashboard') {
      return null
    }
    return this.processQcAction(action.action_id, action.value, payload)
  }

  private bindActionContext(
    blocks: Array<Record<string, unknown>>,
    findingIds: Set<string>,
    userId: string,
    orgId: string | null,
  ): SlackBlock[] {
    return blocks.map((block) => {
      if (block.type !== 'actions' || !Array.isArray(block.elements)) return block as SlackBlock
      return {
        ...block,
        elements: block.elements.map((element) => {
          if (!element || typeof element !== 'object') return element
          const button = element as Record<string, unknown>
          const actionId = String(button.action_id ?? '')
          const findingId = String(button.value ?? '')
          if (!['qc_acknowledge', 'qc_resolve', 'qc_snooze_tomorrow'].includes(actionId)) {
            return button
          }
          if (!findingIds.has(findingId)) {
            throw new BadRequestException('QC block contains an unknown finding action')
          }
          const context: QcActionContext = {
            source: 'page_grader_qc',
            finding_id: findingId,
            page_grader_user_id: userId,
            page_grader_org_id: orgId,
          }
          return { ...button, value: JSON.stringify(context) }
        }),
      } as SlackBlock
    })
  }

  private async processQcAction(
    actionId: string,
    value: string | undefined,
    payload: SlackInteractionPayload,
  ): Promise<void> {
    const context = this.parseActionContext(value)
    const slackUserId = String(payload.user?.id ?? '').trim()
    if (!slackUserId) throw new BadRequestException('Slack user is required')
    const action =
      actionId === 'qc_acknowledge'
        ? 'acknowledge'
        : actionId === 'qc_resolve'
          ? 'resolve'
          : actionId === 'qc_snooze_tomorrow'
            ? 'snooze_tomorrow'
            : null
    if (!action) return

    try {
      const result = await this.pageGraderApi.applyQcAction(
        context.page_grader_user_id,
        context.finding_id,
        {
          action,
          slack_user_id: slackUserId,
          slack_user_name: payload.user?.name,
        },
      )
      if (context.page_grader_org_id) {
        await this.cases.applyExternalAction(this.svc.client, {
          orgId: context.page_grader_org_id,
          sourceType: 'page_grader_qc',
          sourceKey: context.finding_id,
          action,
        })
      }
      await this.respond(payload.response_url, result.confirmation)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Page Grader QC action failed: ${message}`)
      await this.respond(payload.response_url, `:warning: ${message}`)
    }
  }

  private async deliverSlack(
    connection: { userId: string; orgId: string | null },
    payload: ReturnType<typeof PageGraderQcNotificationWebhookSchema.parse>,
    findings: Array<{
      id: string
      type: string
      summary: string
      client_id: string | null
      client_name: string | null
      campaignId: string | null
    }>,
  ): Promise<{ channel: string | null; ts: string | null }> {
    const now = new Date()
    const fingerprint = fingerprintFindings(findings)
    const clientLabel = findings.find((finding) => finding.client_name)?.client_name ?? null
    const campaignId = findings.find((finding) => finding.campaignId)?.campaignId ?? null
    const externalClientId = findings.find((finding) => finding.client_id)?.client_id ?? null
    const sourceKeys = findings.map((finding) => finding.id)
    const anchorItem =
      connection.orgId &&
      (await this.cases.findQcSlackAnchor(this.svc.client, {
        orgId: connection.orgId,
        sourceType: 'page_grader_qc',
        caseTypes: [...QC_CASE_TYPES],
        sinceIso: new Date(now.getTime() - QC_SLACK_ANCHOR_LOOKBACK_MS).toISOString(),
        campaignId,
        externalClientId,
        clientLabel,
        sourceKeys,
        pageGraderUserId: connection.userId,
      }))
    const anchor = anchorItem ? qcSlackAnchorFromCase(anchorItem) : null
    const decision = decideQcSlackDelivery({
      now,
      fingerprint,
      clientLabel,
      summaries: uniqueFindingSummaries(findings),
      anchor,
    })

    if (decision.mode === 'skip' && anchor) {
      await this.stampDelivery(connection.orgId, sourceKeys, {
        channelId: anchor.slack_channel,
        parentTs: anchor.slack_parent_ts,
        fingerprint,
        followedUpAt: anchor.slack_last_follow_up_at ?? anchor.first_seen_at ?? now.toISOString(),
      })
      return { channel: anchor.slack_channel, ts: anchor.slack_parent_ts }
    }

    if (decision.mode === 'thread' && anchor) {
      const delivered = await this.slackTools.sendMessage(
        this.svc.client,
        connection.userId,
        connection.orgId,
        {
          channel_id: anchor.slack_channel,
          text: decision.text,
          thread_ts: anchor.slack_parent_ts,
        },
      )
      const channel = delivered.channel || anchor.slack_channel
      const ts = delivered.ts || anchor.slack_parent_ts
      await this.stampDelivery(connection.orgId, sourceKeys, {
        channelId: channel,
        parentTs: anchor.slack_parent_ts,
        fingerprint,
        followedUpAt: now.toISOString(),
      })
      return { channel, ts }
    }

    const blocks = this.bindActionContext(
      payload.blocks,
      new Set(payload.finding_ids),
      connection.userId,
      connection.orgId,
    )
    const delivered = await this.slackTools.sendBlockMessageToTarget(
      this.svc.client,
      connection.userId,
      connection.orgId,
      {
        // Prefer a fresh DM opened by the ROAS Slack app. A DM channel ID
        // created by Page Grader's legacy bot may not be writable by ROAS.
        slackUserId: payload.admin_slack_user_id,
        channelId: payload.admin_slack_user_id ? null : payload.admin_slack_channel_id,
        text: payload.fallback_text,
        blocks,
      },
    )
    if (delivered.channel && delivered.ts) {
      await this.stampDelivery(connection.orgId, sourceKeys, {
        channelId: delivered.channel,
        parentTs: delivered.ts,
        fingerprint,
        followedUpAt: now.toISOString(),
      })
    }
    return { channel: delivered.channel ?? null, ts: delivered.ts ?? null }
  }

  private async stampDelivery(
    orgId: string | null,
    sourceKeys: string[],
    input: { channelId: string; parentTs: string; fingerprint: string; followedUpAt: string },
  ): Promise<void> {
    if (!orgId) return
    await this.cases.attachSlackDelivery(this.svc.client, {
      orgId,
      sourceType: 'page_grader_qc',
      sourceKeys,
      ...input,
    })
  }

  /** Personal Page Grader rows carry no org; derive it so the case ledger + dedup anchor work. */
  private async withResolvedOrg(
    connection: { userId: string; orgId: string | null },
    payload: ReturnType<typeof PageGraderQcNotificationWebhookSchema.parse>,
  ): Promise<{ userId: string; orgId: string | null }> {
    if (connection.orgId) return connection
    const scopeMap = await this.pageGraderApi.getClientScopeMap(connection.userId).catch(() => ({}))
    const campaignIds = (payload.findings ?? []).map(
      (finding) =>
        finding.roas_campaign_id ??
        (finding.client_id ? scopeMap[finding.client_id]?.campaign_id : null) ??
        null,
    )
    const resolved = await resolveQcConnectionOrg(this.svc.client, connection, { campaignIds })
    if (!resolved.orgId) {
      this.logger.warn(
        `Page Grader QC connection for user ${connection.userId} has no org; cases and dedup are disabled`,
      )
      return connection
    }
    this.logger.log(
      `Page Grader QC connection for user ${connection.userId} resolved org ${resolved.orgId} via ${resolved.via}`,
    )
    return { userId: connection.userId, orgId: resolved.orgId }
  }

  private async recordCases(
    connection: { userId: string; orgId: string | null },
    payload: ReturnType<typeof PageGraderQcNotificationWebhookSchema.parse>,
  ): Promise<
    Array<{
      id: string
      type: string
      summary: string
      client_id: string | null
      client_name: string | null
      campaignId: string | null
    }>
  > {
    const findings = payload.findings?.length
      ? payload.findings
      : payload.finding_ids.map((id) => ({
          id,
          type: 'quality_control' as const,
          summary: payload.fallback_text,
          client_id: null,
          client_name: null,
          page_grader_campaign_id: null,
          roas_campaign_id: null,
          roas_space_id: null,
          severity: 'normal' as const,
          due_at: null,
        }))
    const unknownFinding = findings.find((finding) => !payload.finding_ids.includes(finding.id))
    if (unknownFinding) {
      throw new BadRequestException('QC finding details contain an unknown finding')
    }
    const scopeMap = await this.pageGraderApi.getClientScopeMap(connection.userId)
    const recorded: Array<{
      id: string
      type: string
      summary: string
      client_id: string | null
      client_name: string | null
      campaignId: string | null
    }> = []
    for (const finding of findings) {
      const clientId = finding.client_id ?? null
      const mapped = clientId ? scopeMap[clientId] : null
      const clientName = finding.client_name ?? mapped?.campaign_name ?? null
      const campaignId = finding.roas_campaign_id ?? mapped?.campaign_id ?? null
      if (connection.orgId) {
        await this.cases.recordExternal(this.svc.client, {
          orgId: connection.orgId,
          caseType: finding.type,
          sourceType: 'page_grader_qc',
          sourceKey: finding.id,
          summary: finding.summary,
          severity: finding.severity ?? 'normal',
          clientLabel: clientName,
          externalClientId: clientId,
          externalCampaignId: finding.page_grader_campaign_id ?? null,
          campaignId,
          spaceId: finding.roas_space_id ?? mapped?.space_id ?? null,
          dueAt: finding.due_at ?? null,
          metadata: {
            notification_id: payload.notification_id,
            page_grader_user_id: connection.userId,
          },
        })
      }
      recorded.push({
        id: finding.id,
        type: finding.type,
        summary: finding.summary,
        client_id: clientId,
        client_name: clientName,
        campaignId,
      })
    }
    return recorded
  }

  private parseActionContext(value: string | undefined): QcActionContext {
    try {
      const parsed = JSON.parse(String(value ?? '')) as QcActionContext
      if (parsed.source !== 'page_grader_qc' || !parsed.finding_id || !parsed.page_grader_user_id) {
        throw new Error('invalid context')
      }
      return parsed
    } catch {
      throw new BadRequestException('Invalid Page Grader QC action context')
    }
  }

  private async respond(responseUrl: string | undefined, text: string): Promise<void> {
    if (!responseUrl) return
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response_type: 'ephemeral', replace_original: false, text }),
    })
  }
}
