import type { ModuleRef } from '@nestjs/core'
import type { Queue } from 'bullmq'
import type { ErrorReporter } from '@vibey/api-shared'
import { BrainImportJobsInputRepository } from '../repositories/brain-import-jobs-input.repository'
import { BrainImportJobsRuntimeRepository } from '../repositories/brain-import-jobs-runtime.repository'
import { BrainImportJobsExecutionBase } from './brain-import-jobs-execution.base'
import { buildMeetingMissionInput, legacyFathomJobPayload } from './brain-import-jobs-meeting-input'
import type { BrainImportJobRecord } from './brain-import-jobs.types'

export abstract class BrainImportJobsInputBase extends BrainImportJobsExecutionBase {
  constructor(
    moduleRef: ModuleRef,
    errorReporter: ErrorReporter,
    brainImportQueue?: Queue,
    runtimeRepository: BrainImportJobsRuntimeRepository = new BrainImportJobsRuntimeRepository(),
    protected readonly inputRepository?: BrainImportJobsInputRepository,
  ) {
    super(moduleRef, errorReporter, brainImportQueue, runtimeRepository)
  }

  protected async buildMissionInput(
    job: BrainImportJobRecord,
    payload: Record<string, unknown>,
  ): Promise<{
    targetBrain: 'user' | 'campaign' | 'agent' | 'customer'
    contentType: string
    title: string
    campaignId?: string
    input: Record<string, unknown>
  }> {
    switch (job.job_type) {
      case 'fathom_meeting_import':
        return buildMeetingMissionInput(job, legacyFathomJobPayload(payload))
      case 'document_remember':
        return {
          targetBrain: 'user',
          contentType: 'document',
          title: `Analyze document: ${job.title || 'Untitled'}`,
          input: {
            target_brain: 'user',
            content_type: 'document',
            skill: 'knowledge-intake',
            ...payload,
          },
        }
      case 'user_link_import':
        return {
          targetBrain: 'user',
          contentType: 'link',
          title: `Analyze link: ${job.title || 'Link'}`,
          input: {
            target_brain: 'user',
            content_type: 'link',
            skill: 'knowledge-intake',
            ...payload,
          },
        }
      case 'sk_ingest':
        return {
          targetBrain: 'agent',
          contentType: 'sk_text',
          title: `Train agent: ${job.title || 'Knowledge'}`,
          input: {
            target_brain: 'agent',
            content_type: 'sk_text',
            skill: 'knowledge-intake',
            ...payload,
          },
        }
      case 'sk_link_ingest':
        return {
          targetBrain: 'agent',
          contentType: 'sk_link',
          title: `Train agent from link: ${job.title || 'Link'}`,
          input: {
            target_brain: 'agent',
            content_type: 'sk_link',
            skill: 'knowledge-intake',
            ...payload,
          },
        }
      case 'campaign_file_import': {
        const cId = String(payload.campaignId ?? '')
        return {
          targetBrain: 'campaign',
          contentType: 'campaign_file',
          title: `Add to campaign: ${payload.title || 'File'}`,
          campaignId: cId || undefined,
          input: {
            target_brain: 'campaign',
            content_type: 'campaign_file',
            skill: 'knowledge-intake',
            ...payload,
          },
        }
      }
      case 'campaign_url_import': {
        const cId = String(payload.campaignId ?? '')
        return {
          targetBrain: 'campaign',
          contentType: 'campaign_url',
          title: `Add to campaign from URL`,
          campaignId: cId || undefined,
          input: {
            target_brain: 'campaign',
            content_type: 'campaign_url',
            skill: 'knowledge-intake',
            ...payload,
          },
        }
      }
      case 'campaign_fathom_import':
        return buildMeetingMissionInput(job, legacyFathomJobPayload(payload))
      case 'slack_period_import':
      case 'campaign_slack_import':
        return this.buildSlackMissionInput(job, payload)
      default:
        throw new Error(`Unsupported job type for mission dispatch: ${job.job_type}`)
    }
  }

