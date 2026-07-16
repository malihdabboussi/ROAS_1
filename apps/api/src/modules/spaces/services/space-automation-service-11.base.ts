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
import { SpaceAutomationServiceBase10 } from './space-automation-service-10.base'
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

export abstract class SpaceAutomationServiceBase11 extends SpaceAutomationServiceBase10 {
  protected async fetchRecentYoutubeChannelVideosForBrain(
    ctx: EvalContext,
    channel: AutomationYoutubeChannelInput,
    cutoffMs: number,
    maxVideos: number,
    includeShorts: boolean,
  ): Promise<AutomationYoutubeChannelVideo[]> {
    const collected: AutomationYoutubeChannelVideo[] = []
    let continuationToken: string | undefined

    for (let page = 0; page < MAX_YOUTUBE_BRAIN_PAGES; page++) {
      const query: Record<string, string> = channel.channelId
        ? { channelId: channel.channelId }
        : { handle: channel.handle ?? channel.raw.replace(/^@/, '') }
      if (continuationToken) query.continuationToken = continuationToken

      const body = await this.runScrapeCreatorsAutomationAction(
        ctx,
        'youtube_channel_videos',
        YOUTUBE_CHANNEL_VIDEOS_PATH,
        query,
      )
      const payload = this.unwrapAutomationYoutubePayload(body)
      let stoppedByDate = false

      for (const video of payload.videos) {
        const publishedAt = this.parseYoutubePublishedAt(video.publishedTime ?? video.publishDate)
        if (publishedAt && publishedAt.getTime() < cutoffMs) {
          stoppedByDate = true
          break
        }
        if (!publishedAt) continue
        if (!includeShorts && this.isYoutubeShortOrClip(video)) continue
        collected.push(video)
        if (collected.length >= maxVideos) return collected
      }

      if (stoppedByDate || !payload.continuationToken || payload.videos.length === 0) break
      continuationToken = payload.continuationToken
    }

    return collected
  }

  protected async runScrapeCreatorsAutomationAction(
    ctx: EvalContext,
    actionSlug: string,
    upstreamPath: string,
    query: Record<string, string>,
  ): Promise<unknown> {
    if (!this.scrapeCreatorsApi) throw new Error('ScrapeCreatorsApiService not configured')
    const { status, body } = await this.scrapeCreatorsApi.forwardGet(upstreamPath, query)
    if (status < 200 || status >= 300) {
      const msg =
        typeof body === 'object' && body !== null && 'message' in body
          ? String((body as { message?: unknown }).message)
          : typeof body === 'string'
            ? body
            : `ScrapeCreators error (${status})`
      throw new Error(msg)
    }

    if (this.creditsService) {
      const creditUnits = scrapecreatorsCreditsForAction(actionSlug)
      await this.creditsService.processDirectTextUsage({
        userId: ctx.userId,
        orgId: ctx.orgId ?? undefined,
        feature: 'scrapecreators',
        action: actionSlug,
        modelName: `scrapecreators/${actionSlug}`,
        usage: {
          input: creditUnits,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: creditUnits,
        },
        costSource: 'scrapecreators_flat',
      })
    }

    return body
  }

  protected unwrapAutomationYoutubePayload(body: unknown): {
    videos: AutomationYoutubeChannelVideo[]
    continuationToken?: string
  } {
    const root = this.objectRecord(body)
    const data = this.objectRecord(root.data ?? root.response ?? body)
    const payload = this.objectRecord(data.data ?? data)
    const videos = Array.isArray(payload.videos)
      ? (payload.videos as AutomationYoutubeChannelVideo[])
      : []
    const continuationToken =
      typeof payload.continuationToken === 'string' ? payload.continuationToken : undefined
    return { videos, continuationToken }
  }

  protected youtubeVideoUrl(video: AutomationYoutubeChannelVideo): string | null {
    const explicit = String(video.url ?? '').trim()
    if (explicit && !explicit.includes('/shorts/')) return explicit
    const id = String(video.id ?? '').trim()
    return id ? `https://www.youtube.com/watch?v=${id}` : null
  }

