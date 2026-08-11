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
import { SpaceAutomationServiceBase07 } from './space-automation-service-07.base'
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

const ASYNC_COMPLETION_ACTIONS = new Set(['send_to_agent', 'send_to_agents', 'send_to_cursor'])

/**
 * Actions that are safe to run from an itemless trigger (no source space item).
 * Anything outside this set is rejected at execute time so a stale config that
 * slipped past frontend validation cannot mutate or read a non-existent task.
 */
const ITEMLESS_ALLOWED_ACTION_TYPES = new Set<string>([
  'create_task',
  'agent_suggest_tasks',
  'send_email',
  'send_slack_message',
  'observe_slack_team',
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
  'send_to_agents',
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

export abstract class SpaceAutomationServiceBase08 extends SpaceAutomationServiceBase07 {
  /**
   * Execute a saved automation that has no source space item. Each action is
   * validated against the itemless allow-list
   * before it runs; non-allowed types fail the run with a clear error and are
   * also blocked at publish time (see `space-automation-publishable.ts`).
   */
  async executeAutomationItemless(
    automation: AutomationRule,
    event: TriggerEvent,
    ctx: ItemlessEvalContext,
  ): Promise<void> {
    const space = (await this.repo.findSpaceByIdForAccess(ctx.supabase, ctx.spaceId)) as Record<
      string,
      unknown
    > | null
    if (!space) {
      this.logger.error(
        `Itemless automation "${automation.name}" cannot execute because space ${ctx.spaceId} was not found`,
      )
      return
    }

    const triggerCtx: EvalContext = { ...ctx, itemId: '' }
    let currentCtx: EvalContext = { ...ctx, itemId: '' }
    const actionResults: Record<string, unknown>[] = []
    let item: Record<string, unknown> = {}
    let templateCtx = this.buildItemlessTemplateContext(space, event, actionResults)
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < automation.actions.length; i++) {
      const action = automation.actions[i]
      const start = Date.now()
      const actionType = String(action.type ?? '')
      let targetCtxForActivity = currentCtx
      let targetItemForActivity = item
      let actionFailed = false
      try {
        if (!ITEMLESS_ALLOWED_ACTION_TYPES.has(actionType)) {
          throw new Error(`Action ${actionType} is not allowed for itemless triggers`)
        }
        const target = await this.resolveActionTargetContext(
          action,
          triggerCtx,
          currentCtx,
          templateCtx,
        )
        targetCtxForActivity = target.ctx
        targetItemForActivity = target.item
        const result = await this.executeAction(
          { ...action, automation_timezone: automation.trigger.timezone },
          target.ctx,
          target.item,
          target.templateCtx,
        )
        if (
          result &&
          typeof result === 'object' &&
          typeof (result as { item_id?: unknown }).item_id === 'string'
        ) {
          currentCtx = { ...currentCtx, itemId: (result as { item_id: string }).item_id }
          const loaded = await this.repo.findItemById(
            currentCtx.supabase,
            currentCtx.spaceId,
            currentCtx.itemId,
          )
          if (!loaded) throw new Error('Created task not found after create_task')
          item = loaded as Record<string, unknown>
          templateCtx = await this.buildTemplateContext(
            currentCtx,
            item,
            space,
            event as unknown as Record<string, unknown>,
            actionResults,
          )
        } else {
          templateCtx = {
            ...target.templateCtx,
            steps: this.actionResultsToStepOutputs(actionResults),
          }
        }
        const actionResult = {
          type: actionType,
          result: result ?? 'ok',
          duration_ms: Date.now() - start,
        }
        actionResults.push(actionResult)
        if (targetCtxForActivity.itemId) {
          await this.logAutomationActionActivity(
            targetCtxForActivity,
            automation,
            action,
            actionResult,
            targetItemForActivity,
          )
        }
        templateCtx = {
          ...templateCtx,
          steps: this.actionResultsToStepOutputs(actionResults),
        }
        successCount++
      } catch (err) {
        actionFailed = true
        errorCount++
        const actionResult = {
          type: actionType,
          error: err instanceof Error ? err.message : String(err),
          duration_ms: Date.now() - start,
        }
        actionResults.push(actionResult)
        if (targetCtxForActivity.itemId) {
          await this.logAutomationActionActivity(
            targetCtxForActivity,
            automation,
            action,
            actionResult,
            targetItemForActivity,
          )
        }
        this.logger.error(
          `Itemless automation "${automation.name}" action ${actionType} failed: ${err}`,
        )
      }
      if (actionFailed) break

      const continuation = (action as Record<string, unknown>).continuation as string | undefined
      const completedStatus = String(
        (action as Record<string, unknown>).completed_status ?? '',
      ).trim()
      const isAsyncAgent = ASYNC_COMPLETION_ACTIONS.has(actionType)
      const wantsWait = continuation === 'after_task_completes' || completedStatus.length > 0
      const hasMoreSteps = i < automation.actions.length - 1
      if (isAsyncAgent && wantsWait && (hasMoreSteps || completedStatus.length > 0)) {
        if (!currentCtx.itemId) {
          actionResults.push({
            type: actionType,
            error: 'Itemless agent step needs a created task first',
            duration_ms: Date.now() - start,
          })
          await this.logScheduledRun(
            ctx,
            automation.id,
            event as TriggerEvent,
            actionResults,
            'failed',
          )
          return
        }
        await this.pauseRun(currentCtx, automation.id, event, actionResults, i + 1)
        const status: 'success' | 'partial' | 'failed' =
          errorCount === 0 ? 'success' : successCount > 0 ? 'partial' : 'failed'
        await this.logScheduledRun(ctx, automation.id, event as TriggerEvent, actionResults, status)
        return
      }
    }

    const status: 'success' | 'partial' | 'failed' =
      errorCount === 0 ? 'success' : successCount > 0 ? 'partial' : 'failed'
    await this.logScheduledRun(ctx, automation.id, event as TriggerEvent, actionResults, status)
  }

  protected buildItemlessTemplateContext(
    space: Record<string, unknown>,
    event: TriggerEvent,
    actionResults: Record<string, unknown>[],
  ): TemplateContext {
    return {
      item: {},
      space,
      event: this.normalizeEventForTemplate(event as unknown as Record<string, unknown>),
      steps: this.actionResultsToStepOutputs(actionResults),
      subtasks: [],
      deliverables: [],
      activity: [],
      mission: null,
    }
  }

  protected async logScheduledRun(
    ctx: ItemlessEvalContext,
    automationId: string,
    event: TriggerEvent,
    actionsExecuted: Record<string, unknown>[],
    status: 'success' | 'partial' | 'failed',
  ): Promise<void> {
    const hasError = status !== 'success'
    const actionPayloads = actionsExecuted
      .map((entry) => entry.result)
      .filter((result): result is Record<string, unknown> =>
        Boolean(result && typeof result === 'object'),
      )
    const skippedReason = actionPayloads.find(
      (result) => typeof result.skipped_reason === 'string',
    )?.skipped_reason
    const deliveryOutcomes = actionPayloads.flatMap((result) =>
      Array.isArray(result.delivery_outcomes) ? result.delivery_outcomes : [],
    )
    try {
      await this.automationRunsRepo.insertRun(ctx.supabase, {
        space_id: ctx.spaceId,
        item_id: null,
        automation_id: automationId,
        org_id: ctx.orgId,
        user_id: ctx.userId,
        trigger_event: event as unknown as Record<string, unknown>,
        actions_executed: actionsExecuted,
        status,
        linked_mission_id: null,
        error: hasError ? actionsExecuted.find((a) => a.error)?.error : null,
        skipped_reason: typeof skippedReason === 'string' ? skippedReason : null,
        delivery_outcomes: deliveryOutcomes,
      })
    } catch (err) {
      this.logger.error(`Failed to log scheduled automation run: ${err}`)
    }
  }
}
