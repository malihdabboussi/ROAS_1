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
import { SpaceAutomationServiceBase14 } from './space-automation-service-14.base'
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

export abstract class SpaceAutomationServiceBase15 extends SpaceAutomationServiceBase14 {
  protected async execAssignTo(action: Record<string, unknown>, ctx: EvalContext): Promise<null> {
    const oldItem = await this.repo.findItemById(ctx.supabase, ctx.spaceId, ctx.itemId)
    const oldAssignees = this.itemAssignees(oldItem as Record<string, unknown> | null)
    const actionAssignees = this.normalizeAssignees(action.assignees)
    let newAssignees: AutomationAssignee[] = actionAssignees
    if (
      newAssignees.length === 0 &&
      (action.assignee_type === 'human' || action.assignee_type === 'agent')
    ) {
      const id = String(action.assignee_id ?? '')
      newAssignees = id ? [{ type: action.assignee_type, id }] : []
    }
    {
      const sanitized: {
        assignees?: AutomationAssignee[]
        assignee_type?: 'human' | 'agent' | 'unassigned'
        assignee_id?: string | null
      } = { assignees: newAssignees }
      await sanitizeAssigneesForWrite(this.repo, ctx.supabase, ctx.userId, ctx.orgId, sanitized)
      newAssignees = sanitized.assignees ?? []
    }
    const primary = newAssignees[0] ?? null

    await this.repo.updateItem(
      ctx.supabase,
      ctx.userId,
      ctx.spaceId,
      ctx.itemId,
      {
        assignees: newAssignees,
        assignee_type: primary?.type ?? 'unassigned',
        assignee_id: primary?.id ?? null,
      },
      ctx.orgId,
    )

    if (!this.assigneesEqual(oldAssignees, newAssignees)) {
      const diff = this.assigneeDiff(oldAssignees, newAssignees)
      await this.evaluate(
        {
          type: 'assignee_changed',
          from_type: oldAssignees[0]?.type ?? 'unassigned',
          from_id: oldAssignees[0]?.id,
          to_type: primary?.type ?? 'unassigned',
          to_id: primary?.id,
          from_assignees: oldAssignees,
          to_assignees: newAssignees,
          added_assignees: diff.added,
          removed_assignees: diff.removed,
        },
        { ...ctx, depth: ctx.depth + 1 },
      )
    }

    return null
  }

  protected async execHumanGate(
    action: Record<string, unknown>,
    ctx: EvalContext,
    templateCtx: TemplateContext,
  ): Promise<{ waiting: true; gate_paused_at: string }> {
    const waitingStatus = String(action.waiting_status ?? 'in_review').trim() || 'in_review'
    const messageTemplate = String(action.message_template ?? '').trim()
    const hasAssignees =
      this.normalizeAssignees(action.assignees).length > 0 ||
      ((action.assignee_type === 'human' || action.assignee_type === 'agent') &&
        String(action.assignee_id ?? '').trim().length > 0)

    if (hasAssignees) {
      await this.execAssignTo(action, ctx)
    }

    await this.repo.updateItem(
      ctx.supabase,
      ctx.userId,
      ctx.spaceId,
      ctx.itemId,
      {
        status: waitingStatus,
      },
      ctx.orgId,
    )

    if (messageTemplate) {
      await this.execAddComment(
        { type: 'add_comment', message_template: messageTemplate },
        ctx,
        templateCtx,
      )
    }

    return { waiting: true, gate_paused_at: new Date().toISOString() }
  }

  protected async execChangeStatus(
    action: Record<string, unknown>,
    ctx: EvalContext,
  ): Promise<null> {
    const newStatus = String(action.status)
    const oldItem = await this.repo.findItemById(ctx.supabase, ctx.spaceId, ctx.itemId)
    const oldStatus = (oldItem as Record<string, unknown> | null)?.status as string | undefined

    await this.repo.updateItem(
      ctx.supabase,
      ctx.userId,
      ctx.spaceId,
      ctx.itemId,
      {
        status: newStatus as 'todo' | 'in_progress' | 'in_review' | 'done',
      },
      ctx.orgId,
    )

    if (oldStatus && oldStatus !== newStatus) {
      await this.evaluate(
        { type: 'status_change', from: oldStatus, to: newStatus },
        { ...ctx, depth: ctx.depth + 1 },
      )
    }

    return null
  }

  protected async execChangePriority(
    action: Record<string, unknown>,
    ctx: EvalContext,
  ): Promise<null> {
    const newPriority = String(action.priority) as 'low' | 'medium' | 'high' | 'urgent'
    const oldItem = await this.repo.findItemById(ctx.supabase, ctx.spaceId, ctx.itemId)
    const oldPriority = (oldItem as Record<string, unknown> | null)?.priority as string | undefined

    await this.repo.updateItem(
      ctx.supabase,
      ctx.userId,
      ctx.spaceId,
      ctx.itemId,
      { priority: newPriority },
      ctx.orgId,
    )

    if (oldPriority && oldPriority !== newPriority) {
      await this.evaluate(
        {
          type: 'priority_changed',
          from: oldPriority,
          to: newPriority,
        } as TriggerEvent,
        { ...ctx, depth: ctx.depth + 1 },
      )
    }

    return null
  }

