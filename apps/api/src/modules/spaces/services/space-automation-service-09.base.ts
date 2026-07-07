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
import {
  evaluateFlowBranchCondition,
  readFlowBranchFieldValue,
  resolveFlowBranchJumpIndex,
  type FlowBranchOperator,
} from './flow-branch.utils'
import { SpaceAutomationServiceBase08 } from './space-automation-service-08.base'
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

export abstract class SpaceAutomationServiceBase09 extends SpaceAutomationServiceBase08 {
  protected automationActionSummary(
    action: Record<string, unknown>,
    actionResult: Record<string, unknown>,
    item: Record<string, unknown>,
  ): string {
    const actionType = String(action.type ?? '')
    const hasError = typeof actionResult.error === 'string' && actionResult.error.length > 0
    if (hasError) return `Failed ${this.automationActionVerb(actionType)}`

    switch (actionType) {
      case 'create_task': {
        const result = this.objectRecord(actionResult.result)
        const title = String(result.title ?? '').trim()
        return title ? `Created task "${title}"` : 'Created task'
      }
      case 'agent_suggest_tasks': {
        const result = this.objectRecord(actionResult.result)
        const count =
          typeof result.suggestion_count === 'number' ? result.suggestion_count : undefined
        return count === 1
          ? 'Suggested 1 task'
          : count != null
            ? `Suggested ${count} tasks`
            : 'Suggested tasks'
      }
      case 'send_to_agent':
        return `Asked ${String(action.agent_key ?? 'agent')} to work`
      case 'send_to_agents': {
        const result = this.objectRecord(actionResult.result)
        const count =
          typeof result.pending_agent_count === 'number' ? result.pending_agent_count : undefined
        return count === 1
          ? 'Asked 1 agent to work'
          : count != null
            ? `Asked ${count} agents to work`
            : 'Asked agents to work'
      }
      case 'send_to_cursor': {
        const result = this.objectRecord(actionResult.result)
        const repo = String(result.repo_url ?? action.repo_url ?? 'repository')
        return `Asked Cursor to write code in ${repo}`
      }
      case 'add_brain_context_to_task': {
        const result = this.objectRecord(actionResult.result)
        const count = typeof result.context_count === 'number' ? result.context_count : undefined
        return count != null
          ? `Atlas added ${count} brain context items`
          : 'Atlas added brain context'
      }
      case 'send_email':
        return 'Sent email'
      case 'send_slack_message':
        return 'Sent Slack message'
      case 'send_channel_message':
        return 'Posted channel message'
      case 'change_status':
        return `Changed status to ${String(action.status ?? '') || 'new status'}`
      case 'change_priority':
        return `Changed priority to ${String(action.priority ?? '') || 'new priority'}`
      case 'assign_to':
        return 'Updated assignee'
      case 'create_subtask':
        return 'Created subtask'
      case 'add_comment':
        return 'Added comment'
      case 'create_artifact':
        return `Created ${String(action.artifact_kind ?? 'artifact').replace(/_/g, ' ')}`
      case 'publish_artifact':
        return 'Published artifact'
      case 'unpublish_artifact':
        return 'Unpublished artifact'
      case 'ask_agent_to_improve_artifact':
        return `Asked ${String(action.agent_key ?? 'agent')} to improve artifact`
      case 'attach_artifact_to_item':
        return 'Attached artifact'
      case 'create_contact':
        return 'Created contact'
      case 'update_contact_field':
        return 'Updated contact'
      case 'add_contact_tag':
        return 'Added contact tag'
      case 'remove_contact_tag':
        return 'Removed contact tag'
      case 'attach_note_to_contact':
        return 'Added contact note'
      case 'link_item_to_contact':
        return 'Linked contact'
      case 'sync_social_research': {
        const result = this.objectRecord(actionResult.result)
        const count = typeof result.synced_count === 'number' ? result.synced_count : undefined
        return count != null ? `Synced social research (${count})` : 'Synced social research'
      }
      case 'select_social_outliers': {
        const result = this.objectRecord(actionResult.result)
        const count = typeof result.outlier_count === 'number' ? result.outlier_count : undefined
        return count != null ? `Selected ${count} social outliers` : 'Selected social outliers'
      }
      case 'enrich_social_research_items': {
        const result = this.objectRecord(actionResult.result)
        const count = typeof result.enriched_count === 'number' ? result.enriched_count : undefined
        return count != null ? `Enriched ${count} social outliers` : 'Enriched social outliers'
      }
      default:
        return `Ran ${this.automationActionVerb(actionType)} on ${String(item.title ?? 'task')}`
    }
  }

