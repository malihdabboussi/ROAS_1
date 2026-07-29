import { Injectable } from '@nestjs/common'
import { AgentRuntimeReadinessService } from '../../agent-sync/services/agent-runtime-readiness.service'
import type { OpenClawInputMessage, SendFn } from '../../chat/services/openclaw-proxy.service'
import { OpenClawProxyService } from '../../chat/services/openclaw-proxy.service'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { TaskAgentRepository } from '../repositories/task-agent.repository'
import { TaskAgentInputService } from './task-agent-input.service'

const POST_CALL_DELIVERY_SKILL_KEY = 'post-call-delivery'

export interface SuggestTasksPayload {
  space_id: string
  owner_user_id: string
  org_id: string | null
  agent_key?: string
  max_suggestions?: number
  instructions?: string
  payload: Record<string, unknown>
}

export interface SuggestedTask {
  title: string
  description?: string
  assignee_email?: string
  due_date?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  source_action_index?: number
}

export interface SuggestMeetingTitlePayload {
  space_id: string
  owner_user_id: string
  org_id: string | null
  agent_key?: string
  payload: Record<string, unknown>
}

export interface PostCallDraftPayload {
  space_id: string
  owner_user_id: string
  org_id: string | null
  agent_key?: string
  payload: Record<string, unknown>
}

export interface PostCallDraft {
  message: string
  rationale: string
  context_sources: string[]
}

@Injectable()
export class TaskAgentSuggestionsService {
  constructor(
    private readonly repository: TaskAgentRepository,
    private readonly openClaw: OpenClawProxyService,
    private readonly agentRuntime: AgentRuntimeService,
    private readonly runtimeReadiness: AgentRuntimeReadinessService,
    private readonly inputService?: TaskAgentInputService,
  ) {}

  async draftPostCall(payload: PostCallDraftPayload): Promise<{ draft: PostCallDraft }> {
    const agentKey = payload.agent_key?.trim() || 'vibey'
    const runtime = await this.agentRuntime.resolveConversationRuntime(
      this.repository.client,
      payload.owner_user_id,
      agentKey,
      payload.org_id,
    )
    const skills = this.inputService
      ? await this.inputService.resolveTaskSlashSkills({
          userId: payload.owner_user_id,
          agentKey: runtime.agentKey,
          keys: [POST_CALL_DELIVERY_SKILL_KEY],
          orgId: payload.org_id,
        })
      : []
    if (skills.length === 0) {
      throw new Error(`${POST_CALL_DELIVERY_SKILL_KEY} skill is not available`)
    }
    const requiredSkillFiles = skills.flatMap((skill) => skill.requiredSkillFiles)
    await this.runtimeReadiness.ensureRuntimeReady({
      userId: payload.owner_user_id,
      orgId: payload.org_id,
      agentKey: runtime.agentKey,
      gatewayAgentId: runtime.gatewayAgentId,
      requiredSkillFiles,
    })
    const sessionKey = this.agentRuntime.buildChatSessionKey({
      gatewayAgentId: runtime.gatewayAgentId,
      agentKey: runtime.agentKey,
      userId: payload.owner_user_id,
      conversationId: `post-call-delivery-${payload.space_id}`,
      orgId: payload.org_id ?? undefined,
    })
    const skillContext = this.inputService?.buildSlashSkillContext(skills) ?? ''
    const instructions = [
      skillContext,
      'Return JSON only. Do not include markdown fences or commentary.',
      'Use this exact shape: {"message":"Slack-ready recap","rationale":"why this draft matters","context_sources":["source"]}',
      'The message is a Shadow proposal. Do not claim it was sent.',
    ]
      .filter(Boolean)
      .join('\n\n')
    let content = ''
    const send: SendFn = async (type, data) => {
      if (type === 'content_delta' && typeof data.content === 'string') content += data.content
    }
    const result = await this.openClaw.streamCompletion({
      input: [
        {
          type: 'message',
          role: 'user',
          content: JSON.stringify({ payload: payload.payload }, null, 2),
        },
      ],
      instructions,
      send,
      agentId: runtime.gatewayAgentId,
      sessionKey,
      userId: payload.owner_user_id,
      conversationId: `post-call-delivery-${payload.space_id}`,
      channel: 'studio',
      disableResponseFilter: true,
    })
    const draft = parsePostCallDraft(content || result.content || '')
    if (!draft) throw new Error('Post-call delivery returned an invalid draft')
    return { draft }
  }

