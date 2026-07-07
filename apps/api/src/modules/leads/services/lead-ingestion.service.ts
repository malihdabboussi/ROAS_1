import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LeadIngestionRepository } from '../repositories/lead-ingestion.repository'
import { LeadsRepository } from '../repositories/leads.repository'
import { ContactIdentifierService, type ContactChannel } from './contact-identifier.service'

@Injectable()
export class LeadIngestionService {
  private readonly logger = new Logger(LeadIngestionService.name)

  constructor(
    private readonly leadsRepo: LeadsRepository,
    private readonly contactIdentifier: ContactIdentifierService,
    private readonly leadIngestionRepository: LeadIngestionRepository = new LeadIngestionRepository(),
  ) {}

  createServiceClient() {
    return this.leadIngestionRepository.createServiceClient()
  }

  async ingestLead(
    data: {
      funnelId: string
      email: string
      name?: string
      phone?: string
      pageSlug?: string
      sourceDomain?: string
      utm?: Record<string, unknown>
      userAgent?: string
      ip?: string
      visitorId?: string
    },
    serviceClientFactory?: () => SupabaseClient,
  ) {
    const anonClient = this.leadIngestionRepository.createAnonClient()

    const leadId = await this.leadsRepo.createLeadSecure(anonClient, {
      p_funnel_id: data.funnelId,
      p_email: data.email,
      p_name: data.name,
      p_phone: data.phone,
      p_page_slug: data.pageSlug,
      p_source_domain: data.sourceDomain,
      p_utm: data.utm,
      p_user_agent: data.userAgent,
      p_ip: data.ip,
      p_visitor_id: data.visitorId,
    })

    const serviceClient = serviceClientFactory ? serviceClientFactory() : this.createServiceClient()
    await this.applyAdAttribution(serviceClient, leadId, data.utm)
    const funnel = await this.loadFunnel(serviceClient, data.funnelId)
    const contactId = await this.syncLeadContact(serviceClient, funnel, data)

    await this.upsertFunnelMembership(serviceClient, funnel, contactId, data)
    const campaignId = (funnel as { campaign_id?: string | null })?.campaign_id
    if (campaignId) {
      await this.upsertCampaignMembership(serviceClient, funnel, contactId, campaignId, data)
      await this.scheduleWorkflowSequencesForLead({
        serviceClient,
        userId: funnel.user_id as string,
        funnelId: data.funnelId,
        campaignId,
        leadId,
        orgId: (funnel as { org_id?: string | null }).org_id ?? null,
      })
    }

    return leadId
  }

  async resolveContactForChannel(
    input: {
      userId: string
      orgId?: string | null
      email?: string | null
      phone?: string | null
      firstName?: string | null
      lastName?: string | null
      channel: ContactChannel
      detail?: string | null
      campaignId?: string | null
      agentKey?: string | null
    },
    serviceClientFactory?: () => SupabaseClient,
  ): Promise<{ contact_id: string | null }> {
    const email = input.email?.trim().toLowerCase() || null
    const phone = input.phone?.trim() || null
    if (!email && !phone) return { contact_id: null }

    const serviceClient = serviceClientFactory ? serviceClientFactory() : this.createServiceClient()
    const owner = { userId: input.userId, orgId: input.orgId ?? null }

    const contact = await this.contactIdentifier.findOrCreateContact(serviceClient, {
      ...owner,
      kind: email ? 'email' : 'phone',
      value: email ?? phone!,
      email,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      channel: input.channel,
      detail: input.detail ?? null,
    })

    if (email && phone) {
      await this.contactIdentifier.attachIdentifier(serviceClient, {
        contactId: contact.id,
        owner,
        kind: 'phone',
        value: phone,
        source: input.channel,
      })
    }

    await this.backfillContactName(serviceClient, contact.id, input.firstName, input.lastName)
    if (input.campaignId) {
      await this.upsertChannelCampaignMembership(serviceClient, contact.id, input)
    }

    return { contact_id: contact.id }
  }

