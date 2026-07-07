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
import { SpaceAutomationServiceBase01 } from './space-automation-service-01.base'
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

export abstract class SpaceAutomationServiceBase02 extends SpaceAutomationServiceBase01 {
  // -------------------------------------------------------------------------
  // Trigger matching
  // -------------------------------------------------------------------------

  protected triggerMatches(trigger: Record<string, unknown>, event: TriggerEvent): boolean {
    if (trigger.type !== event.type) return false

    if (TASK_SHAPED_TRIGGER_TYPES.has(String(trigger.type))) {
      const scope = trigger.task_scope as 'tasks' | 'subtasks' | 'all' | undefined
      const eventIsSubtask = (event as { is_subtask?: boolean }).is_subtask
      if (scope === 'tasks' && eventIsSubtask === true) return false
      if (scope === 'subtasks' && eventIsSubtask !== true) return false
    }

    switch (event.type) {
      case 'status_change': {
        const to = trigger.to as string | undefined
        const from = trigger.from as string | undefined
        if (to && to !== event.to) return false
        if (from && from !== event.from) return false
        return true
      }
      case 'task_created': {
        const inStatus = trigger.in_status as string | undefined
        if (inStatus && inStatus !== (event as { in_status?: string }).in_status) return false
        return true
      }
      case 'mission_completed':
      case 'mission_failed':
        return true
      case 'field_changed': {
        const fieldId = trigger.field_id as string | undefined
        if (fieldId && fieldId !== event.field_id) return false
        const to = trigger.to as string | undefined
        if (to && to !== event.to) return false
        return true
      }
      case 'priority_changed': {
        const to = trigger.to as string | undefined
        const from = trigger.from as string | undefined
        if (to && to !== event.to) return false
        if (from && from !== event.from) return false
        return true
      }
      case 'due_date_changed':
      case 'start_date_changed': {
        const to = trigger.to as string | undefined
        const from = trigger.from as string | undefined
        if (to && to !== event.to) return false
        if (from && from !== event.from) return false
        return true
      }
      case 'tag_added':
      case 'tag_removed': {
        const tag = trigger.tag as string | undefined
        if (tag && tag !== event.tag) return false
        return true
      }
      case 'form_submitted': {
        const formId = trigger.form_id as string | undefined
        if (formId && formId !== event.form_id) return false
        const fieldId = trigger.field_id as string | undefined
        const expectedValue = trigger.field_value as string | undefined
        if (fieldId && expectedValue) {
          const actual = this.objectRecord(event.answers)[fieldId]
          if (String(actual ?? '') !== expectedValue) return false
        }
        return true
      }
      case 'contact_created':
        return true
      case 'contact_updated': {
        const fieldId = trigger.field_id as string | undefined
        if (fieldId && fieldId !== event.field_id) return false
        const to = trigger.to as string | undefined
        if (to && String(event.to ?? '') !== to) return false
        return true
      }
      case 'contact_tag_added':
      case 'contact_tag_removed': {
        const tag = trigger.tag as string | undefined
        if (tag && tag !== event.tag) return false
        return true
      }
      case 'contact_type_changed':
      case 'contact_source_changed': {
        const to = trigger.to as string | undefined
        if (to && to !== event.to) return false
        return true
      }
      case 'artifact_lifecycle': {
        const kind = trigger.artifact_kind as string | undefined
        const lifecycle = trigger.lifecycle_event as string | undefined
        const artifactId = trigger.artifact_id as string | undefined
        const status = trigger.status as string | undefined
        if (kind && kind !== event.artifact_kind) return false
        if (lifecycle && lifecycle !== event.lifecycle_event) return false
        if (artifactId && artifactId !== event.artifact_id) return false
        if (status && status !== event.status) return false
        return true
      }
      case 'assignee_changed': {
        const assigneeType = trigger.assignee_type as string | undefined
        const assigneeId = trigger.assignee_id as string | undefined
        const toAssignees = event.to_assignees?.length
          ? event.to_assignees
          : event.to_type !== 'unassigned' && event.to_id
            ? [{ type: event.to_type, id: event.to_id }]
            : []
        if (assigneeType === 'unassigned')
          return toAssignees.length === 0 || event.to_type === 'unassigned'
        if (assigneeType && !toAssignees.some((assignee) => assignee.type === assigneeType)) {
          return false
        }
        if (assigneeId && !toAssignees.some((assignee) => assignee.id === assigneeId)) return false
        return true
      }
      case 'webhook_received': {
        const webhookEndpointId = trigger.webhook_endpoint_id as string | undefined
        return webhookEndpointId === event.webhook_endpoint_id
      }
      case 'external_email_received': {
        if (trigger.provider && trigger.provider !== event.provider) return false
        if (trigger.trigger_slug && trigger.trigger_slug !== event.trigger_slug) return false
        if (
          trigger.connected_account_id &&
          trigger.connected_account_id !== event.connected_account_id
        ) {
          return false
        }
        const fromContains = String(trigger.from_contains ?? '')
          .trim()
          .toLowerCase()
        if (
          fromContains &&
          !String(event.from ?? '')
            .toLowerCase()
            .includes(fromContains)
        )
          return false
        const subjectContains = String(trigger.subject_contains ?? '')
          .trim()
          .toLowerCase()
        if (
          subjectContains &&
          !String(event.subject ?? '')
            .toLowerCase()
            .includes(subjectContains)
        ) {
          return false
        }
        return true
      }
      case 'external_slack_message_received': {
        if (trigger.trigger_slug && trigger.trigger_slug !== event.trigger_slug) return false
        if (
          trigger.connected_account_id &&
          trigger.connected_account_id !== event.connected_account_id
        ) {
          return false
        }
        if (trigger.channel_id && trigger.channel_id !== event.channel_id) return false
        const fromContains = String(trigger.from_contains ?? '')
          .trim()
          .toLowerCase()
        if (
          fromContains &&
          !String(event.from ?? '')
            .toLowerCase()
            .includes(fromContains)
        )
          return false
        const textContains = String(trigger.text_contains ?? '')
          .trim()
          .toLowerCase()
        if (
          textContains &&
          !String(event.text ?? '')
            .toLowerCase()
            .includes(textContains)
        )
          return false
        return true
      }
      case 'external_fathom_recording_ready': {
        const titleContains = String(trigger.title_contains ?? '')
          .trim()
          .toLowerCase()
        if (
          titleContains &&
          !String(event.title ?? '')
            .toLowerCase()
            .includes(titleContains)
        ) {
          return false
        }
        const recordedByContains = String(trigger.recorded_by_contains ?? '')
          .trim()
          .toLowerCase()
        if (
          recordedByContains &&
          !String(event.recorded_by_email ?? '')
            .toLowerCase()
            .includes(recordedByContains)
        ) {
          return false
        }
        return true
      }
      case 'external_app_event': {
        if (trigger.provider && trigger.provider !== event.provider) return false
        if (trigger.trigger_slug && trigger.trigger_slug !== event.trigger_slug) return false
        if (
          trigger.connected_account_id &&
          trigger.connected_account_id !== event.connected_account_id
        ) {
          return false
        }
        return true
      }
      case 'schedule':
        // The scheduler service decides which automations are due and dispatches
        // directly via executeAutomationItemless. There is no listener path that
        // needs to "match" a schedule event against a trigger config.
        return true
      default:
        return false
    }
  }
}
