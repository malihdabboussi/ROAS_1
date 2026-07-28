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
import { MeetingSourceIngestionService } from '../../meetings/services/meeting-source-ingestion.service'
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
import { MeetingFollowUpSlackConfirmService } from './meeting-follow-up-slack-confirm.service'
import { MeetingsPrecallPrepService } from './meetings-precall-prep.service'
import { SlackTeamLoopService, type SlackTeamLoopKind } from './slack-team-loop.service'
import { SocialResearchOrchestrationService } from './social-research-orchestration.service'
import { SpaceAutomationServiceBase19 } from './space-automation-service-19.base'
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
  'observe_slack_team',
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

@Injectable()
export class SpaceAutomationService extends SpaceAutomationServiceBase19 {
  constructor(
    repo: SpacesRepository,
    automationsRepo: SpaceAutomationsRepository,
    configService: ConfigService,
    composio: ComposioService,
    @Optional() slackTools?: SlackAgentToolsService,
    @Optional() channelsRepo?: ChannelsRepository,
    @Optional() creditsService?: CreditsService,
    @Optional() userAgentApi?: UserAgentApiService,
    @Optional() socialResearch?: SocialResearchOrchestrationService,
    @Optional() brainSearch?: SearchService,
    @Optional() cursorApi?: CursorApiService,
    @Optional() scrapeCreatorsApi?: ScrapeCreatorsApiService,
    @Optional() brainImportJobs?: BrainImportJobsService,
    @Optional() @InjectQueue(AGENT_RUNTIME_AUTOMATION_QUEUE) automationQueue?: Queue,
    @Optional() automationActionsRepo?: SpaceAutomationActionsRepository,
    @Optional() externalEventsRepo?: SpaceAutomationExternalEventsRepository,
    @Optional() automationRunsRepo?: SpaceAutomationRunsRepository,
    @Optional() private readonly meetingsPrecallPrep?: MeetingsPrecallPrepService,
    @Optional() private readonly meetingFollowUpSlackConfirm?: MeetingFollowUpSlackConfirmService,
    @Optional() private readonly slackTeamLoop?: SlackTeamLoopService,
    @Optional() meetingSourceIngestion?: MeetingSourceIngestionService,
  ) {
    super(
      repo,
      automationsRepo,
      configService,
      composio,
      slackTools,
      channelsRepo,
      creditsService,
      userAgentApi,
      socialResearch,
      brainSearch,
      cursorApi,
      scrapeCreatorsApi,
      brainImportJobs,
      automationQueue,
      automationActionsRepo,
      externalEventsRepo,
      automationRunsRepo,
      meetingSourceIngestion,
    )
  }

  /** Restore only rules disabled by the matching Fathom disconnect. */
  async restoreFathomDependentRules(
    supabase: SupabaseClient,
    args: {
      fathomOwnerUserId: string
      userIntegrationId: string
      disabledReason: string
    },
  ): Promise<{ restored_automation_ids: string[] }> {
    const collected = new Map<string, Record<string, unknown>>()
    const userRows = await this.externalEventsRepo.listDisconnectedFathomUserRoutes(
      supabase,
      args.userIntegrationId,
      args.disabledReason,
    )
    for (const row of userRows) collected.set(String(row.id), row)

    const selfRows = await this.externalEventsRepo.listDisconnectedFathomSelfRoutes(
      supabase,
      args.fathomOwnerUserId,
      args.disabledReason,
    )
    for (const row of selfRows) {
      const mode = String(this.objectRecord(row.source).mode ?? 'self')
      if (mode === 'self') collected.set(String(row.id), row)
    }
    if (collected.size === 0) return { restored_automation_ids: [] }

    const nowIso = new Date().toISOString()
    const automationIds = [
      ...new Set([...collected.values()].map((row) => String(row.automation_id))),
    ]
    await this.externalEventsRepo.restoreExternalTriggersByIds(
      supabase,
      [...collected.keys()],
      nowIso,
    )
    for (const automationId of automationIds) {
      await this.externalEventsRepo.enableAutomationRule(supabase, automationId, nowIso)
    }
    return { restored_automation_ids: automationIds }
  }

