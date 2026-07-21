import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrainImportJobsService } from '../../brain/services/brain-import-jobs.service'
import { ContactIdentifierService } from '../../leads/services/contact-identifier.service'
import { SlackBrainMappingRepository } from '../repositories/slack-brain-mapping.repository'
import { SlackPeopleBrainRepository } from '../repositories/slack-people-brain.repository'
import { SlackPeopleRepository } from '../repositories/slack-people.repository'
import { SlackRepository } from '../repositories/slack.repository'
import type {
  SlackBrainCadence,
  SlackBrainMapping,
  SlackBrainTargetKind,
  SlackResolvedSender,
} from '../types/slack.types'
import { SlackSenderResolverService } from './slack-sender-resolver.service'

@Injectable()
export class SlackBrainMappingService {
  constructor(
    private readonly mappingsRepo: SlackBrainMappingRepository,
    private readonly slackRepo: SlackRepository,
    private readonly senderResolver: SlackSenderResolverService,
    private readonly contactIdentifiers: ContactIdentifierService,
    private readonly brainImportJobs: BrainImportJobsService,
    private readonly peopleRepo: SlackPeopleRepository,
    private readonly peopleBrains: SlackPeopleBrainRepository,
  ) {}

  async listMappings(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ mappings: SlackBrainMapping[]; autoIngest: boolean; connected: boolean }> {
    const integration = await this.slackRepo.getIntegration(supabase, userId, orgId)
    const metadata = (integration?.metadata ?? {}) as Record<string, unknown>
    const mappings = await this.mappingsRepo.list(supabase, userId, orgId)
    return {
      mappings,
      connected: !!integration?.access_token,
      autoIngest: metadata.slack_brain_auto_ingest !== false,
    }
  }

  async createMapping(
    supabase: SupabaseClient,
    userId: string,
    input: {
      slack_channel_id: string
      slack_channel_name: string
      target_kind: SlackBrainTargetKind
      target_brain_id?: string | null
      target_campaign_id?: string | null
      cadence: SlackBrainCadence
    },
    orgId?: string | null,
  ): Promise<{ mapping: SlackBrainMapping; seeded: number }> {
    const integration = await this.slackRepo.getIntegration(supabase, userId, orgId)
    if (!integration?.access_token) throw new BadRequestException('Slack is not connected')
    const metadata = (integration.metadata ?? {}) as Record<string, unknown>
    const teamId = typeof metadata.team_id === 'string' ? metadata.team_id : ''
    if (!teamId) throw new BadRequestException('Slack integration is missing team id')

    const before = await this.mappingsRepo.list(supabase, userId, orgId)
    const mapping = await this.mappingsRepo.create(supabase, {
      userId,
      orgId,
      slackTeamId: teamId,
      slackChannelId: input.slack_channel_id,
      slackChannelName: input.slack_channel_name,
      targetKind: input.target_kind,
      targetBrainId: input.target_brain_id ?? null,
      targetCampaignId: input.target_campaign_id ?? null,
      cadence: input.cadence,
    })

    let seeded = 0
    const isFirstForWorkspace = !before.some((row) => row.slack_team_id === teamId)
    if (isFirstForWorkspace) {
      const result = await this.senderResolver.seedContactIdentifiersFromWorkspace(supabase, {
        botToken: integration.access_token,
        userId,
        orgId,
      })
      seeded = result.seeded
    }

    return { mapping, seeded }
  }

  async updateMapping(
    supabase: SupabaseClient,
    userId: string,
    id: string,
    updates: { cadence?: SlackBrainCadence; enabled?: boolean },
    orgId?: string | null,
  ): Promise<{ mapping: SlackBrainMapping }> {
    const mapping = await this.mappingsRepo.update(supabase, id, userId, updates, orgId)
    return { mapping }
  }

  async deleteMapping(
    supabase: SupabaseClient,
    userId: string,
    id: string,
    orgId?: string | null,
  ): Promise<{ success: true }> {
    await this.mappingsRepo.delete(supabase, id, userId, orgId)
    return { success: true }
  }

