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
import { SpaceAutomationServiceBase11 } from './space-automation-service-11.base'
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

export abstract class SpaceAutomationServiceBase12 extends SpaceAutomationServiceBase11 {
  protected async searchCompanyCortexContext(
    ctx: EvalContext,
    queryText: string,
  ): Promise<Array<{ source: string; title: string; content: string }>> {
    if (!ctx.orgId) return []
    let brainId = ''
    try {
      brainId = await this.automationActionsRepo.findCompanyBrainId(ctx.supabase, ctx.orgId)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Company Cortex brain lookup failed: ${message}`)
      return []
    }
    if (!brainId) return []

    const terms = queryText
      .split(/\s+/)
      .map((term) => term.replace(/[^\w-]/g, '').trim())
      .filter((term) => term.length >= 4)
      .slice(0, 5)
    if (terms.length === 0) return []

    const rows: Record<string, unknown>[] = []
    for (const term of terms) {
      try {
        rows.push(
          ...(await this.automationActionsRepo.searchCompanyCortexObjects(
            ctx.supabase,
            brainId,
            term,
          )),
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.warn(`Company Cortex context search failed: ${message}`)
        continue
      }
    }

    return rows.slice(0, 4).map((row) => ({
      source: 'Company Cortex',
      title: String(row.title ?? row.object_type ?? 'Company knowledge'),
      content: String(row.truth ?? '')
        .trim()
        .slice(0, 900),
    }))
  }

  protected formatBrainContextBlock(
    items: Array<{ source: string; title: string; content: string }>,
  ) {
    if (items.length === 0) return ''
    const lines = ['## Extended Brain Knowledge', '', 'Atlas found this relevant context:']
    for (const item of items) {
      lines.push('', `### ${item.source}: ${item.title}`, item.content)
    }
    return lines.join('\n')
  }

  protected async execAddBrainContextToTask(
    action: Record<string, unknown>,
    ctx: EvalContext,
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): Promise<Record<string, unknown>> {
    if (!ctx.itemId) throw new Error('Brain context needs a task')
    const query = this.buildBrainSearchQuery(action, item, templateCtx)
    const contextItems = await this.searchBrainContext(ctx, query, 'atlas')
    const block = this.formatBrainContextBlock(contextItems)
    if (!block) return { context_count: 0 }

    const currentDescription = String(item.description ?? '').trim()
    const nextDescription = [currentDescription, block].filter(Boolean).join('\n\n---\n\n')
    await this.repo.updateItem(
      ctx.supabase,
      ctx.userId,
      ctx.spaceId,
      ctx.itemId,
      { description: nextDescription },
      ctx.orgId,
    )
    return { context_count: contextItems.length }
  }

  protected numberInRange(value: unknown, fallback: number, min: number, max: number): number {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) return fallback
    return Math.min(Math.max(n, min), max)
  }

  protected integerInRange(value: unknown, fallback: number, min: number, max: number): number {
    const n = this.numberInRange(value, fallback, min, max)
    return Math.floor(n)
  }

  protected async assertAutomationCreditsAvailable(ctx: EvalContext): Promise<void> {
    if (!this.creditsService) throw new Error('CreditsService not configured')
    await this.creditsService.assertHasAvailableCredits(ctx.userId, ctx.orgId)
  }

  protected async execCreateTask(
    action: Record<string, unknown>,
    ctx: EvalContext,
    templateCtx: TemplateContext,
  ): Promise<Record<string, unknown>> {
    const title = renderTemplate(String(action.title_template ?? ''), templateCtx).trim()
    if (!title) throw new Error('Task title is required')

    const descriptionTemplate = String(action.notes_template ?? '').trim()
    const description = descriptionTemplate
      ? renderTemplate(descriptionTemplate, templateCtx)
      : undefined
    const status =
      typeof action.status === 'string' && action.status
        ? (action.status as 'todo' | 'in_progress' | 'in_review' | 'done')
        : undefined
    const actionAssignees = this.normalizeAssignees(action.assignees)
    let assignees: AutomationAssignee[] = actionAssignees
    if (
      assignees.length === 0 &&
      (action.assignee_type === 'human' || action.assignee_type === 'agent')
    ) {
      const id = String(action.assignee_id ?? '')
      assignees = id ? [{ type: action.assignee_type, id }] : []
    }
    {
      const sanitized: {
        assignees?: AutomationAssignee[]
        assignee_type?: 'human' | 'agent' | 'unassigned'
        assignee_id?: string | null
      } = { assignees }
      await sanitizeAssigneesForWrite(this.repo, ctx.supabase, ctx.userId, ctx.orgId, sanitized)
      assignees = sanitized.assignees ?? []
    }
    const primaryAssignee = assignees[0] ?? null
    const priority =
      typeof action.priority === 'string' && action.priority ? String(action.priority) : undefined

    const emailContext =
      this.emailTriggerContext(templateCtx.event) ?? this.sourceEmailContext(templateCtx.item)
    const fieldValuesRaw =
      action.field_values && typeof action.field_values === 'object'
        ? (action.field_values as Record<string, unknown>)
        : {}

    const mergedFieldValues: Record<string, unknown> = {}
    for (const [key, raw] of Object.entries(fieldValuesRaw)) {
      if (raw === null || raw === undefined) continue
      if (typeof raw === 'string') {
        const rendered = renderTemplate(raw, templateCtx)
        if (rendered.trim() !== '') mergedFieldValues[key] = rendered
      } else if (typeof raw === 'boolean' || typeof raw === 'number') {
        mergedFieldValues[key] = raw
      } else if (Array.isArray(raw)) {
        mergedFieldValues[key] = raw
      }
    }

    const created = (await this.repo.createItem(
      ctx.supabase,
      ctx.userId,
      ctx.spaceId,
      {
        title,
        ...(status ? { status } : {}),
        ...(assignees.length > 0
          ? {
              assignees,
              assignee_type: primaryAssignee?.type ?? 'unassigned',
              assignee_id: primaryAssignee?.id ?? null,
            }
          : {}),
        ...(priority ? { priority: priority as 'low' | 'medium' | 'high' | 'urgent' } : {}),
        ...(description ? { description } : {}),
        custom_data: {
          ...(typeof emailContext?.email === 'string' && emailContext.email
            ? { email: emailContext.email }
            : {}),
          ...mergedFieldValues,
          _automation_created: true,
          ...(ctx.itemId ? { source_item_id: ctx.itemId } : {}),
          ...(emailContext ? { external_email: emailContext } : {}),
        },
      },
      ctx.orgId,
    )) as Record<string, unknown>

    return { item_id: String(created.id), title }
  }

  protected normalizeMaxSuggestions(value: unknown): number {
    const raw = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(raw)) return 10
    return Math.min(20, Math.max(1, Math.floor(raw)))
  }
}
