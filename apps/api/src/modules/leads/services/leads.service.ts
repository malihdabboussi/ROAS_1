import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SendGridIntegration } from '../../email/integrations/sendgrid.integration'
import { EmailOutboundFooterService } from '../../email/services/email-outbound-footer.service'
import { SpaceAutomationService } from '../../spaces/services/space-automation.service'
import { LeadsRuntimeRepository } from '../repositories/leads-runtime.repository'
import { LeadsRepository } from '../repositories/leads.repository'
import {
  ContactIdentifierService,
  normalizeLegacyContactSource,
  type ContactChannel,
} from './contact-identifier.service'
import { LeadContactAutomationService } from './lead-contact-automation.service'
import { LeadEmailService } from './lead-email.service'
import { LeadIngestionService } from './lead-ingestion.service'

const CUSTOMER_CONTACT_TYPES = new Set(['customer', 'lead', 'team_of_customer'])
const PRIVATE_CONTACT_TYPES = new Set(['friend', 'family'])

@Injectable()
export class LeadsService {
  private readonly contactAutomationService: LeadContactAutomationService
  private readonly leadEmailService: LeadEmailService
  private readonly leadIngestionService: LeadIngestionService

  constructor(
    private readonly leadsRepo: LeadsRepository,
    private readonly sendGridIntegration: SendGridIntegration,
    private readonly emailOutboundFooter: EmailOutboundFooterService,
    private readonly contactIdentifier: ContactIdentifierService,
    private readonly leadsRuntime: LeadsRuntimeRepository = new LeadsRuntimeRepository(),
    @Optional()
    spaceAutomation?: SpaceAutomationService,
    @Optional()
    leadEmailService?: LeadEmailService,
    @Optional()
    leadIngestionService?: LeadIngestionService,
    @Optional()
    contactAutomationService?: LeadContactAutomationService,
  ) {
    this.contactAutomationService =
      contactAutomationService ?? new LeadContactAutomationService(spaceAutomation)
    this.leadEmailService =
      leadEmailService ??
      new LeadEmailService(this.leadsRepo, this.sendGridIntegration, this.emailOutboundFooter)
    this.leadIngestionService =
      leadIngestionService ?? new LeadIngestionService(this.leadsRepo, this.contactIdentifier)
  }

  private createServiceClient() {
    return this.leadsRuntime.createServiceClient()
  }

  async getLeadsByFunnel(supabase: SupabaseClient, funnelId: string, orgId?: string | null) {
    return this.leadsRepo.findByFunnelId(supabase, funnelId, orgId)
  }

  async getLeadsByCampaign(supabase: SupabaseClient, campaignId: string, orgId?: string | null) {
    return this.leadsRepo.findByCampaignId(supabase, campaignId, orgId)
  }

  async getContacts(
    supabase: SupabaseClient,
    opts: {
      search?: string
      sort?: string
      limit?: number
      offset?: number
      orgId?: string | null
    },
  ) {
    return this.leadsRepo.findContacts(supabase, opts)
  }

  async getContactBasicsByIds(supabase: SupabaseClient, ids: string[], orgId?: string | null) {
    return this.leadsRepo.findContactBasicsByIds(supabase, ids, orgId)
  }

  async getCrmFunnels(supabase: SupabaseClient, orgId?: string | null) {
    return this.leadsRepo.findCrmFunnels(supabase, orgId)
  }

  async getCrmContacts(
    supabase: SupabaseClient,
    opts: {
      search?: string
      sort?: string
      limit?: number
      offset?: number
      filters?: Record<string, unknown>
      includeArchived?: boolean
      contactType?: string
      campaignId?: string
      segmentId?: string
      orgId?: string | null
    },
  ) {
    let segmentFunnelIds: string[] | undefined
    let segmentDateFrom: string | undefined
    let segmentDateTo: string | undefined

    if (opts.segmentId) {
      const filters = await this.leadsRuntime.findSegmentFilters(
        supabase,
        opts.segmentId,
        opts.orgId,
      )
      if (!filters) {
        throw new NotFoundException('Segment not found')
      }
      const campaigns = filters.campaigns as string[] | undefined
      if (campaigns?.length && opts.campaignId && !campaigns.includes(opts.campaignId)) {
        return { contacts: [], total: 0, hasMore: false }
      }
      const funnels = filters.funnels as string[] | undefined
      if (funnels?.length) segmentFunnelIds = funnels
      const dr = filters.date_range as { from?: string; to?: string } | undefined
      if (dr?.from) segmentDateFrom = dr.from
      if (dr?.to) segmentDateTo = dr.to
    }

    const { segmentId: _segmentId, ...repoOpts } = opts
    return this.leadsRepo.findCrmContacts(supabase, {
      ...repoOpts,
      segmentFunnelIds,
      segmentDateFrom,
      segmentDateTo,
    })
  }