  private async applyAdAttribution(
    serviceClient: SupabaseClient,
    leadId: string,
    utm?: Record<string, unknown>,
  ): Promise<void> {
    const utmContent = typeof utm?.utm_content === 'string' ? utm.utm_content : null
    if (!utmContent || !leadId) return
    try {
      const ad = await this.leadIngestionRepository.findAd(serviceClient, utmContent)
      if (!ad) return
      const updates: Record<string, unknown> = { ad_id: ad.id }
      if (ad.ad_set_id) {
        updates.ad_set_id = ad.ad_set_id
        const campaignId = await this.leadIngestionRepository.findAdSetCampaignId(
          serviceClient,
          ad.ad_set_id,
        )
        if (campaignId) updates.ad_campaign_id = campaignId
      }
      await this.leadIngestionRepository.updateLeadAttribution(serviceClient, leadId, updates)
    } catch (err) {
      this.logger.warn(`[ingestLead] Ad attribution failed for utm_content=${utmContent}: ${err}`)
    }
  }

  private async loadFunnel(serviceClient: SupabaseClient, funnelId: string) {
    return this.leadIngestionRepository.findFunnel(serviceClient, funnelId)
  }

  private async syncLeadContact(
    serviceClient: SupabaseClient,
    funnel: Record<string, unknown>,
    data: {
      funnelId: string
      email: string
      name?: string
      phone?: string
    },
  ): Promise<string> {
    const fullName = (data.name || '').trim()
    const nameParts = fullName ? fullName.split(/\s+/) : []
    const firstName = nameParts[0] || null
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null
    const funnelOrgId = (funnel as { org_id?: string | null }).org_id ?? null
    const funnelOwner = { userId: funnel.user_id as string, orgId: funnelOrgId }
    const funnelName =
      typeof (funnel as { name?: unknown }).name === 'string' &&
      (funnel as { name: string }).name.trim()
        ? (funnel as { name: string }).name.trim()
        : null

    const contact = await this.contactIdentifier.findOrCreateContact(serviceClient, {
      ...funnelOwner,
      kind: 'email',
      value: data.email,
      email: data.email,
      firstName,
      lastName,
      channel: 'funnel',
      detail: funnelName,
    })

    if (data.phone) {
      await this.contactIdentifier.attachIdentifier(serviceClient, {
        contactId: contact.id,
        owner: funnelOwner,
        kind: 'phone',
        value: data.phone,
        source: 'funnel',
      })
    }

    await this.refreshContactAttribution(serviceClient, contact.id, funnel, {
      funnelId: data.funnelId,
      firstName,
      lastName,
      phone: data.phone,
    })
    return contact.id
  }

  private async refreshContactAttribution(
    serviceClient: SupabaseClient,
    contactId: string,
    funnel: Record<string, unknown>,
    input: {
      funnelId: string
      firstName: string | null
      lastName: string | null
      phone?: string
    },
  ): Promise<void> {
    const selectedTagNames = Array.isArray(funnel.tag_ids)
      ? (funnel.tag_ids as string[]).map((tag) => String(tag).trim()).filter(Boolean)
      : []
    const existingTags = await this.leadIngestionRepository.findContactTags(
      serviceClient,
      contactId,
    )
    const mergedTags = Array.from(new Set([...existingTags, ...selectedTagNames]))

    const contactPatch: Record<string, unknown> = {
      tags: mergedTags,
      source: 'funnel',
      source_id: input.funnelId,
    }
    if (input.firstName) contactPatch.first_name = input.firstName
    if (input.lastName) contactPatch.last_name = input.lastName
    if (input.phone) contactPatch.phone = input.phone
    await this.leadIngestionRepository.updateContact(serviceClient, contactId, contactPatch)
  }

  private async upsertFunnelMembership(
    serviceClient: SupabaseClient,
    funnel: Record<string, unknown>,
    contactId: string,
    data: { funnelId: string; sourceDomain?: string; pageSlug?: string },
  ): Promise<void> {
    await this.leadIngestionRepository.upsertFunnelMembership(serviceClient, {
      user_id: funnel.user_id,
      contact_id: contactId,
      funnel_id: data.funnelId,
      last_seen_at: new Date().toISOString(),
      last_source_domain: data.sourceDomain || null,
      last_page_slug: data.pageSlug || null,
    })
  }