  async syncNow(
    supabase: SupabaseClient,
    userId: string,
    id: string,
    orgId?: string | null,
  ): Promise<{ jobId: string; status: string; deduped: boolean }> {
    const mapping = await this.mappingsRepo.getById(supabase, id, userId, orgId)
    if (!mapping) throw new NotFoundException('Slack brain mapping not found')
    const periodStart = mapping.last_synced_at ?? mapping.created_at
    const result = await this.brainImportJobs.enqueueSlackPeriodImport(
      userId,
      mapping,
      periodStart,
      new Date().toISOString(),
      orgId,
    )
    return result
  }

  async backfillPersonBrains(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    lookbackDays: number,
    now = new Date(),
  ): Promise<{
    provisioned_person_brains: number
    mapped_channels: number
    queued_jobs: number
    deduped_jobs: number
    lookback_days: number
  }> {
    if (!orgId)
      throw new BadRequestException('An organization is required for Person Brain backfill')
    const integration = await this.slackRepo.getIntegration(supabase, userId, orgId)
    if (!integration?.access_token) throw new BadRequestException('Slack is not connected')

    const people = await this.peopleRepo.listPeople(supabase, orgId)
    let provisionedPersonBrains = 0
    for (const person of people) {
      if (
        person.relationship_kind === 'ignored' ||
        person.vibey_user_id ||
        person.person_brain_id
      ) {
        continue
      }
      await this.peopleBrains.createManagedPersonBrain(supabase, {
        personId: person.id,
        orgId,
        ownerId: userId,
      })
      provisionedPersonBrains += 1
    }

    const mappings = (await this.mappingsRepo.list(supabase, userId, orgId)).filter(
      (mapping) => mapping.enabled,
    )
    const boundedLookbackDays = Math.min(365, Math.max(1, Math.trunc(lookbackDays)))
    const periodStart = this.toSlackTimestamp(
      new Date(now.getTime() - boundedLookbackDays * 24 * 60 * 60 * 1000),
    )
    const periodEnd = this.toSlackTimestamp(now)
    let queuedJobs = 0
    let dedupedJobs = 0
    for (const mapping of mappings) {
      const result = await this.brainImportJobs.enqueueSlackPeriodImport(
        userId,
        mapping,
        periodStart,
        periodEnd,
        orgId,
      )
      if (result.deduped) dedupedJobs += 1
      else queuedJobs += 1
    }
    return {
      provisioned_person_brains: provisionedPersonBrains,
      mapped_channels: mappings.length,
      queued_jobs: queuedJobs,
      deduped_jobs: dedupedJobs,
      lookback_days: boundedLookbackDays,
    }
  }

  async listSenderResolution(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ senders: SlackResolvedSender[] }> {
    const integration = await this.slackRepo.getIntegration(supabase, userId, orgId)
    if (!integration?.access_token) return { senders: [] }
    const members = await this.senderResolver.seedContactIdentifiersFromWorkspace(supabase, {
      botToken: integration.access_token,
      userId,
      orgId,
    })
    return { senders: members.members }
  }

  async attachSenderToContact(
    supabase: SupabaseClient,
    input: { contactId: string; slackUserId: string },
  ): Promise<{ success: true }> {
    await this.contactIdentifiers.attachIdentifier(supabase, {
      contactId: input.contactId,
      kind: 'slack_user_id',
      value: input.slackUserId,
      confidence: 1,
      source: 'manual',
    })
    return { success: true }
  }

  async setAutoIngest(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    autoIngest: boolean,
  ): Promise<{ success: true; autoIngest: boolean }> {
    await this.slackRepo.updateIntegrationMetadata(
      supabase,
      userId,
      { slack_brain_auto_ingest: autoIngest },
      orgId,
    )
    return { success: true, autoIngest }
  }

  async enqueueDueMappings(supabase: SupabaseClient): Promise<number> {
    const due = await this.mappingsRepo.listDue(supabase)
    let count = 0
    for (const mapping of due) {
      const integration = await this.slackRepo.getIntegration(
        supabase,
        mapping.user_id,
        mapping.org_id,
      )
      const metadata = (integration?.metadata ?? {}) as Record<string, unknown>
      if (!integration?.access_token || metadata.slack_brain_auto_ingest === false) continue
      await this.brainImportJobs.enqueueSlackPeriodImport(
        mapping.user_id,
        mapping,
        mapping.last_synced_at ?? mapping.created_at,
        new Date().toISOString(),
        mapping.org_id,
      )
      count += 1
    }
    return count
  }

  private toSlackTimestamp(value: Date): string {
    return `${Math.floor(value.getTime() / 1000)}.000000`
  }
}
