import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SendGridIntegration } from '../../email/integrations/sendgrid.integration'
import { EmailOutboundFooterService } from '../../email/services/email-outbound-footer.service'
import {
  LeadEmailRepository,
  type LeadEmailSenderIdentity,
} from '../repositories/lead-email.repository'
import { LeadsRepository } from '../repositories/leads.repository'

@Injectable()
export class LeadEmailService {
  private readonly logger = new Logger(LeadEmailService.name)

  constructor(
    private readonly leadsRepo: LeadsRepository,
    private readonly sendGridIntegration: SendGridIntegration,
    private readonly emailOutboundFooter: EmailOutboundFooterService,
    private readonly leadEmailRepository: LeadEmailRepository = new LeadEmailRepository(),
  ) {}

  async sendEmailToContact(
    supabase: SupabaseClient,
    contactId: string,
    payload: { subject: string; body: string; from_identity_id?: string | null },
    orgId?: string | null,
  ) {
    const contact = await this.leadsRepo.findContactById(supabase, contactId, orgId)
    if (!contact) throw new NotFoundException('Contact not found')
    const contactRow = contact as {
      id: string
      user_id: string
      email: string | null
      first_name: string | null
      last_name: string | null
    }
    const toEmail = (contactRow.email ?? '').trim().toLowerCase()
    if (!toEmail) throw new BadRequestException('Contact email is required')

    const sender = await this.resolveSenderIdentity(
      supabase,
      contactRow.user_id,
      payload.from_identity_id,
      orgId,
    )
    const leadId = await this.resolveLeadId(supabase, contactRow.user_id, toEmail, orgId)

    const subject = payload.subject.trim()
    const body = payload.body.trim()
    const recipientName = [contactRow.first_name, contactRow.last_name]
      .filter(Boolean)
      .join(' ')
      .trim()
    const nowIso = new Date().toISOString()

    const sendId = this.emailOutboundFooter.newSendCorrelationId()
    const hideBranding = await this.emailOutboundFooter.shouldHideBranding(
      supabase,
      contactRow.user_id,
      orgId ?? null,
    )
    const unsubscribeUrl = this.emailOutboundFooter.buildUnsubscribeUrl(
      sendId,
      toEmail,
      contactRow.user_id,
      orgId ?? null,
    )
    const { html: htmlWithFooter, text: textBody } =
      this.emailOutboundFooter.appendSignatureAndFooter(
        body,
        {
          from_name: sender.from_name || 'Vibey',
          address: sender.address,
          address_2: sender.address_2,
          city: sender.city,
          state: sender.state,
          zip: sender.zip,
          country: sender.country,
          signature: sender.signature,
        },
        unsubscribeUrl,
        hideBranding,
      )

    try {
      const sendResult = await this.sendGridIntegration.sendEmail({
        to: { email: toEmail, name: recipientName || undefined },
        from: {
          email: sender.from_email,
          name: sender.from_name || 'Vibey',
        },
        replyTo: sender.reply_to_email
          ? {
              email: sender.reply_to_email,
              name: sender.reply_to_name ?? undefined,
            }
          : undefined,
        subject,
        html: htmlWithFooter,
        text: textBody,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })

      const emailSendRow = await this.leadEmailRepository.createSentEmailSend(supabase, {
        id: sendId,
        user_id: contactRow.user_id,
        org_id: orgId ?? null,
        domain_id: sender.domain_id,
        lead_id: leadId,
        from_email: sender.from_email,
        subject,
        html_body: htmlWithFooter,
        status: 'sent',
        sendgrid_message_id: sendResult.messageId,
        sent_at: nowIso,
        updated_at: nowIso,
      })

      return { email: emailSendRow }
    } catch (error) {
      await this.persistFailedSend(
        supabase,
        {
          sendId,
          userId: contactRow.user_id,
          orgId: orgId ?? null,
          domainId: sender.domain_id,
          leadId,
          fromEmail: sender.from_email,
          subject,
          htmlWithFooter,
          nowIso,
        },
        error,
      )
      throw error
    }
  }

  private async resolveSenderIdentity(
    supabase: SupabaseClient,
    userId: string,
    fromIdentityId?: string | null,
    orgId?: string | null,
  ): Promise<LeadEmailSenderIdentity> {
    const senderIdentity = await this.leadEmailRepository.findVerifiedSenderIdentity(supabase, {
      userId,
      fromIdentityId,
      orgId,
    })
    if (!senderIdentity) {
      throw new BadRequestException('No verified sender identity found')
    }
    return senderIdentity
  }

  private async resolveLeadId(
    supabase: SupabaseClient,
    userId: string,
    toEmail: string,
    orgId?: string | null,
  ): Promise<string | null> {
    return this.leadEmailRepository.findLeadIdByEmail(supabase, { userId, toEmail, orgId })
  }

  private async persistFailedSend(
    supabase: SupabaseClient,
    input: {
      sendId: string
      userId: string
      orgId: string | null
      domainId: string | null
      leadId: string | null
      fromEmail: string
      subject: string
      htmlWithFooter: string
      nowIso: string
    },
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown send error'
    try {
      await this.leadEmailRepository.createFailedEmailSend(supabase, {
        id: input.sendId,
        user_id: input.userId,
        org_id: input.orgId,
        domain_id: input.domainId,
        lead_id: input.leadId,
        from_email: input.fromEmail,
        subject: input.subject,
        html_body: input.htmlWithFooter,
        status: 'failed',
        error_message: message,
        updated_at: input.nowIso,
      })
    } catch (failedInsertErr) {
      const failedMessage =
        failedInsertErr instanceof Error ? failedInsertErr.message : String(failedInsertErr)
      this.logger.warn(
        `[sendEmailToContact] failed to persist failed send: ${failedMessage}`,
      )
    }
  }
}