  async suggestMeetingTitle(
    payload: SuggestMeetingTitlePayload,
  ): Promise<{ title: string | null }> {
    const agentKey =
      typeof payload.agent_key === 'string' && payload.agent_key.trim().length > 0
        ? payload.agent_key.trim()
        : 'vibey'
    const runtime = await this.agentRuntime.resolveConversationRuntime(
      this.repository.client,
      payload.owner_user_id,
      agentKey,
      payload.org_id,
    )
    await this.runtimeReadiness.ensureRuntimeReady({
      userId: payload.owner_user_id,
      orgId: payload.org_id,
      agentKey: runtime.agentKey,
      gatewayAgentId: runtime.gatewayAgentId,
    })
    const sessionKey = this.agentRuntime.buildChatSessionKey({
      gatewayAgentId: runtime.gatewayAgentId,
      agentKey: runtime.agentKey,
      userId: payload.owner_user_id,
      conversationId: `suggest-meeting-title-${payload.space_id}`,
      orgId: payload.org_id ?? undefined,
    })
    const instructions = [
      'Write a short CEO meeting label for a Meetings list.',
      'Return JSON only. Do not include markdown fences or commentary.',
      'Use this exact shape: {"title":"..."}',
      'Rules:',
      '- 4–10 words, purpose-first (who + real operating purpose).',
      '- Never start with Meeting, Fathom, Impromptu, Untitled, or Zoom.',
      '- Do NOT copy sensational summary headings unless that was truly the purpose.',
      '  Bad: "Urgent: Stripe Compliance" when the call was a weekly client update.',
      '  Good: "Weekly client update — Stripe" or "Sales call — Jason attention".',
      '- Prefer conversation purpose over calendar scare titles or template section headers.',
      '- Use attendees/speakers + summary + transcript excerpt; invent nothing else.',
    ].join('\n')

    let content = ''
    const send: SendFn = async (type, data) => {
      if (type === 'content_delta' && typeof data.content === 'string') {
        content += data.content
      }
    }
    const input: OpenClawInputMessage[] = [
      {
        type: 'message',
        role: 'user',
        content: JSON.stringify({ payload: payload.payload }, null, 2),
      },
    ]
    const result = await this.openClaw.streamCompletion({
      input,
      instructions,
      send,
      agentId: runtime.gatewayAgentId,
      sessionKey,
      userId: payload.owner_user_id,
      conversationId: `suggest-meeting-title-${payload.space_id}`,
      channel: 'studio',
      disableResponseFilter: true,
    })
    return { title: parseSuggestedMeetingTitle(content || result.content || '') }
  }

