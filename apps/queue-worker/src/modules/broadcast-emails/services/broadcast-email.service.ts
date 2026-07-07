import * as crypto from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import sgMail from '@sendgrid/mail'
import { DatabaseService } from '../../../lib/services/database.service'
import { EmailProviderHelper, GhlEmailHelper } from '../../shared'
import type { BroadcastEmailJobResult } from '../types'

@Injectable()
export class BroadcastEmailService {
  private readonly logger = new Logger(BroadcastEmailService.name)
  private readonly BATCH_SIZE = 100

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly ghlEmailHelper: GhlEmailHelper,
    private readonly emailProviderHelper: EmailProviderHelper,
  ) {
    const apiKey = this.configService.get<string>('sendgrid.apiKey')
    if (!apiKey) return
    sgMail.setApiKey(apiKey)
  }

  async processSchedule(broadcastScheduleId: string): Promise<BroadcastEmailJobResult> {
    const supabase = this.databaseService.getClient()

    const { data: schedule, error: scheduleError } = await supabase
      .from('email_broadcast_schedules')
      .select('*')
      .eq('id', broadcastScheduleId)
      .single()
    if (scheduleError || !schedule)
      throw new Error(
        `Broadcast schedule not found: ${scheduleError?.message || broadcastScheduleId}`,
      )

    await supabase
      .from('email_broadcast_schedules')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', broadcastScheduleId)

    try {
      const { data: sender, error: senderError } = await supabase
        .from('email_sender_identities')
        .select(
          'id, user_id, from_email, from_name, reply_to_email, reply_to_name, address, address_2, city, state, zip, country, signature, is_verified',
        )
        .eq('id', schedule.sender_identity_id)
        .eq('is_verified', true)
        .single()
      if (senderError || !sender)
        throw new Error(
          `Sender identity not found: ${senderError?.message || schedule.sender_identity_id}`,
        )

      let filters: Record<string, unknown> = {}

      if (schedule.segment_id) {
        let segmentQuery = supabase
          .from('segments')
          .select('filters')
          .eq('id', schedule.segment_id)
          .eq('user_id', schedule.user_id)
        if (schedule.org_id) {
          segmentQuery = segmentQuery.eq('org_id', schedule.org_id)
        } else {
          segmentQuery = segmentQuery.is('org_id', null)
        }
        const { data: segment, error: segmentError } = await segmentQuery.single()
        if (segmentError || !segment)
          throw new Error(`Segment not found: ${segmentError?.message || schedule.segment_id}`)
        filters = (segment.filters || {}) as Record<string, unknown>
      }

      let recipientsQuery = supabase
        .from('contacts')
        .select('id, email, first_name, last_name, phone')
        .eq('user_id', schedule.user_id)
      if (schedule.org_id) {
        recipientsQuery = recipientsQuery.eq('org_id', schedule.org_id)
      } else {
        recipientsQuery = recipientsQuery.is('org_id', null)
      }

      const tagIds = filters.tags as string[] | undefined
      if (tagIds?.length) {
        recipientsQuery = recipientsQuery.overlaps('tags', tagIds)
      }
      const dateRange = filters.date_range as { from?: string; to?: string } | undefined
      if (dateRange?.from) recipientsQuery = recipientsQuery.gte('created_at', dateRange.from)
      if (dateRange?.to) recipientsQuery = recipientsQuery.lte('created_at', dateRange.to)

      const { data: recipients, error: recipientsError } = await recipientsQuery.limit(10000)
      if (recipientsError)
        throw new Error(`Failed to resolve recipients: ${recipientsError.message}`)

      const { provider } = await this.emailProviderHelper.getEmailProvider(
        schedule.user_id,
        schedule.org_id ?? null,
      )
      const hideBranding = await this.shouldHideBranding(schedule.user_id, schedule.org_id ?? null)

      let sentCount = 0
      let failedCount = 0
      let skippedCount = 0

      for (let i = 0; i < (recipients || []).length; i += this.BATCH_SIZE) {
        const batch = (recipients || []).slice(i, i + this.BATCH_SIZE)

        for (const r of batch) {
          if (!r.email) continue

          let suppressionQuery = supabase
            .from('email_suppressions')
            .select('id')
            .eq('user_id', schedule.user_id)
            .eq('email', r.email)
          if (schedule.org_id) {
            suppressionQuery = suppressionQuery.eq('org_id', schedule.org_id)
          } else {
            suppressionQuery = suppressionQuery.is('org_id', null)
          }
          const { data: suppression } = await suppressionQuery.limit(1).maybeSingle()
          if (suppression) {
            skippedCount++
            continue
          }

          const correlationId = crypto.randomUUID()
          const unsubscribeUrl = this.buildUnsubscribeUrl(
            correlationId,
            r.email,
            schedule.user_id,
            schedule.org_id,
          )

          const personalizedHtml = schedule.html_content
            .replace(/\{\{name\}\}/gi, `${r.first_name || ''} ${r.last_name || ''}`.trim())
            .replace(/\{\{first_name\}\}/gi, r.first_name || '')
            .replace(/\{\{last_name\}\}/gi, r.last_name || '')
            .replace(/\{\{email\}\}/gi, r.email || '')

          const contentWithFooter = this.appendSignatureAndFooter(
            { html: personalizedHtml || undefined, text: schedule.text_content || undefined },
            sender,
            unsubscribeUrl,
            hideBranding,
          )

          try {
            let messageId: string
            if (provider === 'ghl') {
              // Broadcasts operate over `contacts`, so we don't have a local `leads.ghl_contact_id`.
              // We still upsert/create the contact in GHL and then send.
              const contactId = await this.ghlEmailHelper.ensureLeadHasGhlContactId({
                userId: schedule.user_id,
                orgId: schedule.org_id ?? null,
                leadId: r.id, // NOTE: may not exist in leads; update will no-op if no lead row.
                email: r.email,
                name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || null,
                phone: r.phone || null,
                existingContactId: null,
              })

              const ghlResult = await this.ghlEmailHelper.sendEmail(
                schedule.user_id,
                {
                  contactId,
                  emailFrom: sender.from_email,
                  emailTo: r.email,
                  subject: schedule.subject,
                  html: contentWithFooter.html || schedule.html_content || '',
                  message: contentWithFooter.text || schedule.text_content || undefined,
                },
                schedule.org_id ?? null,
              )
              if (!ghlResult.success || !ghlResult.messageId)
                throw new Error(ghlResult.error || 'GHL send failed')
              messageId = ghlResult.messageId
            } else {
              messageId = await this.sendEmailViaSendGrid({
                to: r.email,
                from: { email: sender.from_email, name: sender.from_name },
                replyTo: sender.reply_to_email,
                subject: schedule.subject,
                html: contentWithFooter.html || schedule.html_content || '',
                text: contentWithFooter.text || schedule.text_content,
                unsubscribeUrl,
                correlationHeaders: {
                  'X-Vibey-Correlation-Id': correlationId,
                  'X-Vibey-User-Id': schedule.user_id,
                  'X-Vibey-Broadcast-Schedule-Id': broadcastScheduleId,
                },
              })
            }

            const { data: emailSend } = await supabase
              .from('email_sends')
              .insert({
                user_id: schedule.user_id,
                org_id: schedule.org_id || null,
                domain_id: schedule.domain_id,
                lead_id: null,
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

            await supabase.from('broadcast_email_sends').insert({
              broadcast_schedule_id: broadcastScheduleId,
              lead_id: null,
              email_send_id: emailSend?.id || null,
              org_id: schedule.org_id || null,
              status: 'sent',
              sent_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            })

            sentCount++
          } catch (e) {
            failedCount++
            this.logger.warn(
              `Broadcast ${broadcastScheduleId} recipient ${r.email} failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
            )
          }
        }
      }

      const finalStatus = failedCount === 0 ? 'completed' : sentCount === 0 ? 'failed' : 'partial'
      const success = failedCount === 0

      await supabase
        .from('email_broadcast_schedules')
        .update({
          status: finalStatus,
          sent_count: sentCount,
          failed_count: failedCount,
          updated_at: new Date().toISOString(),
          sent_at: success ? new Date().toISOString() : null,
        })
        .eq('id', broadcastScheduleId)

      this.logger.log(
        `Broadcast ${broadcastScheduleId} finished: ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped`,
      )

      return {
        broadcastScheduleId,
        success,
        sentCount,
        failedCount,
        skippedCount,
        processedAt: new Date().toISOString(),
      }
    } catch (err) {
      await supabase
        .from('email_broadcast_schedules')
        .update({
          status: 'failed',
          error_message: err instanceof Error ? err.message.slice(0, 1000) : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', broadcastScheduleId)
      throw err
    }
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

  private generateUnsubscribeToken(
    sendId: string,
    email: string,
    userId: string,
    orgId?: string | null,
  ): string {
    const key = this.configService.get<string>('unsubscribe.tokenSecret') || ''
    if (!key)
      throw new Error('Missing UNSUBSCRIBE_TOKEN_SECRET (or SENDGRID_WEBHOOK_VERIFICATION_KEY)')

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
    from: { email: string; name: string }
    replyTo?: string
    subject: string
    html: string
    text?: string | null
    unsubscribeUrl?: string
    correlationHeaders?: Record<string, string>
  }): Promise<string> {
    const mailData: sgMail.MailDataRequired = {
      to: params.to,
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
}
