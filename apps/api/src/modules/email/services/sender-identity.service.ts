import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SendGridIntegration } from '../integrations/sendgrid.integration'
import { EmailDomainsRepository } from '../repositories/email-domains.repository'
import { EmailSenderIdentitiesRepository } from '../repositories/email-sender-identities.repository'
import type { EmailSenderIdentity } from '../types/email.types'

@Injectable()
export class SenderIdentityService {
  private readonly logger = new Logger(SenderIdentityService.name)

  constructor(
    private readonly sendgrid: SendGridIntegration,
    private readonly senderRepo: EmailSenderIdentitiesRepository,
    private readonly domainsRepo: EmailDomainsRepository,
  ) {}

  async createSenderIdentity(
    supabase: SupabaseClient,
    userId: string,
    data: {
      domainId: string
      nickname: string
      fromEmail: string
      fromName: string
      replyToEmail?: string
      replyToName?: string
      address: string
      address2?: string
      city: string
      state?: string
      zip?: string
      country: string
    },
    orgId?: string | null,
  ): Promise<{ success: boolean; senderIdentity?: EmailSenderIdentity; error?: string }> {
    const domain = await this.domainsRepo.findById(supabase, data.domainId, orgId)
    if (!domain) throw new NotFoundException('Domain not found')
    if (domain.status !== 'verified') throw new BadRequestException('Domain must be verified first')

    try {
      const sgResult = await this.sendgrid.createSenderIdentity({
        nickname: data.nickname,
        fromEmail: data.fromEmail,
        fromName: data.fromName,
        replyToEmail: data.replyToEmail || data.fromEmail,
        replyToName: data.replyToName,
        address: data.address,
        address2: data.address2,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
      })

      const identity = await this.senderRepo.create(supabase, {
        userId,
        domainId: data.domainId,
        sendgridSenderId: sgResult.id,
        nickname: data.nickname,
        fromEmail: data.fromEmail,
        fromName: data.fromName,
        replyToEmail: data.replyToEmail || data.fromEmail,
        replyToName: data.replyToName,
        address: data.address,
        address2: data.address2,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
        isVerified: sgResult.verified?.status || false,
        orgId,
      })

      return { success: true, senderIdentity: identity }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create sender identity'
      this.logger.error(`Failed to create sender identity: ${msg}`)
      return { success: false, error: msg }
    }
  }

  async listSenderIdentities(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<EmailSenderIdentity[]> {
    return this.senderRepo.findByUserId(supabase, userId, orgId)
  }

  async getSenderIdentity(
    supabase: SupabaseClient,
    identityId: string,
    orgId?: string | null,
  ): Promise<EmailSenderIdentity> {
    const identity = await this.senderRepo.findById(supabase, identityId, orgId)
    if (!identity) throw new NotFoundException('Sender identity not found')
    return identity
  }

  async updateSenderIdentity(
    supabase: SupabaseClient,
    identityId: string,
    data: Partial<{
      nickname: string
      fromName: string
      replyToEmail: string
      replyToName: string
      address: string
      address2: string
      city: string
      state: string
      zip: string
      country: string
      signature: string
    }>,
    orgId?: string | null,
  ): Promise<{ success: boolean; senderIdentity?: EmailSenderIdentity; error?: string }> {
    const identity = await this.senderRepo.findById(supabase, identityId, orgId)
    if (!identity) throw new NotFoundException('Sender identity not found')

    const dbUpdate: Record<string, unknown> = {}
    if (data.nickname !== undefined) dbUpdate.nickname = data.nickname
    if (data.fromName !== undefined) dbUpdate.from_name = data.fromName
    if (data.replyToEmail !== undefined) dbUpdate.reply_to_email = data.replyToEmail
    if (data.replyToName !== undefined) dbUpdate.reply_to_name = data.replyToName
    if (data.address !== undefined) dbUpdate.address = data.address
    if (data.address2 !== undefined) dbUpdate.address_2 = data.address2
    if (data.city !== undefined) dbUpdate.city = data.city
    if (data.state !== undefined) dbUpdate.state = data.state
    if (data.zip !== undefined) dbUpdate.zip = data.zip
    if (data.country !== undefined) dbUpdate.country = data.country
    if (data.signature !== undefined) dbUpdate.signature = data.signature

    if (identity.sendgrid_sender_id && Object.keys(data).some((k) => k !== 'signature')) {
      try {
        await this.sendgrid.updateSenderIdentity(identity.sendgrid_sender_id, data)
      } catch (error) {
        this.logger.warn(`Failed to update sender identity in SendGrid: ${error}`)
      }
    }

    const updated = await this.senderRepo.update(supabase, identityId, dbUpdate, orgId)
    return { success: true, senderIdentity: updated }
  }

  async deleteSenderIdentity(
    supabase: SupabaseClient,
    identityId: string,
    orgId?: string | null,
  ): Promise<void> {
    const identity = await this.senderRepo.findById(supabase, identityId, orgId)
    if (!identity) throw new NotFoundException('Sender identity not found')

    if (identity.sendgrid_sender_id) {
      try {
        await this.sendgrid.deleteSenderIdentity(identity.sendgrid_sender_id)
      } catch {
        this.logger.warn('Failed to delete sender identity from SendGrid')
      }
    }

    await this.senderRepo.delete(supabase, identityId, orgId)
  }

  async setDefaultSenderIdentity(
    supabase: SupabaseClient,
    userId: string,
    identityId: string,
    orgId?: string | null,
  ): Promise<void> {
    const identity = await this.senderRepo.findById(supabase, identityId, orgId)
    if (!identity) throw new NotFoundException('Sender identity not found')
    if (!identity.is_verified)
      throw new BadRequestException('Only verified sender identities can be set as default')
    await this.senderRepo.setAsDefault(supabase, userId, identityId, orgId)
  }

  async syncVerificationStatus(
    supabase: SupabaseClient,
    identityId: string,
    orgId?: string | null,
  ): Promise<EmailSenderIdentity> {
    const identity = await this.senderRepo.findById(supabase, identityId, orgId)
    if (!identity) throw new NotFoundException('Sender identity not found')
    if (!identity.sendgrid_sender_id) throw new BadRequestException('No SendGrid sender ID linked')

    const sgSender = await this.sendgrid.getSenderIdentity(identity.sendgrid_sender_id)
    const isVerified = sgSender.verified?.status || false

    if (isVerified !== identity.is_verified) {
      return this.senderRepo.update(supabase, identityId, { is_verified: isVerified }, orgId)
    }
    return identity
  }

  async syncFromSendGrid(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ synced: number }> {
    const sgSenders = await this.sendgrid.listSenderIdentities()
    const existing = await this.senderRepo.findByUserId(supabase, userId, orgId)
    const existingMap = new Map(
      existing.filter((e) => e.sendgrid_sender_id).map((e) => [e.sendgrid_sender_id, e]),
    )

    let synced = 0
    for (const sg of sgSenders) {
      const match = existingMap.get(sg.id)
      if (match) {
        const isVerified = sg.verified?.status || false
        if (isVerified !== match.is_verified) {
          await this.senderRepo.update(supabase, match.id, { is_verified: isVerified }, orgId)
          synced++
        }
      }
    }
    return { synced }
  }
}