  private async buildSlackMissionInput(
    job: BrainImportJobRecord,
    payload: Record<string, unknown>,
  ): Promise<{
    targetBrain: 'user' | 'campaign' | 'agent' | 'customer'
    contentType: string
    title: string
    campaignId?: string
    input: Record<string, unknown>
  }> {
    const mappingId = String(payload.mappingId ?? '')
    const mappingUserId = String(payload.mappingUserId || job.user_id)
    const teamId = String(payload.teamId ?? '')
    const channelId = String(payload.channelId ?? '')
    const channelName = String(payload.channelName ?? 'slack')
    const periodStartTs = String(payload.periodStartTs ?? '')
    const periodEndTs = String(payload.periodEndTs ?? '')
    const targetKind = this.resolveSlackTargetKind(payload.targetKind)
    const senderFilterSlackUserId =
      typeof payload.senderFilterSlackUserId === 'string' && payload.senderFilterSlackUserId
        ? payload.senderFilterSlackUserId
        : null
    if (!mappingId || !teamId || !channelId || !periodStartTs) {
      throw new Error('Slack import job is missing mapping/team/channel/period data')
    }

    const admin = this.getAdminClient()
    const botToken = await this.getInputRepository().findConnectedSlackBotToken(
      admin,
      mappingUserId,
      teamId,
    )
    if (!botToken) throw new Error('Slack integration missing bot token')

    const slackService = this.getSlackService()
    const senderResolver = this.getSlackSenderResolver()
    let expandedThreads: Array<Array<{ user?: string; text?: string; ts?: string }>>
    if (job.org_id) {
      const observation = this.getSlackObservationService()
      if (!payload.isFork) {
        await observation.backfillChannelPeriod({
          supabase: admin,
          orgId: job.org_id,
          slackTeamId: teamId,
          botToken,
          channelId,
          channelName,
          periodStartTs,
          periodEndTs,
        })
      }
      expandedThreads = await observation.loadPeriodThreads({
        supabase: admin,
        orgId: job.org_id,
        slackTeamId: teamId,
        channelId,
        periodStartTs,
        periodEndTs,
      })
    } else {
      const rawMessages = await slackService.pullChannelHistorySince(
        botToken,
        channelId,
        periodStartTs,
      )
      expandedThreads = await slackService.expandThreads(botToken, channelId, rawMessages)
    }
    const filteredThreads = senderFilterSlackUserId
      ? expandedThreads.filter((thread: Array<{ user?: string; text?: string }>) =>
          thread.some(
            (message) =>
              message.user === senderFilterSlackUserId && (message.text ?? '').trim().length > 20,
          ),
        )
      : expandedThreads
    const slackUserIds = [
      ...new Set(
        filteredThreads
          .flat()
          .map((message: { user?: string }) => message.user)
          .filter((value: string | undefined): value is string => !!value),
      ),
    ]
    const senderResolutionMap = await senderResolver.resolveSlackSenders(admin, {
      botToken,
      userId: mappingUserId,
      orgId: job.org_id ?? null,
      slackUserIds,
    })

    if (!payload.isFork) {
      await this.enqueueSlackForkJobs(job, payload, senderResolutionMap)
    }

    const content = slackService.formatThreadsAsBlob(
      channelName,
      filteredThreads,
      senderResolutionMap,
    )
    const campaignId =
      targetKind === 'campaign' && typeof payload.targetCampaignId === 'string'
        ? payload.targetCampaignId
        : undefined
    const brainId = await this.resolveSlackBrainId(
      targetKind,
      payload,
      job.user_id,
      job.org_id ?? null,
    )
    const contactId = typeof payload.contactId === 'string' ? payload.contactId : null

    return {
      targetBrain: targetKind,
      contentType: targetKind === 'customer' ? 'slack_period_customer' : 'slack_period',
      title: `Analyze Slack #${channelName}`,
      campaignId,
      input: {
        target_brain: targetKind,
        content_type: targetKind === 'customer' ? 'slack_period_customer' : 'slack_period',
        skill: 'knowledge-intake',
        sourceTitle: `Slack #${channelName}`,
        sourceId: `slack:${teamId}:${channelId}:${periodStartTs}`,
        content,
        brainId,
        contact_id: contactId,
        mappingId,
        channelId,
        channelName,
        teamId,
        periodStartTs,
        periodEndTs,
        occurred_at: this.slackTsToIso(periodStartTs),
        occurred_until: this.slackTsToIso(periodEndTs),
        asserted_at: new Date().toISOString(),
        temporal_source: 'slack_period',
        temporal_confidence: periodStartTs ? 1 : 0,
        senderFilterSlackUserId,
      },
    }
  }

