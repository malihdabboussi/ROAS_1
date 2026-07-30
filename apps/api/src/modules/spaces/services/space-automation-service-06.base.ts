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
import {
  buildMeetingCallIdentity,
  resolveMeetingCallKind,
} from '../../meetings/domain/meeting-call-kind'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import {
  getConnectedAppFlowTriggerBySlug,
  type ConnectedAppFlowProvider,
} from '../data/connected-app-flow-triggers'
import { SpaceAutomationsRepository } from '../repositories/space-automations.repository'
import { SpacesRepository } from '../repositories/spaces.repository'
import { sanitizeAssigneesForWrite } from '../utils/sanitize-assignees'
import {
  resolveFathomAttendeeLabels,
  upsertAttendeeTagOptions,
  type FathomAttendeeLike,
  type FathomTranscriptEntryLike,
} from './fathom-meeting-item-enrichment'
import { upsertFathomPeopleFromAttendees } from './fathom-meeting-people-upsert'
import {
  fallbackCeoMeetingTitle,
  provisionalFathomMeetingTitle,
  sanitizeCeoMeetingTitle,
} from './fathom-meeting-title'
import { SocialResearchOrchestrationService } from './social-research-orchestration.service'
import { SpaceAutomationServiceBase05 } from './space-automation-service-05.base'
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
      meeting_workspace_actions_authoritative?: boolean
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

