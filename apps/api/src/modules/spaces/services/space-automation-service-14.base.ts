import { randomUUID } from 'crypto'
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
import { SpaceAutomationServiceBase13 } from './space-automation-service-13.base'
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
  'send_to_agents',
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

export abstract class SpaceAutomationServiceBase14 extends SpaceAutomationServiceBase13 {
  private normalizeAgentCollaboration(value: unknown): 'allowed' | 'disabled' {
    return value === 'disabled' ? 'disabled' : 'allowed'
  }

  private appendInjectedFields(
    prompt: string,
    action: Record<string, unknown>,
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): string {
    const injectFields = Array.isArray(action.inject_fields)
      ? (action.inject_fields as string[])
      : []
    if (injectFields.length === 0) return prompt
    const schema = (templateCtx.space.schema ?? templateCtx.space) as {
      fields?: { id: string; name: string }[]
    }
    const fieldDefs = schema.fields ?? []
    const customData = (item.custom_data ?? {}) as Record<string, unknown>
    const lines: string[] = []
    for (const fid of injectFields) {
      const def = fieldDefs.find((f) => f.id === fid)
      const label = def?.name ?? fid
      const val = (item[fid] ?? customData[fid]) as unknown
      if (val != null && val !== '') {
        lines.push(`${label}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`)
      }
    }
    return lines.length > 0 ? prompt + '\n\n---\n' + lines.join('\n') : prompt
  }

  private async buildTaskAgentPrompt(
    action: Record<string, unknown>,
    ctx: EvalContext,
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
    agentKey: string,
    promptTemplate: string,
    outputType: string,
  ): Promise<string> {
    let renderedPrompt = renderTemplate(promptTemplate, templateCtx)
    const outputContract = this.buildAgentOutputContract(outputType, ctx)
    if (outputContract) renderedPrompt = renderedPrompt + outputContract
    if (action.extended_brain_knowledge === true) {
      const brainContext = this.formatBrainContextBlock(
        await this.searchBrainContext(
          ctx,
          this.buildBrainSearchQuery(action, item, templateCtx),
          agentKey,
        ),
      )
      if (brainContext) renderedPrompt = `${brainContext}\n\n---\n\n${renderedPrompt}`
    }
    return this.appendInjectedFields(renderedPrompt, action, item, templateCtx)
  }

