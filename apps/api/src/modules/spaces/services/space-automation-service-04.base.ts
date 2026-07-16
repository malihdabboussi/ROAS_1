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
import { SpaceAutomationServiceBase03 } from './space-automation-service-03.base'
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

export abstract class SpaceAutomationServiceBase04 extends SpaceAutomationServiceBase03 {
  async processArtifactLifecycleEvent(
    supabase: SupabaseClient,
    event: {
      artifact_kind: string
      lifecycle_event: string
      artifact_id: string
      campaign_id: string
      user_id: string
      org_id?: string | null
      title?: string
      status?: string
      url?: string | null
      metadata?: Record<string, unknown>
    },
  ): Promise<Record<string, unknown>> {
    const spaces = (await this.repo.findSpacesByCampaignForOwner(
      supabase,
      event.user_id,
      event.campaign_id,
      event.org_id ?? null,
    )) as Array<Record<string, unknown>>
    let processed = 0
    for (const space of spaces) {
      const automations = (await this.automationsRepo.listBySpace(
        supabase,
        String(space.id),
      )) as Array<Record<string, unknown>>
      const triggerEvent: TriggerEvent = {
        type: 'artifact_lifecycle',
        artifact_kind: event.artifact_kind,
        lifecycle_event: event.lifecycle_event,
        artifact_id: event.artifact_id,
        campaign_id: event.campaign_id,
        status: event.status,
      }
      if (
        !automations.some(
          (automation) =>
            automation.enabled === true &&
            automation.is_draft !== true &&
            this.triggerMatches(this.objectRecord(automation.trigger), triggerEvent),
        )
      ) {
        continue
      }
      const spaceId = String(space.id)
      const item = (await this.repo.createItem(
        supabase,
        event.user_id,
        spaceId,
        {
          title: this.artifactEventTitle(event),
          source: 'manual',
          custom_data: {
            _source: 'artifact_automation',
            artifact: {
              kind: event.artifact_kind,
              id: event.artifact_id,
              lifecycle_event: event.lifecycle_event,
              status: event.status ?? null,
              url: event.url ?? null,
            },
            ...(event.metadata ?? {}),
          },
        },
        event.org_id ?? null,
      )) as Record<string, unknown>
      await this.repo.createActivity(supabase, {
        item_id: String(item.id),
        space_id: spaceId,
        user_id: event.user_id,
        org_id: event.org_id ?? null,
        event_type: `artifact_${event.lifecycle_event}`,
        payload: event as unknown as Record<string, unknown>,
      })
      await this.evaluate(triggerEvent, {
        supabase,
        userId: event.user_id,
        orgId: event.org_id ?? null,
        spaceId,
        itemId: String(item.id),
        depth: 0,
      })
      processed++
    }
    return { processed: processed > 0, spaces: processed }
  }

  protected artifactEventTitle(event: {
    artifact_kind: string
    lifecycle_event: string
    artifact_id: string
    title?: string
  }): string {
    const label = event.title?.trim() || event.artifact_id
    return `${event.artifact_kind.replace(/_/g, ' ')} ${event.lifecycle_event}: ${label}`.slice(
      0,
      1000,
    )
  }

  protected contactRouteFiltersMatch(
    filters: Record<string, unknown>,
    event: TriggerEvent,
  ): boolean {
    const tag = String(filters.tag ?? '').trim()
    if ((event.type === 'contact_tag_added' || event.type === 'contact_tag_removed') && tag) {
      if (tag !== event.tag) return false
    }
    const fieldId = String(filters.field_id ?? '').trim()
    if (event.type === 'contact_updated' && fieldId && fieldId !== event.field_id) return false
    const to = String(filters.to ?? '').trim()
    if (
      (event.type === 'contact_updated' ||
        event.type === 'contact_type_changed' ||
        event.type === 'contact_source_changed') &&
      to &&
      to !== String(event.to ?? '')
    ) {
      return false
    }
    return true
  }

  protected contactEventTitle(event: TriggerEvent): string {
    switch (event.type) {
      case 'contact_tag_added':
        return `Contact tag added: ${event.tag}`
      case 'contact_tag_removed':
        return `Contact tag removed: ${event.tag}`
      case 'contact_updated':
        return `Contact updated: ${event.field_id ?? event.contact_id}`
      case 'contact_type_changed':
        return `Contact type changed: ${event.to ?? event.contact_id}`
      case 'contact_source_changed':
        return `Contact source changed: ${event.to ?? event.contact_id}`
      case 'contact_created':
        return `Contact created: ${event.contact_id}`
      default:
        return 'Contact event'
    }
  }

  protected async syncFathomTriggerRoute(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    spaceId: string,
    automation: Record<string, unknown>,
  ): Promise<void> {
    const trigger = automation.trigger as Record<string, unknown> | undefined
    const automationId = String(automation.id ?? '')
    const now = new Date().toISOString()
    const filters = {
      title_contains: String(trigger?.title_contains ?? '').trim(),
      recorded_by_contains: String(trigger?.recorded_by_contains ?? '').trim(),
    }
    // Source picker (Phase 3 / .docs/plans/fathom-org-sharing.md). Default
    // missing source to `self` for backward compat with rules saved before the
    // picker shipped. Webhook router uses this to fan out across personal,
    // user-targeted, and team-targeted rules.
    const rawSource = trigger?.source
    const source = this.normalizeFathomSource(rawSource)
    await this.externalEventsRepo.upsertExternalTrigger(supabase, {
      space_id: spaceId,
      automation_id: automationId,
      user_id: userId,
      org_id: orgId,
      provider: 'fathom',
      trigger_slug: 'FATHOM_RECORDING_READY',
      connected_account_id: `fathom:${userId}`,
      composio_trigger_id: null,
      status: 'active',
      filters,
      source,
      last_error: null,
      created_by: String(automation.created_by ?? userId),
      updated_at: now,
    })
  }
}
