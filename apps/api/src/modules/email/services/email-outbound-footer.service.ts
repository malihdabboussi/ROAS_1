import * as crypto from 'crypto'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EmailRuntimeRepository } from '../repositories/email-runtime.repository'

/** Sender row fields needed for signature + CAN-SPAM footer (aligned with queue-worker single-email). */
export type EmailOutboundSenderFooter = {
  from_name: string
  address?: string | null
  address_2?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  country?: string | null
  signature?: string | null
}

@Injectable()
export class EmailOutboundFooterService {
  constructor(
    private readonly configService: ConfigService,
    private readonly emailRuntime: EmailRuntimeRepository = new EmailRuntimeRepository(),
  ) {}

  newSendCorrelationId(): string {
    return crypto.randomUUID()
  }

  async shouldHideBranding(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<boolean> {
    const emailSettings = await this.emailRuntime.findEmailSettings(supabase, userId, orgId)
    if (!emailSettings?.hide_branding) return false

    const sub = await this.emailRuntime.findActiveSubscription(supabase, userId)
    const priceAmt = sub?.subscription_plans?.price_amount
    const isPaid = typeof priceAmt === 'number' && priceAmt > 0
    return !!isPaid
  }

  buildUnsubscribeUrl(
    sendId: string,
    email: string,
    userId: string,
    orgId?: string | null,
  ): string {
    const token = this.generateUnsubscribeToken(sendId, email, userId, orgId)
    const appUrl =
      this.configService.get<string>('APP_URL') ||
      this.configService.get<string>('NEXT_PUBLIC_APP_URL') ||
      ''
    if (!appUrl) throw new Error('Missing APP_URL (or NEXT_PUBLIC_APP_URL) for unsubscribe links')
    return `${appUrl.replace(/\/$/, '')}/unsubscribe/${token}`
  }

  appendSignatureAndFooter(
    contentHtml: string,
    sender: EmailOutboundSenderFooter,
    unsubscribeUrl: string | undefined,
    hideBranding: boolean,
  ): { html: string; text: string } {
    const plainBody = this.htmlToPlainEmailBody(contentHtml)
    const signature = this.buildSignature(sender)
    const footer = this.buildCanSpamFooter(sender, unsubscribeUrl, hideBranding)
    const html = `${contentHtml}${signature.html}${footer.html}`
    const text = `${plainBody}${signature.text}${footer.text}`.replace(/^\n+/, '')
    return { html, text }
  }

  private htmlToPlainEmailBody(html: string): string {
    return html
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  private buildCanSpamFooter(
    sender: {
      from_name: string
      address?: string | null
      address_2?: string | null
      city?: string | null
      state?: string | null
      zip?: string | null
      country?: string | null
    },
    unsubscribeUrl?: string,
    hideBranding?: boolean,
  ): { html: string; text: string } {
    const addressParts = [sender.address]
    if (sender.address_2) addressParts.push(sender.address_2)
    const cityStateZip = [sender.city, sender.state, sender.zip].filter(Boolean).join(', ')
    addressParts.push(cityStateZip)
    addressParts.push(sender.country ?? undefined)
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

  private buildSignature(sender: { signature?: string | null }): { html: string; text: string } {
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

  private generateUnsubscribeToken(
    sendId: string,
    email: string,
    userId: string,
    orgId?: string | null,
  ): string {
    const secret =
      this.configService.get<string>('UNSUBSCRIBE_TOKEN_SECRET') ||
      this.configService.get<string>('SENDGRID_WEBHOOK_VERIFICATION_KEY') ||
      ''
    if (!secret) {
      throw new Error('Missing UNSUBSCRIBE_TOKEN_SECRET (or SENDGRID_WEBHOOK_VERIFICATION_KEY)')
    }

    const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
    const payload = { sendId, email: email.toLowerCase(), userId, orgId: orgId ?? null, exp }
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url')
    return `${payloadBase64}.${signature}`
  }
}
