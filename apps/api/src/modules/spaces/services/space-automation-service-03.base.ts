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
import { SpaceAutomationServiceBase02 } from './space-automation-service-02.base'
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

export abstract class SpaceAutomationServiceBase03 extends SpaceAutomationServiceBase02 {
  async syncExternalTriggerForAutomation(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    spaceId: string,
    automation: Record<string, unknown>,
  ): Promise<void> {
    const trigger = automation.trigger as Record<string, unknown> | undefined
    const automationId = String(automation.id ?? '')
    if (!automationId) return

    // Schedule triggers do not create Composio/contact routing rows;
    // SpaceAutomationSchedulerService maintains schedule_next_fire_at instead.
    if (trigger?.type === 'schedule') {
      await this.disableExternalTriggerForAutomation(supabase, spaceId, automationId)
      await this.disableContactTriggerForAutomation(supabase, spaceId, automationId)
      return
    }

    if (
      automation.enabled !== true ||
      automation.is_draft === true ||
      (trigger?.type !== 'external_email_received' &&
        trigger?.type !== 'external_slack_message_received' &&
        trigger?.type !== 'external_fathom_recording_ready' &&
        trigger?.type !== 'external_app_event' &&
        !this.isContactTrigger(trigger?.type))
    ) {
      await this.disableExternalTriggerForAutomation(supabase, spaceId, automationId)
      await this.disableContactTriggerForAutomation(supabase, spaceId, automationId)
      return
    }

    if (this.isContactTrigger(trigger?.type)) {
      await this.syncContactTriggerRoute(supabase, userId, orgId, spaceId, automation)
      await this.disableExternalTriggerForAutomation(supabase, spaceId, automationId)
      return
    }

    if (trigger?.type === 'external_fathom_recording_ready') {
      await this.syncFathomTriggerRoute(supabase, userId, orgId, spaceId, automation)
      await this.disableContactTriggerForAutomation(supabase, spaceId, automationId)
      return
    }

    if (!trigger) return
    const provider = this.providerForTriggerSlug(String(trigger.trigger_slug ?? ''))
    const triggerSlug = String(trigger.trigger_slug ?? '')
    const connectedAccountId = String(trigger.connected_account_id ?? '').trim()
    if (!provider || !triggerSlug || !connectedAccountId) return

    const triggerConfig = this.buildTriggerConfig(provider, trigger)
    const triggerInterval =
      provider === 'gmail' && typeof triggerConfig.interval === 'number'
        ? triggerConfig.interval
        : null
    const gmailCategory =
      provider === 'gmail' && typeof trigger.gmail_category === 'string'
        ? trigger.gmail_category
        : ''
    const filters =
      trigger.type === 'external_slack_message_received'
        ? {
            channel_id: String(trigger.channel_id ?? '').trim(),
            from_contains: String(trigger.from_contains ?? '').trim(),
            text_contains: String(trigger.text_contains ?? '').trim(),
          }
        : trigger.type === 'external_app_event'
          ? {}
          : {
              from_contains: String(trigger.from_contains ?? '').trim(),
              subject_contains: String(trigger.subject_contains ?? '').trim(),
              ...(gmailCategory ? { gmail_category: gmailCategory } : {}),
            }

    const existing = await this.externalEventsRepo.findExternalTriggerByAutomation(
      supabase,
      spaceId,
      automationId,
    )

    const existingRecord = (existing ?? null) as Record<string, unknown> | null
    const existingTriggerId = String(existingRecord?.composio_trigger_id ?? '').trim()
    const existingFilters = this.objectRecord(existingRecord?.filters)
    const canReuse =
      existingTriggerId &&
      existingRecord?.provider === provider &&
      existingRecord?.trigger_slug === triggerSlug &&
      existingRecord?.connected_account_id === connectedAccountId &&
      (triggerInterval == null || Number(existingFilters._trigger_interval) === triggerInterval) &&
      (provider !== 'gmail' || String(existingFilters.gmail_category ?? '') === gmailCategory)

    let composioTriggerId = existingTriggerId
    if (!canReuse) {
      if (existingTriggerId) await this.composio.disableTrigger(existingTriggerId)
      const created = await this.composio.createTrigger(userId, triggerSlug, {
        connectedAccountId,
        triggerConfig,
      })
      composioTriggerId = created.triggerId
    } else {
      await this.composio.enableTrigger(existingTriggerId)
    }

    await this.externalEventsRepo.upsertExternalTrigger(supabase, {
      space_id: spaceId,
      automation_id: automationId,
      user_id: userId,
      org_id: orgId,
      provider,
      trigger_slug: triggerSlug,
      connected_account_id: connectedAccountId,
      composio_trigger_id: composioTriggerId,
      status: 'active',
      filters: {
        ...filters,
        ...(triggerInterval == null ? {} : { _trigger_interval: triggerInterval }),
      },
      last_error: null,
      created_by: String(automation.created_by ?? userId),
      updated_at: new Date().toISOString(),
    })
    await this.disableContactTriggerForAutomation(supabase, spaceId, automationId)
  }

