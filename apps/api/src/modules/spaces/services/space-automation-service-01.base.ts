import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Queue } from 'bullmq'
import { AGENT_RUNTIME_AUTOMATION_QUEUE } from '../../agent-runtime/agent-runtime-queues'
import { CreditsService } from '../../billing/services/credits.service'
import { BrainImportJobsService } from '../../brain/services/brain-import-jobs.service'
import { SearchService, type ScoredSnapshot } from '../../brain/services/search.service'
import { ChannelsRepository } from '../../channels/repositories/channels.repository'
import { ComposioService } from '../../composio/services/composio.service'
import { CursorApiService } from '../../integrations/cursor/services/cursor-api.service'
import { scrapecreatorsCreditsForAction } from '../../integrations/scrapecreators/scrapecreators.constants'
import { ScrapeCreatorsApiService } from '../../integrations/scrapecreators/services/scrapecreators-api.service'
import { isContactChannel } from '../../leads/services/contact-identifier.service'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import {
  getConnectedAppFlowTriggerBySlug,
  type ConnectedAppFlowProvider,
} from '../data/connected-app-flow-triggers'
import { SpaceAutomationActionsRepository } from '../repositories/space-automation-actions.repository'
import { SpaceAutomationExternalEventsRepository } from '../repositories/space-automation-external-events.repository'
import { SpaceAutomationRunsRepository } from '../repositories/space-automation-runs.repository'
import { SpaceAutomationsRepository } from '../repositories/space-automations.repository'
import { SpacesRepository } from '../repositories/spaces.repository'
import { sanitizeAssigneesForWrite } from '../utils/sanitize-assignees'
import { SocialResearchOrchestrationService } from './social-research-orchestration.service'
import { renderTemplate, type TemplateContext } from './space-automation-template'

const MAX_CHAIN_DEPTH = 5
const TASK_SHAPED_TRIGGER_TYPES = new Set([
  'task_created',
  'status_change',
  'priority_changed',
  'assignee_changed',
  'field_changed',
  'mission_completed',
  'mission_failed',
  'due_date_changed',
  'start_date_changed',
  'tag_added',
  'tag_removed',
])
const SLACK_TRIGGER_SLUGS = [
  'SLACK_RECEIVE_DIRECT_MESSAGE',
  'SLACK_CHANNEL_MESSAGE_RECEIVED',
  'SLACK_RECEIVE_THREAD_REPLY',
  'SLACKBOT_RECEIVE_DIRECT_MESSAGE',
  'SLACKBOT_CHANNEL_MESSAGE_RECEIVED',
  'SLACKBOT_RECEIVE_THREAD_REPLY',
] as const

const ASYNC_COMPLETION_ACTIONS = new Set(['send_to_agent', 'send_to_cursor'])

/**
 * Actions that are safe to run from a `schedule` trigger (no source space item).
 * Anything outside this set is rejected at execute time so a stale config that
 * slipped past frontend validation cannot mutate or read a non-existent task.
 */
const SCHEDULE_ALLOWED_ACTION_TYPES = new Set<string>([
  'create_task',
  'agent_suggest_tasks',
  'send_email',
  'send_slack_message',
  'send_channel_message',
  'create_artifact',
  'publish_artifact',
  'unpublish_artifact',
  'create_contact',
  'sync_social_research',
  'select_social_outliers',
  'enrich_social_research_items',
  'ingest_youtube_channel_to_agent_brain',
  'send_to_agent',
  'send_to_cursor',
  'meetings_precall_prep',
])

const YOUTUBE_CHANNEL_VIDEOS_PATH = '/v1/youtube/channel-videos'
const MAX_YOUTUBE_BRAIN_CHANNELS = 10
const MAX_YOUTUBE_BRAIN_PAGES = 10
const MIN_LONG_FORM_SECONDS = 60

