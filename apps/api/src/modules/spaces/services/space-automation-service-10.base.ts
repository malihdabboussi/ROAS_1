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
import { SpaceAutomationServiceBase09 } from './space-automation-service-09.base'
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

export abstract class SpaceAutomationServiceBase10 extends SpaceAutomationServiceBase09 {
  protected async execSyncSocialResearch(
    action: Record<string, unknown>,
    ctx: EvalContext,
  ): Promise<Record<string, unknown>> {
    if (!this.socialResearch) throw new Error('Social research service unavailable')
    if (this.normalizeSocialSyncMode(action.sync_mode) === 'resync_30d') {
      await this.assertAutomationCreditsAvailable(ctx)
    }
    return this.socialResearch.syncSocialResearch({
      supabase: ctx.supabase,
      userId: ctx.userId,
      orgId: ctx.orgId,
      spaceId: ctx.spaceId,
      platformSelector: this.normalizeSocialPlatformSelector(action.platform),
      mode: this.normalizeSocialSyncMode(action.sync_mode),
    })
  }

  protected async execSelectSocialOutliers(
    action: Record<string, unknown>,
    ctx: EvalContext,
  ): Promise<Record<string, unknown>> {
    if (!this.socialResearch) throw new Error('Social research service unavailable')
    return this.socialResearch.selectSocialOutliers({
      supabase: ctx.supabase,
      spaceId: ctx.spaceId,
      platformSelector: this.normalizeSocialPlatformSelector(action.platform),
      minScore: this.numberInRange(action.min_outlier_score, 2, 0, 100),
      limit: this.integerInRange(action.limit, 10, 1, 50),
      sinceDays: this.integerInRange(action.since_days, 30, 1, 30),
    })
  }

  protected async execEnrichSocialResearchItems(
    action: Record<string, unknown>,
    ctx: EvalContext,
    templateCtx: TemplateContext,
  ): Promise<Record<string, unknown>> {
    if (!this.socialResearch) throw new Error('Social research service unavailable')
    await this.assertAutomationCreditsAvailable(ctx)
    const itemIds = this.resolveSocialResearchItemIds(action, templateCtx)
    return this.socialResearch.enrichSocialResearchItems({
      supabase: ctx.supabase,
      userId: ctx.userId,
      orgId: ctx.orgId,
      spaceId: ctx.spaceId,
      itemIds,
      enrichments: this.normalizeSocialEnrichments(action.enrichments),
    })
  }

  protected normalizeSocialPlatformSelector(
    value: unknown,
  ): 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'both' | 'all' {
    if (
      value === 'instagram' ||
      value === 'tiktok' ||
      value === 'youtube' ||
      value === 'twitter' ||
      value === 'both' ||
      value === 'all'
    ) {
      return value
    }
    return 'all'
  }

  protected normalizeSocialSyncMode(value: unknown): 'use_existing' | 'resync_30d' {
    if (value === 'use_existing' || value === 'resync_30d') return value
    return 'use_existing'
  }

  protected normalizeSocialEnrichments(value: unknown): Array<'caption' | 'hook' | 'transcript'> {
    if (!Array.isArray(value) || value.length === 0) return ['caption']
    const allowed = new Set(['caption', 'hook', 'transcript'])
    const out = value.filter(
      (v): v is 'caption' | 'hook' | 'transcript' => typeof v === 'string' && allowed.has(v),
    )
    if (out.length === 0) return ['caption']
    return out
  }

