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
import { SpaceAutomationsRepository } from '../repositories/space-automations.repository'
import { SpacesRepository } from '../repositories/spaces.repository'
import { sanitizeAssigneesForWrite } from '../utils/sanitize-assignees'
import { SocialResearchOrchestrationService } from './social-research-orchestration.service'
import { SpaceAutomationServiceBase16 } from './space-automation-service-16.base'
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

export abstract class SpaceAutomationServiceBase17 extends SpaceAutomationServiceBase16 {
  protected async execAttachArtifactToItem(
    action: Record<string, unknown>,
    ctx: EvalContext,
  ): Promise<null> {
    await this.repo.updateItem(
      ctx.supabase,
      ctx.userId,
      ctx.spaceId,
      ctx.itemId,
      {
        custom_data: {
          artifact: {
            kind: String(action.artifact_kind ?? ''),
            id: String(action.artifact_id ?? ''),
          },
        },
      },
      ctx.orgId,
    )
    return null
  }

  // -------------------------------------------------------------------------
  // Template context builder
  // -------------------------------------------------------------------------

  protected async buildTemplateContext(
    ctx: EvalContext,
    item: Record<string, unknown>,
    space: Record<string, unknown>,
    event?: Record<string, unknown>,
    actionResults?: Record<string, unknown>[],
    runContext?: Record<string, unknown>,
  ): Promise<TemplateContext> {
    const subtasks = await this.repo.findSubtasksByParentId(ctx.supabase, ctx.spaceId, ctx.itemId)

    let deliverables: Record<string, unknown>[] = []
    let mission: Record<string, unknown> | null = null
    const linkedMissionId = item.linked_mission_id as string | null
    if (linkedMissionId) {
      mission = await this.automationActionsRepo.findMissionById(ctx.supabase, linkedMissionId)
      deliverables = await this.automationActionsRepo.listMissionDeliverables(
        ctx.supabase,
        linkedMissionId,
      )
    }

    const activity = await this.repo.findActivityByItemId(ctx.supabase, ctx.spaceId, ctx.itemId)

    return {
      item,
      space,
      event: this.normalizeEventForTemplate(event),
      steps: this.actionResultsToStepOutputs(actionResults ?? []),
      subtasks: subtasks as Record<string, unknown>[],
      deliverables,
      activity: activity as Record<string, unknown>[],
      mission,
      run: runContext ?? {},
    }
  }

  protected actionResultsToStepOutputs(
    results: Record<string, unknown>[],
  ): Record<string, unknown>[] {
    return results.map((entry) => {
      const result = this.objectRecord(entry.result)
      return {
        type: entry.type,
        ...(entry.error ? { error: entry.error } : {}),
        ...result,
      }
    })
  }

  protected normalizeEventForTemplate(event?: Record<string, unknown>): Record<string, unknown> {
    if (!event) return {}
    const out: Record<string, unknown> = { ...event }
    if (event.type === 'external_email_received') {
      const from = String(event.from ?? '').trim()
      const parsed = this.parseEmailIdentity(from)
      out.from = from
      out.email = parsed.email || from
      out.name = parsed.name || parsed.email || from
    }
    if (event.type === 'form_submitted') {
      out.answers = this.objectRecord(event.answers)
    }
    if (event.type === 'external_fathom_recording_ready') {
      const recordedByEmail = String(event.recorded_by_email ?? '')
        .trim()
        .toLowerCase()
      const attendees = Array.isArray(event.attendees)
        ? (event.attendees as Array<Record<string, unknown>>)
        : []
      const primaryAttendee =
        attendees.find((attendee) => {
          const email = String(attendee.email ?? attendee.email_address ?? attendee.mail ?? '')
            .trim()
            .toLowerCase()
          return email && email !== recordedByEmail
        }) ?? null
      out.primary_attendee_email = primaryAttendee
        ? String(
            primaryAttendee.email ?? primaryAttendee.email_address ?? primaryAttendee.mail ?? '',
          ).trim()
        : ''
      out.primary_attendee_name = primaryAttendee
        ? String(
            primaryAttendee.name ??
              primaryAttendee.display_name ??
              primaryAttendee.full_name ??
              primaryAttendee.email ??
              '',
          ).trim()
        : ''
    }
    return out
  }