const ARTIFACT_TABLE_BY_KIND: Record<string, string> = {
  funnel: 'funnels',
  website: 'funnels',
  form: 'forms',
  email: 'emails',
  sequence: 'sequences',
  social_post: 'social_posts',
  presentation: 'presentations',
  ad: 'ads',
  offer: 'offers',
  avatar: 'avatars',
}

type AutomationAssignee = { type: 'human' | 'agent'; id: string }

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function inlineMarkdownToHtml(value: string): string {
  return escapeHtmlText(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function emailMarkdownToHtml(markdown: string): string {
  const blocks = markdown.trim().split(/\n{2,}/)
  const html: string[] = []
  for (const block of blocks) {
    const lines = block.split('\n')
    if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
      html.push(
        `<ul>${lines
          .map((line) => `<li>${inlineMarkdownToHtml(line.replace(/^\s*[-*]\s+/, ''))}</li>`)
          .join('')}</ul>`,
      )
      continue
    }
    html.push(`<p>${inlineMarkdownToHtml(block).replace(/\n/g, '<br>')}</p>`)
  }
  return html.join('\n')
}

export type TriggerEvent =
  | { type: 'status_change'; from?: string; to: string; is_subtask?: boolean }
  | { type: 'task_created'; in_status?: string; is_subtask?: boolean }
  | { type: 'mission_completed'; mission_id: string; is_subtask?: boolean }
  | { type: 'mission_failed'; mission_id: string; is_subtask?: boolean }
  | { type: 'field_changed'; field_id: string; from?: string; to?: string; is_subtask?: boolean }
  | {
      type: 'priority_changed'
      from?: string
      to: 'low' | 'medium' | 'high' | 'urgent'
      is_subtask?: boolean
    }
  | { type: 'due_date_changed'; from?: string; to?: string; is_subtask?: boolean }
  | { type: 'start_date_changed'; from?: string; to?: string; is_subtask?: boolean }
  | { type: 'tag_added'; tag: string; is_subtask?: boolean }
  | { type: 'tag_removed'; tag: string; is_subtask?: boolean }
  | { type: 'form_submitted'; form_id: string; answers?: Record<string, unknown> }
  | { type: 'contact_created'; contact_id: string }
  | { type: 'contact_updated'; contact_id: string; field_id?: string; from?: unknown; to?: unknown }
  | { type: 'contact_tag_added'; contact_id: string; tag: string }
  | { type: 'contact_tag_removed'; contact_id: string; tag: string }
  | { type: 'contact_type_changed'; contact_id: string; from?: string; to?: string }
  | { type: 'contact_source_changed'; contact_id: string; from?: string; to?: string }
  | {
      type: 'artifact_lifecycle'
      artifact_kind: string
      lifecycle_event: string
      artifact_id: string
      campaign_id: string
      status?: string
    }
  | {
      type: 'assignee_changed'
      from_type?: 'human' | 'agent' | 'unassigned'
      from_id?: string
      to_type: 'human' | 'agent' | 'unassigned'
      to_id?: string
      from_assignees?: AutomationAssignee[]
      to_assignees?: AutomationAssignee[]
      added_assignees?: AutomationAssignee[]
      removed_assignees?: AutomationAssignee[]
      is_subtask?: boolean
    }
  | {
      type: 'external_email_received'
      provider: 'gmail' | 'outlook'
      trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE' | 'OUTLOOK_MESSAGE_TRIGGER'
      connected_account_id: string
      from?: string
      subject?: string
      body?: string
      cc?: string
    }
  | {
      type: 'external_slack_message_received'
      trigger_slug: string
      connected_account_id: string
      channel_id?: string
      from?: string
      text?: string
    }
  | {
      type: 'external_fathom_recording_ready'
      title?: string
      recorded_by_email?: string
      meeting_id?: string
      summary?: string
      transcript_text?: string
      transcript_entries?: number
      transcript?: Array<Record<string, unknown>>
      action_items?: Array<Record<string, unknown>>
      attendees?: Array<Record<string, unknown>>
      url?: string | null
      fathom_owner_user_id?: string
    }
  | {
      type: 'external_app_event'
      provider: ConnectedAppFlowProvider
      provider_label?: string
      trigger_slug: string
      event_label?: string
      connected_account_id: string
      payload?: unknown
    }
  | {
      type: 'webhook_received'
      webhook_endpoint_id: string
      webhook_event_id: string
      payload: unknown
      fields: Record<string, unknown>
      query?: Record<string, unknown>
      webhook: { endpoint_id: string; event_id: string; received_at: string }
    }
  | {
      type: 'schedule'
      fired_at: string
    }

interface EvalContext {
  supabase: SupabaseClient
  userId: string
  orgId: string | null
  spaceId: string
  itemId: string
  depth: number
}

/** Context used by schedule (item-less) triggers — no `itemId`. */
interface ItemlessEvalContext {
  supabase: SupabaseClient
  userId: string
  orgId: string | null
  spaceId: string
  depth: number
}

interface AutomationRule {
  id: string
  name: string
  enabled: boolean
  is_draft?: boolean
  trigger: Record<string, unknown>
  actions: Record<string, unknown>[]
}

interface AutomationYoutubeChannelVideo {
  type?: string
  id?: string
  url?: string
  title?: string
  publishedTime?: string
  publishDate?: string
  lengthSeconds?: number
  lengthInSeconds?: number
  durationMs?: number
  durationFormatted?: string
}

interface AutomationYoutubeChannelInput {
  raw: string
  handle?: string
  channelId?: string
  label: string
}

export abstract class SpaceAutomationServiceBase01 {
  // Abstract declarations for methods implemented by later base classes.
  protected abstract triggerMatches(...args: any[]): any
  abstract syncExternalTriggerForAutomation(...args: any[]): any
  protected abstract isContactTrigger(...args: any[]): any
  protected abstract syncContactTriggerRoute(...args: any[]): any
  protected abstract disableContactTriggerForAutomation(...args: any[]): any
  abstract processContactAutomationEvent(...args: any[]): any
  abstract processArtifactLifecycleEvent(...args: any[]): any
  protected abstract artifactEventTitle(...args: any[]): any
  protected abstract contactRouteFiltersMatch(...args: any[]): any
  protected abstract contactEventTitle(...args: any[]): any
  protected abstract syncFathomTriggerRoute(...args: any[]): any
  abstract revokeFathomDependentRules(...args: any[]): any
  abstract restoreFathomDependentRules(...args: any[]): any
  protected abstract normalizeFathomSource(...args: any[]): any
  abstract disableExternalTriggerForAutomation(...args: any[]): any
  abstract processComposioExternalEmailEvent(...args: any[]): any
  abstract processComposioExternalEvent(...args: any[]): any
  abstract processFathomRecordingEvent(...args: any[]): any
  protected abstract collectMatchingFathomRoutes(...args: any[]): any
  protected abstract executeAutomation(...args: any[]): any
  abstract resumeAutomation(...args: any[]): any
  abstract executeAutomationById(...args: any[]): any
  abstract executeAutomationItemless(...args: any[]): any
  protected abstract buildItemlessTemplateContext(...args: any[]): any
  protected abstract logScheduledRun(...args: any[]): any
  protected abstract automationActionSummary(...args: any[]): any
  protected abstract automationActionVerb(...args: any[]): any
  protected abstract logAutomationActionActivity(...args: any[]): any
  protected abstract pauseRun(...args: any[]): any
  protected abstract resolveActionTargetContext(...args: any[]): any
  protected abstract executeAction(...args: any[]): any
  protected abstract execSyncSocialResearch(...args: any[]): any
  protected abstract execSelectSocialOutliers(...args: any[]): any
  protected abstract execEnrichSocialResearchItems(...args: any[]): any
  protected abstract normalizeSocialPlatformSelector(...args: any[]): any
  protected abstract normalizeSocialSyncMode(...args: any[]): any
  protected abstract normalizeSocialEnrichments(...args: any[]): any
  protected abstract resolveSocialResearchItemIds(...args: any[]): any
  protected abstract resolveAgentBrainIdFromKey(...args: any[]): any
  protected abstract execIngestYoutubeChannelToAgentBrain(...args: any[]): any
  protected abstract execMeetingsPrecallPrep(...args: any[]): any
  protected abstract normalizeYoutubeBrainChannels(...args: any[]): any
  protected abstract parseYoutubeChannelInput(...args: any[]): any
  protected abstract fetchRecentYoutubeChannelVideosForBrain(...args: any[]): any
  protected abstract runScrapeCreatorsAutomationAction(...args: any[]): any
  protected abstract unwrapAutomationYoutubePayload(...args: any[]): any
  protected abstract youtubeVideoUrl(...args: any[]): any
  protected abstract isYoutubeShortOrClip(...args: any[]): any
  protected abstract parseYoutubePublishedAt(...args: any[]): any
  protected abstract normalizeBrainImportDomain(...args: any[]): any
  protected abstract buildBrainSearchQuery(...args: any[]): any
  protected abstract searchBrainContext(...args: any[]): any
  protected abstract brainResultContent(...args: any[]): any
  protected abstract resolveScopedBrainId(...args: any[]): any
  protected abstract searchCompanyCortexContext(...args: any[]): any
  protected abstract formatBrainContextBlock(...args: any[]): any
  protected abstract execAddBrainContextToTask(...args: any[]): any
  protected abstract numberInRange(...args: any[]): any
  protected abstract integerInRange(...args: any[]): any
  protected abstract assertAutomationCreditsAvailable(...args: any[]): any
  protected abstract execCreateTask(...args: any[]): any
  protected abstract normalizeMaxSuggestions(...args: any[]): any
  protected abstract execAgentSuggestTasks(...args: any[]): any
  protected abstract buildAgentOutputContract(...args: any[]): any
  protected abstract execSendToAgent(...args: any[]): any
  protected abstract execSendToAgents(...args: any[]): any
  protected abstract execSendToCursor(...args: any[]): any
  protected abstract normalizeAssignees(...args: any[]): any
  protected abstract itemAssignees(...args: any[]): any
  protected abstract assigneesEqual(...args: any[]): any
  protected abstract assigneeDiff(...args: any[]): any
  protected abstract execAssignTo(...args: any[]): any
  protected abstract execChangeStatus(...args: any[]): any
  protected abstract execChangePriority(...args: any[]): any
  protected abstract execAddComment(...args: any[]): any
  protected abstract execHumanGate(...args: any[]): any
  protected abstract execFlowLoop(...args: any[]): any
  protected abstract tryResumeHumanGateOnStatusChange(...args: any[]): any
  protected abstract extractReviewFeedbackFromActivity(...args: any[]): any
  protected abstract execCreateSubtask(...args: any[]): any
  protected abstract execSendEmail(...args: any[]): any
  protected abstract resolveEmailArtifactForSend(...args: any[]): any
  protected abstract execSendSlackMessage(...args: any[]): any
  protected abstract execSendChannelMessage(...args: any[]): any
  protected abstract execCreateContact(...args: any[]): any
  protected abstract resolveContactId(...args: any[]): any
  protected abstract readContactTags(...args: any[]): any
  protected abstract execUpdateContactField(...args: any[]): any
  protected abstract execAddContactTag(...args: any[]): any
  protected abstract execRemoveContactTag(...args: any[]): any
  protected abstract execAttachNoteToContact(...args: any[]): any
  protected abstract execLinkItemToContact(...args: any[]): any
  protected abstract artifactTable(...args: any[]): any
  protected abstract artifactTitleColumn(...args: any[]): any
  protected abstract execCreateArtifact(...args: any[]): any
  protected abstract execSetArtifactStatus(...args: any[]): any
  protected abstract execAskAgentToImproveArtifact(...args: any[]): any
  protected abstract execAttachArtifactToItem(...args: any[]): any
  protected abstract buildTemplateContext(...args: any[]): any
  protected abstract actionResultsToStepOutputs(...args: any[]): any
  protected abstract normalizeEventForTemplate(...args: any[]): any
  protected abstract parseEmailIdentity(...args: any[]): any
  protected abstract emailTriggerContext(...args: any[]): any
  protected abstract sourceEmailContext(...args: any[]): any
  protected abstract renderActionPreview(...args: any[]): any
  protected abstract buildTriggerConfig(...args: any[]): any
  protected abstract providerForTriggerSlug(...args: any[]): any
  protected abstract objectRecord(...args: any[]): any
  protected abstract normalizeComposioEmailSubjectSummary(...args: any[]): any
  protected abstract extractEmailSummary(...args: any[]): any
  protected abstract formatEmailRecipients(...args: any[]): any
  protected abstract formatEmailRecipient(...args: any[]): any
  protected abstract emailItemTitle(...args: any[]): any
  protected abstract summarizeExternalPayload(...args: any[]): any
  protected abstract externalRouteFiltersMatch(...args: any[]): any
  protected abstract routeFiltersMatch(...args: any[]): any
  protected abstract extractFathomSummary(...args: any[]): any
  protected abstract fathomRouteFiltersMatch(...args: any[]): any
  protected abstract updateExternalEvent(...args: any[]): any
  protected abstract logRun(...args: any[]): any
  // End generated abstract declarations.

  protected readonly logger = new Logger('SpaceAutomationService')
  protected readonly automationActionsRepo: SpaceAutomationActionsRepository
  protected readonly externalEventsRepo: SpaceAutomationExternalEventsRepository
  protected readonly automationRunsRepo: SpaceAutomationRunsRepository

  constructor(
    protected readonly repo: SpacesRepository,
    protected readonly automationsRepo: SpaceAutomationsRepository,
    protected readonly configService: ConfigService,
    protected readonly composio: ComposioService,
    protected readonly slackTools?: SlackAgentToolsService,
    protected readonly channelsRepo?: ChannelsRepository,
    protected readonly creditsService?: CreditsService,
    protected readonly userAgentApi?: UserAgentApiService,
    protected readonly socialResearch?: SocialResearchOrchestrationService,
    protected readonly brainSearch?: SearchService,
    protected readonly cursorApi?: CursorApiService,
    protected readonly scrapeCreatorsApi?: ScrapeCreatorsApiService,
    protected readonly brainImportJobs?: BrainImportJobsService,
    protected readonly automationQueue?: Queue,
    automationActionsRepo?: SpaceAutomationActionsRepository,
    externalEventsRepo?: SpaceAutomationExternalEventsRepository,
    automationRunsRepo?: SpaceAutomationRunsRepository,
  ) {
    this.automationActionsRepo = automationActionsRepo ?? new SpaceAutomationActionsRepository()
    this.externalEventsRepo = externalEventsRepo ?? new SpaceAutomationExternalEventsRepository()
    this.automationRunsRepo = automationRunsRepo ?? new SpaceAutomationRunsRepository()
  }

  async evaluate(event: TriggerEvent, ctx: EvalContext): Promise<void> {
    if (ctx.depth >= MAX_CHAIN_DEPTH) {
      this.logger.warn(
        `Automation chain depth limit reached (${MAX_CHAIN_DEPTH}) for item ${ctx.itemId}`,
      )
      return
    }

    if (event.type === 'status_change') {
      await this.tryResumeHumanGateOnStatusChange(event, ctx)
    }

    const space = await this.repo.findSpaceById(ctx.supabase, ctx.userId, ctx.spaceId, ctx.orgId)
    if (!space) return

    const automations = (await this.automationsRepo.listBySpace(
      ctx.supabase,
      ctx.spaceId,
    )) as AutomationRule[]
    const matching = automations.filter(
      (a) => a.enabled && !a.is_draft && this.triggerMatches(a.trigger, event),
    )

    for (const automation of matching) {
      if (this.shouldUseAutomationQueue()) {
        await this.enqueueAutomationRuntimeJob(String(automation.id), event, ctx)
      } else {
        await this.executeAutomation(automation, event, ctx, space)
      }
    }
  }

  async executeQueuedAutomation(input: {
    automationId: string
    event: TriggerEvent
    userId: string
    orgId: string | null
    spaceId: string
    itemId: string
    depth: number
    supabase: SupabaseClient
  }): Promise<string | null> {
    return this.executeAutomationById(input.automationId, input.event, {
      supabase: input.supabase,
      userId: input.userId,
      orgId: input.orgId,
      spaceId: input.spaceId,
      itemId: input.itemId,
      depth: input.depth,
    })
  }

  async executeQueuedItemlessAutomation(input: {
    automationId: string
    event: TriggerEvent
    userId: string
    orgId: string | null
    spaceId: string
    depth: number
    supabase: SupabaseClient
  }): Promise<void> {
    const automation = (await this.automationsRepo.findById(
      input.supabase,
      input.spaceId,
      input.automationId,
    )) as AutomationRule | null
    if (!automation || automation.enabled !== true || automation.is_draft === true) return
    await this.executeAutomationItemless(automation, input.event, {
      supabase: input.supabase,
      userId: input.userId,
      orgId: input.orgId,
      spaceId: input.spaceId,
      depth: input.depth,
    })
  }

  protected shouldUseAutomationQueue(): boolean {
    return !!this.automationQueue && process.env.AGENT_RUNTIME_AUTOMATION_QUEUE_DISABLED !== '1'
  }

  async enqueueAutomationRuntimeJob(
    automationId: string,
    event: TriggerEvent,
    ctx: Omit<EvalContext, 'itemId'> & { itemId?: string },
    mode: 'item' | 'itemless' = 'item',
    afterComplete?: { externalEventId: unknown; patch: Record<string, unknown> },
  ): Promise<boolean> {
    if (!this.automationQueue) return false
    await this.automationQueue.add(
      'automation-run',
      {
        mode,
        automationId,
        event,
        userId: ctx.userId,
        orgId: ctx.orgId,
        spaceId: ctx.spaceId,
        itemId: ctx.itemId ?? '',
        depth: ctx.depth,
        afterComplete,
      },
      {
        jobId: `automation-${automationId}-${ctx.spaceId}-${ctx.itemId || 'itemless'}-${Date.now()}`,
        removeOnComplete: true,
        removeOnFail: { age: 7 * 24 * 3600 },
        attempts: 1,
      },
    )
    return true
  }

  async completeQueuedExternalEvent(
    supabase: SupabaseClient,
    externalEventId: unknown,
    patch: Record<string, unknown>,
    itemId: string | null,
  ): Promise<void> {
    await this.updateExternalEvent(supabase, externalEventId, {
      ...patch,
      item_id: itemId,
      processed_at: new Date().toISOString(),
    })
  }

  async dryRun(
    automationId: string,
    ctx: EvalContext,
  ): Promise<{ renderedActions: { type: string; rendered: string }[] }> {
    const space = await this.repo.findSpaceById(ctx.supabase, ctx.userId, ctx.spaceId, ctx.orgId)
    if (!space) return { renderedActions: [] }

    const automation = (await this.automationsRepo.findById(
      ctx.supabase,
      ctx.spaceId,
      automationId,
    )) as AutomationRule | null
    if (!automation || automation.is_draft) return { renderedActions: [] }

    const item = await this.repo.findItemById(ctx.supabase, ctx.spaceId, ctx.itemId)
    if (!item) return { renderedActions: [] }

    const templateCtx = await this.buildTemplateContext(ctx, item as Record<string, unknown>, space)
    const rendered = automation.actions.map((action) => ({
      type: String(action.type),
      rendered: this.renderActionPreview(action, templateCtx),
    }))

    return { renderedActions: rendered }
  }
}
