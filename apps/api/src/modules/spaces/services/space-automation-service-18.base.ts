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
import { SpaceAutomationServiceBase17 } from './space-automation-service-17.base'
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

export abstract class SpaceAutomationServiceBase18 extends SpaceAutomationServiceBase17 {
  protected extractEmailSummary(
    data: Record<string, unknown>,
    provider: 'gmail' | 'outlook',
  ): {
    sender: string
    subject: string
    body: string
    cc: string
    timestamp: string | null
    messageId: string | null
    threadId: string | null
  } {
    const payload = this.objectRecord(data.payload)
    const preview = this.objectRecord(data.preview)
    const sender = String(data.sender ?? data.from ?? preview.sender ?? preview.from ?? '').trim()
    const subject = this.normalizeComposioEmailSubjectSummary(
      String(data.subject ?? preview.subject ?? '').trim(),
    )
    const body = String(
      data.message_text ?? data.body ?? preview.body ?? preview.message_text ?? '',
    ).trim()
    const cc = this.formatEmailRecipients(
      data.cc ?? data.cc_list ?? data.cc_recipients ?? preview.cc,
    )
    const timestamp = String(
      data.message_timestamp ?? data.timestamp ?? preview.timestamp ?? '',
    ).trim()
    const messageId = String(data.message_id ?? data.id ?? payload.id ?? '').trim()
    const threadId = String(data.thread_id ?? payload.threadId ?? payload.thread_id ?? '').trim()
    return {
      sender,
      subject,
      body,
      cc,
      timestamp: timestamp || null,
      messageId: messageId || null,
      threadId: threadId || null,
    }
  }

  protected formatEmailRecipients(value: unknown): string {
    if (value == null) return ''
    if (typeof value === 'string') return value.trim()
    if (Array.isArray(value)) {
      return value
        .map((entry) => this.formatEmailRecipient(entry))
        .filter(Boolean)
        .join(', ')
    }
    return this.formatEmailRecipient(value)
  }

  protected formatEmailRecipient(value: unknown): string {
    if (value == null) return ''
    if (typeof value === 'string') return value.trim()
    if (typeof value !== 'object' || Array.isArray(value)) return String(value).trim()
    const record = value as Record<string, unknown>
    const email = String(record.email ?? record.address ?? record.value ?? '').trim()
    const name = String(record.name ?? record.display_name ?? '').trim()
    if (name && email) return `${name} <${email}>`
    return email || name
  }

  protected emailItemTitle(email: { subject: string }): string {
    const subject = email.subject || 'No subject'
    return subject.slice(0, 1000)
  }

