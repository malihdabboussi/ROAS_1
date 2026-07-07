import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SpaceAutomationService } from '../../../spaces/services/space-automation.service'
import { SpacesRepository } from '../../../spaces/repositories/spaces.repository'
import { CursorIntegration } from '../integrations/cursor.integration'
import { CursorRepository } from '../repositories/cursor.repository'
import type { CursorWebhookEvent } from '../types/cursor.types'

export type CursorWebhookHandleInput = {
  rawBody: Buffer
  signature?: string
  webhookId?: string
}

export type CursorWebhookHandleResult = {
  success: boolean
  status: number
  error?: string
}

@Injectable()
export class CursorWebhookService {
  private readonly logger = new Logger(CursorWebhookService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly cursor: CursorIntegration,
    private readonly cursorRepo: CursorRepository,
    private readonly repo: SpacesRepository,
    @Inject(forwardRef(() => SpaceAutomationService))
    private readonly automationService: SpaceAutomationService,
  ) {}

  private getServiceClient(): SupabaseClient | null {
    const url = this.configService.get<string>('SUPABASE_URL') ?? process.env.SUPABASE_URL ?? ''
    const key =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      ''
    if (!url || !key) return null
    return this.cursorRepo.getServiceClient()
  }

  async handleEvent(input: CursorWebhookHandleInput): Promise<CursorWebhookHandleResult> {
    const admin = this.getServiceClient()
    if (!admin) {
      return { success: false, status: 500, error: 'Service client unavailable' }
    }

    let event: CursorWebhookEvent
    try {
      event = JSON.parse(input.rawBody.toString('utf8')) as CursorWebhookEvent
    } catch {
      return { success: false, status: 400, error: 'Invalid JSON body' }
    }

    const agentId = String(event.id ?? '').trim()
    if (!agentId) {
      return { success: false, status: 400, error: 'Missing agent id' }
    }

    if (input.webhookId) {
      const idempotencyError = await this.cursorRepo.insertWebhookEvent(admin, {
        webhook_id: input.webhookId,
        agent_id: agentId,
        event_type: event.event,
        status: String(event.status ?? ''),
      })
      if (idempotencyError?.code === '23505') {
        return { success: true, status: 200 }
      }
      if (idempotencyError) {
        this.logger.error(`cursor_webhook_events insert failed: ${idempotencyError.message}`)
      }
    }

    const item = await this.cursorRepo.findSpaceItemByCursorAgentId(admin, agentId)

    if (!item) {
      this.logger.warn(`No space item for cursor agent ${agentId}`)
      return { success: true, status: 200 }
    }

    const customData = (item.custom_data ?? {}) as Record<string, unknown>
    const connectionId = String(customData.cursor_connection_id ?? '').trim()
    if (!connectionId) {
      return { success: false, status: 400, error: 'Task missing cursor_connection_id' }
    }

    const metadata = await this.cursorRepo.findConnectionMetadata(admin, connectionId)
    const webhookSecret = typeof metadata.webhook_secret === 'string' ? metadata.webhook_secret : ''

    if (
      webhookSecret &&
      !this.cursor.verifyWebhookSignature(webhookSecret, input.rawBody, input.signature)
    ) {
      return { success: false, status: 401, error: 'Invalid webhook signature' }
    }

    const status = String(event.status ?? '').toUpperCase()
    const isSuccess = status === 'FINISHED'
    const isFailure = status === 'ERROR' || status === 'EXPIRED'

    if (!isSuccess && !isFailure) {
      return { success: true, status: 200 }
    }

    const nextCustom: Record<string, unknown> = {
      ...customData,
      cursor_agent_url: event.target?.url ?? customData.cursor_agent_url,
      cursor_branch: event.target?.branchName ?? customData.cursor_branch,
      cursor_summary: event.summary ?? customData.cursor_summary,
    }
    if (isSuccess && event.target?.prUrl) {
      nextCustom.cursor_pr_url = event.target.prUrl
    }
    if (isFailure) {
      nextCustom.cursor_error = event.summary ?? 'Cursor agent failed'
    }

    await this.cursorRepo.updateSpaceItemCursorResult(
      admin,
      item,
      {
        custom_data: nextCustom,
        task_execution_status: isSuccess ? 'done' : 'failed',
        updated_at: new Date().toISOString(),
      },
    )

    const prUrl = typeof event.target?.prUrl === 'string' ? event.target.prUrl : ''
    const agentUrl = typeof event.target?.url === 'string' ? event.target.url : ''
    const summary = typeof event.summary === 'string' ? event.summary : ''
    const messageParts = [
      isSuccess ? 'Cursor finished.' : 'Cursor agent failed.',
      summary ? `Summary: ${summary}` : null,
      agentUrl ? `Agent: ${agentUrl}` : null,
      prUrl ? `PR: ${prUrl}` : null,
    ].filter(Boolean)

    await this.repo.createActivity(admin, {
      item_id: String(item.id),
      space_id: String(item.space_id),
      user_id: String(item.user_id),
      org_id: item.org_id != null ? String(item.org_id) : null,
      event_type: 'automation_comment',
      actor_kind: 'automation',
      payload: { message: messageParts.join('\n'), automation: true, source: 'cursor_webhook' },
    })

    const pausedRun = await this.cursorRepo.findLatestPausedRunForItem(admin, item.id)

    if (pausedRun?.id) {
      this.automationService
        .resumeAutomation(
          {
            supabase: admin,
            userId: String(item.user_id),
            orgId: item.org_id != null ? String(item.org_id) : null,
            spaceId: String(item.space_id),
            itemId: String(item.id),
            depth: 0,
          },
          String(pausedRun.id),
          isSuccess ? 'done' : 'failed',
        )
        .catch((err) => {
          this.logger.error(`Cursor webhook automation resume failed: ${err}`)
        })
    }

    return { success: true, status: 200 }
  }
}