export abstract class SpaceAutomationServiceBase06 extends SpaceAutomationServiceBase05 {
  async processFathomRecordingEvent(
    supabase: SupabaseClient,
    userId: string,
    event: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const meeting = this.extractFathomSummary(event)
    const eventId = `fathom:${meeting.meetingId}`
    const payloadSummary = {
      provider: 'fathom',
      trigger_slug: 'FATHOM_RECORDING_READY',
      meeting_id: meeting.meetingId,
      title: meeting.title,
      recorded_by_email: meeting.recordedByEmail,
      transcript_entries: meeting.transcriptEntries,
      action_items: meeting.actionItems.length,
    }

    const claim = await this.externalEventsRepo.claimFathomExternalEvent(supabase, {
      composio_event_id: eventId,
      provider: 'fathom',
      trigger_slug: 'FATHOM_RECORDING_READY',
      connected_account_id: `fathom:${userId}`,
      payload_summary: payloadSummary,
      user_id: userId,
    })

    if (!claim.claimed) {
      return {
        processed: false,
        duplicate: true,
        status: String(claim.row.status ?? 'duplicate'),
      }
    }

    const eventRow = claim.row
    try {
      // Resolve matching routes across THREE source modes:
      //
      // 1. self    — rule owner = recording owner. The historical case.
      // 2. user    — admin's rule pointed at a specific user_integrations.id;
      //              fires when that integration's owner records.
      // 3. team    — admin's rule pointed at an agent_team; fires when ANY
      //              member of that team records.
      //
      // Each mode is loaded with its own filtered query so we never scan the
      // global trigger table. A single canonical route stores the meeting so
      // one Fathom call cannot become duplicate meeting records.
      const matchingRoutes = await this.collectMatchingFathomRoutes(supabase, userId, meeting)

      if (matchingRoutes.length === 0) {
        await this.updateExternalEvent(supabase, eventRow.id, { status: 'ignored' })
        return { processed: false, reason: 'no_matching_route' }
      }

      const canonicalRoute = this.selectCanonicalFathomRoute(matchingRoutes)
      const canonicalResults: Array<{
        route_id: string
        space_id: string
        automation_id: string
        item_id: string
      }> = []

      for (const routeRecord of [canonicalRoute]) {
        const spaceId = String(routeRecord.space_id)
        const automationId = String(routeRecord.automation_id)
        const orgId = routeRecord.org_id ? String(routeRecord.org_id) : null
        // Billing + RLS identity per locked decision #4: the rule's own user_id
        // owns the run, not the Fathom recording owner. For self-source rules
        // these are identical anyway. For user/team-source rules this routes
        // credits to the rule creator (admin/owner) and gives them rights to
        // mutate the synthetic Space item.
        const runUserId = routeRecord.user_id ? String(routeRecord.user_id) : userId

        const exactCall = await this.repo.findItemByFathomMeetingId(
          supabase,
          spaceId,
          meeting.meetingId,
        )
        const reconciledMeetingItemId =
          !exactCall?.id && this.meetingSourceIngestion
            ? await this.meetingSourceIngestion.findMatchingMeetingItem(supabase, {
                spaceId,
                userId: runUserId,
                event,
              })
            : null
        const existingCall =
          exactCall ??
          (reconciledMeetingItemId
            ? await this.repo.findItemById(supabase, spaceId, reconciledMeetingItemId)
            : null)
        if (existingCall?.id) {
          if (this.meetingSourceIngestion) {
            await this.meetingSourceIngestion.ingestFathomSource(supabase, {
              meetingItemId: String(existingCall.id),
              spaceId,
              userId: runUserId,
              orgId,
              calendarEventId: null,
              event,
            })
          }
          this.logger.log(
            `Attached Fathom recording ${meeting.meetingId} to meeting ${String(existingCall.id)} on space ${spaceId}`,
          )
          canonicalResults.push({
            route_id: String(routeRecord.id),
            space_id: spaceId,
            automation_id: automationId,
            item_id: String(existingCall.id),
          })
          continue
        }

        const space = (await this.repo.findSpaceById(
          supabase,
          runUserId,
          spaceId,
          orgId,
        )) as Record<string, unknown> | null
        const resolvedAttendees = resolveFathomAttendeeLabels({
          attendees: meeting.attendees as FathomAttendeeLike[],
          transcript: meeting.transcript as FathomTranscriptEntryLike[],
          recordedByEmail: meeting.recordedByEmail,
          titleHint: meeting.title,
        })
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('email, fathom_aliases, full_name')
          .eq('id', runUserId)
          .maybeSingle()
        const callIdentity = buildMeetingCallIdentity({
          email: typeof ownerProfile?.email === 'string' ? ownerProfile.email : null,
          fathomAliases: Array.isArray(ownerProfile?.fathom_aliases)
            ? (ownerProfile.fathom_aliases as string[])
            : null,
          fullName: typeof ownerProfile?.full_name === 'string' ? ownerProfile.full_name : null,
          internalEmails: [meeting.recordedByEmail],
        })
        const callKind = resolveMeetingCallKind({
          identity: callIdentity,
          recordedByEmail: meeting.recordedByEmail,
          attendees: meeting.attendees as FathomAttendeeLike[],
          attendeeLabels: resolvedAttendees.labels,
          titleHint: meeting.title,
          summary: meeting.summary,
        })
        const { optionIds, nextSchema, optionsChanged } = upsertAttendeeTagOptions(
          this.objectRecord(space?.schema),
          resolvedAttendees.labels,
        )
        if (optionsChanged && nextSchema) {
          try {
            await this.repo.updateSpace(
              supabase,
              runUserId,
              spaceId,
              { schema: nextSchema as never },
              orgId,
            )
          } catch (error) {
            this.logger.warn(
              `Failed to upsert Fathom attendee tags on space ${spaceId}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            )
          }
        }

        const statusField = Array.isArray(this.objectRecord(space?.schema).fields)
          ? (this.objectRecord(space?.schema).fields as Array<Record<string, unknown>>).find(
              (field) => String(field.id ?? '') === 'status',
            )
          : null
        const statusOptions = Array.isArray(statusField?.options)
          ? (statusField.options as Array<Record<string, unknown>>)
          : []
        const hasProcessingStatus = statusOptions.some(
          (option) => String(option.id ?? '') === 'processing',
        )

        const provisionalTitle = provisionalFathomMeetingTitle(meeting.title)
        let item = (await this.repo.createItem(
          supabase,
          runUserId,
          spaceId,
          {
            title: provisionalTitle,
            // Keep description as the short purpose summary; full transcript lives in custom_data.
            description: meeting.summary || null,
            source: 'fathom',
            ...(hasProcessingStatus ? { status: 'processing' as const } : {}),
            custom_data: {
              entry_type: 'call',
              call_kind: callKind,
              call_kind_source: 'automatic',
              ...(meeting.callDate ? { call_date: meeting.callDate } : {}),
              ...(meeting.url ? { recording_url: meeting.url, fathom_url: meeting.url } : {}),
              ...(meeting.summary ? { summary: meeting.summary } : {}),
              ...(meeting.transcriptText ? { transcript_text: meeting.transcriptText } : {}),
              ...(optionIds.length > 0 ? { attendees: optionIds } : {}),
              ...(Object.keys(resolvedAttendees.speakerRemaps).length > 0
                ? { speaker_remaps: resolvedAttendees.speakerRemaps }
                : {}),
              ...(resolvedAttendees.unresolvedSpeakers.length > 0
                ? { unresolved_speakers: resolvedAttendees.unresolvedSpeakers }
                : {}),
              external_automation: {
                provider: 'fathom',
                trigger_slug: 'FATHOM_RECORDING_READY',
                meeting_id: meeting.meetingId,
                recorded_by_email: meeting.recordedByEmail,
                transcript_entries: meeting.transcriptEntries,
                fathom_owner_user_id: userId,
                attendees_from_speakers: resolvedAttendees.usedSpeakers,
                call_kind: callKind,
              },
            },
          },
          orgId,
        )) as Record<string, unknown>

        const aiTitle = await this.suggestCeoMeetingTitle(runUserId, spaceId, orgId, {
          calendar_title: meeting.title,
          summary: meeting.summary,
          transcript_text: meeting.transcriptText,
          attendees: meeting.attendees,
          action_items: meeting.actionItems,
          recorded_by_email: meeting.recordedByEmail,
        })
        const resolvedTitle =
          aiTitle ??
          fallbackCeoMeetingTitle({
            summary: meeting.summary,
            calendarTitle: meeting.title,
            attendees: meeting.attendees as Array<{ name?: string | null } | null>,
          })
        if (resolvedTitle && resolvedTitle !== provisionalTitle) {
          try {
            item = (await this.repo.updateItem(
              supabase,
              runUserId,
              spaceId,
              String(item.id),
              { title: resolvedTitle },
              orgId,
            )) as Record<string, unknown>
          } catch (error) {
            this.logger.warn(
              `Failed to apply CEO meeting title on space ${spaceId}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            )
          }
        }

        await upsertFathomPeopleFromAttendees(
          supabase,
          {
            userId: runUserId,
            orgId,
            campaignId:
              typeof space?.campaign_id === 'string' && space.campaign_id.trim()
                ? space.campaign_id.trim()
                : null,
            attendees: meeting.attendees as FathomAttendeeLike[],
          },
          (message) => this.logger.warn(message),
        )

        if (this.meetingSourceIngestion) {
          await this.meetingSourceIngestion.ingestFathomSource(supabase, {
            meetingItemId: String(item.id),
            spaceId,
            userId: runUserId,
            orgId,
            calendarEventId: null,
            event,
          })
        }

        await this.repo.createActivity(supabase, {
          item_id: String(item.id),
          space_id: spaceId,
          user_id: runUserId,
          org_id: orgId,
          event_type: 'external_fathom_recording_ready',
          payload: payloadSummary,
        })

        const fathomTriggerEvent: TriggerEvent = {
          type: 'external_fathom_recording_ready',
          title: meeting.title,
          recorded_by_email: meeting.recordedByEmail,
          meeting_id: meeting.meetingId,
          summary: meeting.summary,
          transcript_text: meeting.transcriptText,
          transcript_entries: meeting.transcriptEntries,
          transcript: meeting.transcript,
          action_items: meeting.actionItems,
          attendees: meeting.attendees,
          url: meeting.url,
          fathom_owner_user_id: userId,
          meeting_workspace_actions_authoritative: Boolean(this.meetingSourceIngestion),
        }

        const queued = await this.enqueueAutomationRuntimeJob(automationId, fathomTriggerEvent, {
          supabase,
          userId: runUserId,
          orgId,
          spaceId,
          itemId: String(item.id),
          depth: 0,
        })
        if (!queued) {
          await this.executeAutomationById(automationId, fathomTriggerEvent, {
            supabase,
            userId: runUserId,
            orgId,
            spaceId,
            itemId: String(item.id),
            depth: 0,
          })
        }

        canonicalResults.push({
          route_id: String(routeRecord.id),
          space_id: spaceId,
          automation_id: automationId,
          item_id: String(item.id),
        })
      }

      // The audit row stores the canonical meeting pointer plus how many routes
      // matched, which preserves routing diagnostics without duplicating data.
      const first = canonicalResults[0]
      await this.updateExternalEvent(supabase, eventRow.id, {
        status: 'processed',
        external_trigger_id: first.route_id,
        space_id: first.space_id,
        automation_id: first.automation_id,
        item_id: first.item_id,
        org_id: canonicalRoute.org_id ? String(canonicalRoute.org_id) : null,
        processed_at: new Date().toISOString(),
        payload_summary: {
          ...payloadSummary,
          fanout_count: canonicalResults.length,
          matching_route_count: matchingRoutes.length,
        },
      })

      return {
        processed: true,
        fanout_count: canonicalResults.length,
        space_id: first.space_id,
        item_id: first.item_id,
        automation_id: first.automation_id,
      }
    } catch (error) {
      await this.updateExternalEvent(supabase, eventRow.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        processed_at: new Date().toISOString(),
      })
      throw error
    }
  }

  private selectCanonicalFathomRoute(
    routes: Array<Record<string, unknown>>,
  ): Record<string, unknown> {
    return routes.slice().sort((left, right) => {
      const score = (route: Record<string, unknown>) => {
        const filters = this.objectRecord(route.filters)
        const source = this.objectRecord(route.source)
        const filterScore = Object.values(filters).filter(
          (value) => value !== null && value !== undefined && String(value).trim() !== '',
        ).length
        const orgScore = route.org_id ? 3 : 0
        const sourceScore = source.mode === 'user' ? 2 : source.mode === 'self' ? 1 : 0
        return filterScore * 10 + orgScore + sourceScore
      }
      return score(right) - score(left) || String(left.id).localeCompare(String(right.id))
    })[0]
  }

  /** Always AI-name Meetings rows — purpose-first CEO labels, no "Meeting:" prefix. */
  protected async suggestCeoMeetingTitle(
    ownerUserId: string,
    spaceId: string,
    orgId: string | null,
    meetingPayload: Record<string, unknown>,
  ): Promise<string | null> {
    if (!this.userAgentApi) return null
    const internalToken =
      this.configService.get<string>('INTERNAL_API_TOKEN') ?? process.env.INTERNAL_API_TOKEN ?? ''
    if (!internalToken) return null
    try {
      const response = await this.userAgentApi.invoke(
        ownerUserId,
        '/api/agents/suggest-meeting-title',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Internal-Token': internalToken },
          body: JSON.stringify({
            space_id: spaceId,
            owner_user_id: ownerUserId,
            org_id: orgId,
            agent_key: 'vibey',
            payload: meetingPayload,
          }),
        },
        {
          timeoutMs: 90_000,
          logTag: `suggest_meeting_title space=${spaceId}`,
        },
      )
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
      if (!response.ok) {
        this.logger.warn(
          `suggest-meeting-title failed for space ${spaceId}: ${String(body?.error ?? body?.message ?? response.status)}`,
        )
        return null
      }
      return sanitizeCeoMeetingTitle(String(body?.title ?? ''))
    } catch (error) {
      this.logger.warn(
        `suggest-meeting-title threw for space ${spaceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return null
    }
  }

  /**
   * Resolve every active Fathom rule that should fire for a recording owned
   * by `recordingOwnerUserId`. Three queries, indexed by partial indexes from
   * `20260513145656_fathom_trigger_source.sql`. Results are unioned and
   * de-duped on `route.id` so a single rule never appears twice even if it
   * matches multiple paths (e.g., self AND team membership).
   *
   * Title/recorded-by filters are applied client-side after the union since
   * they live inside `route.filters` JSONB.
   */
  protected async collectMatchingFathomRoutes(
    supabase: SupabaseClient,
    recordingOwnerUserId: string,
    meeting: { title: string; recordedByEmail: string },
  ): Promise<Array<Record<string, unknown>>> {
    const dedupe = new Map<string, Record<string, unknown>>()

    // 1) self: trigger row's user_id (= rule creator) matches recording owner.
    const selfRoutes = await this.externalEventsRepo.listActiveSelfFathomRoutes(
      supabase,
      recordingOwnerUserId,
    )
    for (const route of selfRoutes) {
      const mode = String(this.objectRecord(route.source).mode ?? 'self')
      if (mode !== 'self') continue
      dedupe.set(String(route.id), route)
    }

    // 2) user: source.user_integration_id resolves to recording owner.
    const ownerIntegrationIds = await this.externalEventsRepo.listFathomIntegrationIdsForUser(
      supabase,
      recordingOwnerUserId,
    )
    if (ownerIntegrationIds.length > 0) {
      const userRoutes = await this.externalEventsRepo.listActiveFathomRoutesByIntegrationIds(
        supabase,
        ownerIntegrationIds,
      )
      for (const route of userRoutes) {
        const mode = String(this.objectRecord(route.source).mode ?? '')
        if (mode !== 'user') continue
        dedupe.set(String(route.id), route)
      }
    }

    // 3) team: recording owner is a member of source.team_id.
    const teamIds = await this.externalEventsRepo.listAgentTeamIdsForUser(
      supabase,
      recordingOwnerUserId,
    )
    if (teamIds.length > 0) {
      const teamRoutes = await this.externalEventsRepo.listActiveFathomRoutesByTeamIds(
        supabase,
        teamIds,
      )
      for (const route of teamRoutes) {
        const mode = String(this.objectRecord(route.source).mode ?? '')
        if (mode !== 'team') continue
        dedupe.set(String(route.id), route)
      }
    }

    const all = [...dedupe.values()]
    return all.filter((route) => this.fathomRouteFiltersMatch(route, meeting))
  }
}