  protected parseEmailIdentity(value: string): { name: string; email: string } {
    const match = value.match(/^(.*?)<([^>]+)>$/)
    if (match) {
      return {
        name: String(match[1] ?? '')
          .replace(/^"|"$/g, '')
          .trim(),
        email: String(match[2] ?? '').trim(),
      }
    }
    return { name: '', email: value.trim() }
  }

  protected emailTriggerContext(event?: Record<string, unknown>): Record<string, unknown> | null {
    if (event?.type !== 'external_email_received') return null
    const context: Record<string, unknown> = {}
    for (const key of ['from', 'subject', 'body', 'cc']) {
      const value = event[key]
      if (value != null && value !== '') context[key] = value
    }
    const parsed = this.parseEmailIdentity(String(event.from ?? '').trim())
    if (parsed.email) context.email = parsed.email
    if (parsed.name) context.name = parsed.name
    return Object.keys(context).length > 0 ? context : null
  }

  protected sourceEmailContext(item: Record<string, unknown>): Record<string, unknown> | null {
    const custom = this.objectRecord(item.custom_data)
    const externalEmail = this.objectRecord(custom.external_email)
    const externalAutomation = this.objectRecord(custom.external_automation)
    const raw = Object.keys(externalEmail).length > 0 ? externalEmail : externalAutomation
    if (!raw) return null
    const from = String(raw.from ?? raw.sender ?? raw.email ?? '').trim()
    const parsed = this.parseEmailIdentity(from)
    const context: Record<string, unknown> = {}
    if (from) context.from = from
    if (parsed.email) context.email = parsed.email
    if (parsed.name) context.name = parsed.name
    for (const key of ['subject', 'body', 'cc']) {
      const value = raw[key]
      if (value != null && value !== '') context[key] = value
    }
    return Object.keys(context).length > 0 ? context : null
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  protected renderActionPreview(
    action: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): string {
    if (action.prompt_template) {
      return renderTemplate(String(action.prompt_template), templateCtx)
    }
    if (action.message_template) {
      return renderTemplate(String(action.message_template), templateCtx)
    }
    if (action.title_template) {
      return renderTemplate(String(action.title_template), templateCtx)
    }
    return JSON.stringify(action)
  }

  protected buildTriggerConfig(
    provider: 'gmail' | 'outlook' | 'slack' | ConnectedAppFlowProvider,
    trigger: Record<string, unknown>,
  ): Record<string, unknown> {
    if (provider !== 'gmail' && provider !== 'outlook' && provider !== 'slack') {
      const triggerConfig = this.objectRecord(trigger.trigger_config)
      return { ...triggerConfig }
    }
    if (provider === 'gmail') {
      const category = String(trigger.gmail_category ?? '').trim()
      if (category) {
        return { interval: 10, query: `in:inbox category:${category}`, userId: 'me' }
      }
      return { interval: 10, labelIds: 'INBOX', userId: 'me' }
    }
    return {}
  }

  protected providerForTriggerSlug(
    triggerSlug: string,
  ): 'gmail' | 'outlook' | 'slack' | ConnectedAppFlowProvider | null {
    if (triggerSlug === 'GMAIL_NEW_GMAIL_MESSAGE') return 'gmail'
    if (triggerSlug === 'OUTLOOK_MESSAGE_TRIGGER') return 'outlook'
    if ((SLACK_TRIGGER_SLUGS as readonly string[]).includes(triggerSlug)) return 'slack'
    return getConnectedAppFlowTriggerBySlug(triggerSlug)?.provider ?? null
  }

  protected objectRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  /**
   * Composio Gmail/Outlook webhooks sometimes put a one-line UI summary in `data.subject`
   * (e.g. `Gmail email from Name <addr@>: Real subject`) instead of the SMTP subject alone.
   */
  protected normalizeComposioEmailSubjectSummary(raw: string): string {
    const s = raw.trim()
    if (!s) return s
    for (const literal of ['Gmail email from', 'Outlook email from']) {
      const esc = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const withAngleFrom = new RegExp(`^${esc}\\s+.+<[^>]+>\\s*:\\s*(.*)$`, 's')
      let m = s.match(withAngleFrom)
      if (m) {
        const rest = (m[1] ?? '').trim()
        if (rest) return rest
      }
      const plainFrom = new RegExp(`^${esc}\\s+[^:]+:\\s*(.*)$`, 's')
      m = s.match(plainFrom)
      if (m) {
        const rest = (m[1] ?? '').trim()
        if (rest) return rest
      }
    }
    return s
  }
}