  protected automationActionVerb(actionType: string): string {
    return actionType.replace(/_/g, ' ').trim() || 'automation action'
  }

  protected async logAutomationActionActivity(
    ctx: EvalContext,
    automation: AutomationRule,
    action: Record<string, unknown>,
    actionResult: Record<string, unknown>,
    item: Record<string, unknown>,
  ): Promise<void> {
    if (!ctx.itemId) return
    try {
      const createActivity = (
        this.repo as unknown as {
          createActivity?: SpacesRepository['createActivity']
        }
      ).createActivity
      if (typeof createActivity !== 'function') return
      const actionType = String(action.type ?? '')
      const hasError = typeof actionResult.error === 'string' && actionResult.error.length > 0
      await createActivity.call(this.repo, ctx.supabase, {
        item_id: ctx.itemId,
        space_id: ctx.spaceId,
        user_id: ctx.userId,
        org_id: ctx.orgId,
        event_type: 'automation_action',
        payload: {
          automation_id: automation.id,
          automation_name: automation.name,
          action_type: actionType,
          status: hasError ? 'failed' : 'success',
          duration_ms:
            typeof actionResult.duration_ms === 'number' ? actionResult.duration_ms : undefined,
          summary: this.automationActionSummary(action, actionResult, item),
          ...(hasError ? { error: actionResult.error } : {}),
        },
      })
    } catch (err) {
      this.logger.warn(`Automation action activity log failed: ${err}`)
    }
  }