  protected isContactTrigger(type: unknown): boolean {
    return (
      type === 'contact_created' ||
      type === 'contact_updated' ||
      type === 'contact_tag_added' ||
      type === 'contact_tag_removed' ||
      type === 'contact_type_changed' ||
      type === 'contact_source_changed'
    )
  }

  protected async syncContactTriggerRoute(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    spaceId: string,
    automation: Record<string, unknown>,
  ): Promise<void> {
    const trigger = automation.trigger as Record<string, unknown> | undefined
    const automationId = String(automation.id ?? '')
    const filters = {
      field_id: String(trigger?.field_id ?? '').trim(),
      to: String(trigger?.to ?? '').trim(),
      tag: String(trigger?.tag ?? '').trim(),
    }
    await this.externalEventsRepo.upsertContactRoute(supabase, {
      space_id: spaceId,
      automation_id: automationId,
      user_id: userId,
      org_id: orgId,
      trigger_type: String(trigger?.type ?? ''),
      status: 'active',
      filters,
      created_by: String(automation.created_by ?? userId),
      updated_at: new Date().toISOString(),
    })
  }

  protected async disableContactTriggerForAutomation(
    supabase: SupabaseClient,
    spaceId: string,
    automationId: string,
  ): Promise<void> {
    await this.externalEventsRepo.disableContactRoute(supabase, spaceId, automationId)
  }

  async processContactAutomationEvent(
    supabase: SupabaseClient,
    event: Extract<
      TriggerEvent,
      {
        type:
          | 'contact_created'
          | 'contact_updated'
          | 'contact_tag_added'
          | 'contact_tag_removed'
          | 'contact_type_changed'
          | 'contact_source_changed'
      }
    > & { user_id: string; org_id?: string | null },
  ): Promise<Record<string, unknown>> {
    // Push tenant + trigger filtering into the query so we hit
    // `idx_space_contact_automation_routes_user (user_id, trigger_type, status)`
    // instead of loading every active contact route system-wide and filtering
    // in JS. Tag/field/value matching stays in `contactRouteFiltersMatch`.
    const eventOrgId = event.org_id ?? null
    const routes = await this.externalEventsRepo.listActiveContactRoutes(supabase, event)
    let processed = 0
    for (const route of routes) {
      if (!this.contactRouteFiltersMatch(this.objectRecord(route.filters), event)) continue
      const spaceId = String(route.space_id)
      const automationId = String(route.automation_id)
      const item = (await this.repo.createItem(
        supabase,
        event.user_id,
        spaceId,
        {
          title: this.contactEventTitle(event),
          source: 'manual',
          custom_data: {
            _source: 'contact_automation',
            contact_id: event.contact_id,
            contact_event: event,
          },
        },
        eventOrgId,
      )) as Record<string, unknown>
      await this.repo.createActivity(supabase, {
        item_id: String(item.id),
        space_id: spaceId,
        user_id: event.user_id,
        org_id: eventOrgId,
        event_type: event.type,
        payload: event as unknown as Record<string, unknown>,
      })
      const queued = await this.enqueueAutomationRuntimeJob(automationId, event, {
        supabase,
        userId: event.user_id,
        orgId: eventOrgId,
        spaceId,
        itemId: String(item.id),
        depth: 0,
      })
      if (!queued) {
        await this.executeAutomationById(automationId, event, {
          supabase,
          userId: event.user_id,
          orgId: eventOrgId,
          spaceId,
          itemId: String(item.id),
          depth: 0,
        })
      }
      processed++
    }
    return { processed: processed > 0, routes: processed }
  }
}