  async suggestTasks(payload: SuggestTasksPayload): Promise<{ tasks: SuggestedTask[] }> {
    const maxSuggestions = Math.min(
      20,
      Math.max(1, Math.floor(Number(payload.max_suggestions ?? 10) || 10)),
    )
    const agentKey =
      typeof payload.agent_key === 'string' && payload.agent_key.trim().length > 0
        ? payload.agent_key.trim()
        : 'vibey'
    const runtime = await this.agentRuntime.resolveConversationRuntime(
      this.repository.client,
      payload.owner_user_id,
      agentKey,
      payload.org_id,
    )
    await this.runtimeReadiness.ensureRuntimeReady({
      userId: payload.owner_user_id,
      orgId: payload.org_id,
      agentKey: runtime.agentKey,
      gatewayAgentId: runtime.gatewayAgentId,
    })
    const sessionKey = this.agentRuntime.buildChatSessionKey({
      gatewayAgentId: runtime.gatewayAgentId,
      agentKey: runtime.agentKey,
      userId: payload.owner_user_id,
      conversationId: `suggest-tasks-${payload.space_id}`,
      orgId: payload.org_id ?? undefined,
    })
    const instructions = [
      'You convert automation trigger payloads into suggested tasks for a human workspace.',
      'Return JSON only. Do not include markdown fences or commentary.',
      `Return at most ${maxSuggestions} tasks.`,
      'Each task must be concrete, actionable, and based only on the payload.',
      'Prefer payload.action_items when present — turn each into a task when possible.',
      'For every task derived from payload.action_items, preserve its zero-based array position in source_action_index.',
      'Always set priority (not everything medium): urgent/high when ASAP/today/blocker/this week; low for nice-to-have/FYI.',
      'Set due_date to ISO-8601 when the payload has a deadline/due date; otherwise "".',
      'Set assignee_email when an owner email is present on the action item or clearly stated; else "".',
      'Use this exact shape: {"tasks":[{"title":"...","description":"...","assignee_email":"...","due_date":"ISO-8601 or empty","priority":"low|medium|high|urgent","source_action_index":0}]}',
      payload.instructions ? `User instructions: ${payload.instructions}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    let content = ''
    const send: SendFn = async (type, data) => {
      if (type === 'content_delta' && typeof data.content === 'string') {
        content += data.content
      }
    }
    const input: OpenClawInputMessage[] = [
      {
        type: 'message',
        role: 'user',
        content: JSON.stringify(
          {
            max_suggestions: maxSuggestions,
            payload: payload.payload,
          },
          null,
          2,
        ),
      },
    ]

    const result = await this.openClaw.streamCompletion({
      input,
      instructions,
      send,
      agentId: runtime.gatewayAgentId,
      sessionKey,
      userId: payload.owner_user_id,
      conversationId: `suggest-tasks-${payload.space_id}`,
      channel: 'studio',
      disableResponseFilter: true,
    })
    return { tasks: parseSuggestedTasks(content || result.content || '', maxSuggestions) }
  }
}

function parseSuggestedMeetingTitle(raw: string): string | null {
  const trimmed = raw.trim()
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  const jsonText =
    withoutFence.startsWith('{') || withoutFence.startsWith('[')
      ? withoutFence
      : (withoutFence.match(/\{[\s\S]*\}/)?.[0] ?? '')
  if (!jsonText) return null
  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>
    const title = String(parsed.title ?? '')
      .replace(/^(?:fathom\s+)?meeting:\s*/i, '')
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[.!?]+$/g, '')
      .trim()
    if (!title || title.length < 4) return null
    if (/^(impromptu|untitled|zoom)/i.test(title)) return null
    return title.slice(0, 120)
  } catch {
    return null
  }
}

function parsePostCallDraft(raw: string): PostCallDraft | null {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  const jsonText = trimmed.startsWith('{') ? trimmed : (trimmed.match(/\{[\s\S]*\}/)?.[0] ?? '')
  if (!jsonText) return null
  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>
    const message = typeof parsed.message === 'string' ? parsed.message.trim() : ''
    const rationale = typeof parsed.rationale === 'string' ? parsed.rationale.trim() : ''
    const contextSources = Array.isArray(parsed.context_sources)
      ? parsed.context_sources
          .filter((source): source is string => typeof source === 'string')
          .map((source) => source.trim())
          .filter(Boolean)
      : []
    if (!message || !rationale) return null
    return {
      message: message.slice(0, 12000),
      rationale: rationale.slice(0, 1000),
      context_sources: contextSources.slice(0, 20),
    }
  } catch {
    return null
  }
}

function parseSuggestedTasks(raw: string, maxSuggestions: number): SuggestedTask[] {
  const trimmed = raw.trim()
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  const jsonText =
    withoutFence.startsWith('{') || withoutFence.startsWith('[')
      ? withoutFence
      : (withoutFence.match(/\{[\s\S]*\}/)?.[0] ?? '')
  if (!jsonText) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return []
  }
  const root = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  const rawTasks = Array.isArray(root.tasks) ? root.tasks : Array.isArray(parsed) ? parsed : []
  const tasks: SuggestedTask[] = []
  for (const rawTask of rawTasks) {
    if (!rawTask || typeof rawTask !== 'object' || Array.isArray(rawTask)) continue
    const task = rawTask as Record<string, unknown>
    const title = String(task.title ?? '').trim()
    if (!title) continue
    const priority = String(task.priority ?? '').trim()
    const sourceActionIndex = Number(task.source_action_index)
    tasks.push({
      title: title.slice(0, 1000),
      ...(typeof task.description === 'string' && task.description.trim()
        ? { description: task.description.trim().slice(0, 20000) }
        : {}),
      ...(typeof task.assignee_email === 'string' && task.assignee_email.trim()
        ? { assignee_email: task.assignee_email.trim().toLowerCase() }
        : {}),
      ...(typeof task.due_date === 'string' && task.due_date.trim()
        ? { due_date: task.due_date.trim() }
        : {}),
      ...(priority === 'low' ||
      priority === 'medium' ||
      priority === 'high' ||
      priority === 'urgent'
        ? { priority }
        : {}),
      ...(Number.isInteger(sourceActionIndex) && sourceActionIndex >= 0
        ? { source_action_index: sourceActionIndex }
        : {}),
    })
    if (tasks.length >= maxSuggestions) break
  }
  return tasks
}
