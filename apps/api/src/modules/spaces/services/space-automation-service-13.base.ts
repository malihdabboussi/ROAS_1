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
import { isFollowUpSpaceItem } from '../../meetings/domain/meeting-follow-up-actions'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import {
  getConnectedAppFlowTriggerBySlug,
  type ConnectedAppFlowProvider,
} from '../data/connected-app-flow-triggers'
import { SpaceAutomationsRepository } from '../repositories/space-automations.repository'
import { SpacesRepository } from '../repositories/spaces.repository'
import { sanitizeAssigneesForWrite } from '../utils/sanitize-assignees'
import { findExistingFollowUpForSuggestedTask } from './agent-suggest-follow-up-match'
import {
  enrichSuggestedFollowUp,
  followUpOwnerTagLabel,
  isInternalAssigneeEmail,
  matchAttendeeTagOption,
  type FathomActionItemLike,
} from './fathom-follow-up-enrichment'
import { upsertAttendeeTagOptions } from './fathom-meeting-item-enrichment'
import {
  groundAssigneeNameOnPortalPeople,
  groundFollowUpTitleOnPortalPeople,
} from './fathom-portal-people-grounding'
import { loadPortalPeopleForSpaceFollowUps } from './fathom-portal-people-loader'
import { SocialResearchOrchestrationService } from './social-research-orchestration.service'
import { SpaceAutomationServiceBase12 } from './space-automation-service-12.base'
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

export abstract class SpaceAutomationServiceBase13 extends SpaceAutomationServiceBase12 {
  /**
   * Assign follow-ups only to internal humans we can resolve.
   * Personal spaces: owner only. Org spaces: active org member.
   * Never invent external Fathom people as Assignees.
   */
  protected async resolveInternalFollowUpAssignee(
    supabase: SupabaseClient,
    ownerUserId: string,
    orgId: string | null,
    email: string | null,
  ): Promise<{
    assignee_type: 'human'
    assignee_id: string
    assignees: Array<{ type: 'human'; id: string }>
  } | null> {
    if (!email || !isInternalAssigneeEmail(email)) return null
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle()
    if (error || !profile?.id) return null
    const userId = String(profile.id)

    if (!orgId) {
      if (userId !== ownerUserId) return null
      return {
        assignee_type: 'human',
        assignee_id: userId,
        assignees: [{ type: 'human', id: userId }],
      }
    }

    const { data: member } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    if (!member?.user_id) return null
    return {
      assignee_type: 'human',
      assignee_id: userId,
      assignees: [{ type: 'human', id: userId }],
    }
  }

  protected async execAgentSuggestTasks(
    action: Record<string, unknown>,
    ctx: EvalContext,
    templateCtx: TemplateContext,
  ): Promise<Record<string, unknown>> {
    if (!this.userAgentApi) throw new Error('UserAgentApiService not configured')

    const internalToken =
      this.configService.get<string>('INTERNAL_API_TOKEN') ?? process.env.INTERNAL_API_TOKEN ?? ''
    if (!internalToken) throw new Error('INTERNAL_API_TOKEN not configured')

    const event = this.objectRecord(templateCtx.event)
    if (
      event.type === 'external_fathom_recording_ready' &&
      event.meeting_workspace_actions_authoritative === true
    ) {
      return {
        skipped: true,
        reason: 'provider_actions_are_authoritative',
        suggestion_count: 0,
      }
    }
    const ownerUserId =
      event.type === 'external_fathom_recording_ready' &&
      typeof event.fathom_owner_user_id === 'string' &&
      event.fathom_owner_user_id.trim().length > 0
        ? event.fathom_owner_user_id.trim()
        : ctx.userId
    const maxSuggestions = this.normalizeMaxSuggestions(action.max_suggestions)
    const agentKey =
      typeof action.agent_key === 'string' && action.agent_key.trim().length > 0
        ? action.agent_key.trim()
        : 'vibey'
    const instructions =
      typeof action.instructions === 'string' ? action.instructions.trim().slice(0, 4000) : ''
    const brainContext =
      action.extended_brain_knowledge === true
        ? this.formatBrainContextBlock(
            await this.searchBrainContext(
              ctx,
              this.buildBrainSearchQuery(action, templateCtx.item, templateCtx),
              agentKey,
            ),
          )
        : ''

    const response = await this.userAgentApi.invoke(
      ownerUserId,
      '/api/agents/suggest-tasks',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Token': internalToken },
        body: JSON.stringify({
          space_id: ctx.spaceId,
          owner_user_id: ownerUserId,
          org_id: ctx.orgId,
          agent_key: agentKey,
          max_suggestions: maxSuggestions,
          ...(instructions ? { instructions } : {}),
          payload: {
            trigger: event,
            space: {
              id: ctx.spaceId,
              title: templateCtx.space.title,
              schema: templateCtx.space.schema,
            },
            item: templateCtx.item,
            transcript_text: event.transcript_text,
            summary: event.summary,
            action_items: event.action_items,
            attendees: event.attendees,
            meeting_url: event.url,
            ...(brainContext
              ? { extended_brain_knowledge: true, brain_context: brainContext }
              : {}),
          },
        }),
      },
      {
        timeoutMs: 600_000,
        logTag: `agent_suggest_tasks space=${ctx.spaceId}`,
      },
    )

    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
    if (!response.ok) {
      throw new Error(String(body?.error ?? body?.message ?? 'Agent task suggestion failed'))
    }

