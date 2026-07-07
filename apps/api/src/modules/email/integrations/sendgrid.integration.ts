import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import sgClient from '@sendgrid/client'
import { EventWebhook, EventWebhookHeader } from '@sendgrid/eventwebhook'
import sgMail from '@sendgrid/mail'
import type {
  SendGridDomainResponse,
  SendGridMailMessage,
  SendGridSenderResponse,
  SendGridValidationResponse,
  SendGridWebhookEvent,
} from '../types/email.types'

@Injectable()
export class SendGridIntegration {
  private readonly logger = new Logger(SendGridIntegration.name)
  private readonly webhookVerifier: EventWebhook
  private ecPublicKey: ReturnType<EventWebhook['convertPublicKeyToECDSA']> | null = null

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY')
    const webhookKey = this.configService.get<string>('SENDGRID_WEBHOOK_VERIFICATION_KEY')

    if (!apiKey) {
      this.logger.warn('SENDGRID_API_KEY not configured - email sending will fail')
    } else {
      sgMail.setApiKey(apiKey)
      sgClient.setApiKey(apiKey)
      this.logger.log('SendGrid integration initialized')
    }

    this.webhookVerifier = new EventWebhook()

    if (webhookKey) {
      try {
        this.ecPublicKey = this.webhookVerifier.convertPublicKeyToECDSA(webhookKey)
      } catch (error) {
        this.logger.error('Failed to parse SendGrid webhook verification key', error)
      }
    }
  }

  // --- Email Sending ---

  async sendEmail(message: SendGridMailMessage): Promise<{ messageId: string }> {
    try {
      const [response] = await sgMail.send(message as sgMail.MailDataRequired)
      const messageId = response.headers['x-message-id'] as string
      return { messageId }
    } catch (error) {
      const sgError = error as { response?: { body?: { errors?: Array<{ message: string }> } } }
      const errorMessage =
        sgError.response?.body?.errors?.[0]?.message ||
        (error instanceof Error ? error.message : 'Unknown SendGrid error')
      throw new Error(`SendGrid error: ${errorMessage}`)
    }
  }

  async sendMultipleEmails(
    messages: SendGridMailMessage[],
  ): Promise<Array<{ success: boolean; messageId?: string; error?: string }>> {
    const results: Array<{ success: boolean; messageId?: string; error?: string }> = []
    for (const message of messages) {
      try {
        const result = await this.sendEmail(message)
        results.push({ success: true, messageId: result.messageId })
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
    return results
  }

  // --- Domain Authentication ---

  async createDomainAuthentication(
    domain: string,
    subdomain?: string,
    customDkimSelector?: string,
  ): Promise<SendGridDomainResponse> {
    try {
      const requestBody: Record<string, unknown> = {
        domain,
        automatic_security: true,
        default: false,
      }
      if (subdomain && subdomain.trim() !== '') requestBody.subdomain = subdomain
      if (customDkimSelector) requestBody.custom_dkim_selector = customDkimSelector

      const [response, body] = await sgClient.request({
        method: 'POST',
        url: '/v3/whitelabel/domains',
        body: requestBody,
      })

      if (response.statusCode !== 201 && response.statusCode !== 200) {
        throw new Error(`Unexpected status code: ${response.statusCode}`)
      }
      return body as unknown as SendGridDomainResponse
    } catch (error) {
      const sgError = error as { response?: { body?: { errors?: Array<{ message: string }> } } }
      const errorMessage =
        sgError.response?.body?.errors?.[0]?.message ||
        (error instanceof Error ? error.message : 'Unknown error')
      throw new Error(`Domain authentication failed: ${errorMessage}`)
    }
  }

  async getDomainAuthentication(sendgridDomainId: number): Promise<SendGridDomainResponse> {
    const [response, body] = await sgClient.request({
      method: 'GET',
      url: `/v3/whitelabel/domains/${sendgridDomainId}`,
    })
    if (response.statusCode !== 200)
      throw new Error(`Unexpected status code: ${response.statusCode}`)
    return body as unknown as SendGridDomainResponse
  }

  async validateDomainAuthentication(
    sendgridDomainId: number,
  ): Promise<SendGridValidationResponse> {
    try {
      const [response, body] = await sgClient.request({
        method: 'POST',
        url: `/v3/whitelabel/domains/${sendgridDomainId}/validate`,
      })
      if (response.statusCode !== 200)
        throw new Error(`Unexpected status code: ${response.statusCode}`)
      return body as unknown as SendGridValidationResponse
    } catch (error) {
      const sgError = error as { response?: { body?: { errors?: Array<{ message: string }> } } }
      const errorMessage =
        sgError.response?.body?.errors?.[0]?.message ||
        (error instanceof Error ? error.message : 'Unknown error')
      throw new Error(`Domain validation failed: ${errorMessage}`)
    }
  }

  async deleteDomainAuthentication(sendgridDomainId: number): Promise<void> {
    const [response] = await sgClient.request({
      method: 'DELETE',
      url: `/v3/whitelabel/domains/${sendgridDomainId}`,
    })
    if (response.statusCode !== 204 && response.statusCode !== 200) {
      throw new Error(`Unexpected status code: ${response.statusCode}`)
    }
  }

  // --- Sender Identity ---

  async createSenderIdentity(data: {
    nickname: string
    fromEmail: string
    fromName: string
    replyToEmail: string
    replyToName?: string
    address: string
    address2?: string
    city: string
    state?: string
    zip?: string
    country: string
  }): Promise<SendGridSenderResponse> {
    try {
      const [response, body] = await sgClient.request({
        method: 'POST',
        url: '/v3/verified_senders',
        body: {
          nickname: data.nickname,
          from_email: data.fromEmail,
          from_name: data.fromName,
          reply_to: data.replyToEmail,
          reply_to_name: data.replyToName || data.fromName,
          address: data.address,
          address2: data.address2 || '',
          city: data.city,
          state: data.state || '',
          zip: data.zip || '',
          country: data.country,
        },
      })
      if (response.statusCode !== 201 && response.statusCode !== 200) {
        throw new Error(`Unexpected status code: ${response.statusCode}`)
      }
      const raw = body as Record<string, unknown>
      return this.normalizeVerifiedSender(raw)
    } catch (error) {
      const sgError = error as { response?: { body?: { errors?: Array<{ message: string }> } } }
      const errorMessage =
        sgError.response?.body?.errors?.[0]?.message ||
        (error instanceof Error ? error.message : 'Unknown error')
      throw new Error(`Sender identity creation failed: ${errorMessage}`)
    }
  }

  async getSenderIdentity(sendgridSenderId: number): Promise<SendGridSenderResponse> {
    const [response, body] = await sgClient.request({
      method: 'GET',
      url: '/v3/verified_senders',
    })
    if (response.statusCode !== 200)
      throw new Error(`Unexpected status code: ${response.statusCode}`)
    const list = body as { results?: Record<string, unknown>[] }
    const match = list.results?.find((s) => s.id === sendgridSenderId)
    if (!match) throw new Error(`Sender ${sendgridSenderId} not found`)
    return this.normalizeVerifiedSender(match)
  }

  async listSenderIdentities(): Promise<SendGridSenderResponse[]> {
    const [response, body] = await sgClient.request({
      method: 'GET',
      url: '/v3/verified_senders',
    })
    if (response.statusCode !== 200)
      throw new Error(`Unexpected status code: ${response.statusCode}`)
    const list = body as { results?: Record<string, unknown>[] }
    return (list.results || []).map((s) => this.normalizeVerifiedSender(s))
  }

  async updateSenderIdentity(
    sendgridSenderId: number,
    data: {
      nickname?: string
      fromName?: string
      replyToEmail?: string
      replyToName?: string
      address?: string
      address2?: string
      city?: string
      state?: string
      zip?: string
      country?: string
    },
  ): Promise<SendGridSenderResponse> {
    const updateBody: Record<string, unknown> = {}
    if (data.nickname) updateBody.nickname = data.nickname
    if (data.fromName) updateBody.from_name = data.fromName
    if (data.replyToEmail) updateBody.reply_to = data.replyToEmail
    if (data.replyToName) updateBody.reply_to_name = data.replyToName
    if (data.address) updateBody.address = data.address
    if (data.address2 !== undefined) updateBody.address2 = data.address2
    if (data.city) updateBody.city = data.city
    if (data.state !== undefined) updateBody.state = data.state
    if (data.zip !== undefined) updateBody.zip = data.zip
    if (data.country) updateBody.country = data.country

    const [response, body] = await sgClient.request({
      method: 'PATCH',
      url: `/v3/verified_senders/${sendgridSenderId}`,
      body: updateBody,
    })
    if (response.statusCode !== 200)
      throw new Error(`Unexpected status code: ${response.statusCode}`)
    const raw = body as Record<string, unknown>
    return this.normalizeVerifiedSender(raw)
  }

  async deleteSenderIdentity(sendgridSenderId: number): Promise<void> {
    const [response] = await sgClient.request({
      method: 'DELETE',
      url: `/v3/verified_senders/${sendgridSenderId}`,
    })
    if (response.statusCode !== 204 && response.statusCode !== 200) {
      throw new Error(`Unexpected status code: ${response.statusCode}`)
    }
  }

  async resendSenderVerification(sendgridSenderId: number): Promise<void> {
    const [response] = await sgClient.request({
      method: 'POST',
      url: `/v3/verified_senders/resend/${sendgridSenderId}`,
    })
    if (response.statusCode !== 204 && response.statusCode !== 200) {
      throw new Error(`Unexpected status code: ${response.statusCode}`)
    }
  }

  private normalizeVerifiedSender(raw: Record<string, unknown>): SendGridSenderResponse {
    return {
      id: raw.id as number,
      nickname: (raw.nickname as string) || '',
      from: {
        email: (raw.from_email as string) || '',
        name: (raw.from_name as string) || '',
      },
      reply_to: {
        email: (raw.reply_to as string) || '',
        name: (raw.reply_to_name as string) || '',
      },
      address: (raw.address as string) || '',
      address_2: (raw.address2 as string) || '',
      city: (raw.city as string) || '',
      state: (raw.state as string) || '',
      zip: (raw.zip as string) || '',
      country: (raw.country as string) || '',
      verified: { status: (raw.verified as boolean) || false, reason: null },
      locked: (raw.locked as boolean) || false,
      created_at: (raw.created_at as number) || 0,
      updated_at: (raw.updated_at as number) || 0,
    }
  }

  // --- Inbound Parse ---

  async createInboundParseSetting(
    hostname: string,
    webhookUrl: string,
    sendRaw = true,
    spamCheck = false,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const [response] = await sgClient.request({
        method: 'POST',
        url: '/v3/user/webhooks/parse/settings',
        body: { hostname, url: webhookUrl, send_raw: sendRaw, spam_check: spamCheck },
      })
      if (response.statusCode !== 201 && response.statusCode !== 200) {
        throw new Error(`Unexpected status code: ${response.statusCode}`)
      }
      return { success: true }
    } catch (error) {
      const sgError = error as { response?: { body?: { errors?: Array<{ message: string }> } } }
      const errorMessage =
        sgError.response?.body?.errors?.[0]?.message ||
        (error instanceof Error ? error.message : 'Unknown error')
      return { success: false, error: errorMessage }
    }
  }

  async deleteInboundParseSetting(hostname: string): Promise<{ success: boolean; error?: string }> {
    try {
      const [response] = await sgClient.request({
        method: 'DELETE',
        url: `/v3/user/webhooks/parse/settings/${encodeURIComponent(hostname)}`,
      })
      if (response.statusCode !== 204 && response.statusCode !== 200) {
        throw new Error(`Unexpected status code: ${response.statusCode}`)
      }
      return { success: true }
    } catch (error) {
      const sgError = error as { response?: { body?: { errors?: Array<{ message: string }> } } }
      const errorMessage =
        sgError.response?.body?.errors?.[0]?.message ||
        (error instanceof Error ? error.message : 'Unknown error')
      return { success: false, error: errorMessage }
    }
  }

  // --- Webhook Verification ---

  verifyWebhookSignature(
    rawPayload: Buffer | string,
    signature: string,
    timestamp: string,
  ): boolean {
    if (!this.ecPublicKey) return false
    try {
      return this.webhookVerifier.verifySignature(
        this.ecPublicKey,
        rawPayload,
        signature,
        timestamp,
      )
    } catch {
      return false
    }
  }

  parseWebhookEvents(rawPayload: Buffer | string): SendGridWebhookEvent[] {
    const payload = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString()
    return JSON.parse(payload) as SendGridWebhookEvent[]
  }

  getSignatureHeaderName(): string {
    return EventWebhookHeader.SIGNATURE()
  }

  getTimestampHeaderName(): string {
    return EventWebhookHeader.TIMESTAMP()
  }

  isConfigured(): boolean {
    return !!this.configService.get<string>('SENDGRID_API_KEY')
  }
}