  private async upsertCampaignMembership(
    serviceClient: SupabaseClient,
    funnel: Record<string, unknown>,
    contactId: string,
    campaignId: string,
    data: { funnelId: string; sourceDomain?: string; pageSlug?: string },
  ): Promise<void> {
    await this.leadIngestionRepository.upsertCampaignMembership(serviceClient, {
      user_id: funnel.user_id,
      contact_id: contactId,
      campaign_id: campaignId,
      source_funnel_id: data.funnelId,
      last_seen_at: new Date().toISOString(),
      last_source_domain: data.sourceDomain || null,
      last_page_slug: data.pageSlug || null,
    })
  }

  private async backfillContactName(
    serviceClient: SupabaseClient,
    contactId: string,
    firstName?: string | null,
    lastName?: string | null,
  ): Promise<void> {
    if (!firstName && !lastName) return
    const existing = await this.leadIngestionRepository.findContactNameFields(
      serviceClient,
      contactId,
    )
    const patch: Record<string, unknown> = {}
    if (firstName && !existing?.first_name) patch.first_name = firstName
    if (lastName && !existing?.last_name) patch.last_name = lastName
    if (Object.keys(patch).length > 0) {
      await this.leadIngestionRepository.updateContact(serviceClient, contactId, patch)
    }
  }

  private async upsertChannelCampaignMembership(
    serviceClient: SupabaseClient,
    contactId: string,
    input: {
      userId: string
      channel: ContactChannel
      campaignId?: string | null
      agentKey?: string | null
    },
  ): Promise<void> {
    try {
      await this.leadIngestionRepository.upsertCampaignMembership(serviceClient, {
        user_id: input.userId,
        contact_id: contactId,
        campaign_id: input.campaignId,
        last_seen_at: new Date().toISOString(),
        metadata: {
          source: input.channel,
          ...(input.agentKey ? { agent_key: input.agentKey } : {}),
        },
      })
    } catch (membershipError) {
      const message =
        membershipError instanceof Error ? membershipError.message : String(membershipError)
      this.logger.warn(`[resolveContactForChannel] campaign membership failed: ${message}`)
    }
  }

  private async scheduleWorkflowSequencesForLead(input: {
    serviceClient: SupabaseClient
    userId: string
    funnelId: string
    campaignId: string
    leadId: string
    orgId?: string | null
  }) {
    const { serviceClient, userId, funnelId, campaignId, leadId, orgId } = input

    const sequenceIds = await this.leadIngestionRepository.findWorkflowSequenceIds(
      serviceClient,
      { campaignId, funnelId },
    )
    if (sequenceIds.length === 0) return

    const senderIdentity = await this.resolveDefaultSender(serviceClient, userId, orgId)
    const sequenceRows = await this.loadSequenceEmails(serviceClient, sequenceIds)
    const { sendTrackingRows, scheduleRows } = this.buildSequenceScheduleRows({
      sequenceIds,
      sequenceRows,
      userId,
      leadId,
      senderIdentity,
      orgId,
    })
    await this.insertMissingSequenceSendRows(serviceClient, userId, leadId, sendTrackingRows)
    await this.insertMissingSequenceScheduleRows(serviceClient, userId, leadId, scheduleRows)
  }

  private async resolveDefaultSender(
    serviceClient: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ id: string; domain_id: string }> {
    return this.leadIngestionRepository.findDefaultSender(serviceClient, { userId, orgId })
  }

  private async loadSequenceEmails(serviceClient: SupabaseClient, sequenceIds: string[]) {
    return this.leadIngestionRepository.listSequenceEmails(serviceClient, sequenceIds)
  }