    const rawTasks = Array.isArray(body?.tasks) ? body.tasks : []
    let spaceSchema = this.objectRecord(templateCtx.space.schema)
    const portalPeople = await loadPortalPeopleForSpaceFollowUps({
      supabase: ctx.supabase,
      ownerUserId,
      orgId: ctx.orgId,
      spaceSchema,
    })
    const statusField = Array.isArray(spaceSchema.fields)
      ? (spaceSchema.fields as Array<Record<string, unknown>>).find(
          (field) => String(field.id ?? '') === 'status',
        )
      : null
    const statusOptions = Array.isArray(statusField?.options)
      ? (statusField.options as Array<Record<string, unknown>>)
      : []
    const hasToActionStatus = statusOptions.some((option) => String(option.id ?? '') === 'logged')
    const sourceCallTitle = String(templateCtx.item.title ?? '')
      .replace(/^(?:fathom\s+)?meeting:\s*/i, '')
      .trim()
      .slice(0, 500)
    const actionItems = Array.isArray(event.action_items)
      ? (event.action_items as FathomActionItemLike[])
      : []
    // Empty Fathom list → ingest already mirrored nothing; do not invent follow_ups.
    if (
      event.type === 'external_fathom_recording_ready' &&
      Array.isArray(event.action_items) &&
      event.action_items.length === 0
    ) {
      return { skipped: true, reason: 'fathom_action_items_empty', suggestion_count: 0 }
    }

    let existingFollowUps: Record<string, unknown>[] = []
    if (ctx.itemId) {
      const { data: followUpRows, error: followUpError } = await ctx.supabase
        .from('space_items')
        .select('id, title, source, status, custom_data, description, due_date, priority')
        .eq('space_id', ctx.spaceId)
        .or(`parent_item_id.eq.${ctx.itemId},custom_data->>source_call_item_id.eq.${ctx.itemId}`)
      if (followUpError) throw new Error(followUpError.message)
      existingFollowUps = ((followUpRows as Record<string, unknown>[]) ?? []).filter((row) =>
        isFollowUpSpaceItem(row),
      )
    }

