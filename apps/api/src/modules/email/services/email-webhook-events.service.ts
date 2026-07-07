import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { EmailRuntimeRepository } from '../repositories/email-runtime.repository'
import type { SendGridWebhookEvent } from '../types/email.types'

const EVENT_TO_STATUS: Record<string, string> = {
  delivered: 'delivered',
  bounce: 'bounced',
  dropped: 'dropped',
  deferred: 'deferred',
  open: 'opened',
  click: 'clicked',
  spamreport: 'spam',
  spam_report: 'spam',
  unsubscribe: 'unsubscribed',
}

const SUPPRESSION_EVENTS = new Set(['bounce', 'spamreport', 'spam_report'])

@Injectable()
export class EmailWebhookEventsService {
  constructor(
    private readonly serviceClient: SupabaseServiceClient,
    private readonly emailRuntime: EmailRuntimeRepository = new EmailRuntimeRepository(),
  ) {}

  async processEvent(event: SendGridWebhookEvent): Promise<void> {
    const admin = this.serviceClient.client
    const sgMessageId = (event.sg_message_id || '').replace(/<|>/g, '').split('.')[0]
    if (!sgMessageId) return

    const sendRow = await this.emailRuntime.findSendBySendGridMessageId(admin, sgMessageId)
    if (!sendRow) return

    const eventTimestamp = new Date(event.timestamp * 1000).toISOString()
    const newStatus = EVENT_TO_STATUS[event.event]

    if (newStatus) {
      const statusUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (newStatus === 'delivered') statusUpdate.delivered_at = eventTimestamp
      if (newStatus === 'opened') statusUpdate.opened_at = eventTimestamp
      if (newStatus === 'clicked') statusUpdate.clicked_at = eventTimestamp
      statusUpdate.status = newStatus

      await this.emailRuntime.updateEmailSendStatus(admin, sendRow.id, statusUpdate)
    }

    await this.emailRuntime.createEmailEvent(admin, {
      email_send_id: sendRow.id,
      event_type: event.event,
      event_data: event as unknown as Record<string, unknown>,
      sg_event_id: event.sg_event_id || null,
      timestamp: eventTimestamp,
      ip_address: event.ip || null,
      user_agent: event.useragent || null,
      url: event.url || null,
    })

    if (SUPPRESSION_EVENTS.has(event.event) && event.email) {
      const bounceType = event.event === 'bounce' ? event.type || 'hard' : null
      const isHardBounce = event.event === 'bounce' && bounceType !== 'soft'
      const isSpam = event.event === 'spamreport' || event.event === 'spam_report'

      if (isHardBounce || isSpam) {
        const reason = isSpam ? 'spam_report' : 'hard_bounce'
        const existing = await this.emailRuntime.findSuppression(admin, {
          userId: sendRow.user_id,
          email: event.email,
          orgId: sendRow.org_id,
        })

        if (!existing) {
          await this.emailRuntime.createSuppression(admin, {
            user_id: sendRow.user_id,
            org_id: sendRow.org_id || null,
            email: event.email,
            reason,
            bounce_type: bounceType,
            bounce_reason: event.reason || null,
          })
        }
      }
    }
  }
}