  private buildSequenceScheduleRows(input: {
    sequenceIds: string[]
    sequenceRows: Array<Record<string, unknown>>
    userId: string
    leadId: string
    senderIdentity: { id: string; domain_id: string }
    orgId?: string | null
  }) {
    const now = Date.now()
    const groupedBySequence = new Map<string, Array<Record<string, unknown>>>()
    for (const row of input.sequenceRows) {
      const sequenceId = String(row.sequence_id || '')
      if (!sequenceId) continue
      const arr = groupedBySequence.get(sequenceId) ?? []
      arr.push(row)
      groupedBySequence.set(sequenceId, arr)
    }

    const sendTrackingRows: Array<Record<string, unknown>> = []
    const scheduleRows: Array<Record<string, unknown>> = []

    for (const sequenceId of input.sequenceIds) {
      const emails = groupedBySequence.get(sequenceId) ?? []
      let cumulativeDelayHours = 0

      for (const email of emails) {
        if (email.status !== 'ready') continue
        const sequenceEmailId = String(email.id || '')
        if (!sequenceEmailId) continue

        const subject = typeof email.subject === 'string' ? email.subject.trim() : ''
        const htmlBody = typeof email.body === 'string' ? email.body.trim() : ''
        if (!subject) throw new Error(`Sequence email ${sequenceEmailId} has empty subject`)
        if (!htmlBody) throw new Error(`Sequence email ${sequenceEmailId} has empty body`)

        const delayHoursRaw = Number(email.delay_hours ?? 0)
        const delayHours = Number.isFinite(delayHoursRaw) ? Math.max(0, delayHoursRaw) : 0
        cumulativeDelayHours += delayHours

        const scheduledAtIso = new Date(now + cumulativeDelayHours * 60 * 60 * 1000).toISOString()
        const timestamp = new Date().toISOString()

        sendTrackingRows.push({
          user_id: input.userId,
          sequence_id: sequenceId,
          sequence_email_id: sequenceEmailId,
          lead_id: input.leadId,
          status: 'pending',
          created_at: timestamp,
          updated_at: timestamp,
          org_id: input.orgId ?? null,
        })

        scheduleRows.push({
          user_id: input.userId,
          lead_id: input.leadId,
          sender_identity_id: input.senderIdentity.id,
          domain_id: input.senderIdentity.domain_id,
          sequence_id: sequenceId,
          sequence_email_id: sequenceEmailId,
          subject,
          html_content: htmlBody,
          text_content: null,
          scheduled_at: scheduledAtIso,
          status: 'scheduled',
          created_at: timestamp,
          updated_at: timestamp,
          org_id: input.orgId ?? null,
        })
      }
    }

    return { sendTrackingRows, scheduleRows }
  }

  private async insertMissingSequenceSendRows(
    serviceClient: SupabaseClient,
    userId: string,
    leadId: string,
    sendTrackingRows: Array<Record<string, unknown>>,
  ): Promise<void> {
    if (sendTrackingRows.length === 0) return
    const sequenceEmailIds = Array.from(
      new Set(sendTrackingRows.map((row) => String(row.sequence_email_id)).filter(Boolean)),
    )
    const existingSendTrackIds = await this.leadIngestionRepository.listExistingSequenceSendIds(
      serviceClient,
      { userId, leadId, sequenceEmailIds },
    )
    const rowsToInsert = sendTrackingRows.filter(
      (row) => !existingSendTrackIds.has(String(row.sequence_email_id)),
    )
    await this.leadIngestionRepository.insertSequenceSendRows(serviceClient, rowsToInsert)
  }

  private async insertMissingSequenceScheduleRows(
    serviceClient: SupabaseClient,
    userId: string,
    leadId: string,
    scheduleRows: Array<Record<string, unknown>>,
  ): Promise<void> {
    if (scheduleRows.length === 0) return
    const sequenceEmailIds = Array.from(
      new Set(scheduleRows.map((row) => String(row.sequence_email_id)).filter(Boolean)),
    )
    const existingScheduleIds = await this.leadIngestionRepository.listExistingScheduleIds(
      serviceClient,
      { userId, leadId, sequenceEmailIds },
    )
    const rowsToInsert = scheduleRows.filter(
      (row) => !existingScheduleIds.has(String(row.sequence_email_id)),
    )
    await this.leadIngestionRepository.insertScheduleRows(serviceClient, rowsToInsert)
  }
}