  protected async pauseRun(
    ctx: EvalContext,
    automationId: string,
    event: TriggerEvent,
    actionsExecuted: Record<string, unknown>[],
    nextActionIndex: number,
    runContext: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await this.automationRunsRepo.insertRunState(ctx.supabase, {
        space_id: ctx.spaceId,
        item_id: ctx.itemId,
        automation_id: automationId,
        user_id: ctx.userId,
        org_id: ctx.orgId,
        trigger_event: event as unknown as Record<string, unknown>,
        actions_executed: actionsExecuted,
        next_action_index: nextActionIndex,
        run_context: runContext,
        status: 'paused',
      })
    } catch (err) {
      this.logger.error(`Failed to pause automation run: ${err}`)
    }
  }

  protected async resolveActionTargetContext(
    action: Record<string, unknown>,
    triggerCtx: EvalContext,
    currentCtx: EvalContext,
    templateCtx: TemplateContext,
  ): Promise<{ ctx: EvalContext; item: Record<string, unknown>; templateCtx: TemplateContext }> {
    const targetRef = String(action.target_item_ref ?? '').trim()
    if (!targetRef || targetRef === 'current') {
      return { ctx: currentCtx, item: templateCtx.item, templateCtx }
    }

    const rendered = renderTemplate(targetRef, templateCtx).trim()
    const targetItemId =
      rendered === 'trigger' || rendered === '{{trigger.item_id}}' ? triggerCtx.itemId : rendered
    if (!targetItemId) return { ctx: currentCtx, item: templateCtx.item, templateCtx }

    const targetCtx = { ...currentCtx, itemId: targetItemId }
    const targetItem = await this.repo.findItemById(
      targetCtx.supabase,
      targetCtx.spaceId,
      targetCtx.itemId,
    )
    if (!targetItem) throw new Error(`Target task not found: ${targetItemId}`)

    return {
      ctx: targetCtx,
      item: targetItem as Record<string, unknown>,
      templateCtx: await this.buildTemplateContext(
        targetCtx,
        targetItem as Record<string, unknown>,
        templateCtx.space,
        templateCtx.event,
        templateCtx.steps,
      ),
    }
  }

  protected execFlowLoop(
    action: Record<string, unknown>,
    stepIndex: number,
    templateCtx: TemplateContext,
  ): { loop_jump?: number; skipped?: boolean; iteration?: number } {
    const when = String(action.when ?? 'on_reject')
    const targetIndex = Number(action.target_step_index ?? 0)
    const maxIterations = Number(action.max_iterations ?? 3)
    const runContext = templateCtx.run ?? {}
    const loopIterations =
      runContext.loop_iterations && typeof runContext.loop_iterations === 'object'
        ? ({ ...(runContext.loop_iterations as Record<string, number>) } as Record<string, number>)
        : ({} as Record<string, number>)
    const loopKey = String(stepIndex)
    const iterations = Number(loopIterations[loopKey] ?? 0)

    if (when === 'on_reject' && !String(runContext.review_feedback ?? '').trim()) {
      return { skipped: true }
    }

    if (iterations >= maxIterations) {
      return { skipped: true, iteration: iterations }
    }

    loopIterations[loopKey] = iterations + 1
    templateCtx.run = { ...runContext, loop_iterations: loopIterations }

    return { loop_jump: targetIndex, iteration: iterations + 1 }
  }

  protected execFlowBranch(
    action: Record<string, unknown>,
    item: Record<string, unknown>,
  ): { branch_jump?: number; branch_matched?: boolean } {
    const fieldId = String(action.field_id ?? '').trim()
    const operator = String(action.operator ?? 'equals') as FlowBranchOperator
    const expected = String(action.value ?? '')
    const thenStepIndex = Number(action.then_step_index ?? 0)
    const elseStepIndex =
      typeof action.else_step_index === 'number' ? Number(action.else_step_index) : undefined

    const actual = readFlowBranchFieldValue(item, fieldId)
    const matched = evaluateFlowBranchCondition(actual, operator, expected)
    const jumpIndex = resolveFlowBranchJumpIndex({
      matched,
      thenStepIndex,
      elseStepIndex,
    })

    if (jumpIndex === null) {
      return { branch_matched: matched }
    }

    return { branch_jump: jumpIndex, branch_matched: matched }
  }

  protected async executeAction(
    action: Record<string, unknown>,
    ctx: EvalContext,
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
    stepIndex = 0,
  ): Promise<Record<string, unknown> | null> {
    switch (action.type) {
      case 'create_task':
        return this.execCreateTask(action, ctx, templateCtx)
      case 'agent_suggest_tasks':
        return this.execAgentSuggestTasks(action, ctx, templateCtx)
      case 'send_to_agent':
        return this.execSendToAgent(action, ctx, item, templateCtx)
      case 'send_to_agents':
        return this.execSendToAgents(action, ctx, item, templateCtx)
      case 'send_to_cursor':
        return this.execSendToCursor(action, ctx, item, templateCtx)
      case 'add_brain_context_to_task':
        return this.execAddBrainContextToTask(action, ctx, item, templateCtx)
      case 'assign_to':
        return this.execAssignTo(action, ctx)
      case 'change_status':
        return this.execChangeStatus(action, ctx)
      case 'change_priority':
        return this.execChangePriority(action, ctx)
      case 'add_comment':
        return this.execAddComment(action, ctx, templateCtx)
      case 'human_gate':
        return this.execHumanGate(action, ctx, templateCtx)
      case 'flow_loop':
        return this.execFlowLoop(action, stepIndex, templateCtx)
      case 'flow_branch':
        return this.execFlowBranch(action, item)
      case 'create_subtask':
        return this.execCreateSubtask(action, ctx, templateCtx)
      case 'send_email':
        return this.execSendEmail(action, ctx, templateCtx)
      case 'send_slack_message':
        return this.execSendSlackMessage(action, ctx, templateCtx)
      case 'send_channel_message':
        return this.execSendChannelMessage(action, ctx, templateCtx)
      case 'create_contact':
        return this.execCreateContact(action, ctx, templateCtx)
      case 'update_contact_field':
        return this.execUpdateContactField(action, ctx, item, templateCtx)
      case 'add_contact_tag':
        return this.execAddContactTag(action, ctx, item, templateCtx)
      case 'remove_contact_tag':
        return this.execRemoveContactTag(action, ctx, item, templateCtx)
      case 'attach_note_to_contact':
        return this.execAttachNoteToContact(action, ctx, item, templateCtx)
      case 'link_item_to_contact':
        return this.execLinkItemToContact(action, ctx, item, templateCtx)
      case 'create_artifact':
        return this.execCreateArtifact(action, ctx, templateCtx)
      case 'publish_artifact':
        return this.execSetArtifactStatus(action, ctx, 'published')
      case 'unpublish_artifact':
        return this.execSetArtifactStatus(action, ctx, 'draft')
      case 'ask_agent_to_improve_artifact':
        return this.execAskAgentToImproveArtifact(action, ctx, item, templateCtx)
      case 'attach_artifact_to_item':
        return this.execAttachArtifactToItem(action, ctx)
      case 'sync_social_research':
        return this.execSyncSocialResearch(action, ctx)
      case 'select_social_outliers':
        return this.execSelectSocialOutliers(action, ctx)
      case 'enrich_social_research_items':
        return this.execEnrichSocialResearchItems(action, ctx, templateCtx)
      case 'ingest_youtube_channel_to_agent_brain':
        return this.execIngestYoutubeChannelToAgentBrain(action, ctx)
      default:
        this.logger.warn(`Unknown action type: ${action.type}`)
        return null
    }
  }
}
