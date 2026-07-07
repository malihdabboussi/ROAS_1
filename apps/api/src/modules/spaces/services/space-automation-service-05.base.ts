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
import { SpaceAutomationServiceBase04 } from './space-automation-service-04.base'
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

export abstract class SpaceAutomationServiceBase05 extends SpaceAutomationServiceBase04 {
  /**
   * Phase 4 of fathom-org-sharing: when a Fathom owner disconnects or
   * unshares, every rule that depended on that integration must auto-disable
   * and the rule's creator gets notified.
   *
   * Two entry points use this:
   * - `FathomOAuthService.disconnect`: full revocation. Pass `mode='disconnect'`
   *   so we sweep BOTH self-mode (the owner's own rules can't fire without a
   *   Fathom feed) AND user-mode rules pointing at the disconnected row.
   * - `IntegrationsCoreService.changeConnectionScope` going `personal`: soft
   *   revocation. Pass `mode='unshare'` so we only sweep user-mode rules
   *   pointing at the row; the owner's self-mode rules stay enabled because
   *   the integration is still connected.
   *
   * Team-mode rules are intentionally untouched — disconnecting one team
   * member should not break the team-wide rule for everyone else.
   *
   * Returns the IDs of disabled automations so the caller can surface a count
   * in the toast / response. Notification dispatch is best-effort and does not
   * block the disable update.
   */
  async revokeFathomDependentRules(
    supabase: SupabaseClient,
    args: {
      fathomOwnerUserId: string
      userIntegrationId: string
      mode: 'disconnect' | 'unshare'
      reason: string
    },
  ): Promise<{ disabled_automation_ids: string[] }> {
    const collected = new Map<string, Record<string, unknown>>()

    // user-mode rules pointing at the affected user_integrations row.
    const userRows = await this.externalEventsRepo.listFathomUserRoutes(
      supabase,
      args.userIntegrationId,
    )
    for (const row of userRows) {
      collected.set(String(row.id), row)
    }

    if (args.mode === 'disconnect') {
      // self-mode rules owned by the disconnecting user. Without a Fathom
      // feed they can't fire, so disable them too.
      const selfRows = await this.externalEventsRepo.listFathomSelfRoutes(
        supabase,
        args.fathomOwnerUserId,
      )
      for (const row of selfRows) {
        const mode = String(this.objectRecord(row.source).mode ?? 'self')
        if (mode !== 'self') continue
        collected.set(String(row.id), row)
      }
    }

    if (collected.size === 0) {
      return { disabled_automation_ids: [] }
    }

    const automationIds = [...collected.values()].map((r) => String(r.automation_id))
    const triggerRowIds = [...collected.keys()]

    // Mark trigger rows disabled with a stable last_error so the UI can show
    // why. Failure here is real — propagate to caller (no silent swallow).
    const nowIso = new Date().toISOString()
    await this.externalEventsRepo.disableExternalTriggersByIds(
      supabase,
      triggerRowIds,
      args.reason,
      nowIso,
    )

    // Disable the rule rows themselves so they show "off" in the rule list,
    // not just the underlying route. Per-rule update because we want to keep
    // each rule's `updated_at` accurate.
    for (const automationId of automationIds) {
      await this.externalEventsRepo.disableAutomationRule(supabase, automationId, nowIso)
    }

    // Notify the rule creator(s). Group by created_by + space so a single
    // owner who lost N rules sees one row per rule (per existing notification
    // patterns). Best-effort: log on failure, don't throw.
    const automationDetails = await this.externalEventsRepo.listAutomationDetails(
      supabase,
      automationIds,
    )
    const notifications = automationDetails.map((rule) => ({
      user_id: rule.created_by,
      org_id: rule.org_id,
      type: 'space_automation_disabled',
      title: `Automation disabled: ${rule.name}`,
      body: args.reason,
      action_url: `/spaces?space=${encodeURIComponent(rule.space_id)}`,
      channel_sent: { in_app: true },
    }))
    if (notifications.length > 0) {
      const notifError = await this.externalEventsRepo.insertNotifications(supabase, notifications)
      if (notifError) {
        this.logger.warn(`Fathom revocation notifications failed: ${notifError}`)
      }
    }

    return { disabled_automation_ids: automationIds }
  }