  protected summarizeExternalPayload(
    data: Record<string, unknown>,
    provider: 'gmail' | 'outlook' | 'slack' | ConnectedAppFlowProvider,
    triggerSlug: string,
  ): {
    payload: Record<string, unknown>
    itemTitle: string
    description: string
    customData: Record<string, unknown>
    eventType: 'external_email_received' | 'external_slack_message_received' | 'external_app_event'
    triggerEvent: (triggerSlug: string, connectedAccountId: string) => TriggerEvent
    routeMatch: Record<string, string>
  } {
    const connectedAppMeta = getConnectedAppFlowTriggerBySlug(triggerSlug)
    if (connectedAppMeta) {
      const payloadJson = JSON.stringify(data, null, 2)
      const provider = connectedAppMeta.provider
      const providerLabel = connectedAppMeta.providerLabel
      const eventLabel = connectedAppMeta.eventLabel
      return {
        payload: {
          provider,
          provider_label: providerLabel,
          trigger_slug: triggerSlug,
          event_label: eventLabel,
          payload_preview: payloadJson.slice(0, 2000),
        },
        itemTitle: `${providerLabel}: ${eventLabel}`.slice(0, 1000),
        description: payloadJson.slice(0, 20000),
        customData: { provider, trigger_slug: triggerSlug, payload: data },
        eventType: 'external_app_event',
        triggerEvent: (slug, connectedAccountId) => ({
          type: 'external_app_event',
          provider,
          provider_label: providerLabel,
          trigger_slug: slug,
          event_label: eventLabel,
          connected_account_id: connectedAccountId,
          payload: data,
        }),
        routeMatch: {},
      }
    }

    if (provider === 'slack') {
      const channelId = String(data.channel ?? data.channel_id ?? '').trim()
      const sender = String(data.user ?? data.sender ?? data.user_id ?? '').trim()
      const text = String(data.text ?? data.message ?? '').trim()
      const timestamp = String(data.ts ?? data.timestamp ?? '').trim()
      const threadTs = String(data.thread_ts ?? '').trim()
      return {
        payload: {
          provider,
          channel_id: channelId,
          sender,
          text_preview: text.slice(0, 500),
          timestamp,
        },
        itemTitle: `Slack message${sender ? ` from ${sender}` : ''}: ${text || 'No text'}`.slice(
          0,
          1000,
        ),
        description: text.slice(0, 20000),
        customData: { channel_id: channelId, sender, text, timestamp, thread_ts: threadTs || null },
        eventType: 'external_slack_message_received',
        triggerEvent: (triggerSlug, connectedAccountId) => ({
          type: 'external_slack_message_received',
          trigger_slug: triggerSlug,
          connected_account_id: connectedAccountId,
          channel_id: channelId,
          from: sender,
          text,
        }),
        routeMatch: { channel_id: channelId, from: sender, text },
      }
    }

    if (provider !== 'gmail' && provider !== 'outlook') {
      throw new Error(`Unsupported external trigger provider: ${provider}`)
    }

    const email = this.extractEmailSummary(data, provider)
    return {
      payload: {
        provider,
        sender: email.sender,
        subject: email.subject,
        cc: email.cc,
        timestamp: email.timestamp,
      },
      itemTitle: this.emailItemTitle(email),
      description: email.body ? email.body.slice(0, 20000) : '',
      customData: {
        sender: email.sender,
        subject: email.subject,
        body: email.body,
        cc: email.cc,
        timestamp: email.timestamp,
        thread_id: email.threadId,
        message_id: email.messageId,
      },
      eventType: 'external_email_received',
      triggerEvent: (triggerSlug, connectedAccountId) => ({
        type: 'external_email_received',
        provider,
        trigger_slug: triggerSlug as 'GMAIL_NEW_GMAIL_MESSAGE' | 'OUTLOOK_MESSAGE_TRIGGER',
        connected_account_id: connectedAccountId,
        from: email.sender,
        subject: email.subject,
        body: email.body,
        cc: email.cc,
      }),
      routeMatch: { from: email.sender, subject: email.subject },
    }
  }

  protected externalRouteFiltersMatch(
    route: Record<string, unknown>,
    summary: ReturnType<SpaceAutomationServiceBase18['summarizeExternalPayload']>,
  ): boolean {
    const filters = this.objectRecord(route.filters)
    const channelId = String(filters.channel_id ?? '').trim()
    if (channelId && summary.routeMatch.channel_id !== channelId) return false
    const fromContains = String(filters.from_contains ?? '')
      .trim()
      .toLowerCase()
    if (
      fromContains &&
      !String(summary.routeMatch.from ?? '')
        .toLowerCase()
        .includes(fromContains)
    ) {
      return false
    }
    const subjectContains = String(filters.subject_contains ?? '')
      .trim()
      .toLowerCase()
    if (
      subjectContains &&
      !String(summary.routeMatch.subject ?? '')
        .toLowerCase()
        .includes(subjectContains)
    ) {
      return false
    }
    const textContains = String(filters.text_contains ?? '')
      .trim()
      .toLowerCase()
    if (
      textContains &&
      !String(summary.routeMatch.text ?? '')
        .toLowerCase()
        .includes(textContains)
    ) {
      return false
    }
    return true
  }

  protected routeFiltersMatch(
    route: Record<string, unknown>,
    email: { sender: string; subject: string },
  ): boolean {
    const filters = this.objectRecord(route.filters)
    const fromContains = String(filters.from_contains ?? '')
      .trim()
      .toLowerCase()
    if (fromContains && !email.sender.toLowerCase().includes(fromContains)) return false
    const subjectContains = String(filters.subject_contains ?? '')
      .trim()
      .toLowerCase()
    if (subjectContains && !email.subject.toLowerCase().includes(subjectContains)) return false
    return true
  }
}
