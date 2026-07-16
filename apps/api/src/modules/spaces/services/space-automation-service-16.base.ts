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
import { SpaceAutomationServiceBase15 } from './space-automation-service-15.base'
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

export abstract class SpaceAutomationServiceBase16 extends SpaceAutomationServiceBase15 {
  protected async execSendChannelMessage(
    action: Record<string, unknown>,
    ctx: EvalContext,
    templateCtx: TemplateContext,
  ): Promise<null> {
    if (!this.channelsRepo) throw new Error('Channels repository is not available')
    const channelId = String(action.channel_id ?? '').trim()
    const content = renderTemplate(String(action.content_template ?? ''), templateCtx)
    await this.channelsRepo.createMessage(ctx.supabase, {
      channel_id: channelId,
      sender_type: 'system',
      sender_id: 'automation',
      content,
      content_blocks: null,
      metadata: {
        automation: true,
        space_id: ctx.spaceId,
        ...(ctx.itemId ? { item_id: ctx.itemId } : {}),
      },
    })
    return null
  }

  protected async execCreateContact(
    action: Record<string, unknown>,
    ctx: EvalContext,
    templateCtx: TemplateContext,
  ): Promise<Record<string, unknown>> {
    const email = renderTemplate(String(action.email_template ?? ''), templateCtx)
      .trim()
      .toLowerCase()
    const name = renderTemplate(String(action.name_template ?? ''), templateCtx).trim()
    const [firstName, ...rest] = name.split(/\s+/).filter(Boolean)

    // contact_source is constrained to the channel enum; arbitrary action sources go to detail.
    const rawSource = String(action.source ?? '').trim()
    const baseInsert: Record<string, unknown> = {
      user_id: ctx.userId,
      org_id: ctx.orgId,
      email: email || null,
      first_name: firstName || null,
      last_name: rest.join(' ') || null,
      source: rawSource || 'automation',
      contact_source: isContactChannel(rawSource) ? rawSource : 'automation',
      contact_source_detail: rawSource && !isContactChannel(rawSource) ? rawSource : null,
      tags: [],
    }
    if (action.field_values && typeof action.field_values === 'object') {
      for (const [fieldId, raw] of Object.entries(action.field_values as Record<string, unknown>)) {
        if (typeof raw !== 'string' || raw.trim() === '') continue
        const rendered = renderTemplate(raw, templateCtx).trim()
        if (rendered === '') continue
        baseInsert[fieldId] = rendered
      }
    }
    const contact = await this.automationActionsRepo.createContact(ctx.supabase, baseInsert)
    return {
      contact_id: String(contact.id ?? ''),
      email: String(contact.email ?? email),
      name:
        [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim() ||
        name ||
        String(contact.email ?? email),
    }
  }

  protected resolveContactId(
    action: Record<string, unknown>,
    item: Record<string, unknown>,
    templateCtx?: TemplateContext,
  ): string {
    const direct = templateCtx
      ? renderTemplate(String(action.contact_id ?? ''), templateCtx).trim()
      : String(action.contact_id ?? '').trim()
    if (direct) return direct
    const custom = this.objectRecord(item.custom_data)
    return String(custom.contact_id ?? custom.contact ?? '').trim()
  }

  protected async readContactTags(ctx: EvalContext, contactId: string): Promise<string[]> {
    return this.automationActionsRepo.readContactTags(ctx.supabase, contactId)
  }

  protected async execUpdateContactField(
    action: Record<string, unknown>,
    ctx: EvalContext,
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): Promise<null> {
    const contactId = this.resolveContactId(action, item, templateCtx)
    const fieldId = String(action.field_id ?? '').trim()
    const value = renderTemplate(String(action.value_template ?? ''), templateCtx)
    await this.automationActionsRepo.updateContact(ctx.supabase, contactId, { [fieldId]: value })
    return null
  }

  protected async execAddContactTag(
    action: Record<string, unknown>,
    ctx: EvalContext,
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): Promise<null> {
    const contactId = this.resolveContactId(action, item, templateCtx)
    const tag = String(action.tag ?? '').trim()
    const tags = await this.readContactTags(ctx, contactId)
    const nextTags = tags.includes(tag) ? tags : [...tags, tag]
    await this.automationActionsRepo.updateContact(ctx.supabase, contactId, { tags: nextTags })
    return null
  }

  protected async execRemoveContactTag(
    action: Record<string, unknown>,
    ctx: EvalContext,
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): Promise<null> {
    const contactId = this.resolveContactId(action, item, templateCtx)
    const tag = String(action.tag ?? '').trim()
    const tags = await this.readContactTags(ctx, contactId)
    const nextTags = tags.filter((existing) => existing !== tag)
    await this.automationActionsRepo.updateContact(ctx.supabase, contactId, { tags: nextTags })
    return null
  }

  protected async execAttachNoteToContact(
    action: Record<string, unknown>,
    ctx: EvalContext,
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): Promise<null> {
    const contactId = this.resolveContactId(action, item, templateCtx)
    const content = renderTemplate(String(action.content_template ?? ''), templateCtx)
    await this.automationActionsRepo.insertContactNote(ctx.supabase, {
      contact_id: contactId,
      user_id: ctx.userId,
      org_id: ctx.orgId,
      content,
    })
    return null
  }

  protected async execLinkItemToContact(
    action: Record<string, unknown>,
    ctx: EvalContext,
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): Promise<null> {
    const contactId = this.resolveContactId(action, item, templateCtx)
    await this.repo.updateItem(
      ctx.supabase,
      ctx.userId,
      ctx.spaceId,
      ctx.itemId,
      { custom_data: { contact_id: contactId } },
      ctx.orgId,
    )
    return null
  }

  protected artifactTable(kind: unknown): string {
    const table = ARTIFACT_TABLE_BY_KIND[String(kind ?? '')]
    if (!table) throw new Error(`Unsupported artifact kind: ${String(kind ?? '')}`)
    return table
  }

  protected artifactTitleColumn(
    kind: string,
  ): 'name' | 'title' | 'headline' | 'caption' | 'subject' {
    if (kind === 'ad') return 'headline'
    if (kind === 'social_post') return 'caption'
    if (kind === 'form') return 'name'
    if (kind === 'email') return 'subject'
    return 'name'
  }

  protected async execCreateArtifact(
    action: Record<string, unknown>,
    ctx: EvalContext,
    templateCtx: TemplateContext,
  ): Promise<null> {
    const kind = String(action.artifact_kind ?? '')
    const table = this.artifactTable(kind)
    const titleColumn = this.artifactTitleColumn(kind)
    const title = renderTemplate(String(action.title_template ?? 'Untitled'), templateCtx)
    const payload: Record<string, unknown> = {
      user_id: ctx.userId,
      org_id: ctx.orgId,
      [titleColumn]: title,
      status: 'draft',
    }
    const campaignId = String(action.campaign_id ?? templateCtx.space.campaign_id ?? '').trim()
    if (campaignId) payload.campaign_id = campaignId
    if (kind === 'email') {
      payload.body = ''
      payload.space_id = ctx.spaceId
      if (ctx.itemId) payload.source_item_id = ctx.itemId
      payload.created_by = ctx.userId
    }
    if (kind === 'presentation') payload.slides = []
    if (kind === 'social_post') {
      payload.platform = String(action.platform ?? 'linkedin')
      payload.post_type = String(action.post_type ?? 'text_only')
    }
    await this.automationActionsRepo.createArtifact(ctx.supabase, table, payload)
    return null
  }

  protected async execSetArtifactStatus(
    action: Record<string, unknown>,
    ctx: EvalContext,
    status: 'published' | 'draft',
  ): Promise<null> {
    const table = this.artifactTable(action.artifact_kind)
    const artifactId = String(action.artifact_id ?? '').trim()
    await this.automationActionsRepo.updateArtifactStatus(ctx.supabase, table, artifactId, status)
    return null
  }

  protected async execAskAgentToImproveArtifact(
    action: Record<string, unknown>,
    ctx: EvalContext,
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): Promise<null> {
    const artifactKind = String(action.artifact_kind ?? '')
    const artifactId = String(action.artifact_id ?? '').trim()
    const prompt = renderTemplate(String(action.prompt_template ?? ''), templateCtx)
    return this.execSendToAgent(
      {
        type: 'send_to_agent',
        agent_key: action.agent_key,
        prompt_template: `Improve ${artifactKind} ${artifactId}.\n\n${prompt}`,
      },
      ctx,
      item,
      templateCtx,
    )
  }
}