    const createdIds: string[] = []
    const fathomMeetingId =
      typeof event.meeting_id === 'string' && event.meeting_id.trim()
        ? event.meeting_id.trim()
        : null
    for (const [index, raw] of rawTasks.slice(0, maxSuggestions).entries()) {
      const task = this.objectRecord(raw)
      const rawTitle = String(task.title ?? '')
        .trim()
        .slice(0, 1000)
      if (!rawTitle) continue
      const groundedTitle = groundFollowUpTitleOnPortalPeople(rawTitle, portalPeople)
      const title = groundedTitle.title
      const description = String(task.description ?? '')
        .trim()
        .slice(0, 20000)
      const enriched = enrichSuggestedFollowUp({
        title,
        description,
        due_date: typeof task.due_date === 'string' ? task.due_date : null,
        priority: typeof task.priority === 'string' ? task.priority : null,
        assignee_email: typeof task.assignee_email === 'string' ? task.assignee_email : null,
        actionItems,
        source_action_index:
          typeof task.source_action_index === 'number' ? task.source_action_index : null,
      })
      const groundedAssigneeName = groundAssigneeNameOnPortalPeople(
        enriched.assignee_name,
        portalPeople,
      )
      const assignee = await this.resolveInternalFollowUpAssignee(
        ctx.supabase,
        ownerUserId,
        ctx.orgId,
        enriched.assignee_email,
      )

      const ownerHint = {
        name: groundedAssigneeName,
        email: enriched.assignee_email,
      }
      let ownerAttendeeIds: string[] = []
      const attendeesField = Array.isArray(spaceSchema.fields)
        ? (spaceSchema.fields as Array<Record<string, unknown>>).find(
            (field) => String(field.id ?? '') === 'attendees',
          )
        : null
      const attendeeOptions = Array.isArray(attendeesField?.options)
        ? (attendeesField.options as Array<{ id: string; label: string }>)
        : []
      const matchedOwnerId = matchAttendeeTagOption(attendeeOptions, ownerHint)
      if (matchedOwnerId) {
        ownerAttendeeIds = [matchedOwnerId]
      } else {
        const ownerLabel = followUpOwnerTagLabel(ownerHint)
        if (ownerLabel) {
          const upserted = upsertAttendeeTagOptions(spaceSchema, [ownerLabel])
          if (upserted.optionIds[0]) ownerAttendeeIds = [upserted.optionIds[0]]
          if (upserted.optionsChanged && upserted.nextSchema) {
            spaceSchema = upserted.nextSchema
            try {
              await this.repo.updateSpace(
                ctx.supabase,
                ownerUserId,
                ctx.spaceId,
                { schema: spaceSchema as never },
                ctx.orgId,
              )
            } catch (error) {
              this.logger.warn(
                `Failed to upsert follow-up owner attendee tag on space ${ctx.spaceId}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              )
            }
          }
        }
      }

      const providerSourceKey =
        fathomMeetingId &&
        enriched.source_action_index != null &&
        Number.isInteger(enriched.source_action_index)
          ? `fathom:${fathomMeetingId}:action:${enriched.source_action_index}`
          : null
      const customData: Record<string, unknown> = {
        entry_type: 'follow_up',
        ...(ownerAttendeeIds.length > 0 ? { attendees: ownerAttendeeIds } : {}),
        ...(ctx.itemId
          ? {
              source_call_item_id: ctx.itemId,
              ...(sourceCallTitle ? { source_call: sourceCallTitle } : {}),
            }
          : {}),
        ...(providerSourceKey
          ? { provider_source_key: providerSourceKey, provider: 'fathom' }
          : {}),
        suggestion_origin: {
          ...(ctx.itemId ? { rule_trigger_item_id: ctx.itemId } : {}),
          trigger_type: String(event.type ?? ''),
          fathom_meeting_id: fathomMeetingId,
          agent_key: agentKey,
          suggestion_index: index,
          source_action_index: enriched.source_action_index,
          source_action_key:
            enriched.source_action_index === null
              ? null
              : (providerSourceKey ??
                `${String(event.meeting_id ?? 'meeting')}:${enriched.source_action_index}`),
          source_action: 'agent_suggest_tasks',
        },
        ...(enriched.assignee_email || groundedAssigneeName
          ? {
              ...(enriched.assignee_email
                ? { suggested_assignee_email: enriched.assignee_email }
                : {}),
              ...(groundedAssigneeName ? { suggested_assignee_name: groundedAssigneeName } : {}),
              ...(groundedTitle.grounded && groundedTitle.matched
                ? {
                    suggested_title_grounded_from: rawTitle,
                    suggested_title_portal_person: groundedTitle.matched.label,
                  }
                : {}),
              ...(assignee
                ? {}
                : enriched.assignee_email && isInternalAssigneeEmail(enriched.assignee_email)
                  ? { suggested_assignee_unresolved: true }
                  : enriched.assignee_email
                    ? { suggested_assignee_external: true }
                    : {}),
            }
          : {}),
      }

      const existingMatch = findExistingFollowUpForSuggestedTask({
        existingFollowUps,
        title,
        meetingId: fathomMeetingId,
        sourceActionIndex: enriched.source_action_index,
      })
      if (existingMatch?.id) {
        const updated = (await this.repo.updateItem(
          ctx.supabase,
          ownerUserId,
          ctx.spaceId,
          String(existingMatch.id),
          {
            title,
            ...(description ? { description } : {}),
            ...(enriched.due_date ? { due_date: enriched.due_date } : {}),
            priority: enriched.priority,
            ...(assignee
              ? {
                  assignee_type: assignee.assignee_type,
                  assignee_id: assignee.assignee_id,
                  assignees: assignee.assignees,
                }
              : {}),
            custom_data: customData,
          } as never,
          ctx.orgId,
        )) as Record<string, unknown>
        createdIds.push(String(updated.id ?? existingMatch.id))
        existingFollowUps = existingFollowUps.map((row) =>
          String(row.id) === String(existingMatch.id)
            ? { ...row, ...updated, custom_data: customData }
            : row,
        )
        continue
      }

      const created = (await this.repo.createItem(
        ctx.supabase,
        ownerUserId,
        ctx.spaceId,
        {
          title,
          ...(description ? { description } : {}),
          ...(enriched.due_date ? { due_date: enriched.due_date } : {}),
          priority: enriched.priority,
          ...(hasToActionStatus ? { status: 'logged' as const } : {}),
          ...(assignee
            ? {
                assignee_type: assignee.assignee_type,
                assignee_id: assignee.assignee_id,
                assignees: assignee.assignees,
              }
            : {}),
          source: 'agent_suggested',
          ...(ctx.itemId ? { parent_item_id: ctx.itemId } : {}),
          custom_data: customData,
        },
        ctx.orgId,
      )) as Record<string, unknown>
      createdIds.push(String(created.id))
      existingFollowUps = [...existingFollowUps, created]
    }

    if (createdIds.length > 0 && ctx.itemId) {
      await this.repo.createActivity(ctx.supabase, {
        item_id: ctx.itemId,
        space_id: ctx.spaceId,
        user_id: ownerUserId,
        org_id: ctx.orgId,
        event_type: 'agent_suggested_tasks',
        actor_kind: 'automation',
        payload: {
          count: createdIds.length,
          suggestion_ids: createdIds,
          agent_key: agentKey,
        },
      })
    }

    return { suggestion_count: createdIds.length, suggestion_ids: createdIds }
  }

  /**
   * OUTPUT CONTRACT appended to the agent prompt when `send_to_agent.output_type`
   * is set. Each branch points the agent at a specific `vibey_backend` save tool
   * and links the resulting artifact back to the source space + task so a later
   * automation step (or the task UI) can pick it up.
   *
   * Returns `null` when no contract should be appended (`none` or unknown kind).
   */
  protected buildAgentOutputContract(outputType: string, ctx: EvalContext): string | null {
    if (!outputType || outputType === 'none') return null

    const link = { space_id: ctx.spaceId, source_item_id: ctx.itemId }
    const wrap = (lines: string[]): string =>
      ['', '', '---', 'OUTPUT CONTRACT', ...lines].join('\n')

    switch (outputType) {
      case 'email_artifact':
        return wrap([
          'Create exactly one Email artifact by calling save_email with this shape:',
          JSON.stringify(
            { subject: '<draft email subject>', body: '<draft email body>', ...link },
            null,
            2,
          ),
          'Do not send the email. The automation will send it later after review.',
        ])
      case 'document_artifact':
        return wrap([
          'Create exactly one Document by calling save_document with this shape:',
          JSON.stringify({ title: '<document title>', body: '<markdown body>', ...link }, null, 2),
        ])
      case 'pdf_artifact':
        return wrap([
          'Create exactly one PDF by calling create_pdf with this shape:',
          JSON.stringify({ title: '<pdf title>', body: '<markdown body>', ...link }, null, 2),
        ])
      case 'docx_artifact':
        return wrap([
          'Create exactly one Word DOCX file by calling create_docx with this shape:',
          JSON.stringify(
            {
              title: '<docx title>',
              content: '<markdown body>',
              content_format: 'markdown',
              ...link,
            },
            null,
            2,
          ),
        ])
      case 'funnel_artifact':
        return wrap([
          'Create exactly one Funnel by calling create_funnel with this shape:',
          JSON.stringify({ name: '<funnel name>', ...link }, null, 2),
          'Add at least one page with add_funnel_page after the funnel is created.',
        ])
      case 'website_artifact':
        return wrap([
          'Create exactly one Website by calling create_website with this shape:',
          JSON.stringify({ name: '<website name>', ...link }, null, 2),
          'Add at least one page with add_website_page after the website is created.',
        ])
      case 'sequence_artifact':
        return wrap([
          'Create exactly one Email Sequence by calling create_sequence with this shape:',
          JSON.stringify({ name: '<sequence name>', ...link }, null, 2),
          'Add at least one email with add_sequence_email after the sequence is created.',
        ])
      case 'social_post_artifact':
        return wrap([
          'Create exactly one Social Post by calling create_social_post with this shape:',
          JSON.stringify({ caption: '<post caption>', platform: '<platform>', ...link }, null, 2),
          'Do not publish the post. The automation will publish it later after review.',
        ])
      case 'presentation_artifact':
        return wrap([
          'Create exactly one Presentation by calling create_presentation with this shape:',
          JSON.stringify({ name: '<presentation name>', ...link }, null, 2),
          'Add slides with add_presentation_slide after the presentation is created.',
        ])
      case 'ad_artifact':
        return wrap([
          'Create exactly one Ad by calling create_ad with this shape:',
          JSON.stringify(
            { headline: '<ad headline>', primary_text: '<ad body>', ...link },
            null,
            2,
          ),
          'Do not publish to Meta. The automation will publish it later after review.',
        ])
      case 'offer_artifact':
        return wrap([
          'Create exactly one Offer by calling create_offer with this shape:',
          JSON.stringify({ name: '<offer name>', ...link }, null, 2),
        ])
      case 'avatar_artifact':
        return wrap([
          'Create exactly one Avatar by calling create_avatar with this shape:',
          JSON.stringify({ name: '<avatar name>', ...link }, null, 2),
        ])
      case 'blog_post_artifact':
        return wrap([
          'Create exactly one Blog Post by calling create_blog_post with this shape:',
          JSON.stringify({ title: '<post title>', body: '<markdown body>', ...link }, null, 2),
        ])
      default:
        this.logger.warn(`Unknown send_to_agent output_type: ${outputType}`)
        return null
    }
  }
}
