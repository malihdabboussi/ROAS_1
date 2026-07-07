import * as crypto from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import sgMail from '@sendgrid/mail'
import { DatabaseService } from '../../../lib/services/database.service'
import { QueueLoggerService } from '../../logger'
import { EmailProviderHelper, GhlEmailHelper } from '../../shared'
import type { SingleEmailJobResult } from '../types'

@Injectable()
export class SingleEmailService {
  private readonly logger = new Logger(SingleEmailService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly queueLoggerService: QueueLoggerService,
    private readonly ghlEmailHelper: GhlEmailHelper,
    private readonly emailProviderHelper: EmailProviderHelper,
  ) {
    const apiKey = this.configService.get<string>('sendgrid.apiKey')
    if (!apiKey) return
    sgMail.setApiKey(apiKey)
  }

  async processSchedule(scheduleId: string): Promise<SingleEmailJobResult> {
    const supabase = this.databaseService.getClient()

    const { data: schedule, error: scheduleError } = await supabase
      .from('email_single_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single()
    if (scheduleError || !schedule)
      throw new Error(`Single schedule not found: ${scheduleError?.message || scheduleId}`)

    if (schedule.status !== 'scheduled' && schedule.status !== 'processing') {
      return {
        scheduleId,
        success: false,
        error: `Schedule status is ${schedule.status}`,
        processedAt: new Date().toISOString(),
      }
    }

    await supabase
      .from('email_single_schedules')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', scheduleId)

    try {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, user_id, org_id, email, name, phone, ghl_contact_id')
        .eq('id', schedule.lead_id)
        .single()
      if (leadError || !lead)
        throw new Error(`Lead not found: ${leadError?.message || schedule.lead_id}`)

      let suppressionQ = supabase
        .from('email_suppressions')
        .select('id, reason')
        .eq('user_id', lead.user_id)
        .eq('email', lead.email)
        .limit(1)
      if (lead.org_id) {
        suppressionQ = suppressionQ.eq('org_id', lead.org_id)
      } else {
        suppressionQ = suppressionQ.is('org_id', null)
      }
      const { data: suppression } = await suppressionQ.maybeSingle()
      if (suppression) {
        await supabase
          .from('email_single_schedules')
          .update({
            status: 'failed',
            error_message: `Suppressed (${suppression.reason})`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', scheduleId)

        if (schedule.sequence_id && schedule.sequence_email_id) {
          await supabase
            .from('sequence_email_sends')
            .update({
              status: 'skipped',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', lead.user_id)
            .eq('lead_id', lead.id)
            .eq('sequence_id', schedule.sequence_id)
            .eq('sequence_email_id', schedule.sequence_email_id)
            .eq('status', 'pending')

          await this.tryAdvanceSequenceWorkflow({
            leadId: lead.id as string,
            userId: lead.user_id as string,
            sequenceId: schedule.sequence_id as string,
            orgId: lead.org_id ?? null,
          })
        }

        return {
          scheduleId,
          success: false,
          error: 'Suppressed',
          processedAt: new Date().toISOString(),
        }
      }

      const { data: sender, error: senderError } = await supabase
        .from('email_sender_identities')
        .select(
          'id, user_id, from_email, from_name, reply_to_email, reply_to_name, address, address_2, city, state, zip, country, signature, is_verified, is_default',
        )
        .eq('id', schedule.sender_identity_id)
        .eq('is_verified', true)
        .single()
      if (senderError || !sender)
        throw new Error(
          `Sender identity not found: ${senderError?.message || schedule.sender_identity_id}`,
        )

      const { data: domain } = await supabase
        .from('email_domains')
        .select('inbound_parse_enabled, inbound_parse_hostname')
        .eq('id', schedule.domain_id)
        .single()

      const sendId = crypto.randomUUID()

      const replyTo =
        domain?.inbound_parse_enabled && domain?.inbound_parse_hostname
          ? `${sendId}@${domain.inbound_parse_hostname}`
          : sender.reply_to_email

      const unsubscribeUrl = this.buildUnsubscribeUrl(sendId, lead.email, lead.user_id, lead.org_id)
      const hideBranding = await this.shouldHideBranding(lead.user_id, lead.org_id ?? null)

      const mergeData = {
        name: (lead.name || '').trim(),
        first_name: (lead.name || '').trim().split(/\s+/)[0] || '',
        last_name: (lead.name || '').trim().split(/\s+/).slice(1).join(' ') || '',
        email: lead.email || '',
      }
      const resolvedHtml = this.resolveEmailContent(schedule.html_content || '', mergeData)
      const resolvedText = schedule.text_content
        ? this.replaceMergeTags(schedule.text_content, mergeData)
        : undefined

      const contentWithFooter = this.appendSignatureAndFooter(
        { html: resolvedHtml || undefined, text: resolvedText },
        sender,
        unsubscribeUrl,
        hideBranding,
      )

      const { provider } = await this.emailProviderHelper.getEmailProvider(
        lead.user_id,
        lead.org_id ?? null,
      )

      let messageId: string
      if (provider === 'ghl') {
        try {
          const contactId = await this.ghlEmailHelper.ensureLeadHasGhlContactId({
            userId: lead.user_id,
            orgId: lead.org_id ?? null,
            leadId: lead.id,
            email: lead.email,
            name: lead.name,
            phone: lead.phone,
            existingContactId: lead.ghl_contact_id,
          })

          const ghlResult = await this.ghlEmailHelper.sendEmail(
            lead.user_id,
            {
              contactId,
              emailFrom: sender.from_email,
              emailTo: lead.email,
              subject: schedule.subject,
              html: contentWithFooter.html || schedule.html_content || '',
              message: contentWithFooter.text || schedule.text_content || undefined,
            },
            lead.org_id ?? null,
          )
          if (!ghlResult.success || !ghlResult.messageId) {
            throw new Error(ghlResult.error || 'GHL send failed')
          }
          messageId = ghlResult.messageId
        } catch (ghlErr: unknown) {
          await supabase
            .from('email_single_schedules')
            .update({
              status: 'failed',
              error_message:
                ghlErr instanceof Error
                  ? ghlErr.message.slice(0, 1000)
                  : String(ghlErr).slice(0, 1000),
              updated_at: new Date().toISOString(),
            })
            .eq('id', scheduleId)
          throw ghlErr
        }
      } else {
        messageId = await this.sendEmailViaSendGrid({
          to: lead.email,
          toName: lead.name || undefined,
          from: { email: sender.from_email, name: sender.from_name },
          replyTo,
          subject: schedule.subject,
          html: contentWithFooter.html || schedule.html_content || '',
          text: contentWithFooter.text || schedule.text_content,
          unsubscribeUrl,
          correlationHeaders: {
            'X-Vibey-Correlation-Id': sendId,
            'X-Vibey-User-Id': lead.user_id,
            'X-Vibey-Schedule-Id': scheduleId,
          },
        })
      }

      const { data: emailSend, error: emailSendError } = await supabase
        .from('email_sends')
        .insert({
          user_id: lead.user_id,
          org_id: lead.org_id || null,
          domain_id: schedule.domain_id,
          lead_id: lead.id,
          sequence_id: schedule.sequence_id || null,
          from_email: sender.from_email,
          subject: schedule.subject,
          html_body: contentWithFooter.html || schedule.html_content || null,
          status: 'sent',
          sendgrid_message_id: messageId,
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (emailSendError)
        this.logger.error(`Failed to insert email_sends row: ${emailSendError.message}`, {
          scheduleId,
          leadId: lead.id,
          messageId,
        })

      await supabase
        .from('email_single_schedules')
        .update({
          status: 'sent',
          sendgrid_message_id: messageId,
          updated_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', scheduleId)

      if (schedule.sequence_id && schedule.sequence_email_id && emailSend?.id) {
        await supabase
          .from('sequence_email_sends')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            email_send_id: emailSend.id,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', lead.user_id)
          .eq('lead_id', lead.id)
          .eq('sequence_id', schedule.sequence_id)
          .eq('sequence_email_id', schedule.sequence_email_id)
          .eq('status', 'pending')

        await this.tryAdvanceSequenceWorkflow({
          leadId: lead.id as string,
          userId: lead.user_id as string,
          sequenceId: schedule.sequence_id as string,
          orgId: lead.org_id ?? null,
        })
      }

      this.logger.log(`Sent single scheduled email ${scheduleId} to ${lead.email}`)

      return {
        scheduleId,
        success: true,
        messageId,
        processedAt: new Date().toISOString(),
      }
    } catch (err) {
      await supabase
        .from('email_single_schedules')
        .update({
          status: 'failed',
          error_message: err instanceof Error ? err.message.slice(0, 1000) : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleId)
      throw err
    }
  }

  private replaceMergeTags(content: string, data: Record<string, string>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
      const value = data[key.toLowerCase()]
      return value !== undefined ? value : ''
    })
  }

  private resolveEmailContent(rawHtml: string, mergeData: Record<string, string>): string {
    return this.replaceMergeTags(rawHtml, mergeData)
  }

  private async shouldHideBranding(userId: string, orgId?: string | null): Promise<boolean> {
    const supabase = this.databaseService.getClient()

    let settingsQuery = supabase
      .from('email_settings')
      .select('hide_branding')
      .eq('user_id', userId)
    settingsQuery = orgId ? settingsQuery.eq('org_id', orgId) : settingsQuery.is('org_id', null)
    const { data: emailSettings } = await settingsQuery.single()
    if (!emailSettings?.hide_branding) return false

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('status, subscription_plans(price_amount)')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .single()
    const isPaid = !!subscription && (subscription as any)?.subscription_plans?.price_amount > 0
    return !!isPaid
  }

  private buildCanSpamFooter(
    sender: {
      from_name: string
      address?: string
      address_2?: string
      city?: string
      state?: string
      zip?: string
      country?: string
    },
    unsubscribeUrl?: string,
    hideBranding?: boolean,
  ): { html: string; text: string } {
    const addressParts = [sender.address]
    if (sender.address_2) addressParts.push(sender.address_2)
    const cityStateZip = [sender.city, sender.state, sender.zip].filter(Boolean).join(', ')
    addressParts.push(cityStateZip)
    addressParts.push(sender.country)
    const addressText = addressParts.filter(Boolean).join(' | ')

    const unsubscribeHtml = unsubscribeUrl
      ? `<p style="margin: 8px 0 0 0;"><a href="${unsubscribeUrl}" style="color: #666666; text-decoration: underline;">Unsubscribe</a></p>`
      : ''
    const unsubscribeText = unsubscribeUrl ? `\nUnsubscribe: ${unsubscribeUrl}` : ''

    const vibeyBrandingHtml = !hideBranding
      ? `<p style="margin: 16px 0 0 0; text-align: center;"><a href="https://vibey.so?utm_source=email&utm_medium=footer&utm_campaign=powered_by" style="display: inline-block; padding: 4px 12px; border-radius: 20px; background-color: #f5f5f5; color: #888888; text-decoration: none; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 16px; border: 1px solid #e5e5e5;"><span style="display: inline-block; width: 12px; height: 12px; background: linear-gradient(135deg, #a3e635, #10b981); border-radius: 3px; vertical-align: middle; margin-right: 5px; margin-top: -1px;"></span>Powered by Vibey</a></p>`
      : ''
    const vibeyBrandingText = !hideBranding ? '\nPowered by Vibey - https://vibey.so' : ''

    const html = `
<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666666; text-align: center;">
  <p style="margin: 0;">
    ${sender.from_name}<br/>
    ${addressText}
  </p>
  ${unsubscribeHtml}
  ${vibeyBrandingHtml}
</div>`

    const text = `\n\n---\n${sender.from_name}\n${addressText}${unsubscribeText}${vibeyBrandingText}`

    return { html, text }
  }

  private buildSignature(sender: { signature?: string }): { html: string; text: string } {
    if (!sender.signature) return { html: '', text: '' }
    const html = `
<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e5e5;">
  ${sender.signature}
</div>`
    const textContent = sender.signature
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
    const text = textContent ? `\n\n--\n${textContent}` : ''
    return { html, text }
  }

  private appendSignatureAndFooter(
    content: { html?: string; text?: string },
    sender: any,
    unsubscribeUrl?: string,
    hideBranding?: boolean,
  ): { html?: string; text?: string } {
    const signature = this.buildSignature(sender)
    const footer = this.buildCanSpamFooter(sender, unsubscribeUrl, hideBranding)
    return {
      html: content.html ? `${content.html}${signature.html}${footer.html}` : undefined,
      text: content.text ? `${content.text}${signature.text}${footer.text}` : undefined,
    }
  }

  private generateUnsubscribeToken(
    sendId: string,
    email: string,
    userId: string,
    orgId?: string | null,
  ): string {
    const key = this.configService.get<string>('unsubscribe.tokenSecret') || ''
    if (!key) {
      throw new Error('Missing UNSUBSCRIBE_TOKEN_SECRET (or SENDGRID_WEBHOOK_VERIFICATION_KEY)')
    }

    const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
    const payload = { sendId, email: email.toLowerCase(), userId, orgId: orgId ?? null, exp }
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signature = crypto.createHmac('sha256', key).update(payloadBase64).digest('base64url')
    return `${payloadBase64}.${signature}`
  }

  private buildUnsubscribeUrl(
    sendId: string,
    email: string,
    userId: string,
    orgId?: string | null,
  ): string {
    const token = this.generateUnsubscribeToken(sendId, email, userId, orgId)
    const appUrl = this.configService.get<string>('app.url') || ''
    if (!appUrl) throw new Error('Missing APP_URL (or NEXT_PUBLIC_APP_URL) for unsubscribe links')
    return `${appUrl}/unsubscribe/${token}`
  }

  private async sendEmailViaSendGrid(params: {
    to: string
    toName?: string
    from: { email: string; name: string }
    replyTo?: string
    subject: string
    html: string
    text?: string | null
    unsubscribeUrl?: string
    correlationHeaders?: Record<string, string>
  }): Promise<string> {
    const mailData: sgMail.MailDataRequired = {
      to: params.toName ? { email: params.to, name: params.toName } : params.to,
      from: params.from,
      replyTo: params.replyTo,
      subject: params.subject,
      html: params.html,
      text: params.text || undefined,
    }

    if (params.unsubscribeUrl) {
      mailData.headers = {
        'List-Unsubscribe': `<${params.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        ...(params.correlationHeaders || {}),
      }
    }

    const [response] = await sgMail.send(mailData)
    const messageId =
      (response.headers as any)['x-message-id'] ||
      `sg-${Date.now()}-${Math.random().toString(36).slice(2)}`
    return messageId
  }

  private async tryAdvanceSequenceWorkflow(input: {
    userId: string
    leadId: string
    sequenceId: string
    orgId: string | null
  }): Promise<void> {
    const { userId, leadId, sequenceId, orgId } = input
    if (!sequenceId || !leadId || !userId) return

    try {
      const supabase = this.databaseService.getClient()
      const { data: sequenceRows, error: sequenceError } = await supabase
        .from('sequences')
        .select('id, campaign_id')
        .eq('id', sequenceId)
        .eq('user_id', userId)
        .maybeSingle()
      if (sequenceError || !sequenceRows?.campaign_id) return

      const { data: stepSends, error: stepSendsError } = await supabase
        .from('sequence_email_sends')
        .select('status')
        .eq('lead_id', leadId)
        .eq('sequence_id', sequenceId)
      if (stepSendsError || !stepSends || stepSends.length === 0) return

      const hasPending = stepSends.some((row) => row.status === 'pending')
      if (hasPending) return

      const { data: edges, error: edgesError } = await supabase
        .from('campaign_workflow_edges')
        .select('to_id')
        .eq('campaign_id', sequenceRows.campaign_id as string)
        .eq('from_type', 'sequence')
        .eq('from_id', sequenceId)
        .eq('to_type', 'sequence')
        .eq('edge_type', 'sequence_complete_to_sequence')
        .in('status', ['valid', 'active'])
      if (edgesError) return

      const downstreamSequenceIds = Array.from(
        new Set((edges ?? []).map((edge) => String(edge.to_id ?? '')).filter(Boolean)),
      )
      if (downstreamSequenceIds.length === 0) return

      let senderIdentityQuery = supabase
        .from('email_sender_identities')
        .select('id, domain_id')
        .eq('user_id', userId)
        .eq('is_verified', true)
      if (orgId) {
        senderIdentityQuery = senderIdentityQuery.eq('org_id', orgId)
      } else {
        senderIdentityQuery = senderIdentityQuery.is('org_id', null)
      }
      const { data: senderIdentity, error: senderError } = await senderIdentityQuery
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (senderError || !senderIdentity?.id || !senderIdentity?.domain_id) return

      const { data: sequenceEmails, error: sequenceEmailsError } = await supabase
        .from('sequence_emails')
        .select('id, sequence_id, subject, body, delay_hours, order_index, status')
        .in('sequence_id', downstreamSequenceIds)
        .order('sequence_id', { ascending: true })
        .order('order_index', { ascending: true })
      if (sequenceEmailsError || !sequenceEmails) return

      const groupedBySequence = new Map<string, typeof sequenceEmails>()
      for (const row of sequenceEmails) {
        const sid = String(row.sequence_id ?? '')
        if (!sid) continue
        const arr = groupedBySequence.get(sid) ?? []
        arr.push(row)
        groupedBySequence.set(sid, arr)
      }

      const now = Date.now()
      const sendTrackingRows: Array<{
        user_id: string
        org_id: string | null
        sequence_id: string
        sequence_email_id: string
        lead_id: string
        status: 'pending'
        created_at: string
        updated_at: string
      }> = []

      const scheduleRows: Array<{
        user_id: string
        org_id: string | null
        lead_id: string
        sender_identity_id: string
        domain_id: string
        sequence_id: string
        sequence_email_id: string
        subject: string
        html_content: string
        text_content: string | null
        scheduled_at: string
        status: 'scheduled'
        created_at: string
        updated_at: string
      }> = []

      for (const downstreamSequenceId of downstreamSequenceIds) {
        const emails = groupedBySequence.get(downstreamSequenceId) ?? []
        let cumulativeDelayHours = 0

        for (const email of emails) {
          if (email.status !== 'ready') continue
          const sequenceEmailId = String(email.id ?? '')
          const subject = typeof email.subject === 'string' ? email.subject.trim() : ''
          const body = typeof email.body === 'string' ? email.body.trim() : ''
          if (!sequenceEmailId || !subject || !body) continue

          const delayHoursRaw = Number(email.delay_hours ?? 0)
          const delayHours = Number.isFinite(delayHoursRaw) ? Math.max(0, delayHoursRaw) : 0
          cumulativeDelayHours += delayHours

          const nowIso = new Date().toISOString()
          const scheduledAtIso = new Date(now + cumulativeDelayHours * 60 * 60 * 1000).toISOString()

          sendTrackingRows.push({
            user_id: userId,
            org_id: orgId,
            sequence_id: downstreamSequenceId,
            sequence_email_id: sequenceEmailId,
            lead_id: leadId,
            status: 'pending',
            created_at: nowIso,
            updated_at: nowIso,
          })

          scheduleRows.push({
            user_id: userId,
            org_id: orgId,
            lead_id: leadId,
            sender_identity_id: senderIdentity.id as string,
            domain_id: senderIdentity.domain_id as string,
            sequence_id: downstreamSequenceId,
            sequence_email_id: sequenceEmailId,
            subject,
            html_content: body,
            text_content: null,
            scheduled_at: scheduledAtIso,
            status: 'scheduled',
            created_at: nowIso,
            updated_at: nowIso,
          })
        }
      }

      if (sendTrackingRows.length > 0) {
        const sequenceEmailIds = Array.from(
          new Set(sendTrackingRows.map((row) => row.sequence_email_id).filter(Boolean)),
        )
        const { data: existingSendTrack } = await supabase
          .from('sequence_email_sends')
          .select('sequence_email_id')
          .eq('user_id', userId)
          .eq('lead_id', leadId)
          .in('sequence_email_id', sequenceEmailIds)
        const existingSendTrackIds = new Set(
          (existingSendTrack ?? [])
            .map((row) => String((row as { sequence_email_id?: unknown }).sequence_email_id ?? ''))
            .filter((id) => id.length > 0),
        )
        const rowsToInsert = sendTrackingRows.filter(
          (row) => !existingSendTrackIds.has(row.sequence_email_id),
        )
        if (rowsToInsert.length > 0) {
          await supabase.from('sequence_email_sends').insert(rowsToInsert)
        }
      }

      if (scheduleRows.length > 0) {
        const sequenceEmailIds = Array.from(
          new Set(scheduleRows.map((row) => row.sequence_email_id).filter(Boolean)),
        )
        const { data: existingSchedules } = await supabase
          .from('email_single_schedules')
          .select('sequence_email_id')
          .eq('user_id', userId)
          .eq('lead_id', leadId)
          .in('sequence_email_id', sequenceEmailIds)
        const existingScheduleIds = new Set(
          (existingSchedules ?? [])
            .map((row) => String((row as { sequence_email_id?: unknown }).sequence_email_id ?? ''))
            .filter((id) => id.length > 0),
        )
        const rowsToInsert = scheduleRows.filter(
          (row) => !existingScheduleIds.has(row.sequence_email_id),
        )
        if (rowsToInsert.length > 0) {
          await supabase.from('email_single_schedules').insert(rowsToInsert)
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to advance sequence workflow for lead ${leadId} from sequence ${sequenceId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }
  }
}
