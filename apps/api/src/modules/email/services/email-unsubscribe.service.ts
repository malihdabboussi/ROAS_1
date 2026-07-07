import * as crypto from 'crypto'
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EmailRuntimeRepository } from '../repositories/email-runtime.repository'

interface UnsubscribePayload {
  sendId: string
  email: string
  userId: string
  orgId?: string | null
  exp: number
}

@Injectable()
export class EmailUnsubscribeService {
  private readonly logger = new Logger(EmailUnsubscribeService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly emailRuntime: EmailRuntimeRepository = new EmailRuntimeRepository(),
  ) {}

  async checkStatus(token: string) {
    const validation = this.validateToken(token)
    if (!validation.valid || !validation.payload) {
      return { valid: false }
    }

    const { email, userId } = validation.payload
    const supabase = this.getServiceClient()

    const orgId = validation.payload.orgId ?? null
    const suppression = await this.emailRuntime.findSuppression(supabase, { userId, email, orgId })

    return {
      valid: true,
      email: this.maskEmail(email),
      isUnsubscribed: !!suppression,
    }
  }

  async processUnsubscribe(token: string) {
    const validation = this.validateToken(token)
    if (!validation.valid || !validation.payload) {
      throw new HttpException(
        { success: false, error: validation.error || 'Invalid or expired link' },
        HttpStatus.BAD_REQUEST,
      )
    }

    const { sendId, email, userId, orgId } = validation.payload
    const supabase = this.getServiceClient()
    const resolvedOrgId = orgId ?? null

    const existing = await this.emailRuntime.findSuppression(supabase, {
      userId,
      email,
      orgId: resolvedOrgId,
    })

    if (existing) {
      return { success: true, email: this.maskEmail(email), alreadyUnsubscribed: true }
    }

    try {
      await this.emailRuntime.createSuppression(supabase, {
        user_id: userId,
        email,
        reason: 'unsubscribe',
        org_id: resolvedOrgId,
      })
    } catch (error) {
      this.logger.error(
        `Failed to create suppression: ${error instanceof Error ? error.message : String(error)}`,
      )
      throw new HttpException(
        { success: false, error: 'Failed to process unsubscribe' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    try {
      await this.emailRuntime.markSendUnsubscribed(supabase, sendId)
    } catch {
      // non-critical
    }

    return { success: true, email: this.maskEmail(email), alreadyUnsubscribed: false }
  }

  async getPreferences(token: string) {
    const validation = this.validateToken(token)
    if (!validation.valid || !validation.payload) {
      throw new HttpException(
        { success: false, error: 'Invalid or expired link' },
        HttpStatus.BAD_REQUEST,
      )
    }

    const { email, userId, orgId: prefOrgId } = validation.payload
    const supabase = this.getServiceClient()
    const resolvedPrefOrgId = prefOrgId ?? null

    const suppression = await this.emailRuntime.findSuppression(supabase, {
      userId,
      email,
      orgId: resolvedPrefOrgId,
    })

    return {
      success: true,
      email: this.maskEmail(email),
      preferences: [],
      isGloballyUnsubscribed: !!suppression,
    }
  }

  async updatePreferences(
    token: string,
    body: { updates?: Array<{ groupId: number; subscribed: boolean }> },
  ) {
    const validation = this.validateToken(token)
    if (!validation.valid || !validation.payload) {
      throw new HttpException(
        { success: false, error: 'Invalid or expired link' },
        HttpStatus.BAD_REQUEST,
      )
    }

    const allUnsubscribed = body.updates?.every((u) => !u.subscribed)
    if (allUnsubscribed) {
      return this.processUnsubscribe(token)
    }

    return { success: true, email: this.maskEmail(validation.payload.email) }
  }

  private validateToken(token: string): {
    valid: boolean
    payload?: UnsubscribePayload
    error?: string
  } {
    try {
      const parts = token.split('.')
      if (parts.length !== 2) return { valid: false, error: 'Invalid token format' }

      const [payloadBase64, signature] = parts
      const secret =
        this.configService.get<string>('UNSUBSCRIBE_TOKEN_SECRET') ||
        this.configService.get<string>('SENDGRID_WEBHOOK_VERIFICATION_KEY') ||
        ''
      if (!secret) return { valid: false, error: 'Server configuration error' }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadBase64)
        .digest('base64url')

      if (signature !== expectedSignature) return { valid: false, error: 'Invalid token signature' }

      const payloadString = Buffer.from(payloadBase64, 'base64url').toString('utf-8')
      const payload: UnsubscribePayload = JSON.parse(payloadString)

      if (payload.exp < Math.floor(Date.now() / 1000))
        return { valid: false, error: 'Token expired' }
      if (!payload.sendId || !payload.email || !payload.userId)
        return { valid: false, error: 'Invalid token payload' }

      return { valid: true, payload }
    } catch {
      return { valid: false, error: 'Failed to parse token' }
    }
  }

  private getServiceClient() {
    return this.emailRuntime.createServiceClient(this.configService)
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@')
    if (!local || !domain) return '***@***'
    return `${local.substring(0, Math.min(2, local.length))}***@${domain}`
  }
}