  protected async executeAction(
    action: Record<string, unknown>,
    ctx: {
      supabase: SupabaseClient
      userId: string
      orgId: string | null
      spaceId: string
      itemId: string
      depth: number
    },
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
    stepIndex = 0,
  ): Promise<Record<string, unknown> | null> {
    if (action.type === 'request_slack_follow_up_confirm') {
      return this.execRequestSlackFollowUpConfirm(action, ctx, item, templateCtx)
    }
    if (action.type === 'observe_slack_team') {
      return this.execObserveSlackTeam(action, ctx)
    }
    return super.executeAction(action, ctx, item, templateCtx, stepIndex)
  }

  protected async execObserveSlackTeam(
    action: Record<string, unknown>,
    ctx: {
      supabase: SupabaseClient
      userId: string
      orgId: string | null
    },
  ): Promise<Record<string, unknown>> {
    if (!ctx.orgId) throw new Error('Slack team observation requires an organization')
    if (!this.slackTeamLoop) throw new Error('Slack team observation service is unavailable')
    const quietHours =
      action.quiet_hours && typeof action.quiet_hours === 'object'
        ? (action.quiet_hours as { start: string; end: string; timezone: string })
        : undefined
    return this.slackTeamLoop.run({
      supabase: ctx.supabase,
      userId: ctx.userId,
      orgId: ctx.orgId,
      loopKind: String(action.loop_kind ?? 'all') as SlackTeamLoopKind,
      deliveryMode: action.delivery_mode === 'active' ? 'active' : 'shadow',
      channelIds: Array.isArray(action.channel_ids)
        ? action.channel_ids.filter((value): value is string => typeof value === 'string')
        : [],
      personIds: Array.isArray(action.person_ids)
        ? action.person_ids.filter((value): value is string => typeof value === 'string')
        : [],
      lookbackMinutes: Number(action.lookback_minutes ?? 60),
      dailyLimit: Number(action.daily_limit ?? 10),
      quietHours,
      instructions: typeof action.instructions === 'string' ? action.instructions : undefined,
    })
  }

  protected async execRequestSlackFollowUpConfirm(
    action: Record<string, unknown>,
    ctx: {
      supabase: SupabaseClient
      userId: string
      orgId: string | null
      spaceId: string
      itemId: string
    },
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): Promise<Record<string, unknown>> {
    if (!this.meetingFollowUpSlackConfirm) {
      throw new Error('Meeting follow-up Slack confirm service is not available')
    }
    const suggestionIds = this.meetingFollowUpSlackConfirm.resolveSuggestionIds(
      action,
      templateCtx.steps as Array<Record<string, unknown>> | undefined,
    )
    return this.meetingFollowUpSlackConfirm.requestConfirm({
      supabase: ctx.supabase,
      userId: ctx.userId,
      orgId: ctx.orgId,
      spaceId: ctx.spaceId,
      callItemId: ctx.itemId,
      callTitle: String(item.title ?? ''),
      suggestionIds,
      deliveryMode: action.delivery_mode === 'active' ? 'active' : 'shadow',
      dmEmail: typeof action.dm_email === 'string' ? action.dm_email : undefined,
      confirmReaction:
        typeof action.confirm_reaction === 'string' ? action.confirm_reaction : undefined,
    })
  }

  protected async execMeetingsPrecallPrep(
    action: Record<string, unknown>,
    ctx: {
      supabase: SupabaseClient
      userId: string
      orgId: string | null
      spaceId: string
    },
  ): Promise<Record<string, unknown>> {
    if (!this.meetingsPrecallPrep) throw new Error('Pre-call prep service unavailable')
    const result = await this.meetingsPrecallPrep.runForToday({
      supabase: ctx.supabase,
      userId: ctx.userId,
      orgId: ctx.orgId,
      spaceId: ctx.spaceId,
      timezone: typeof action.timezone === 'string' ? action.timezone : undefined,
      refresh: action.refresh !== false,
      scope: { orgId: ctx.orgId, userId: ctx.userId, orgRole: null },
    })
    return result as unknown as Record<string, unknown>
  }
}
