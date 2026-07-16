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
import { SpaceAutomationServiceBase06 } from './space-automation-service-06.base'
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

export abstract class SpaceAutomationServiceBase07 extends SpaceAutomationServiceBase06 {
  // -------------------------------------------------------------------------
  // Execution
  // -------------------------------------------------------------------------

  protected async executeAutomation(
    automation: AutomationRule,
    event: TriggerEvent,
    ctx: EvalContext,
    space: Record<string, unknown>,
    startFromIndex = 0,
    priorResults: Record<string, unknown>[] = [],
    runContext: Record<string, unknown> = {},
  ): Promise<string | null> {
    const triggerCtx = { ...ctx }
    let currentCtx = { ...ctx }
    const actionResults: Record<string, unknown>[] = [...priorResults]
    const activeRunContext = { ...runContext }

    let item: Record<string, unknown>
    let templateCtx: TemplateContext
    if (currentCtx.itemId) {
      const loaded = await this.repo.findItemById(
        currentCtx.supabase,
        currentCtx.spaceId,
        currentCtx.itemId,
      )
      if (!loaded) return null
      item = loaded as Record<string, unknown>
      templateCtx = await this.buildTemplateContext(
        currentCtx,
        item,
        space,
        event as unknown as Record<string, unknown>,
        actionResults,
        activeRunContext,
      )
    } else {
      item = {}
      templateCtx = this.buildItemlessTemplateContext(space, event, actionResults)
      templateCtx = { ...templateCtx, run: activeRunContext }
    }
    let successCount = priorResults.filter((r) => !r.error).length
    let errorCount = priorResults.filter((r) => !!r.error).length

    for (let i = startFromIndex; i < automation.actions.length; i++) {
      const action = automation.actions[i]
      const start = Date.now()
      let targetCtxForActivity = currentCtx
      let targetItemForActivity = item as Record<string, unknown>
      try {
        const target = await this.resolveActionTargetContext(
          action,
          triggerCtx,
          currentCtx,
          templateCtx,
        )
        targetCtxForActivity = target.ctx
        targetItemForActivity = target.item
        target.templateCtx = { ...target.templateCtx, run: activeRunContext }
        const result = await this.executeAction(action, target.ctx, target.item, target.templateCtx, i)
        if (
          result &&
          typeof result === 'object' &&
          typeof (result as { item_id?: unknown }).item_id === 'string'
        ) {
          currentCtx = { ...currentCtx, itemId: (result as { item_id: string }).item_id }
          item = await this.repo.findItemById(
            currentCtx.supabase,
            currentCtx.spaceId,
            currentCtx.itemId,
          )
          if (!item) return null
          templateCtx = await this.buildTemplateContext(
            currentCtx,
            item as Record<string, unknown>,
            space,
            event as unknown as Record<string, unknown>,
            actionResults,
            activeRunContext,
          )
        } else {
          templateCtx = {
            ...templateCtx,
            steps: this.actionResultsToStepOutputs(actionResults),
            run: activeRunContext,
          }
        }
        const durationMs = Date.now() - start
        const actionResult = {
          type: action.type,
          result: result ?? 'ok',
          duration_ms: durationMs,
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
          run: activeRunContext,
        }
        successCount++

        if (
          result &&
          typeof result === 'object' &&
          typeof (result as { loop_jump?: unknown }).loop_jump === 'number'
        ) {
          const jumpIndex = (result as { loop_jump: number }).loop_jump
          if (Number.isInteger(jumpIndex) && jumpIndex >= 0 && jumpIndex < automation.actions.length) {
            i = jumpIndex - 1
            continue
          }
        }
        if (
          result &&
          typeof result === 'object' &&
          typeof (result as { branch_jump?: unknown }).branch_jump === 'number'
        ) {
          const jumpIndex = (result as { branch_jump: number }).branch_jump
          if (Number.isInteger(jumpIndex) && jumpIndex >= 0 && jumpIndex < automation.actions.length) {
            i = jumpIndex - 1
            continue
          }
        }
      } catch (err) {
        const durationMs = Date.now() - start
        errorCount++
        const actionResult = {
          type: action.type,
          error: err instanceof Error ? err.message : String(err),
          duration_ms: durationMs,
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
        this.logger.error(`Automation "${automation.name}" action ${action.type} failed: ${err}`)
      }

      const continuation = (action as Record<string, unknown>).continuation as string | undefined
      const completedStatus = String(
        (action as Record<string, unknown>).completed_status ?? '',
      ).trim()
      const isAsyncAgent = ASYNC_COMPLETION_ACTIONS.has(String(action.type))
      const wantsWait = continuation === 'after_task_completes' || completedStatus.length > 0
      const hasMoreSteps = i < automation.actions.length - 1
      // Pause when an agent step needs to wait — either because a later step
      // depends on its completion, or because `completed_status` must be
      // applied to the source task once the agent finishes.
      if (isAsyncAgent && wantsWait && (hasMoreSteps || completedStatus.length > 0)) {
        await this.pauseRun(currentCtx, automation.id, event, actionResults, i + 1)
        return currentCtx.itemId || null
      }
      if (String(action.type) === 'human_gate' && hasMoreSteps) {
        const gateResult = actionResults[actionResults.length - 1]?.result as
          | Record<string, unknown>
          | undefined
        const gatePausedAt = String(gateResult?.gate_paused_at ?? new Date().toISOString())
        await this.pauseRun(currentCtx, automation.id, event, actionResults, i + 1, {
          ...activeRunContext,
          gate_paused_at: gatePausedAt,
        })
        return currentCtx.itemId || null
      }
    }

    const status: 'success' | 'partial' | 'failed' =
      errorCount === 0 ? 'success' : successCount > 0 ? 'partial' : 'failed'
    await this.logRun(currentCtx, automation.id, event, actionResults, null, status)
    return currentCtx.itemId || null
  }

  protected extractReviewFeedbackFromActivity(
    activity: Record<string, unknown>[],
    sinceIso?: string,
  ): string {
    const sinceMs = sinceIso ? Date.parse(sinceIso) : 0
    const commentEvents = new Set(['comment', 'user.comment', 'automation_comment'])
    for (let index = activity.length - 1; index >= 0; index--) {
      const row = activity[index]
      const eventType = String(row.event_type ?? '')
      if (!commentEvents.has(eventType)) continue
      const createdAt = String(row.created_at ?? '')
      if (sinceMs > 0 && createdAt && Date.parse(createdAt) < sinceMs) continue
      const payload = (row.payload ?? {}) as Record<string, unknown>
      const message = String(payload.message ?? payload.text ?? payload.body ?? '').trim()
      if (message) return message
    }
    return ''
  }

  protected async tryResumeHumanGateOnStatusChange(
    event: Extract<TriggerEvent, { type: 'status_change' }>,
    ctx: EvalContext,
  ): Promise<void> {
    const pausedRuns = await this.automationRunsRepo.findPausedRunsByItemId(
      ctx.supabase,
      ctx.itemId,
    )
    if (pausedRuns.length === 0) return

    for (const runState of pausedRuns) {
      const automationId = String(runState.automation_id ?? '')
      const nextActionIndex = Number(runState.next_action_index ?? 0)
      if (!automationId || nextActionIndex <= 0) continue

      const automation = (await this.automationsRepo.findById(
        ctx.supabase,
        ctx.spaceId,
        automationId,
      )) as AutomationRule | null
      if (!automation) continue

      const gateAction = automation.actions[nextActionIndex - 1] as Record<string, unknown> | undefined
      if (!gateAction || gateAction.type !== 'human_gate') continue

      const resumeOn = String(gateAction.resume_on_status ?? 'done').trim() || 'done'
      const rejectOn = String(gateAction.reject_on_status ?? 'needs_revision').trim() || 'needs_revision'
      const isApprove = event.to === resumeOn
      const isReject = event.to === rejectOn
      if (!isApprove && !isReject) continue

      const existingRunContext =
        runState.run_context && typeof runState.run_context === 'object'
          ? ({ ...(runState.run_context as Record<string, unknown>) } as Record<string, unknown>)
          : ({} as Record<string, unknown>)

      let resumeStartIndex = nextActionIndex
      if (isReject) {
        const rejectGoto = gateAction.on_reject_goto_step_index
        if (typeof rejectGoto !== 'number' || !Number.isInteger(rejectGoto) || rejectGoto < 0) {
          continue
        }
        resumeStartIndex = rejectGoto
        const gatePausedAt = String(existingRunContext.gate_paused_at ?? runState.created_at ?? '')
        const activity = await this.repo.findActivityByItemId(ctx.supabase, ctx.spaceId, ctx.itemId)
        existingRunContext.review_feedback = this.extractReviewFeedbackFromActivity(
          (activity ?? []) as Record<string, unknown>[],
          gatePausedAt || undefined,
        )
      } else {
        delete existingRunContext.review_feedback
      }

      await this.resumeAutomation(
        {
          supabase: ctx.supabase,
          userId: String(runState.user_id ?? ctx.userId),
          orgId: (runState.org_id as string | null) ?? ctx.orgId,
          spaceId: String(runState.space_id ?? ctx.spaceId),
          itemId: String(runState.item_id ?? ctx.itemId),
          depth: ctx.depth,
        },
        String(runState.id),
        'done',
        resumeStartIndex,
        existingRunContext,
      )
      return
    }
  }

  async resumeAutomation(
    ctx: EvalContext,
    runStateId: string,
    taskStatus: 'done' | 'failed',
    startFromIndexOverride?: number,
    runContextOverride?: Record<string, unknown>,
  ): Promise<void> {
    const runState = await this.automationRunsRepo.findPausedRunState(ctx.supabase, runStateId)
    if (!runState) {
      this.logger.warn(`No paused run state found: ${runStateId}`)
      return
    }

    await this.automationRunsRepo.markRunStateResumed(ctx.supabase, runStateId)

    if (taskStatus === 'failed') {
      const priorResults = (runState.actions_executed ?? []) as Record<string, unknown>[]
      priorResults.push({ type: 'task_execution_wait', result: 'task_failed' })
      const errorCount = priorResults.filter((r) => !!r.error).length
      const successCount = priorResults.filter((r) => !r.error).length
      const status: 'success' | 'partial' | 'failed' =
        errorCount === 0 ? 'success' : successCount > 0 ? 'partial' : 'failed'
      await this.logRun(
        ctx,
        runState.automation_id,
        runState.trigger_event as unknown as TriggerEvent,
        priorResults,
        null,
        status,
      )
      return
    }

    const space = await this.repo.findSpaceById(ctx.supabase, ctx.userId, ctx.spaceId, ctx.orgId)
    if (!space) return

    const automation = (await this.automationsRepo.findById(
      ctx.supabase,
      ctx.spaceId,
      String(runState.automation_id),
    )) as AutomationRule | null
    if (!automation) {
      this.logger.warn(`Automation ${runState.automation_id} no longer exists`)
      return
    }

    // The agent step that paused this run sits at `next_action_index - 1`.
    // Apply its `completed_status` to the source task before continuing so the
    // user sees the task land on the chosen status as part of agent completion.
    const pausedActionIndex = (runState.next_action_index as number) - 1
    const pausedAction =
      pausedActionIndex >= 0 ? (automation.actions[pausedActionIndex] ?? null) : null
    const completedStatus = String(
      (pausedAction as Record<string, unknown> | null)?.completed_status ?? '',
    ).trim()
    if (completedStatus) {
      try {
        await this.repo.updateItem(
          ctx.supabase,
          ctx.userId,
          ctx.spaceId,
          ctx.itemId,
          { status: completedStatus as 'todo' | 'in_progress' | 'in_review' | 'done' },
          ctx.orgId,
        )
      } catch (err) {
        this.logger.error(`Failed to apply completed_status on resume: ${err}`)
      }
    }

    await this.executeAutomation(
      automation,
      runState.trigger_event as unknown as TriggerEvent,
      ctx,
      space,
      startFromIndexOverride ?? (runState.next_action_index as number),
      (runState.actions_executed ?? []) as Record<string, unknown>[],
      runContextOverride ??
        (runState.run_context && typeof runState.run_context === 'object'
          ? (runState.run_context as Record<string, unknown>)
          : {}),
    )
  }

  async executeAutomationById(
    automationId: string,
    event: TriggerEvent,
    ctx: EvalContext,
  ): Promise<string | null> {
    const space = await this.repo.findSpaceById(ctx.supabase, ctx.userId, ctx.spaceId, ctx.orgId)
    if (!space) return null
    const automation = (await this.automationsRepo.findById(
      ctx.supabase,
      ctx.spaceId,
      automationId,
    )) as AutomationRule | null
    if (!automation || automation.enabled !== true || automation.is_draft === true) return null
    return this.executeAutomation(automation, event, ctx, space)
  }
}
