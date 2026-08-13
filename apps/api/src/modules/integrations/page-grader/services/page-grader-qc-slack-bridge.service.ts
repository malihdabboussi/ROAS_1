import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { SlackApiIntegration } from '../../../slack/integrations/slack-api.integration'
import { SlackAgentToolsService } from '../../../slack/services/slack-agent-tools.service'
import type { SlackBlock } from '../../../slack/types/slack.types'
import { PageGraderQcNotificationWebhookSchema } from '../dto/page-grader.dto'
import { PageGraderApiService } from './page-grader-api.service'
import { PageGraderBrainSyncService } from './page-grader-brain-sync.service'

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

    for (const connection of connections) {
      try {
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
      await this.respond(payload.response_url, result.confirmation)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Page Grader QC action failed: ${message}`)
      await this.respond(payload.response_url, `:warning: ${message}`)
    }
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