  private async invokeTaskAgentAutomation(
    ctx: EvalContext,
    templateCtx: TemplateContext,
    input: {
      agentKey: string
      prompt: string
      collaboration: 'allowed' | 'disabled'
      executionBatchId?: string
      executionBatchAgentKeys?: string[]
    },
  ): Promise<void> {
    const internalToken =
      this.configService.get<string>('INTERNAL_API_TOKEN') ?? process.env.INTERNAL_API_TOKEN ?? ''
    if (!this.userAgentApi) throw new Error('UserAgentApiService not configured')
    if (!internalToken) throw new Error('INTERNAL_API_TOKEN not configured')
    const response = await this.userAgentApi.invoke(
      ctx.userId,
      '/api/task-agent/invoke',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Token': internalToken },
        body: JSON.stringify({
          item_id: ctx.itemId,
          space_id: ctx.spaceId,
          agent_key: input.agentKey,
          user_id: ctx.userId,
          org_id: ctx.orgId,
          campaign_id:
            typeof templateCtx.space.campaign_id === 'string'
              ? templateCtx.space.campaign_id
              : null,
          prompt: input.prompt,
          agent_collaboration: input.collaboration,
          execution_batch_id: input.executionBatchId,
          execution_batch_agent_keys: input.executionBatchAgentKeys,
        }),
      },
      {
        timeoutMs: 600_000,
        logTag: `task_agent_automation item=${ctx.itemId}`,
      },
    )
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
      throw new Error(String(body?.error ?? body?.message ?? 'Task agent invocation failed'))
    }
  }

  protected async execSendToAgent(
    action: Record<string, unknown>,
    ctx: EvalContext,
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): Promise<null> {
    if (!ctx.itemId) {
      throw new Error('Scheduled agent step needs a created task first')
    }
    await this.assertAutomationCreditsAvailable(ctx)

    await this.automationActionsRepo.updateTaskExecutionState(
      ctx.supabase,
      ctx.spaceId,
      ctx.itemId,
      {
        task_execution_status: 'running',
        status: 'in_progress',
      },
    )

    const agentKey = String(action.agent_key)
    const renderedPrompt = await this.buildTaskAgentPrompt(
      action,
      ctx,
      item,
      templateCtx,
      agentKey,
      String(action.prompt_template ?? ''),
      String(action.output_type ?? 'none'),
    )
    await this.invokeTaskAgentAutomation(ctx, templateCtx, {
      agentKey,
      prompt: renderedPrompt,
      collaboration: this.normalizeAgentCollaboration(action.agent_collaboration),
    })

    return null
  }

  protected async execSendToAgents(
    action: Record<string, unknown>,
    ctx: EvalContext,
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): Promise<Record<string, unknown>> {
    if (!ctx.itemId) {
      throw new Error('Scheduled agent step needs a created task first')
    }
    const rawTasks = Array.isArray(action.agent_tasks)
      ? (action.agent_tasks as Array<Record<string, unknown>>)
      : []
    const agentTasks = rawTasks
      .map((task) => ({
        agentKey: String(task.agent_key ?? '').trim(),
        promptTemplate: String(task.prompt_template ?? '').trim(),
      }))
      .filter((task) => task.agentKey)
    if (agentTasks.length < 2) throw new Error('send_to_agents needs at least two agents')

    await this.assertAutomationCreditsAvailable(ctx)
    await this.automationActionsRepo.updateTaskExecutionState(
      ctx.supabase,
      ctx.spaceId,
      ctx.itemId,
      {
        task_execution_status: 'running',
        status: 'in_progress',
      },
    )

    const batchId = randomUUID()
    const agentKeys = agentTasks.map((task) => task.agentKey)
    const collaboration = this.normalizeAgentCollaboration(action.agent_collaboration)
    for (const task of agentTasks) {
      const promptTemplate = task.promptTemplate || String(action.prompt_template ?? '')
      const renderedPrompt = await this.buildTaskAgentPrompt(
        action,
        ctx,
        item,
        templateCtx,
        task.agentKey,
        promptTemplate,
        'none',
      )
      await this.invokeTaskAgentAutomation(ctx, templateCtx, {
        agentKey: task.agentKey,
        prompt: renderedPrompt,
        collaboration,
        executionBatchId: batchId,
        executionBatchAgentKeys: agentKeys,
      })
    }

    return {
      execution_batch_id: batchId,
      agent_keys: agentKeys,
      pending_agent_count: agentKeys.length,
    }
  }

  protected async execSendToCursor(
    action: Record<string, unknown>,
    ctx: EvalContext,
    item: Record<string, unknown>,
    templateCtx: TemplateContext,
  ): Promise<Record<string, unknown>> {
    if (!ctx.itemId) {
      throw new Error('Scheduled Cursor step needs a created task first')
    }
    if (!this.cursorApi) throw new Error('CursorApiService not configured')

    let renderedPrompt = renderTemplate(String(action.prompt_template ?? ''), templateCtx)
    const taskTitle = String(item.title ?? 'Task').trim()
    renderedPrompt = `${renderedPrompt}\n\n---\nTask: ${taskTitle}\nTask ID: ${ctx.itemId}\nSpace ID: ${ctx.spaceId}`

    const injectFields = Array.isArray(action.inject_fields)
      ? (action.inject_fields as string[])
      : []
    if (injectFields.length > 0) {
      const schema = (templateCtx.space.schema ?? templateCtx.space) as {
        fields?: { id: string; name: string }[]
      }
      const fieldDefs = schema.fields ?? []
      const customData = (item.custom_data ?? {}) as Record<string, unknown>
      const lines: string[] = []
      for (const fid of injectFields) {
        const def = fieldDefs.find((f) => f.id === fid)
        const label = def?.name ?? fid
        const val = (item[fid] ?? customData[fid]) as unknown
        if (val != null && val !== '') {
          lines.push(`${label}: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`)
        }
      }
      if (lines.length > 0) {
        renderedPrompt = `${renderedPrompt}\n\n---\n${lines.join('\n')}`
      }
    }

    await this.assertAutomationCreditsAvailable(ctx)

    const connection = await this.cursorApi.getActiveConnection(ctx.supabase, {
      userId: ctx.userId,
      orgId: ctx.orgId,
      connectionId:
        typeof action.connection_id === 'string' && action.connection_id.trim().length > 0
          ? action.connection_id.trim()
          : undefined,
    })

    const repoUrl = String(action.repo_url ?? '').trim()
    const baseBranch = String(action.base_branch ?? 'main').trim() || 'main'
    const modelId = String(action.model_id ?? 'composer-2').trim() || 'composer-2'
    const branchName =
      typeof action.branch_name === 'string' && action.branch_name.trim().length > 0
        ? action.branch_name.trim()
        : undefined

    await this.automationActionsRepo.updateTaskExecutionState(
      ctx.supabase,
      ctx.spaceId,
      ctx.itemId,
      {
        task_execution_status: 'running',
        status: 'in_progress',
      },
    )

    const response = await this.cursorApi.launchAgent({
      connection,
      prompt: renderedPrompt,
      repoUrl,
      startingRef: baseBranch,
      modelId,
      branchName,
      autoCreatePR: true,
    })

    const existingCustom = (item.custom_data ?? {}) as Record<string, unknown>
    const nextCustom: Record<string, unknown> = {
      ...existingCustom,
      cursor_agent_id: response.agent.id,
      cursor_agent_url: response.agent.url ?? null,
      cursor_run_id: response.run.id,
      cursor_connection_id: connection.integrationRowId,
      cursor_repo_url: repoUrl,
      cursor_base_branch: baseBranch,
    }

    await this.automationActionsRepo.updateTaskExecutionState(
      ctx.supabase,
      ctx.spaceId,
      ctx.itemId,
      {
        custom_data: nextCustom,
      },
    )

    return {
      agent_id: response.agent.id,
      agent_url: response.agent.url ?? null,
      run_id: response.run.id,
      repo_url: repoUrl,
    }
  }

  protected normalizeAssignees(value: unknown): AutomationAssignee[] {
    if (!Array.isArray(value)) return []
    const out: AutomationAssignee[] = []
    const seen = new Set<string>()
    for (const item of value) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const raw = item as Record<string, unknown>
      const type = raw.type === 'human' || raw.type === 'agent' ? raw.type : null
      const id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : null
      if (!type || !id) continue
      const key = `${type}:${id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ type, id })
    }
    return out
  }

  protected itemAssignees(item: Record<string, unknown> | null | undefined): AutomationAssignee[] {
    const assignees = this.normalizeAssignees(item?.assignees)
    if (assignees.length > 0) return assignees
    if (
      (item?.assignee_type === 'human' || item?.assignee_type === 'agent') &&
      typeof item.assignee_id === 'string' &&
      item.assignee_id.length > 0
    ) {
      return [{ type: item.assignee_type, id: item.assignee_id }]
    }
    return []
  }

  protected assigneesEqual(a: AutomationAssignee[], b: AutomationAssignee[]): boolean {
    const serialize = (items: AutomationAssignee[]) =>
      items
        .map((item) => `${item.type}:${item.id}`)
        .sort()
        .join('|')
    return serialize(a) === serialize(b)
  }

  protected assigneeDiff(
    from: AutomationAssignee[],
    to: AutomationAssignee[],
  ): { added: AutomationAssignee[]; removed: AutomationAssignee[] } {
    const fromKeys = new Set(from.map((item) => `${item.type}:${item.id}`))
    const toKeys = new Set(to.map((item) => `${item.type}:${item.id}`))
    return {
      added: to.filter((item) => !fromKeys.has(`${item.type}:${item.id}`)),
      removed: from.filter((item) => !toKeys.has(`${item.type}:${item.id}`)),
    }
  }
}