  async importContactsToCampaign(
    supabase: SupabaseClient,
    campaignId: string,
    contactIds: string[],
    orgId?: string | null,
  ) {
    return this.leadsRepo.importContactsToCampaign(supabase, campaignId, contactIds, orgId)
  }

  async createUserContact(
    supabase: SupabaseClient,
    userId: string,
    input: {
      email: string
      first_name?: string | null
      last_name?: string | null
      phone?: string | null
    },
    orgId?: string | null,
  ) {
    const email = input.email.trim().toLowerCase()
    const existing = await this.leadsRepo.findContactEmailForOwner(supabase, userId, email, orgId)
    if (existing) {
      throw new ConflictException('A contact with this email already exists')
    }
    const contact = await this.leadsRepo.createUserContact(
      supabase,
      userId,
      {
        email,
        first_name: input.first_name?.trim() || null,
        last_name: input.last_name?.trim() || null,
        phone: input.phone?.trim() || null,
        source: 'manual',
        contact_source: 'manual',
      },
      orgId,
    )
    await this.contactAutomationService.processContactCreated(supabase, {
      contactId: String((contact as Record<string, unknown>).id),
      userId,
      orgId,
    })
    return contact
  }

  async startCrmSync(
    userId: string,
    sourceRaw: string,
    orgId?: string | null,
  ): Promise<{ jobId: string; status: string }> {
    const source = sourceRaw.trim().toLowerCase()
    if (source !== 'activecampaign' && source !== 'gohighlevel') {
      throw new BadRequestException('source must be activecampaign or gohighlevel')
    }

    const sc = this.createServiceClient()
    await this.assertCrmIntegrationConnected(sc, userId, source)

    const active = await this.leadsRuntime.findActiveCrmSyncJob(sc, userId, source)

    if (active?.id) {
      throw new ConflictException('A sync is already in progress for this source')
    }

    try {
      const row = await this.leadsRuntime.createCrmSyncJob(sc, userId, source)
      return { jobId: row.id as string, status: 'queued' }
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A sync is already in progress for this source')
      }
      const message = error instanceof Error ? error.message : String(error)
      throw new BadRequestException(`Failed to create sync job: ${message}`)
    }
  }

  async getCrmSyncJob(
    userId: string,
    jobId: string,
    orgId?: string | null,
  ): Promise<Record<string, unknown>> {
    const sc = this.createServiceClient()
    const job = await this.leadsRuntime.findCrmSyncJob(sc, userId, jobId)

    if (!job) {
      throw new NotFoundException('Job not found')
    }
    return job
  }

  private async assertCrmIntegrationConnected(
    sc: SupabaseClient,
    userId: string,
    source: string,
  ): Promise<void> {
    if (source === 'activecampaign') {
      const connected = await this.leadsRuntime.hasActiveCampaignConnection(sc, userId)
      if (!connected) {
        throw new BadRequestException('ActiveCampaign is not connected')
      }
      return
    }

    if (source === 'gohighlevel') {
      const connected = await this.leadsRuntime.hasGoHighLevelConnection(sc, userId)
      if (!connected) {
        throw new BadRequestException('GoHighLevel is not connected')
      }
    }
  }

  async importContactsBatch(
    supabase: SupabaseClient,
    userId: string,
    items: Array<{
      email: string
      first_name?: string | null
      last_name?: string | null
      phone?: string | null
      contact_source?: string | null
      contact_source_detail?: string | null
    }>,
    orgId?: string | null,
  ) {
    const normalized = items.map((i) => {
      const src = normalizeLegacyContactSource(i.contact_source)
      return {
        email: i.email,
        first_name: i.first_name ?? null,
        last_name: i.last_name ?? null,
        phone: i.phone ?? null,
        contact_source: src.channel ?? 'import',
        contact_source_detail: i.contact_source_detail ?? src.detail,
      }
    })
    return this.leadsRepo.importContactsBatch(supabase, userId, normalized, orgId)
  }

  async getContactById(supabase: SupabaseClient, contactId: string, orgId?: string | null) {
    return this.leadsRepo.findContactById(supabase, contactId, orgId)
  }

  async updateContact(
    supabase: SupabaseClient,
    contactId: string,
    updates: Record<string, unknown>,
    orgId: string | null | undefined,
    actorUserId: string,
  ) {
    const previous = (await this.leadsRepo.findContactById(supabase, contactId, orgId)) as Record<
      string,
      unknown
    > | null
    const updated = (await this.leadsRepo.updateContact(
      supabase,
      contactId,
      updates,
      orgId,
      actorUserId,
    )) as Record<string, unknown>
    if (previous) {
      await this.contactAutomationService.emitContactAutomationDiffs(
        supabase,
        previous,
        updated,
        updates,
        actorUserId,
        orgId,
      )
    }
    return updated
  }

  async reclassifyContact(
    supabase: SupabaseClient,
    input: {
      contactId: string
      newContactType: string
      orgId?: string | null
      actorUserId: string
      confirmed?: boolean
    },
  ) {
    const contact = await this.leadsRepo.findContactById(supabase, input.contactId, input.orgId)
    if (!contact) throw new NotFoundException('Contact not found')
    const previousType = String((contact as { contact_type?: unknown }).contact_type ?? 'unknown')
    const nextType = input.newContactType.trim()
    if (!nextType) throw new BadRequestException('new_contact_type is required')

    const brainIds = await this.leadsRepo.findCustomerBrainIdsForContact(
      supabase,
      input.contactId,
      input.orgId,
    )
    const shouldDeleteCustomer =
      CUSTOMER_CONTACT_TYPES.has(previousType) && !CUSTOMER_CONTACT_TYPES.has(nextType)
    const shouldDeletePrivate =
      CUSTOMER_CONTACT_TYPES.has(previousType) && PRIVATE_CONTACT_TYPES.has(nextType)
    const deleteCount =
      shouldDeleteCustomer || shouldDeletePrivate
        ? await this.leadsRepo.countCustomerMemoriesForContact(supabase, input.contactId, brainIds)
        : 0

    if (deleteCount > 0 && !input.confirmed) {
      return {
        requires_confirmation: true,
        summary: {
          memories_to_delete: deleteCount,
          avatars_to_update: 0,
          from: previousType,
          to: nextType,
        },
      }
    }

    const updates: Record<string, unknown> = {
      contact_type: nextType,
      contact_type_source: 'user',
      contact_type_confidence: 1,
      contact_type_set_at: new Date().toISOString(),
    }
    const updated = await this.updateContact(
      supabase,
      input.contactId,
      updates,
      input.orgId,
      input.actorUserId,
    )

    const removedMemories =
      deleteCount > 0
        ? await this.leadsRepo.deleteCustomerMemoriesForContact(supabase, input.contactId, brainIds)
        : 0
    const affectedAvatars =
      deleteCount > 0
        ? await this.leadsRepo.removeContactFromCustomerAvatars(supabase, input.contactId, brainIds)
        : 0

    return {
      requires_confirmation: false,
      contact: updated,
      summary: {
        memories_deleted: removedMemories,
        avatars_updated: affectedAvatars,
        from: previousType,
        to: nextType,
      },
    }
  }

  async getContactActivity(supabase: SupabaseClient, contactId: string, orgId?: string | null) {
    return this.leadsRepo.findContactActivity(supabase, contactId, orgId)
  }

  async addContactNote(
    supabase: SupabaseClient,
    contactId: string,
    userId: string,
    content: string,
    orgId?: string | null,
    cardTint?: string | null,
  ) {
    return this.leadsRepo.createContactNote(supabase, contactId, userId, content, orgId, cardTint)
  }

  async updateContactNote(
    supabase: SupabaseClient,
    noteId: string,
    userId: string,
    orgId: string | null | undefined,
    orgRole: string | null,
    updates: { content?: string; card_tint?: string | null },
  ) {
    const isOrgAdmin = orgRole === 'owner' || orgRole === 'admin'
    return this.leadsRepo.updateContactNote(supabase, noteId, userId, orgId, updates, isOrgAdmin)
  }

  async getContactEmails(
    supabase: SupabaseClient,
    contactId: string,
    orgId?: string | null,
    opts?: { limit?: number; offset?: number; includeBodies?: boolean },
  ) {
    const result = await this.leadsRepo.findContactEmailTimeline(supabase, contactId, orgId, opts)
    return { emails: result.emails, total: result.total }
  }

  async getContactEmail(
    supabase: SupabaseClient,
    contactId: string,
    emailId: string,
    orgId?: string | null,
  ) {
    const email = await this.leadsRepo.findContactEmailById(supabase, contactId, emailId, orgId)
    return { email }
  }

  async getContactConversations(
    supabase: SupabaseClient,
    contactId: string,
    orgId?: string | null,
    opts?: { limit?: number; offset?: number },
  ) {
    const result = await this.leadsRepo.findContactConversations(supabase, contactId, orgId, opts)
    return {
      conversations: result.linked,
      suggested_conversations: result.suggested,
      total: result.total,
    }
  }

  async sendEmailToContact(
    supabase: SupabaseClient,
    contactId: string,
    payload: { subject: string; body: string; from_identity_id?: string | null },
    orgId?: string | null,
  ) {
    return this.leadEmailService.sendEmailToContact(supabase, contactId, payload, orgId)
  }

  async linkConversationToContact(
    supabase: SupabaseClient,
    contactId: string,
    conversationId: string,
    orgId?: string | null,
  ) {
    const conversation = await this.leadsRepo.linkConversationToContact(
      supabase,
      contactId,
      conversationId,
      orgId,
    )
    return { conversation }
  }

  async ingestLead(data: {
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
  }) {
    return this.leadIngestionService.ingestLead(data, () => this.createServiceClient())
  }

  async resolveContactForChannel(input: {
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
  }): Promise<{ contact_id: string | null }> {
    return this.leadIngestionService.resolveContactForChannel(input, () =>
      this.createServiceClient(),
    )
  }
}