  protected isYoutubeShortOrClip(video: AutomationYoutubeChannelVideo): boolean {
    const url = String(video.url ?? '').toLowerCase()
    const type = String(video.type ?? '').toLowerCase()
    if (url.includes('/shorts/') || type.includes('short')) return true
    const seconds =
      typeof video.lengthSeconds === 'number'
        ? video.lengthSeconds
        : typeof video.lengthInSeconds === 'number'
          ? video.lengthInSeconds
          : typeof video.durationMs === 'number'
            ? Math.round(video.durationMs / 1000)
            : null
    return seconds != null && seconds < MIN_LONG_FORM_SECONDS
  }

  protected parseYoutubePublishedAt(value: unknown): Date | null {
    if (typeof value !== 'string') return null
    const text = value.trim()
    if (!text) return null

    const parsed = Date.parse(text)
    if (Number.isFinite(parsed)) return new Date(parsed)

    const normalized = text
      .toLowerCase()
      .replace(/^(streamed|premiered|published)\s+/, '')
      .trim()
    const match = normalized.match(/(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/)
    if (!match) return null
    const amount = Number(match[1])
    const unit = match[2]
    const dayMs = 86_400_000
    const multiplier =
      unit === 'minute'
        ? 60_000
        : unit === 'hour'
          ? 3_600_000
          : unit === 'day'
            ? dayMs
            : unit === 'week'
              ? 7 * dayMs
              : unit === 'month'
                ? 30 * dayMs
                : 365 * dayMs
    return new Date(Date.now() - amount * multiplier)
  }

  protected normalizeBrainImportDomain(
    value: unknown,
  ): 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general' {
    if (
      value === 'strategy' ||
      value === 'marketing' ||
      value === 'finance' ||
      value === 'operations' ||
      value === 'creative' ||
      value === 'general'
    ) {
      return value
    }
    return 'strategy'
  }

  protected buildBrainSearchQuery(
    action: Record<string, unknown>,
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): string {
    const explicitTemplate = String(action.query_template ?? '').trim()
    if (explicitTemplate) return renderTemplate(explicitTemplate, templateCtx).trim()
    const title = String(item.title ?? '').trim()
    const description = String(item.description ?? item.notes ?? '').trim()
    return [title, description].filter(Boolean).join('\n\n').slice(0, 2000)
  }

  protected async searchBrainContext(
    ctx: EvalContext,
    query: string,
    agentKey?: string,
  ): Promise<Array<{ source: string; title: string; content: string }>> {
    if (!query.trim()) return []
    const results: Array<{ source: string; title: string; content: string }> = []

    if (this.brainSearch) {
      const pushSearch = async (
        source: string,
        input: { brainId?: string; agentId?: string },
      ): Promise<void> => {
        try {
          const found = await this.brainSearch!.search(ctx.supabase, ctx.userId, {
            query,
            mode: 'hybrid',
            limit: 4,
            orgId: ctx.orgId,
            ...input,
          })
          for (const row of found.results.slice(0, 4)) {
            results.push({
              source,
              title: row.name || row.type || source,
              content: this.brainResultContent(row),
            })
          }
        } catch (err) {
          this.logger.warn(`Brain context search failed for ${source}: ${err}`)
        }
      }

      await pushSearch('User Brain', {})
      if (agentKey?.trim()) await pushSearch('Agent Brain', { agentId: agentKey.trim() })

      const customerBrainId = await this.resolveScopedBrainId(ctx, 'customer')
      if (customerBrainId) await pushSearch('Customer Brain', { brainId: customerBrainId })
    }

    const companyResults = await this.searchCompanyCortexContext(ctx, query)
    results.push(...companyResults)

    const seen = new Set<string>()
    return results
      .filter((item) => {
        const key = `${item.source}:${item.title}:${item.content.slice(0, 120)}`
        if (seen.has(key)) return false
        seen.add(key)
        return item.content.trim().length > 0
      })
      .slice(0, 12)
  }

  protected brainResultContent(row: ScoredSnapshot): string {
    return String(row.content ?? row.core ?? '')
      .trim()
      .slice(0, 900)
  }

  protected async resolveScopedBrainId(
    ctx: EvalContext,
    scope: 'customer',
  ): Promise<string | null> {
    try {
      return await this.automationActionsRepo.findScopedBrainId(ctx.supabase, {
        scope,
        userId: ctx.userId,
        orgId: ctx.orgId,
      })
    } catch (error) {
      this.logger.warn(
        `Failed to resolve ${scope} brain: ${error instanceof Error ? error.message : String(error)}`,
      )
      return null
    }
  }
}