  private firstString(...values: unknown[]): string | undefined {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value.trim()
      if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    }
    return undefined
  }

  private slackTsToIso(value: string): string | undefined {
    const raw = value.trim()
    if (!/^\d+(\.\d+)?$/.test(raw)) return undefined
    const millis = Number(raw) * 1000
    if (!Number.isFinite(millis)) return undefined
    return new Date(millis).toISOString()
  }

  private resolveSlackTargetKind(value: unknown): 'user' | 'campaign' | 'agent' | 'customer' {
    return value === 'campaign' || value === 'agent' || value === 'customer' ? value : 'user'
  }

  private async resolveSlackBrainId(
    targetKind: 'user' | 'campaign' | 'agent' | 'customer',
    payload: Record<string, unknown>,
    userId: string,
    orgId: string | null,
  ): Promise<string | undefined> {
    if (targetKind === 'customer') {
      const customerBrain = this.getCustomerBrainService()
      const brain = await customerBrain.getOrCreateCustomerBrain({ ownerId: userId, orgId })
      return brain.id
    }
    if (
      (targetKind === 'user' || targetKind === 'agent') &&
      typeof payload.targetBrainId === 'string'
    ) {
      return payload.targetBrainId
    }
    return undefined
  }

  private async enqueueSlackForkJobs(
    job: BrainImportJobRecord,
    payload: Record<string, unknown>,
    senderResolutionMap: Map<
      string,
      {
        contactId: string | null
        contactRole: string | null
        qualifiesForCustomerBrain: boolean
        vibeyUserId: string | null
        personBrainId: string | null
        relationshipKind: 'internal' | 'external' | 'ignored'
      }
    >,
  ): Promise<void> {
    const mapping = await this.loadSlackMappingForPayload(payload)
    const targetKind = this.resolveSlackTargetKind(payload.targetKind)
    for (const [slackUserId, sender] of senderResolutionMap.entries()) {
      if (sender.contactRole === 'friend' || sender.contactRole === 'family') continue
      if (sender.qualifiesForCustomerBrain && sender.contactId && targetKind !== 'customer') {
        await this.enqueueSlackPeriodImport(
          mapping.user_id,
          mapping,
          String(payload.periodStartTs ?? ''),
          String(payload.periodEndTs ?? new Date().toISOString()),
          mapping.org_id,
          {
            kind: 'customer',
            targetId: sender.contactId,
            contactId: sender.contactId,
            slackUserId,
          },
        )
      }
      if (sender.vibeyUserId && sender.vibeyUserId !== mapping.user_id) {
        const brainId = await this.resolveDefaultBrainId(sender.vibeyUserId, mapping.org_id)
        if (brainId) {
          await this.enqueueSlackPeriodImport(
            mapping.user_id,
            mapping,
            String(payload.periodStartTs ?? ''),
            String(payload.periodEndTs ?? new Date().toISOString()),
            mapping.org_id,
            {
              kind: 'user',
              targetId: sender.vibeyUserId,
              userId: sender.vibeyUserId,
              brainId,
              slackUserId,
            },
          )
        }
      }
      if (sender.personBrainId && !sender.vibeyUserId && sender.relationshipKind !== 'ignored') {
        await this.enqueueSlackPeriodImport(
          mapping.user_id,
          mapping,
          String(payload.periodStartTs ?? ''),
          String(payload.periodEndTs ?? new Date().toISOString()),
          mapping.org_id,
          {
            kind: 'managed_person',
            targetId: sender.personBrainId,
            brainId: sender.personBrainId,
            slackUserId,
          },
        )
      }
    }
  }

  private async loadSlackMappingForPayload(payload: Record<string, unknown>): Promise<{
    id: string
    user_id: string
    org_id: string | null
    slack_team_id: string
    slack_channel_id: string
    slack_channel_name: string
    target_kind: 'user' | 'campaign' | 'agent' | 'customer'
    target_brain_id: string | null
    target_campaign_id: string | null
    cadence: string
  }> {
    const mappingId = String(payload.mappingId ?? '')
    const admin = this.getAdminClient()
    return this.getInputRepository().loadSlackMapping(admin, mappingId)
  }

  private async resolveDefaultBrainId(
    userId: string,
    _orgId: string | null,
  ): Promise<string | null> {
    return this.getInputRepository().resolveDefaultBrainId(this.getAdminClient(), userId)
  }

  private getInputRepository(): BrainImportJobsInputRepository {
    if (!this.inputRepository) throw new Error('Brain import input repository is not configured')
    return this.inputRepository
  }
}