  protected resolveSocialResearchItemIds(
    action: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): string[] {
    const sourceStep = String(action.source_step ?? '').trim()
    if (sourceStep) {
      const rendered = renderTemplate(sourceStep, templateCtx).trim()
      const match = /^steps\.(\d+)\./.exec(rendered)
      const stepIndex = match ? Number(match[1]) - 1 : Number(rendered) - 1
      const step = templateCtx.steps?.[stepIndex] as Record<string, unknown> | undefined
      const ids = step?.selected_item_ids
      if (Array.isArray(ids) && ids.every((id) => typeof id === 'string')) {
        return ids as string[]
      }
    }
    const steps = templateCtx.steps ?? []
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i] as Record<string, unknown>
      const ids = step?.selected_item_ids
      if (Array.isArray(ids) && ids.length > 0 && ids.every((id) => typeof id === 'string')) {
        return ids as string[]
      }
    }
    throw new Error('No selected social research items found')
  }

  protected async resolveAgentBrainIdFromKey(
    ctx: EvalContext,
    agentKey: string,
  ): Promise<string | null> {
    try {
      return await this.automationActionsRepo.findAgentBrainId(ctx.supabase, {
        agentKey,
        userId: ctx.userId,
        orgId: ctx.orgId,
      })
    } catch (error) {
      throw new Error(
        `Failed to resolve agent brain: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  protected async execIngestYoutubeChannelToAgentBrain(
    action: Record<string, unknown>,
    ctx: EvalContext,
  ): Promise<Record<string, unknown>> {
    if (!this.scrapeCreatorsApi) throw new Error('ScrapeCreatorsApiService not configured')
    if (!this.brainImportJobs) throw new Error('BrainImportJobsService not configured')

    await this.assertAutomationCreditsAvailable(ctx)

    let brainId = String(action.brain_id ?? '').trim()
    if (!brainId) {
      const agentKey = String(action.agent_key ?? '').trim()
      if (!agentKey) throw new Error('agent_key or brain_id is required')
      brainId = (await this.resolveAgentBrainIdFromKey(ctx, agentKey)) ?? ''
      if (!brainId) throw new Error(`No agent brain found for agent "${agentKey}"`)
    }

    const channels = this.normalizeYoutubeBrainChannels(action.channel_urls)
    if (channels.length === 0) throw new Error('At least one YouTube channel URL is required')

    const sinceDays = this.integerInRange(action.since_days, 7, 1, 30)
    const maxVideosPerChannel = this.integerInRange(action.max_videos_per_channel, 25, 1, 200)
    const includeShorts = action.include_shorts === true
    const domain = this.normalizeBrainImportDomain(action.domain)
    const cutoffMs = Date.now() - sinceDays * 86_400_000

    const queuedJobIds: string[] = []
    const videos: Array<{
      channel: string
      title: string
      url: string
      published_at: string | null
      job_id: string
      deduped: boolean
    }> = []

    for (const channel of channels) {
      const channelVideos = await this.fetchRecentYoutubeChannelVideosForBrain(
        ctx,
        channel,
        cutoffMs,
        maxVideosPerChannel,
        includeShorts,
      )
      for (const video of channelVideos) {
        const url = this.youtubeVideoUrl(video)
        if (!url) continue
        const title = String(video.title ?? '').trim() || `YouTube video: ${url}`
        const publishedAt = this.parseYoutubePublishedAt(video.publishedTime ?? video.publishDate)
        const job = await this.brainImportJobs.enqueueSkLinkIngest(
          ctx.userId,
          {
            brainId,
            url,
            sourceType: 'youtube_video',
            title: `${channel.label}: ${title}`,
            domain,
          },
          ctx.orgId,
        )
        queuedJobIds.push(job.jobId)
        videos.push({
          channel: channel.label,
          title,
          url,
          published_at: publishedAt ? publishedAt.toISOString() : null,
          job_id: job.jobId,
          deduped: job.deduped === true,
        })
      }
    }

    return {
      queued_count: queuedJobIds.length,
      video_count: videos.length,
      job_ids: queuedJobIds,
      channels: channels.map((channel) => channel.label),
      videos,
      digest:
        videos.length === 0
          ? `No recent long-form YouTube videos found in the last ${sinceDays} days.`
          : videos.map((video) => `- ${video.channel}: ${video.title} (${video.url})`).join('\n'),
    }
  }

  protected normalizeYoutubeBrainChannels(value: unknown): AutomationYoutubeChannelInput[] {
    if (!Array.isArray(value)) return []
    const out: AutomationYoutubeChannelInput[] = []
    const seen = new Set<string>()
    for (const rawValue of value.slice(0, MAX_YOUTUBE_BRAIN_CHANNELS)) {
      const raw = String(rawValue ?? '').trim()
      if (!raw) continue
      const parsed = this.parseYoutubeChannelInput(raw)
      const dedupe = parsed.channelId ? `channel:${parsed.channelId}` : `handle:${parsed.handle}`
      if (seen.has(dedupe)) continue
      seen.add(dedupe)
      out.push(parsed)
    }
    return out
  }

  protected parseYoutubeChannelInput(raw: string): AutomationYoutubeChannelInput {
    try {
      const candidate = raw.startsWith('http')
        ? raw
        : `https://www.youtube.com/${raw.startsWith('@') ? raw : `@${raw}`}`
      const url = new URL(candidate)
      const parts = url.pathname.split('/').filter(Boolean)
      const channelIndex = parts.findIndex((part) => part === 'channel')
      if (channelIndex >= 0 && parts[channelIndex + 1]?.startsWith('UC')) {
        const channelId = parts[channelIndex + 1]
        return { raw, channelId, label: channelId }
      }
      const handlePart = parts.find((part) => part.startsWith('@'))
      if (handlePart) {
        const handle = handlePart.replace(/^@/, '').trim()
        if (handle) return { raw, handle, label: `@${handle}` }
      }
    } catch {
      // Fall back to raw handle parsing below.
    }

    const channelMatch = raw.match(/^(UC[a-zA-Z0-9_-]{10,})$/)
    if (channelMatch?.[1]) {
      return { raw, channelId: channelMatch[1], label: channelMatch[1] }
    }

    const handleMatch = raw.match(/^@?([a-zA-Z0-9._-]{2,})$/)
    const handle = handleMatch?.[1]?.replace(/^@/, '').trim()
    if (!handle) throw new Error(`Invalid YouTube channel URL or handle: ${raw}`)
    return { raw, handle, label: `@${handle}` }
  }
}