  protected async execAddComment(
    action: Record<string, unknown>,
    ctx: EvalContext,
    templateCtx: TemplateContext,
  ): Promise<null> {
    const message = renderTemplate(String(action.message_template ?? ''), templateCtx)
    await this.repo.createActivity(ctx.supabase, {
      item_id: ctx.itemId,
      space_id: ctx.spaceId,
      user_id: ctx.userId,
      org_id: ctx.orgId,
      event_type: 'automation_comment',
      payload: { message, automation: true },
    })
    return null
  }

  protected async execCreateSubtask(
    action: Record<string, unknown>,
    ctx: EvalContext,
    templateCtx: TemplateContext,
  ): Promise<null> {
    const title = renderTemplate(String(action.title_template ?? ''), templateCtx)
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
    const primary = assignees[0] ?? null
    await this.repo.createItem(
      ctx.supabase,
      ctx.userId,
      ctx.spaceId,
      {
        title,
        parent_item_id: ctx.itemId,
        assignees,
        assignee_type: primary?.type ?? 'unassigned',
        assignee_id: primary?.id ?? null,
      },
      ctx.orgId,
    )
    return null
  }

  protected async execSendEmail(
    action: Record<string, unknown>,
    ctx: EvalContext,
    templateCtx: TemplateContext,
  ): Promise<null> {
    const toolSlug = String(action.tool_slug ?? '').trim()
    const connectedAccountId = String(action.connected_account_id ?? '').trim()
    const to = renderTemplate(String(action.to ?? ''), templateCtx).trim()
    const artifactEmail =
      action.subject_source === 'artifact'
        ? await this.resolveEmailArtifactForSend(action, ctx, templateCtx)
        : null
    const subject = artifactEmail
      ? String(artifactEmail.subject ?? '')
      : renderTemplate(String(action.subject_template ?? ''), templateCtx)
    const body = artifactEmail
      ? String(artifactEmail.body ?? '')
      : renderTemplate(String(action.body_template ?? ''), templateCtx)
    const bodyHasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(body)
    const bodyHasMarkdownBold = /\*\*[^*]+\*\*/.test(body)
    const bodyHasMarkdownList = /(^|\n)\s*[-*]\s+\S/.test(body)
    const shouldSendHtml = bodyHasHtmlTags || bodyHasMarkdownBold || bodyHasMarkdownList
    const outboundBody = shouldSendHtml && !bodyHasHtmlTags ? emailMarkdownToHtml(body) : body
    try {
      const result = await this.composio.executeTool(
        toolSlug,
        ctx.userId,
        { to, subject, body: outboundBody, is_html: shouldSendHtml },
        connectedAccountId,
      )
      const resultRecord = this.objectRecord(result)
      const successful = resultRecord.successful ?? resultRecord.success
      if (successful === false) {
        const errorValue =
          resultRecord.error ?? resultRecord.message ?? 'Email provider returned failure'
        throw new Error(typeof errorValue === 'string' ? errorValue : JSON.stringify(errorValue))
      }
    } catch (err) {
      throw err
    }
    return null
  }

  protected async resolveEmailArtifactForSend(
    action: Record<string, unknown>,
    ctx: EvalContext,
    templateCtx: TemplateContext,
  ): Promise<Record<string, unknown>> {
    const explicitId = String(action.email_artifact_id ?? '').trim()
    const linkedArtifact = this.objectRecord(
      this.objectRecord(templateCtx.item).custom_data,
    ).artifact
    const linked =
      linkedArtifact && typeof linkedArtifact === 'object' && !Array.isArray(linkedArtifact)
        ? (linkedArtifact as Record<string, unknown>)
        : null
    const linkedId =
      linked?.kind === 'email' && typeof linked.id === 'string' ? String(linked.id).trim() : ''
    const artifactId = explicitId || linkedId
    if (!artifactId) {
      throw new Error('No email artifact is linked to this task')
    }

    const data = await this.automationActionsRepo.findEmailArtifactForSend(ctx.supabase, artifactId)
    if (!data) throw new Error('Email artifact not found')
    return data
  }

  protected async execSendSlackMessage(
    action: Record<string, unknown>,
    ctx: EvalContext,
    templateCtx: TemplateContext,
  ): Promise<null> {
    if (!this.slackTools) throw new Error('Slack tools service is not available')
    const channelId = String(action.channel_id ?? '').trim()
    const text = renderTemplate(String(action.text_template ?? ''), templateCtx)
    const threadTs = String(action.thread_ts ?? '').trim() || undefined
    await this.slackTools.sendMessage(ctx.supabase, ctx.userId, ctx.orgId, {
      channel_id: channelId,
      text,
      thread_ts: threadTs,
    })
    return null
  }
}