  /** Defensive normalizer — caller may pass arbitrary JSON from a saved rule. */
  protected normalizeFathomSource(raw: unknown): Record<string, unknown> {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>
      const mode = String(obj.mode ?? '')
      if (mode === 'user' && typeof obj.user_integration_id === 'string') {
        return { mode: 'user', user_integration_id: obj.user_integration_id }
      }
      if (mode === 'team' && typeof obj.team_id === 'string') {
        return { mode: 'team', team_id: obj.team_id }
      }
    }
    return { mode: 'self' }
  }

  async disableExternalTriggerForAutomation(
    supabase: SupabaseClient,
    spaceId: string,
    automationId: string,
  ): Promise<void> {
    const existing = await this.externalEventsRepo.findExternalTriggerByAutomation(
      supabase,
      spaceId,
      automationId,
      'composio_trigger_id',
    )
    const triggerId = String(
      (existing as Record<string, unknown> | null)?.composio_trigger_id ?? '',
    ).trim()
    if (triggerId) await this.composio.disableTrigger(triggerId)
    await this.externalEventsRepo.disableExternalTrigger(supabase, spaceId, automationId)
  }

  async processComposioExternalEmailEvent(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.processComposioExternalEvent(supabase, payload)
  }

  async processComposioExternalEvent(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const metadata = this.objectRecord(payload.metadata)
    const data = this.objectRecord(payload.data)
    const eventId = String(payload.id ?? metadata.log_id ?? '').trim()
    const composioTriggerId = String(metadata.trigger_id ?? '').trim()
    const triggerSlug = String(metadata.trigger_slug ?? '').trim()
    const connectedAccountId = String(metadata.connected_account_id ?? '').trim()
    const provider = this.providerForTriggerSlug(triggerSlug)

    if (!eventId || !composioTriggerId || !provider) {
      return { processed: false, reason: 'unsupported_or_missing_metadata' }
    }

    const summary = this.summarizeExternalPayload(data, provider, triggerSlug)
    const payloadSummary = { ...summary.payload, data_keys: Object.keys(data).sort() }

    const insertedEvent = await this.externalEventsRepo.insertExternalEvent(supabase, {
      composio_event_id: eventId,
      composio_trigger_id: composioTriggerId,
      provider,
      trigger_slug: triggerSlug,
      connected_account_id: connectedAccountId || null,
      payload_summary: payloadSummary,
      status: 'received',
    })

    if (insertedEvent.error) {
      if (insertedEvent.error.code === '23505') return { processed: false, duplicate: true }
      throw new Error(insertedEvent.error.message)
    }

    const eventRow = insertedEvent.data as Record<string, unknown>
    const route = await this.externalEventsRepo.findActiveExternalRouteByTriggerId(
      supabase,
      composioTriggerId,
    )

    const routeRecord = (route ?? null) as Record<string, unknown> | null
    const routeMatches = !!routeRecord && this.externalRouteFiltersMatch(routeRecord, summary)
    if (!routeRecord || !routeMatches) {
      await this.updateExternalEvent(supabase, eventRow.id, { status: 'ignored' })
      return { processed: false, reason: 'no_matching_route' }
    }

    const spaceId = String(routeRecord.space_id)
    const automationId = String(routeRecord.automation_id)
    const userId = String(routeRecord.user_id)
    const orgId = routeRecord.org_id ? String(routeRecord.org_id) : null

    const event = summary.triggerEvent(triggerSlug, connectedAccountId)

    // Connected-app automations start without a space item. A task row is created only
    // when the user adds a create_task action (not silently on ingest).
    const externalEventPatch = {
      status: 'processed',
      external_trigger_id: routeRecord.id,
      space_id: spaceId,
      automation_id: automationId,
      user_id: userId,
      org_id: orgId,
    }
    const queued = await this.enqueueAutomationRuntimeJob(
      automationId,
      event,
      {
        supabase,
        userId,
        orgId,
        spaceId,
        itemId: '',
        depth: 0,
      },
      'item',
      { externalEventId: eventRow.id, patch: externalEventPatch },
    )

    let resultItemId: string | null = null
    if (!queued) {
      resultItemId = await this.executeAutomationById(automationId, event, {
        supabase,
        userId,
        orgId,
        spaceId,
        itemId: '',
        depth: 0,
      })
      await this.completeQueuedExternalEvent(
        supabase,
        eventRow.id,
        externalEventPatch,
        resultItemId,
      )
    }

    return { processed: true, item_id: resultItemId, automation_id: automationId }
  }

  async processWebhookEvent(
    supabase: SupabaseClient,
    input: {
      endpointId: string
      eventId: string
      userId: string
      orgId: string | null
      spaceId: string
      payload: unknown
      fields: Record<string, unknown>
      query: Record<string, unknown>
      receivedAt: string
    },
  ): Promise<{ processed: boolean; matched_automation_ids: string[]; queued: boolean }> {
    const automations = await this.automationsRepo.listPublishedWebhookAutomations(
      supabase,
      input.spaceId,
      input.endpointId,
    )
    if (automations.length === 0) {
      return { processed: false, matched_automation_ids: [], queued: false }
    }

    const event: TriggerEvent = {
      type: 'webhook_received',
      webhook_endpoint_id: input.endpointId,
      webhook_event_id: input.eventId,
      payload: input.payload,
      fields: input.fields,
      query: input.query,
      webhook: {
        endpoint_id: input.endpointId,
        event_id: input.eventId,
        received_at: input.receivedAt,
      },
    }
    const matchedAutomationIds: string[] = []
    let queuedAny = false

    for (const automation of automations) {
      const automationId = String(automation.id ?? '').trim()
      if (!automationId) continue
      matchedAutomationIds.push(automationId)
      const queued = await this.enqueueAutomationRuntimeJob(
        automationId,
        event,
        {
          supabase,
          userId: input.userId,
          orgId: input.orgId,
          spaceId: input.spaceId,
          depth: 0,
        },
        'itemless',
      )
      queuedAny = queuedAny || queued
      if (!queued) {
        await this.executeQueuedItemlessAutomation({
          automationId,
          event,
          userId: input.userId,
          orgId: input.orgId,
          spaceId: input.spaceId,
          depth: 0,
          supabase,
        })
      }
    }

    return {
      processed: matchedAutomationIds.length > 0,
      matched_automation_ids: matchedAutomationIds,
      queued: queuedAny,
    }
  }
}
