import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  defaultProbeReachable,
  normalizeAgentToolFailureFields,
  resolveMachineProfileColumns,
  resolveMachineProfileRow,
  UserAgentApiClient,
  UserMachineCircuitOpenError,
  UserMachineUnreachableError,
  type AgentApiTarget,
} from '@vibey/api-shared'
import {
  isModelStrategy,
  resolveModelForStrategy,
  type TaskType,
} from '../../../../lib/model-strategy'
import { DatabaseService } from '../../../../lib/services/database.service'
import type { AgentKey } from '../../types'
import { resolveLabel } from '../../utils/tool-labels'
import { AgentRuntimeService } from '../agent-runtime.service'
import { MissionContextService } from '../context/mission-context.service'
import { MissionTracingService } from '../mission-tracing.service'
import { MissionDeliverablesRepository } from '../persistence/mission-deliverables.repository'
import { MissionStateRepository } from '../persistence/mission-state.repository'
import { MissionJsonService } from '../utils/mission-json.service'
import { OpenClawNonRetryableError } from './mission-openclaw-errors'
import { consumeOpenResponsesSseStream } from './mission-openclaw-sse'

export type OpenClawExecOptions = {
  abortSignal?: AbortSignal
  subtaskId?: string
  identitySuffix?: string
  onStreamHeartbeat?: () => void | Promise<void>
  onToolStart?: (
    name: string,
    args?: Record<string, unknown>,
    toolCallId?: string,
  ) => void | Promise<void>
  onToolUpdate?: (
    name: string,
    partialResult?: unknown,
    toolCallId?: string,
  ) => void | Promise<void>
  onToolDone?: (
    name: string,
    toolCallId?: string,
    isError?: boolean,
    action?: string,
    result?: unknown,
  ) => void | Promise<void>
  onThinkingDelta?: (delta: string, text: string) => void | Promise<void>
  onOutputTextDelta?: (delta: string) => void | Promise<void>
  channel?: string
  targetBrainId?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function formatMissionToolFailureMessage(result: unknown): string {
  if (isRecord(result)) {
    if (typeof result.error === 'string') return result.error
    if (typeof result.message === 'string') return result.message
    return JSON.stringify(result).slice(0, 500)
  }
  if (typeof result === 'string') return result.slice(0, 500)
  return String(result ?? 'unknown error')
}

function detectMultimodalProvider(model: string): 'gemini' | 'anthropic' | 'openai' {
  const normalized = (model || '').toLowerCase()
  if (normalized.includes('anthropic/') || normalized.includes('claude')) return 'anthropic'
  if (normalized.includes('openai/') || normalized.includes('gpt-')) return 'openai'
  return 'gemini'
}

const ANTHROPIC_SUBSCRIPTION_GATEWAY_MODEL_IDS = new Map<string, string>([
  ['anthropic-subscription/claude-opus-4-6', 'anthropic/claude-opus-4.6'],
  ['anthropic-subscription/claude-opus-4-7', 'anthropic/claude-opus-4.7'],
  ['anthropic-subscription/claude-opus-4-8', 'anthropic/claude-opus-4.8'],
  ['anthropic-subscription/claude-sonnet-4-6', 'anthropic/claude-sonnet-4.6'],
  ['anthropic-subscription/claude-haiku-4-5', 'anthropic/claude-haiku-4.5'],
])

function buildProviderContentBlock(
  provider: 'gemini' | 'anthropic' | 'openai',
  contentRef: Record<string, unknown>,
): Record<string, unknown> {
  const mimeType =
    typeof contentRef.mime_type === 'string' ? contentRef.mime_type : 'application/octet-stream'
  const data = typeof contentRef.data === 'string' ? contentRef.data : null
  const url = typeof contentRef.url === 'string' ? contentRef.url : ''
  if (provider === 'gemini') {
    return data
      ? { inline_data: { mime_type: mimeType, data } }
      : { file_data: { mime_type: mimeType, file_uri: url } }
  }
  if (provider === 'anthropic') {
    return data
      ? {
          type: mimeType.startsWith('image/') ? 'image' : 'document',
          source: { type: 'base64', media_type: mimeType, data },
        }
      : {
          type: mimeType.startsWith('image/') ? 'image' : 'document',
          source: { type: 'url', url },
        }
  }
  return data
    ? {
        type: 'input_file',
        source: {
          type: 'base64',
          media_type: mimeType,
          data,
          filename: 'document',
        },
      }
    : {
        type: 'input_file',
        source: {
          type: 'url',
          media_type: mimeType,
          url,
        },
      }
}

export type MissionTraceToolStep = {
  name: string
  label: string
  status: string
  error?: string
  error_code?: string
  error_class?: string
  workflow_class?: string
  effect_state?: string
  retry_policy?: string
  observability?: Record<string, unknown>
  toolCallId?: string
  action?: string
  args?: Record<string, unknown>
  result?: unknown
  isError?: boolean
}

type AgentApiTargetState = {
  target: AgentApiTarget
  machineStatus: string | null
  hasMachine: boolean
  source: 'local' | 'shared_railway' | 'fly' | 'fallback'
}

@Injectable()
export class MissionOpenclawGateway {
  private readonly logger = new Logger(MissionOpenclawGateway.name)
  private readonly machineColumns = resolveMachineProfileColumns(process.env)
  private static readonly CALLBACK_SUFFIX = '/api/internal/missions/callback'
  private static readonly ENSURE_MACHINE_TIMEOUT_MS = Number.parseInt(
    process.env.MISSIONS_ENSURE_MACHINE_TIMEOUT_MS ?? String(285_000),
    10,
  )
  private readonly userAgentApiClient: UserAgentApiClient

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly agentRuntime: AgentRuntimeService,
    private readonly contextService: MissionContextService,
    private readonly stateRepo: MissionStateRepository,
    private readonly deliverablesRepo: MissionDeliverablesRepository,
    private readonly jsonService: MissionJsonService,
    private readonly missionTracing: MissionTracingService,
  ) {
    const gatewayToken = this.configService.get<string>('openclaw.gatewayToken') || ''
    this.userAgentApiClient = new UserAgentApiClient({
      logger: {
        log: (msg) => this.logger.log(msg),
        warn: (msg) => this.logger.warn(msg),
        error: (msg) => this.logger.error(msg),
      },
      probeReachable: (target) =>
        defaultProbeReachable(target, {
          gatewayToken,
          logger: {
            log: (msg) => this.logger.log(msg),
            warn: (msg) => this.logger.warn(msg),
            error: (msg) => this.logger.error(msg),
          },
        }),
      wakeMachine: async (userId) => {
        await this.wakeUserMachineIfNeeded(userId)
      },
      markMachineUnknown: async (userId) => {
        const supabase = this.databaseService.getClient()
        await supabase
          .from('profiles')
          .update({ [this.machineColumns.machineStatus]: 'unknown' })
          .eq('id', userId)
      },
    })
  }

  /**
   * Ensures the user's Fly runtime is up via API internal route (before OpenClaw / artifact calls).
   * No-op when MISSIONS_SKIP_MACHINE_WAKE=true or INTERNAL_API_TOKEN is unset.
   */
  async wakeUserMachineIfNeeded(userId: string): Promise<void> {
    if (this.shouldSkipMachineWake()) {
      return
    }
    const token =
      this.configService.get<string>('missionApi.internalToken') ||
      process.env.INTERNAL_API_TOKEN ||
      ''
    if (!token.trim()) {
      this.logger.warn(
        'wakeUserMachineIfNeeded skipped: INTERNAL_API_TOKEN / missionApi.internalToken unset',
      )
      return
    }
    const baseUrl = this.resolveBackendApiBaseUrl()
    const url = `${baseUrl}/api/internal/machines/ensure-running`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ user_id: userId }),
      signal: AbortSignal.timeout(MissionOpenclawGateway.ENSURE_MACHINE_TIMEOUT_MS),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Machine ensure-running failed (${res.status}): ${text.slice(0, 500)}`)
    }
  }

  /**
   * Public API kept for backward compatibility (mission-agent-state.service +
   * smoke tests). Delegates to the shared UserAgentApiClient (probe → wake →
   * 3 attempts → opens 5-min circuit on failure).
   *
   * @param _supabase reserved (kept for signature stability with prior callers)
   */
  async ensureUserMachineReachable(
    _supabase: SupabaseClient,
    userId: string,
    target: AgentApiTarget,
  ): Promise<void> {
    return this.userAgentApiClient.ensureReachable(userId, target)
  }

  /**
   * Helper for sibling services (e.g. MissionAgentStateService) that need to
   * call the user's agent-api with the same pin + retry behavior.
   */
  async fetchAgentApi(
    target: AgentApiTarget,
    path: string,
    init: RequestInit,
    opts?: { signal?: AbortSignal; timeoutMs?: number; logTag?: string },
  ): Promise<Response> {
    return this.userAgentApiClient.fetch(target, path, init, opts)
  }

  private async ensureAgentRuntimeReady(
    target: AgentApiTarget,
    mission: Record<string, any>,
    agentKey: string,
    gatewayAgentId: string,
    orgId: string | null,
    signal?: AbortSignal,
  ): Promise<void> {
    const readinessTimeoutMs =
      Number(this.configService.get<number>('missions.runtimeReadinessTimeoutMs')) || 120_000
    await this.userAgentApiClient.fetch(
      target,
      `/api/agents/${encodeURIComponent(agentKey)}/ensure-ready`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openclaw-internal': 'true',
          'x-correlation-id': String(mission.correlation_id ?? ''),
          'x-mission-id': String(mission.id ?? ''),
        },
        body: JSON.stringify({
          user_id: String(mission.user_id),
          org_id: orgId,
          gateway_agent_id: gatewayAgentId,
        }),
      },
      {
        signal,
        timeoutMs: readinessTimeoutMs,
        logTag: `runtime_ready mission=${mission.id} agent=${agentKey}`,
      },
    )
  }

  private resolveBackendApiBaseUrl(): string {
    const callback =
      this.configService.get<string>('missionApi.callbackUrl') ||
      process.env.MISSION_CALLBACK_URL ||
      ''
    if (callback.endsWith(MissionOpenclawGateway.CALLBACK_SUFFIX)) {
      return callback.slice(0, -MissionOpenclawGateway.CALLBACK_SUFFIX.length).replace(/\/+$/, '')
    }
    const fallback = process.env.BACKEND_URL || 'http://localhost:3001'
    return fallback.replace(/\/+$/, '')
  }

  private buildStaticMissionInstructions(mission: Record<string, any>): string {
    const agentToken =
      this.configService.get<string>('VIBEY_AGENT_TOKEN') ?? process.env.VIBEY_AGENT_TOKEN ?? ''
    return [
      `AGENT_TOKEN=${agentToken}`,
      `USER_ID=${mission.user_id}`,
      `ORG_ID=${mission.org_id ?? ''}`,
      `CAMPAIGN_ID=${mission.campaign_id ?? ''}`,
      `SPACE_ID=${mission.space_id ?? ''}`,
      `MISSION_ID=${mission.id}`,
    ].join('\n')
  }

  private buildMissionOpenClawInput(
    campaignContext: string,
    taskUserMessage: string,
  ): Array<{ type: 'message'; role: 'user' | 'assistant'; content: string }> {
    const items: Array<{ type: 'message'; role: 'user' | 'assistant'; content: string }> = []
    const ctx = campaignContext.trim()
    if (ctx.length > 0) {
      items.push({ type: 'message', role: 'user', content: `[CONTEXT]\n${ctx}` })
      items.push({ type: 'message', role: 'assistant', content: 'Context received.' })
    }
    items.push({ type: 'message', role: 'user', content: taskUserMessage })
    return items
  }

  private async buildMissionAttachmentContext(
    supabase: SupabaseClient,
    mission: Record<string, any>,
  ): Promise<string> {
    const missionId = String(mission.id ?? '')
    const userId = String(mission.user_id ?? '')
    if (!missionId || !userId) return ''
    const pathPrefix = `${userId}/${missionId}/`
    let q = supabase
      .from('media_assets')
      .select('id, name, original_filename, mime_type, file_size, page_count')
      .eq('user_id', userId)
      .eq('bucket_name', 'mission-attachments')
      .eq('source_surface', 'mission')
      .ilike('file_path', `${pathPrefix}%`)
      .order('created_at', { ascending: false })
      .limit(12)
    q = mission.org_id ? q.eq('org_id', mission.org_id) : q.is('org_id', null)
    const { data, error } = await q
    if (error || !data || data.length === 0) return ''
    const lines = [
      'MISSION ATTACHMENTS:',
      'Use read_document with asset_id for mission files instead of assuming extracted text exists.',
    ]
    for (const row of data as Array<Record<string, unknown>>) {
      const filename = String(row.original_filename ?? row.name ?? 'attachment')
      const mime = String(row.mime_type ?? 'unknown')
      const sizeBytes = Number(row.file_size ?? 0)
      const pageCount = row.page_count == null ? null : Number(row.page_count)
      lines.push(
        `- ${filename} | asset_id=${String(row.id)} | mime=${mime} | size=${sizeBytes} bytes${pageCount ? ` | pages=${pageCount}` : ''}`,
      )
    }
    return lines.join('\n')
  }

  private buildMissionHarnessReviewContext(plan: Record<string, any> | null | undefined): string {
    const content =
      plan?.content && typeof plan.content === 'object' && !Array.isArray(plan.content)
        ? (plan.content as Record<string, unknown>)
        : {}
    const harness =
      content.harness && typeof content.harness === 'object' && !Array.isArray(content.harness)
        ? (content.harness as Record<string, unknown>)
        : null
    if (!harness) return ''

    const contextSnapshot =
      harness.contextSnapshot &&
      typeof harness.contextSnapshot === 'object' &&
      !Array.isArray(harness.contextSnapshot)
        ? (harness.contextSnapshot as Record<string, unknown>)
        : null
    const assumptions = Array.isArray(harness.assumptions) ? harness.assumptions : []
    const assertions = Array.isArray(harness.assertions)
      ? (harness.assertions as Array<Record<string, unknown>>)
      : []
    const coverage = Array.isArray(harness.assertionCoverage)
      ? (harness.assertionCoverage as Array<Record<string, unknown>>)
      : []
    const validatorPlan = Array.isArray(harness.validatorPlan) ? harness.validatorPlan : []

    if (
      !contextSnapshot &&
      assumptions.length === 0 &&
      assertions.length === 0 &&
      coverage.length === 0 &&
      validatorPlan.length === 0
    ) {
      return ''
    }

    const assertionLines = assertions.slice(0, 60).map((assertion) => {
      const key = String(assertion.assertionKey || assertion.assertion_key || '').trim()
      const category = String(assertion.category || 'general')
      const priority = String(assertion.priority || 'must')
      const statement = String(assertion.statement || '').trim()
      const evidence = String(
        assertion.evidenceRequirement || assertion.evidence_requirement || '',
      ).trim()
      return `- ${key || 'A-?'} [${priority}/${category}] ${statement}${evidence ? ` | evidence: ${evidence}` : ''}`
    })

    return [
      '\nMISSION_HARNESS_CONTRACT:',
      contextSnapshot?.summary ? `Context snapshot: ${String(contextSnapshot.summary)}` : '',
      assumptions.length > 0 ? `Assumptions: ${JSON.stringify(assumptions).slice(0, 3000)}` : '',
      assertionLines.length > 0 ? `Assertions:\n${assertionLines.join('\n')}` : '',
      coverage.length > 0 ? `Coverage: ${JSON.stringify(coverage).slice(0, 3000)}` : '',
      validatorPlan.length > 0
        ? `Validator plan: ${JSON.stringify(validatorPlan).slice(0, 3000)}`
        : '',
      '',
      'Reviewer rule: approve only when the deliverables provide concrete evidence for must assertions. Failed must assertions need actionable feedback tied to assertion keys.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  async assertMissionHasCredits(supabase: SupabaseClient, mission: Record<string, any>) {
    const userId = String(mission.user_id ?? '').trim()
    const orgId = mission.org_id ? String(mission.org_id).trim() : ''
    if (!userId) throw new Error('credits_check_missing_user')

    if (orgId) {
      const { data: member, error: memberError } = await supabase
        .from('org_members')
        .select('id')
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle()
      if (memberError) throw new Error(memberError.message)
      if (member?.id) {
        const { data: limit, error: limitError } = await supabase
          .from('org_member_credit_limits')
          .select('period, credit_limit, credits_used')
          .eq('member_id', member.id)
          .maybeSingle()
        if (limitError) throw new Error(limitError.message)
        if (
          limit &&
          limit.period !== 'uncapped' &&
          Number(limit.credits_used ?? 0) >= Number(limit.credit_limit ?? 0)
        ) {
          throw new Error('org_credit_limit_reached')
        }
      }

      const remaining = await computeOrgCreditsRemaining(supabase, orgId)
      if (remaining <= 0) throw new Error('credits_exhausted')
      return
    }

    const remaining = await computePersonalCreditsRemaining(supabase, userId)
    if (remaining <= 0) throw new Error('credits_exhausted')
  }

  private parseOpenResponsesBody(parsed: Record<string, unknown>): {
    text: string
    usage: Record<string, unknown>
    id: string | null
  } {
    const status = parsed.status
    if (status === 'failed') {
      const err = parsed.error as { message?: string; code?: string } | undefined
      const meta =
        parsed.metadata && typeof parsed.metadata === 'object' && !Array.isArray(parsed.metadata)
          ? (parsed.metadata as Record<string, unknown>)
          : undefined
      const code = typeof err?.code === 'string' ? err.code : 'internal_error'
      const msg = err?.message || 'Agent response failed'
      const explicitRetryable = typeof meta?.retryable === 'boolean' ? meta.retryable : undefined
      const retryable = explicitRetryable ?? code !== 'tool_error'

      if (!retryable) {
        throw new OpenClawNonRetryableError(`Tool error: ${msg}`, code)
      }
      throw new Error(msg)
    }
    const output = parsed.output as
      | Array<{
          type?: string
          content?: Array<{ type?: string; text?: string }>
        }>
      | undefined
    let text = ''
    if (Array.isArray(output)) {
      for (const item of output) {
        if (item.type === 'message' && Array.isArray(item.content)) {
          text = item.content
            .filter((c) => c && c.type === 'output_text' && typeof c.text === 'string')
            .map((c) => c.text as string)
            .join('\n\n')
          break
        }
      }
    }
    return {
      text,
      usage: (parsed.usage as Record<string, unknown>) || {},
      id: typeof parsed.id === 'string' ? parsed.id : null,
    }
  }

  async callOpenClawForPlan(
    mission: Record<string, any>,
    managerKey: string,
  ): Promise<Record<string, unknown>> {
    const supabase = this.databaseService.getClient()
    const missionOrgId = (mission.org_id as string | null) ?? null
    let campaignAgents: Array<{ agent_key: string }> = []
    if (mission.campaign_id) {
      let caQ = supabase
        .from('campaign_agents')
        .select('agent_key')
        .eq('campaign_id', mission.campaign_id)
      if (missionOrgId) caQ = caQ.eq('org_id', missionOrgId)
      else caQ = caQ.eq('user_id', mission.user_id)
      const { data } = await caQ
      campaignAgents = data || []
    }
    const agentKeys = campaignAgents.map((a) => a.agent_key)
    const allowUnassigned = (mission.input as any)?.allow_unassigned_workers === true
    const useOrgWide = !mission.campaign_id || allowUnassigned || agentKeys.length === 0

    let agentsQuery = supabase
      .from('agents_registry')
      .select('agent_key, name, role, level, config')
      .neq('level', 'c_level')
      .neq('level', 'system')
    if (missionOrgId) {
      agentsQuery = agentsQuery.eq('org_id', missionOrgId).is('user_id', null)
    } else {
      agentsQuery = agentsQuery.eq('user_id', mission.user_id).is('org_id', null)
    }
    if (!useOrgWide && agentKeys.length > 0) {
      agentsQuery = agentsQuery.in('agent_key', agentKeys)
    }
    const { data: agents } = await agentsQuery

    const agentSkillsMap = new Map<string, string[]>()
    if (agents && agents.length > 0) {
      let skillsQ = supabase
        .from('agent_skills')
        .select('agent_key, name')
        .in(
          'agent_key',
          agents.map((a) => a.agent_key),
        )
        .eq('is_enabled', true)
      if (missionOrgId) {
        skillsQ = skillsQ.or(`org_id.eq.${missionOrgId},org_id.is.null`).is('user_id', null)
      } else {
        skillsQ = skillsQ.or(`user_id.eq.${mission.user_id},user_id.is.null`).is('org_id', null)
      }
      const { data: allSkills } = await skillsQ
      for (const skill of allSkills || []) {
        const list = agentSkillsMap.get(skill.agent_key) ?? []
        list.push(skill.name)
        agentSkillsMap.set(skill.agent_key, list)
      }
    }

    const agentWorkerList = (agents || [])
      .map((a) => {
        const skills = agentSkillsMap.get(a.agent_key) ?? []
        const skillsSuffix = skills.length > 0 ? ` [skills: ${skills.slice(0, 5).join(', ')}]` : ''
        const cfg =
          a.config && typeof a.config === 'object' && !Array.isArray(a.config)
            ? (a.config as Record<string, unknown>)
            : {}
        const capabilityDomain =
          typeof cfg.capability_domain === 'string' ? ` [domain: ${cfg.capability_domain}]` : ''
        const level = typeof a.level === 'string' ? ` [level: ${a.level}]` : ''
        return `"${a.agent_key}" (${a.name} — ${a.role}${level}${capabilityDomain}${skillsSuffix})`
      })
      .join(', ')

    const humansEnabled = process.env.HUMAN_SUBTASKS_ENABLED === 'true'
    let humanWorkerList = ''
    if (humansEnabled && missionOrgId) {
      const { data: humans } = await supabase
        .from('team_roster')
        .select('user_id, display_name, role_label, specialties, current_load')
        .eq('org_id', missionOrgId)
        .eq('kind', 'human')
        .eq('is_ready', true)
      humanWorkerList = (humans || [])
        .map((h) => {
          const specs =
            Array.isArray(h.specialties) && h.specialties.length > 0
              ? ` [specialties: ${(h.specialties as string[]).slice(0, 5).join(', ')}]`
              : ''
          const load = typeof h.current_load === 'number' ? ` [open: ${h.current_load}]` : ''
          return `"human:${h.user_id}" ([HUMAN] ${h.display_name} — ${h.role_label ?? 'teammate'}${specs}${load})`
        })
        .join(', ')
    }
    const workerList = [agentWorkerList, humanWorkerList].filter(Boolean).join(', ')
    const noCampaignWorkers =
      !!mission.campaign_id && !allowUnassigned && (campaignAgents?.length ?? 0) === 0
    const assignToLine = workerList
      ? `  "assignTo": one of: ${workerList}`
      : '  "assignTo": "vibey" (no workers available — return kind:"blocked" with feedback asking the user to assign workers to the campaign)'

    await this.assertMissionHasCredits(supabase, mission)
    const campaignContext = await this.contextService.buildCampaignContext(
      supabase,
      mission,
      managerKey,
    )
    let northStarBlock = ''
    if (mission.campaign_id) {
      const { data: campCtxRow } = await supabase
        .from('campaigns')
        .select('context')
        .eq('id', mission.campaign_id)
        .maybeSingle()
      const campCtx = (campCtxRow?.context || {}) as Record<string, string>
      northStarBlock = [
        '',
        'NORTH STAR STATUS:',
        `- Result: ${campCtx.result || 'NOT DEFINED'}`,
        `- Purpose: ${campCtx.purpose || 'NOT DEFINED'}`,
        `- Strategy: ${campCtx.strategy || 'NOT DEFINED'}`,
        '',
        'Before any autonomous action verify it does not violate the Off-Limits rules listed in campaign context.',
        'If Result, Purpose, or Strategy are NOT DEFINED and this is a proactive mission (no direct user request triggered it): respond with kind:"blocked" and guide the user to define their North Star first.',
      ].join('\n')
    }
    const noWorkersDirective = noCampaignWorkers
      ? '\nNO_CAMPAIGN_WORKERS: true. This campaign has no assigned workers. Return kind:"blocked" with feedback explaining this and asking the user to assign workers to the campaign first.'
      : ''
    const capabilityDirective = `
CAPABILITY ASSESSMENT:
Before assigning each subtask, evaluate whether the assigned worker has the skills and capability domain to execute it well.
If a subtask requires a durable artifact, align assignTo with outputContract.required_action and the worker capability domain.
Do not assign skill creation, brain writes, content publishing, or artifact creation to a worker whose listed domain/level makes that impossible.
If the best available worker is a poor fit for the mission type:
1. Still assign to the best available - never block work because of this
2. Include a top-level "capability_gap" object in your plan JSON:
   { "exists": true, "note": "brief explanation of the gap", "suggested_hire": "role name that would handle this better" }
If the team is well-suited, omit capability_gap or set exists:false.
`
    const brainMemoryRoutingDirective = [
      '',
      'BRAIN MEMORY ROUTING (critical for any mission that ingests, saves, moves, or archives knowledge):',
      'Vibey has durable brain layers plus active campaign/Space context. They are NOT interchangeable:',
      '1) USER brain (aka default brain / main brain / "my brain"): owner-wide; durable personal + business cognition. Typical tools: save_user_memory / crystallize_user_brain on the user (default) scope.',
      '2) AGENT brain (per worker, e.g. Atlas scholar / copywriter): expertise for ONE agent role. Typical tools: ingest_agent_brain_* after resolve_agent_brain — separate from user default brain.',
      '3) Campaign/Space context: project-specific working context. It is not a Brain tool target.',
      '',
      'Authoritative source: mission title + mission brief beat all other context. If the user says "main brain", "my brain", "user brain", or "default brain" → plan summary, approach, and EVERY subtask title + intent endState must reflect USER brain ingestion.',
      'If the user says "campaign brain", treat that as campaign/Space context and ask whether durable knowledge belongs in User Brain, Agent Brain, Customer Brain, or Company Brain.',
      'If they name a worker brain (e.g. copywriter brain, Atlas brain) → AGENT brain for that agent_key.',
      'Bias guard: Do NOT invent a campaign brain target just because campaign_id is present.',
      'If the brief is ambiguous between User Brain, Agent Brain, Customer Brain, Company Brain, or campaign/Space context, return kind:"blocked" and ask which layer they want — do not guess.',
    ].join('\n')

    const planningMissionControl = [
      '[MISSION_CONTROL — PLANNING MODE]',
      'You are the Manager agent for Vibey Mission Control.',
      "Your role is not just to plan tasks — it is to TRANSLATE the campaign's purpose into per-subtask intent so each worker produces from understanding, not instruction.",
      '',
      `Available workers on this team: ${workerList || 'none (you handle it)'}`,
      humanWorkerList
        ? 'HUMAN ASSIGNMENTS: Humans above are flagged [HUMAN]. Use "human:<user_id>" as assignTo. Only assign to humans listed here (they opted-in and have specialties set). If the task does not match anyone\'s specialties, prefer an agent teammate. A human subtask pauses the mission until they complete it, so only delegate to humans when their judgment or authority is actually required.'
        : '',
      'Break the mission into subtasks. Assign each to the best-fit worker based on their role.',
      'Subtasks can depend on other subtasks — use dependsOn to declare what must finish first.',
      'Subtasks with no dependencies can run in parallel by different agents.',
      '',
      'PLANNING PHASE IS REASONING-ONLY: YOU do not call tools during planning (no browsing, no fetching, no tool calls).',
      'However, your team members WILL have full access to all connected integrations, tools, and capabilities during execution — including Google Drive, image generation/editing, web browsing, and all vibey_backend actions.',
      'Plan subtasks that leverage these capabilities. Do NOT block just because YOU cannot access a resource right now — delegate it to a worker.',
      'If the mission includes a social URL/account/profile, delegate to a worker instead of researching it yourself.',
      '',
      'IMPORTANT: Be proactive. If details are missing, make smart creative decisions yourself.',
      'Only block if the mission is truly impossible without user input (e.g., "do something" with zero context).',
      'If details are missing but a good plan can proceed, write the assumption into harness.assumptions and make the assertion contract test the risky parts.',
      '',
      'To block (RARE — only when truly impossible):',
      '{ "kind": "blocked", "feedback": "Clear explanation of what the user needs to provide" }',
      '',
      'Otherwise, respond with ONLY valid JSON (no markdown, no backticks):',
      '{',
      '  "kind": "plan",',
      '  "title": "plan title",',
      '  "summary": "1-2 sentence summary of what will be delivered",',
      '  "approach": "how you will approach this mission",',
      '  "capability_gap": { "exists": false, "note": "", "suggested_hire": "" },',
      '  "harness": {',
      '    "contextSnapshot": {',
      '      "summary": "what campaign/customer/user context you used before planning",',
      '      "sources": [{"sourceType":"campaign_context|offer|avatar|theme|space|user_brain|company_brain|customer_brain|attachment|deliverable","title":"source name","confidence":"strong|medium|weak","summary":"grounded fact used"}],',
      '      "missing": ["important facts that were not available"],',
      '      "sufficiency": {"sufficientForPlan": true, "sufficientForValidation": true, "reason": "why"}',
      '    },',
      '    "clarificationQuestions": [{"questionKey":"Q-001","question":"question only if it changes the plan or validation","rationale":"why it matters","impact":"what changes if answered","required": false,"options": []}],',
      '    "assumptions": [{"assumptionKey":"AS-001","statement":"assumption made so work can proceed","confidence":"medium","impact":"what this affects"}],',
      '    "assertions": [{"assertionKey":"A-001","category":"strategy|avatar|offer|copy|design|workflow|integration|analytics|compliance|deliverable","statement":"what must be true at the end","priority":"must|should|could","validatorType":"scrutiny|user_testing|marketing_quality|data_integrity|human_review","evidenceRequirement":"specific evidence needed","failureSeverity":"blocker|major|minor"}],',
      '    "assertionCoverage": [{"assertionKey":"A-001","implementedBy":["st-1"],"verifiedBy":["marketing-quality-validator"],"rationale":"why this covers the assertion"}],',
      '    "validatorPlan": [{"validatorKey":"marketing-quality-validator","validatorType":"marketing_quality","assertionKeys":["A-001"],"evidenceRequired":"what the validator must cite"}]',
      '  },',
      '  "subtasks": [',
      '    {',
      '      "id": "st-1",',
      '      "title": "subtask title",',
      `      "assignTo": one of: ${workerList || '"vibey"'},`,
      '      "dependsOn": [],',
      '      "assertionKeys": ["A-001"],',
      '      "scheduledAt": null,',
      '      "intent": {',
      '        "why": "why this task exists in the campaign — the purpose it serves",',
      '        "story": "micro-narrative: who benefits and what they experience when this task is done well",',
      '        "sensory": "what success feels/looks/sounds like — the experiential evidence, not metrics",',
      '        "endState": "what is true in the world when this task is complete",',
      '        "ecology": "what other pieces this must harmonize with, what it must not break"',
      '      },',
      '      "outputContract": {',
      '        "artifact_kind": "agent_skill|document_artifact|presentation_artifact|brain_ingestion",',
      '        "required_action": "exact vibey_backend action required to create the output",',
      '        "required_artifact_type": "agent_skill|doc|presentation|brain_memory",',
      '        "expected": { "skill_key": "optional", "agent_key": "optional", "title": "optional" }',
      '      }',
      '    }',
      '  ],',
      '  "outOfScope": ["things not included"],',
      assignToLine,
      '}',
      '',
      'INTENT RULES (critical):',
      '- Every subtask MUST have an intent object with all 5 fields: why, story, sensory, endState, ecology.',
      '- "why" comes from the campaign purpose — translate it into why THIS specific task matters.',
      '- "story" is a micro-narrative: place the task inside a human experience. Who encounters the output? What do they feel?',
      '- "sensory" defines success experientially — not "500 words" but "reader pauses, feels understood, clicks through."',
      '- "endState" is what the world looks like when done — the state change, not the deliverable description.',
      '- "ecology" is how this piece fits with other subtasks and the campaign as a whole.',
      '',
      'MISSION HARNESS RULES (critical):',
      '- Create harness.assertions before subtasks conceptually, then make subtasks cover those assertions.',
      '- Assertions are not generic quality wishes. They are specific statements that a validator can prove true or false.',
      '- Every "must" assertion must appear in harness.assertionCoverage with implementedBy and verifiedBy.',
      '- Every subtask should include assertionKeys for the assertions it is responsible for implementing.',
      '- For marketing missions, include assertions for avatar specificity, offer clarity, proof, anti-generic-AI copy, brand voice, conversion path, and functional delivery.',
      '- The validatorPlan must include at least marketing_quality for creative/copy work and scrutiny for artifact/form/integration work.',
      '- Clarification questions are non-blocking in this first harness slice. If a question is truly required, return kind:"blocked" instead of plan.',
      '',
      'OUTPUT CONTRACT RULES (critical):',
      '- Every subtask that must produce a durable artifact MUST include outputContract.',
      '- Use agent_skill when the user asked for a callable agent skill. required_action=create_agent_skill and required_artifact_type=agent_skill.',
      '- Use document_artifact when the user asked for markdown/docs/files. required_action=save_document and required_artifact_type=doc. For Word DOCX output, use required_action=create_docx and required_artifact_type=file with expected.mime_type=application/vnd.openxmlformats-officedocument.wordprocessingml.document.',
      '- Use presentation_artifact only when the requested deliverable is actually a presentation/deck. Do not use it as a fallback for docs or skills.',
      '- The worker will verify this contract in code. If the expected artifact is missing, the subtask will not be marked done.',
      brainMemoryRoutingDirective,
      '',
      'SUBTASK RULES:',
      '- Each subtask has a unique id (st-1, st-2, etc.), a title, an assignTo (agent key), dependsOn, scheduledAt, and intent.',
      '- If subtask B needs the output of subtask A, set dependsOn: ["st-1"] on subtask B.',
      '- If two subtasks are independent, leave dependsOn empty on both — they will run in parallel.',
      '- Always include at least one subtask.',
      '- assignTo is required on every subtask. The top-level assignTo is the default fallback.',
      '',
      'SCHEDULING RULES:',
      '- scheduledAt is an ISO-8601 timestamp or null. When set, the subtask will not execute before that time even if dependencies are satisfied.',
      `- The mission scheduled_at is: ${mission.scheduled_at || 'not set (immediate execution)'}.`,
      '- If the mission has a scheduled_at or the user brief mentions a specific time, plan subtask timings accordingly.',
      '- Work backwards from the target delivery time. The final delivery subtask should have scheduledAt matching the mission target.',
      '- Preparation subtasks should be scheduled earlier (20-60 min before depending on complexity).',
      '- If no time constraint exists, leave scheduledAt as null on all subtasks (immediate execution).',
      noWorkersDirective,
      capabilityDirective,
      northStarBlock,
    ].join('\n')

    const planUserComments = await this.stateRepo.getRecentUserComments(
      supabase,
      mission.id,
      mission.user_id,
      mission.org_id ?? null,
    )
    const planCommentsCtx =
      planUserComments.length > 0
        ? '\n\nUser Comments:\n' + planUserComments.map((c) => `- ${c}`).join('\n')
        : ''

    let replanContextBlock = ''
    const rawInput =
      mission.input && typeof mission.input === 'object' && !Array.isArray(mission.input)
        ? (mission.input as Record<string, unknown>)
        : {}
    const replanCtx = rawInput._replan_context as
      | { reason?: string; cancelled_subtask_count?: number }
      | undefined
    if (replanCtx?.reason) {
      const { data: doneSubs } = await supabase
        .from('mission_subtasks')
        .select('title, output')
        .eq('mission_id', mission.id)
        .eq('status', 'done')
        .order('sort_order', { ascending: true })
        .limit(10)
      const doneContext =
        doneSubs && doneSubs.length > 0
          ? doneSubs
              .map(
                (s) =>
                  `- "${s.title}": ${typeof s.output === 'object' ? JSON.stringify(s.output).slice(0, 200) : String(s.output || '').slice(0, 200)}`,
              )
              .join('\n')
          : '(none)'
      replanContextBlock = [
        '\n[REPLAN CONTEXT]',
        `This mission is being replanned. ${replanCtx.cancelled_subtask_count || 0} incomplete subtask(s) were cancelled.`,
        `Reason for replan: ${replanCtx.reason}`,
        `Already-completed work (reuse, do not redo):`,
        doneContext,
        'Focus your new plan on addressing the specific change above. Completed subtask outputs are available to new subtasks via dependsOn.',
      ].join('\n')
    }

    const taskUserMessage = [
      planningMissionControl,
      '',
      'Read skills/mission-planner/SKILL.md',
      '',
      '[MISSION_PLAN]',
      `Mission title: ${mission.title}`,
      `Mission brief: ${mission.brief || ''}`,
      `Priority: ${mission.priority || 'medium'}`,
      replanContextBlock,
      planCommentsCtx,
    ]
      .filter(Boolean)
      .join('\n')

    const planExecOptions: OpenClawExecOptions | undefined =
      managerKey === 'vibey' ? { identitySuffix: '-CEO' } : undefined

    const firstAttempt = await this.callOpenClawRaw(
      mission,
      managerKey,
      campaignContext,
      taskUserMessage,
      undefined,
      'mission_plan',
      planExecOptions,
    )
    const firstParsed = this.jsonService.tryParseJsonStrict(firstAttempt.content as string)
    if (firstParsed) return firstParsed

    const retryTaskUserMessage = [
      taskUserMessage,
      '',
      'FORMAT_RETRY:',
      'Your previous response was not valid JSON.',
      'Return ONLY valid JSON that matches the required planning schema.',
      'Do not include explanations, markdown, or tool error text.',
    ].join('\n')
    const secondAttempt = await this.callOpenClawRaw(
      mission,
      managerKey,
      campaignContext,
      retryTaskUserMessage,
      undefined,
      'mission_plan',
      planExecOptions,
    )
    const secondParsed = this.jsonService.tryParseJsonStrict(secondAttempt.content as string)
    if (secondParsed) return secondParsed

    throw new Error(
      `Invalid JSON response after 2 rounds: ${(secondAttempt.content as string).trim().slice(0, 200)}`,
    )
  }

  async callOpenClawForExecution(
    mission: Record<string, any>,
    plan: Record<string, any> | null,
  ): Promise<Record<string, unknown>> {
    const agentKey = String(mission.assigned_agent_key || mission.current_agent_key || 'vibey')
    const supabase = this.databaseService.getClient()
    const planContext = plan?.content
      ? `\n\nExecution Plan:\n${JSON.stringify(plan.content, null, 2)}`
      : ''
    await this.assertMissionHasCredits(supabase, mission)
    const campaignContext = await this.contextService.buildCampaignContext(
      supabase,
      mission,
      agentKey,
    )

    const priorDeliverable = await this.deliverablesRepo.getExistingDeliverable(
      supabase,
      mission.id,
    )
    const isRevision = !!priorDeliverable
    const feedbackNote =
      mission.progress_notes && mission.progress_notes.startsWith('Revision requested:')
        ? `\n\nManager Feedback:\n${mission.progress_notes}`
        : ''
    const priorWorkContext = priorDeliverable
      ? `\n\nYour Previous Deliverable (needs revision):\n${priorDeliverable}`
      : ''

    const executionMissionControl = [
      '[MISSION_CONTROL — EXECUTION MODE]',
      `You are the ${agentKey} agent for Vibey Mission Control.`,
      isRevision
        ? 'Your previous work was reviewed and needs revision. Read the feedback carefully and improve your output.'
        : 'Execute the assigned mission and produce structured output.',
      'You are the author of the final artifact. Do not rely on backend rewriting for quality.',
      '',
      'DELIVERABLE PUBLISHING (MANDATORY):',
      'You MUST call save_document (or create_pdf, create_docx, generate_image, generate_video) via vibey_backend tools to publish your final deliverable.',
      'The "content" field in your JSON response is for internal tracking only — it will NOT be shown to the user.',
      'If you do not call save_document, no deliverable is created and the user sees nothing.',
      'Do NOT put full source code, TSX, page files, or implementation code in the content field — those are not deliverables.',
      'If you generate a video, poll get_video_status until final status and include the final deliverable_id.',
      '',
      'Only include memory_update when you discovered a durable, campaign-specific insight about brand, audience, offer, positioning, or constraints.',
      'Never use praise in memory_update (no "good job", "well written", or generic quality comments).',
      'If there is no durable insight, set memory_update to an empty string.',
      'Respond with ONLY valid JSON (no markdown, no backticks):',
      '{ "content": "short internal summary of what you did", "summary": "brief summary", "memory_update": "what I learned", "artifact_manifest": [{"deliverable_id":"uuid","action":"save_document|create_pdf|create_docx|generate_image|generate_video|create_offer|create_funnel|create_website|create_presentation|create_sequence|create_blog_post|create_social_post|create_ad|create_avatar","type":"doc|pdf|file|image|video|offer|funnel|website|presentation|sequence|blog_post|social_post|ad|avatar","title":"artifact title","file_url":"optional"}] }',
    ].join('\n')

    const userComments = await this.stateRepo.getRecentUserComments(
      supabase,
      mission.id,
      mission.user_id,
      mission.org_id ?? null,
    )
    const commentsContext =
      userComments.length > 0
        ? '\n\nUser Comments:\n' + userComments.map((c) => `- ${c}`).join('\n')
        : ''
    const taskUserMessage = [
      executionMissionControl,
      '',
      'Read skills/mission-worker-executor/SKILL.md',
      '',
      '[MISSION_EXECUTE]',
      `Mission title: ${mission.title}`,
      `Mission brief: ${mission.brief || ''}`,
      `Priority: ${mission.priority || 'medium'}`,
      planContext,
      feedbackNote,
      priorWorkContext,
      commentsContext,
    ]
      .filter(Boolean)
      .join('\n')

    const execExecOptions: OpenClawExecOptions | undefined =
      agentKey === 'vibey' ? { identitySuffix: '-CEO' } : undefined

    const result = await this.callOpenClawRaw(
      mission,
      agentKey,
      campaignContext,
      taskUserMessage,
      undefined,
      'mission_execute',
      execExecOptions,
    )
    return {
      raw_content: result.content,
      ...this.jsonService.tryParseJson(result.content as string),
    }
  }

  async callOpenClawForStep(
    mission: Record<string, any>,
    plan: Record<string, any>,
    step: { id: string; title: string },
    priorWork: string,
    agentKey: AgentKey,
  ): Promise<Record<string, unknown>> {
    const supabase = this.databaseService.getClient()
    const planSummary = (plan?.content as any)?.summary || ''
    const priorContext = priorWork ? `\n\nWork completed so far:\n${priorWork}` : ''

    await this.assertMissionHasCredits(supabase, mission)
    const campaignContext = await this.contextService.buildCampaignContext(
      supabase,
      mission,
      agentKey,
      step.title,
    )
    const userComments = await this.stateRepo.getRecentUserComments(
      supabase,
      mission.id,
      mission.user_id,
      mission.org_id ?? null,
    )
    const commentsContext =
      userComments.length > 0
        ? `\n\nUser Comments:\n${userComments.map((c) => `- ${c}`).join('\n')}`
        : ''
    const priorDeliverable = await this.deliverablesRepo.getExistingDeliverable(
      supabase,
      mission.id,
    )
    const isRevision = !!priorDeliverable
    const feedbackNote =
      mission.progress_notes && mission.progress_notes.startsWith('Revision requested:')
        ? `\n\nManager Feedback:\n${mission.progress_notes}`
        : ''
    const priorDeliverableContext = priorDeliverable
      ? `\n\nYour Previous Deliverable (revise based on feedback):\n${priorDeliverable}`
      : ''

    const stepMissionControl = [
      '[MISSION_CONTROL — EXECUTE_STEP MODE]',
      `You are the ${agentKey} agent for Vibey Mission Control.`,
      isRevision
        ? 'Your previous work was reviewed and needs revision. Read the feedback carefully and improve this step.'
        : 'Execute ONLY the current step. Build on any prior work provided.',
      'Produce the deliverable for this step. Be thorough but focused.',
      '',
      'DELIVERABLE PUBLISHING (MANDATORY):',
      'You MUST call save_document (or create_pdf, create_docx, generate_image, generate_video) via vibey_backend tools to publish your final deliverable for this step.',
      'If you do not call a publishing tool, no deliverable is created and the user sees nothing.',
      'Do NOT put full source code, TSX, page files, or implementation code in your response — those are not deliverables.',
      '',
      'Respond with your output directly (plain text or structured content). No JSON wrapper needed.',
    ].join('\n')

    const taskUserMessage = [
      stepMissionControl,
      '',
      'Read skills/mission-worker-executor/SKILL.md',
      '',
      '[MISSION_EXECUTE_STEP]',
      `Mission: ${mission.title}`,
      `Brief: ${mission.brief || ''}`,
      `Priority: ${mission.priority || 'medium'}`,
      `Plan summary: ${planSummary}`,
      ``,
      `Current step: ${step.title}`,
      priorContext,
      feedbackNote,
      commentsContext,
      priorDeliverableContext,
    ]
      .filter(Boolean)
      .join('\n')

    return this.callOpenClawRaw(
      mission,
      agentKey,
      campaignContext,
      taskUserMessage,
      undefined,
      'mission_execute',
    )
  }

  async callOpenClawForReview(
    mission: Record<string, any>,
    plan: Record<string, any> | null,
    managerKey: string,
  ): Promise<Record<string, unknown>> {
    const supabase = this.databaseService.getClient()
    const planContext = plan?.content
      ? `\n\nOriginal Plan:\n${JSON.stringify(plan.content, null, 2)}`
      : ''
    const harnessContext = this.buildMissionHarnessReviewContext(plan)
    const outputContext = mission.output
      ? `\n\nWorker Output:\n${JSON.stringify(mission.output, null, 2)}`
      : ''
    await this.assertMissionHasCredits(supabase, mission)
    const campaignContext = await this.contextService.buildCampaignContext(
      supabase,
      mission,
      managerKey,
    )

    const reviewMissionControl = [
      '[MISSION_CONTROL — REVIEW MODE]',
      "You are the Manager agent reviewing a worker's output.",
      'Assess if the output meets the mission requirements, plan, and mission harness assertions.',
      'You have these options:',
      '1. Approve — output meets requirements.',
      '2. Reject — output needs revision, send back to worker.',
      '3. Block — mission cannot proceed, requires user input.',
      '4. Amend scope — if user comments indicate a change, you may update mission fields, add subtasks, or trigger a full replan.',
      '',
      'Respond with ONLY valid JSON (no markdown, no backticks):',
      '{',
      '  "approved": true/false, "blocked": true/false,',
      '  "feedback": "your feedback or blocker reason",',
      '  "qualityScore": 1-10,',
      '  "dimensionScores": {',
      '    "intent_alignment": 1-10,',
      '    "craft": 1-10,',
      '    "originality": 1-10,',
      '    "brand_coherence": 1-10,',
      '    "completeness": 1-10',
      '  },',
      '  "missionUpdates": { "title": "...", "brief": "..." },  // optional — only if user comment changes scope',
      '  "fullReplan": false,  // set true ONLY when the approach must fundamentally change',
      '  "replanReason": "..."  // required when fullReplan is true',
      '}',
    ].join('\n')

    const reviewUserComments = await this.stateRepo.getRecentUserComments(
      supabase,
      mission.id,
      mission.user_id,
      mission.org_id ?? null,
    )
    const reviewCommentsCtx =
      reviewUserComments.length > 0
        ? '\n\nUser Comments:\n' + reviewUserComments.map((c) => `- ${c}`).join('\n')
        : ''
    const taskUserMessage = [
      reviewMissionControl,
      '',
      'Read skills/mission-reviewer/SKILL.md',
      '',
      '[MISSION_REVIEW]',
      `Mission title: ${mission.title}`,
      `Mission brief: ${mission.brief || ''}`,
      `Priority: ${mission.priority || 'medium'}`,
      planContext,
      harnessContext,
      outputContext,
      reviewCommentsCtx,
    ]
      .filter(Boolean)
      .join('\n')

    const result = await this.callOpenClawRaw(
      mission,
      managerKey,
      campaignContext,
      taskUserMessage,
      undefined,
      'mission_review',
    )
    return this.jsonService.tryParseJson(result.content as string)
  }

  async callOpenClawForSubtaskReview(
    mission: Record<string, any>,
    plan: Record<string, any> | null,
    subtasks: Array<Record<string, any>>,
    managerKey: string,
    userComments: string[],
  ): Promise<Record<string, unknown>> {
    const supabase = this.databaseService.getClient()
    await this.assertMissionHasCredits(supabase, mission)
    const campaignContext = await this.contextService.buildCampaignContext(
      supabase,
      mission,
      managerKey,
    )

    const subtaskContext = subtasks
      .map((st, i) => {
        const output = st.output ? JSON.stringify(st.output, null, 2) : '(no output)'
        const intent = (st.intent || {}) as Record<string, string>
        const intentBlock = intent.why
          ? `\nIntent:\n  WHY: ${intent.why}\n  STORY: ${intent.story}\n  SENSORY: ${intent.sensory}\n  END-STATE: ${intent.endState}\n  ECOLOGY: ${intent.ecology}`
          : ''
        return `\n### Subtask ${i + 1}: ${st.title}\nAssigned to: ${st.assigned_agent_key || 'unknown'}\nStatus: ${st.status}${intentBlock}\nOutput:\n${output}`
      })
      .join('\n')
    const harnessContext = this.buildMissionHarnessReviewContext(plan)
    const commentsContext =
      userComments.length > 0
        ? '\n\nUser Comments:\n' + userComments.map((c) => `- ${c}`).join('\n')
        : ''
    const subtaskIds = subtasks.map((st) => `"${st.id}"`).join(', ')

    const subtaskReviewMissionControl = [
      '[MISSION_CONTROL — SUBTASK_REVIEW MODE]',
      'You are the Manager agent reviewing subtask deliverables.',
      'Review each subtask individually. You can approve some and reject others.',
      '',
      'REVIEW CRITERIA:',
      "1. Does this deliverable carry the intent through? Check against the subtask's Intent (WHY, STORY, SENSORY, END-STATE, ECOLOGY).",
      '2. If someone experiences this output, will they feel what the sensory evidence describes?',
      '3. Does the output move the world toward the end-state?',
      '4. Does it harmonize with the ecology — the other pieces and the campaign as a whole?',
      '5. Does it satisfy the mission harness assertions it is responsible for, with evidence?',
      '6. Standard quality: completeness, clarity, accuracy.',
      '',
      'For rejected subtasks, provide specific feedback referencing which intent layer or assertion key was missed.',
      'Optionally reassign to a different agent.',
      '',
      'SCOPE CHANGE (use when user comments request changes):',
      '- "missionUpdates": { "title": "...", "brief": "..." } — optional, patch mission text.',
      '- "addSubtasks": [{"id": "new-1", "title": "...", "assignTo": "agent_key", "dependsOn": [], "intent": {...}}] — optional, max 5, append new work.',
      '- "fullReplan": true + "replanReason": "..." — ONLY when the entire approach must change. Cancels incomplete subtasks and re-plans from scratch.',
      'If fullReplan is true, subtaskReviews are ignored (all non-done work will be cancelled).',
      '',
      'Respond with ONLY valid JSON (no markdown, no backticks):',
      '{',
      `  "subtaskReviews": [{"subtaskId": one of [${subtaskIds}], "approved": true/false, "intentAlignment": true/false, "feedback": "...", "reassignTo": "agent_key or omit"}],`,
      '  "qualityScore": 1-10,',
      '  "dimensionScores": {',
      '    "intent_alignment": 1-10,',
      '    "craft": 1-10,',
      '    "originality": 1-10,',
      '    "brand_coherence": 1-10,',
      '    "completeness": 1-10',
      '  },',
      '  "missionUpdates": { ... },  // optional',
      '  "addSubtasks": [ ... ],  // optional, max 5',
      '  "fullReplan": false,  // optional',
      '  "replanReason": "..."  // required when fullReplan is true',
      '}',
    ].join('\n')

    const taskUserMessage = [
      subtaskReviewMissionControl,
      '',
      'Read skills/mission-reviewer/SKILL.md',
      '',
      '[MISSION_SUBTASK_REVIEW]',
      `Mission title: ${mission.title}`,
      `Mission brief: ${mission.brief || ''}`,
      `Priority: ${mission.priority || 'medium'}`,
      harnessContext,
      subtaskContext,
      commentsContext,
    ]
      .filter(Boolean)
      .join('\n')

    const result = await this.callOpenClawRaw(
      mission,
      managerKey,
      campaignContext,
      taskUserMessage,
      undefined,
      'mission_review',
    )
    return this.jsonService.tryParseJson(result.content as string)
  }

  async callOpenClawForSubtaskTriage(
    mission: Record<string, any>,
    plan: Record<string, any> | null,
    blockedSubtask: Record<string, any>,
    siblingSubtasks: Array<Record<string, unknown>>,
    managerKey: string,
    userComments: string[],
  ): Promise<Record<string, unknown>> {
    const supabase = this.databaseService.getClient()
    await this.assertMissionHasCredits(supabase, mission)
    const campaignContext = await this.contextService.buildCampaignContext(
      supabase,
      mission,
      managerKey,
    )

    const planSummary = plan?.content
      ? JSON.stringify(plan.content, null, 2).slice(0, 8000)
      : '(no plan)'

    const blockedIntent = (blockedSubtask.intent || {}) as Record<string, string>
    const intentBlock = blockedIntent.why
      ? `\nIntent:\n  WHY: ${blockedIntent.why}\n  STORY: ${blockedIntent.story}\n  SENSORY: ${blockedIntent.sensory}\n  END-STATE: ${blockedIntent.endState}\n  ECOLOGY: ${blockedIntent.ecology}`
      : ''

    const siblingLines = siblingSubtasks
      .map((st) => {
        const id = String(st.id || '')
        const title = String(st.title || '')
        const status = String(st.status || '')
        const ag = String(st.assigned_agent_key || '—')
        const mark = id === String(blockedSubtask.id) ? ' ← BLOCKED (this one)' : ''
        return `- ${id} | ${status} | ${title} | assign=${ag}${mark}`
      })
      .join('\n')

    const commentsContext =
      userComments.length > 0
        ? '\n\nUser comments:\n' + userComments.map((c) => `- ${c}`).join('\n')
        : ''

    const triageMissionControl = [
      '[MISSION_CONTROL — SUBTASK_TRIAGE MODE]',
      'You are the Manager. A subtask failed or is blocked during execution.',
      'Choose exactly one decision for THIS subtask.',
      '',
      'Decisions:',
      '- retry — same agent, re-run the subtask',
      '- reassign — set field reassignTo (agent_key) then execution will retry with that agent',
      '- cancel — cancel this subtask (dependents are cancelled by the system)',
      '- replace — cancel this subtask and append replacement subtasks (addSubtasks array, same shape as planning subtasks: id, title, assignTo, dependsOn?, intent)',
      '- replan — full mission replan (set replanReason)',
      '- escalate — mission blocked for user (set escalateMessage)',
      '',
      'Respond with ONLY valid JSON (no markdown, no backticks):',
      '{',
      '  "decision": "retry|reassign|cancel|replace|replan|escalate",',
      '  "reassignTo": "agent_key optional",',
      '  "feedback": "short rationale",',
      '  "addSubtasks": [ ... ]  // only for replace',
      '  "replanReason": "..."  // only for replan',
      '  "escalateMessage": "..."  // only for escalate',
      '}',
    ].join('\n')

    const taskUserMessage = [
      triageMissionControl,
      '',
      'Read skills/mission-triage/SKILL.md',
      '',
      '[SUBTASK_TRIAGE]',
      `Mission title: ${mission.title}`,
      `Mission brief: ${mission.brief || ''}`,
      `Priority: ${mission.priority || 'medium'}`,
      '',
      'Plan summary:',
      planSummary,
      '',
      'Blocked subtask:',
      `Title: ${blockedSubtask.title}`,
      `Assigned: ${blockedSubtask.assigned_agent_key || 'unknown'}`,
      `Status: ${blockedSubtask.status}`,
      `Feedback / error context: ${String(blockedSubtask.feedback || '').slice(0, 2000)}`,
      intentBlock,
      '',
      'Sibling subtasks:',
      siblingLines || '- none',
      commentsContext,
    ]
      .filter(Boolean)
      .join('\n')

    const result = await this.callOpenClawRaw(
      mission,
      managerKey,
      campaignContext,
      taskUserMessage,
      undefined,
      'mission_review',
    )
    const parsed =
      this.jsonService.tryParseJsonStrict(String(result.content || '')) ||
      this.jsonService.tryParseJson(String(result.content || ''))
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Triage: model returned non-JSON')
    }
    return parsed as Record<string, unknown>
  }

  async callOpenClawForCommentDirective(
    mission: Record<string, any>,
    plan: Record<string, any> | null,
    subtasks: Array<Record<string, unknown>>,
    triggeringComment: string,
    commentLogId: string | null,
    fromStatus: string | undefined,
    userComments: string[],
  ): Promise<Record<string, unknown>> {
    const supabase = this.databaseService.getClient()
    const vibeyKey = 'vibey'
    await this.assertMissionHasCredits(supabase, mission)
    const campaignContext = await this.contextService.buildCampaignContext(
      supabase,
      mission,
      vibeyKey,
    )

    const planSummary = plan?.content
      ? JSON.stringify(plan.content, null, 2).slice(0, 8000)
      : '(no plan)'

    const subtaskLines = subtasks
      .map((st) => {
        const id = String(st.id || '')
        const title = String(st.title || '')
        const status = String(st.status || '')
        const ag = String(st.assigned_agent_key || '—')
        return `- ${id} | ${status} | ${title} | assign=${ag}`
      })
      .join('\n')

    const commentsContext =
      userComments.length > 0
        ? '\n\nRecent user comments (chronological):\n' +
          userComments.map((c) => `- ${c}`).join('\n')
        : ''

    const missionIsDone = String(mission.status || '') === 'done'

    const directiveMissionControl = [
      '[MISSION_CONTROL — USER_COMMENT_DIRECTIVE MODE]',
      missionIsDone
        ? 'You are Vibey, the mission orchestrator. This mission was previously completed. The user is sending a new directive — they want additional work done on this mission. The mission will be automatically reopened when you return structural actions.'
        : 'You are Vibey, the mission orchestrator. The user has given you a directive on an active mission.',
      'Read the triggering comment below as a binding instruction — it is a hard constraint, not optional context.',
      'Look at the current mission and subtasks and decide what actions to take.',
      '',
      ...(missionIsDone
        ? [
            'IMPORTANT: This mission status is "done" but the user is requesting new work.',
            'You MUST take action — do NOT return empty actions or note_only unless the user is truly only saying thanks.',
            'For new tasks: use create_subtask to add new work (the mission will reopen automatically).',
            'For redoing existing work: use retry_subtask on a done subtask, or replan if the approach needs to change entirely.',
            '',
          ]
        : []),
      'You may return one or more actions in order. Valid action types:',
      '- cancel_subtask — { "type": "cancel_subtask", "subtask_id": "<uuid>" } — immediately stops a running agent for that subtask (saves tokens); use for in_progress work you want to kill',
      '- create_subtask — { "type": "create_subtask", "title": "...", "assignTo": "agent_key", "intent": { "why","story","sensory","endState","ecology" }, "dependsOn": ["uuid"] optional }',
      '- edit_subtask — { "type": "edit_subtask", "subtask_id": "<uuid>", "title"?, "assigned_agent_key"?, "intent"? (partial fields ok) } — allowed for any subtask status except cancelled; if the subtask is in_progress, the agent will be interrupted',
      '- reassign_subtask — { "type": "reassign_subtask", "subtask_id": "<uuid>", "assignTo": "agent_key" } (edit assignee + retry); for in_progress subtasks the previous agent is stopped immediately',
      '- retry_subtask — { "type": "retry_subtask", "subtask_id": "<uuid>" } — for blocked, done, or revision: sends the subtask back for another execution cycle (iterate on done work with new feedback)',
      '- amend_mission — { "type": "amend_mission", "title"?, "brief"?, "priority"? ("low"|"medium"|"high"|"urgent") }',
      '- replan — { "type": "replan", "reason": "..." } — cancels incomplete subtasks and triggers full replan; use when the approach must change',
      '- approve_mission — { "type": "approve_mission", "feedback": "..." } — marks mission as done/complete; only use when ALL active subtasks are done AND the user explicitly asks to approve/complete/finish the mission, or when reviewing and all deliverables are satisfactory',
      '- note_only — { "type": "note_only", "message": "..." } — user message is feedback only; no structural changes',
      '',
      'For in_progress work you want to stop and redo differently: cancel_subtask then create_subtask is the cleanest path.',
      'If the user is only giving feedback or thanks with no change requested, use a single note_only action.',
      'Respond with ONLY valid JSON (no markdown, no backticks):',
      '{ "actions": [ ... ], "rationale": "short explanation" }',
    ].join('\n')

    const taskUserMessage = [
      directiveMissionControl,
      '',
      '[COMMENT_DIRECTIVE]',
      `Mission id: ${mission.id}`,
      `Mission status: ${String(mission.status || '')}`,
      fromStatus && fromStatus !== String(mission.status || '')
        ? `Status when user commented: ${fromStatus}`
        : '',
      `Mission title: ${mission.title}`,
      `Mission brief: ${mission.brief || ''}`,
      `Priority: ${mission.priority || 'medium'}`,
      '',
      'Plan summary:',
      planSummary,
      '',
      'Subtasks:',
      subtaskLines || '- none',
      commentsContext,
      '',
      'Triggering comment (binding):',
      triggeringComment || '(empty)',
      commentLogId ? `Comment log id: ${commentLogId}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const result = await this.callOpenClawRaw(
      mission,
      vibeyKey,
      campaignContext,
      taskUserMessage,
      undefined,
      'mission_review',
    )
    const parsed =
      this.jsonService.tryParseJsonStrict(String(result.content || '')) ||
      this.jsonService.tryParseJson(String(result.content || ''))
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Comment directive: model returned non-JSON')
    }
    return parsed as Record<string, unknown>
  }

  async callOpenClawForQualityEval(
    mission: Record<string, any>,
    subtasks: Array<Record<string, any>>,
    plan?: Record<string, any> | null,
  ): Promise<Record<string, unknown>> {
    const supabase = this.databaseService.getClient()
    const vibeyKey = 'vibey'
    await this.assertMissionHasCredits(supabase, mission)
    const campaignContext = await this.contextService.buildCampaignContext(
      supabase,
      mission,
      vibeyKey,
    )

    const deliverableContext = subtasks
      .map((st, i) => {
        const output = st.output ? JSON.stringify(st.output, null, 2) : '(no output)'
        return `\n### Deliverable ${i + 1}: ${st.title}\nAssigned to: ${st.assigned_agent_key || 'unknown'}\nOutput:\n${output}`
      })
      .join('\n')
    const harnessContext = this.buildMissionHarnessReviewContext(plan)

    const qualityEvalPrompt = [
      '[MISSION_CONTROL — QUALITY EVALUATION MODE]',
      'You are Vibey, acting as an independent quality evaluator.',
      'You are evaluating deliverables for a mission. You did NOT plan or manage this work.',
      'Judge purely on whether the output serves the mission brief well.',
      '',
      'Read skills/mission-quality-evaluator/SKILL.md',
      '',
      'STEP 1 — DYNAMIC RUBRIC:',
      'Read the mission brief below. Generate 3-5 evaluation criteria specific to this type of deliverable.',
      'For example, a financial report needs: data accuracy, time coverage, insight depth, presentation.',
      'A website needs: design coherence, copy quality, functional completeness, brand alignment.',
      '',
      'STEP 2 — SCORE EACH CRITERION:',
      'Score each criterion you generated on a 1-10 scale using the behavioral anchors in your evaluator skill.',
      'Every score MUST cite specific evidence from the deliverable. No score without a receipt.',
      '',
      'STEP 3 — VERIFY CLAIMS:',
      'Extract claims the deliverable makes about itself (e.g. "comprehensive 5-year analysis").',
      'Verify each claim against the actual content. Flag any unsubstantiated claims.',
      '',
      'STEP 4 — VERIFY MISSION HARNESS ASSERTIONS:',
      'If a mission harness contract is provided, evaluate every must assertion and cite concrete evidence or mark it failed.',
      '',
      'STEP 5 — STRENGTHS AND WEAKNESSES:',
      'List specific strengths and weaknesses with citations. Even excellent work has weaknesses.',
      '',
      'Respond with ONLY valid JSON (no markdown, no backticks):',
      '{',
      '  "dynamicRubric": [{"criterion": "...", "score": 1-10, "evidence": "..."}],',
      '  "dimensionScores": {',
      '    "intent_alignment": 1-10,',
      '    "craft": 1-10,',
      '    "originality": 1-10,',
      '    "brand_coherence": 1-10,',
      '    "completeness": 1-10',
      '  },',
      '  "qualityScore": 1-10,',
      '  "assertionResults": [{"assertionKey": "...", "passed": true/false, "evidence": "...", "blocking": true/false}],',
      '  "strengths": ["..."],',
      '  "weaknesses": ["..."],',
      '  "claimsVerification": [{"claim": "...", "verified": true/false, "evidence": "..."}],',
      '  "revisionGuidance": [{"dimension": "...", "score": N, "priority": "high/medium/low", "issue": "...", "revision_guidance": "...", "expected_impact": "..."}]',
      '}',
    ].join('\n')

    const taskUserMessage = [
      qualityEvalPrompt,
      '',
      '[QUALITY_EVALUATION]',
      `Mission title: ${mission.title}`,
      `Mission brief: ${mission.brief || ''}`,
      `Priority: ${mission.priority || 'medium'}`,
      harnessContext,
      deliverableContext,
    ]
      .filter(Boolean)
      .join('\n')

    const result = await this.callOpenClawRaw(
      mission,
      vibeyKey,
      campaignContext,
      taskUserMessage,
      undefined,
      'mission_quality_eval',
      { identitySuffix: '-EVAL' },
    )
    const parsed =
      this.jsonService.tryParseJsonStrict(String(result.content || '')) ||
      this.jsonService.tryParseJson(String(result.content || ''))
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Quality eval: model returned non-JSON')
    }
    return parsed as Record<string, unknown>
  }

  async callOpenClawRaw(
    mission: Record<string, any>,
    agentKey: string,
    campaignContext: string,
    taskUserMessage: string,
    modelOverride?: string,
    taskType: TaskType = 'mission_execute',
    execOptions?: OpenClawExecOptions,
  ): Promise<Record<string, unknown>> {
    if (mission?.input?.simulate_failure === true) {
      throw new Error('Simulated worker failure')
    }

    const supabase = this.databaseService.getClient()
    const uid = String(mission.user_id)
    await this.assertMissionHasCredits(supabase, mission)

    const routingTargetState = await this.resolveAgentApiTargetStateForUser(
      supabase,
      mission.user_id,
    )
    let routingTarget = routingTargetState.target
    if (routingTarget.machineId && routingTargetState.machineStatus !== 'running') {
      this.logger.log(
        `[machine_wake_forced] user=${uid} status=${routingTargetState.machineStatus || 'unknown'} machine=${routingTarget.machineId}`,
      )
      try {
        await this.wakeUserMachineIfNeeded(uid)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        this.logger.error(
          `[machine_wake_forced_failed] user=${uid} status=${routingTargetState.machineStatus || 'unknown'} machine=${routingTarget.machineId} error=${message}`,
        )
        throw err
      }
      routingTarget = (await this.resolveAgentApiTargetStateForUser(supabase, mission.user_id))
        .target
      this.logger.log(
        `[machine_wake_forced_ok] user=${uid} machine=${routingTarget.machineId ?? 'none'}`,
      )
    }
    try {
      await this.ensureUserMachineReachable(supabase, uid, routingTarget)
    } catch (e) {
      if (e instanceof UserMachineCircuitOpenError) {
        throw new Error('User machine unavailable (circuit open)')
      }
      if (e instanceof UserMachineUnreachableError) {
        throw new Error(e.message)
      }
      throw e
    }
    const modelPrefix = this.configService.get<string>('openclaw.modelPrefix') || 'openclaw'
    const missionOrgIdForRuntime = (mission.org_id as string | null) ?? null
    const runtime = await this.agentRuntime.resolveRuntimeAgent(
      supabase,
      mission.user_id,
      agentKey,
      missionOrgIdForRuntime,
    )
    const gatewayAgentId = runtime.gatewayAgentId
    await this.ensureAgentRuntimeReady(
      routingTarget,
      mission,
      agentKey,
      gatewayAgentId,
      missionOrgIdForRuntime,
      execOptions?.abortSignal,
    )
    const normalizedOverride = typeof modelOverride === 'string' ? modelOverride.trim() : ''
    const selectedModelOrStrategy = normalizedOverride
      ? normalizedOverride
      : await this.resolveAgentSelectedModel(
          supabase,
          mission.user_id,
          agentKey,
          missionOrgIdForRuntime,
        )
    const defaultResolution = resolveModelForStrategy('auto', taskType)
    const selectedModel =
      selectedModelOrStrategy && isModelStrategy(selectedModelOrStrategy)
        ? resolveModelForStrategy(selectedModelOrStrategy, taskType).modelId
        : selectedModelOrStrategy || defaultResolution.modelId
    if (selectedModelOrStrategy && isModelStrategy(selectedModelOrStrategy)) {
      const resolution = resolveModelForStrategy(selectedModelOrStrategy, taskType)
      this.logger.log(
        `[ModelRouter] strategy=${selectedModelOrStrategy} source=${
          normalizedOverride ? 'override' : 'agent_config'
        } task=${taskType} resolved=${resolution.modelId} reason=${resolution.reason}`,
      )
    } else if (!selectedModelOrStrategy) {
      this.logger.log(
        `[ModelRouter] strategy=auto source=default task=${taskType} resolved=${defaultResolution.modelId} reason=${defaultResolution.reason}`,
      )
    } else {
      this.logger.log(
        `[ModelRouter] strategy=manual source=${
          normalizedOverride ? 'override' : 'agent_config'
        } task=${taskType} resolved=${selectedModel}`,
      )
    }
    const model = selectedModel
      ? this.normalizeGatewayModel(selectedModel)
      : `${modelPrefix}:${gatewayAgentId}`
    let sessionKey: string
    let lane: string
    if (execOptions?.channel === 'brain-ops') {
      sessionKey = this.agentRuntime.buildBrainOpsSessionKey({
        gatewayAgentId,
        agentKey,
        userId: mission.user_id,
        outboxId: mission.id,
        targetBrainId: execOptions?.targetBrainId,
        orgId: mission.org_id ?? null,
      })
      lane = this.agentRuntime.buildBrainOpsLane({
        userId: mission.user_id,
        outboxId: mission.id,
        orgId: mission.org_id ?? null,
      })
    } else if (execOptions?.channel === 'dream-ops') {
      sessionKey = this.agentRuntime.buildDreamOpsSessionKey({
        gatewayAgentId,
        userId: mission.user_id,
        runId: mission.id,
        orgId: String(mission.org_id || ''),
      })
      lane = this.agentRuntime.buildDreamOpsLane({
        userId: mission.user_id,
        runId: mission.id,
        orgId: String(mission.org_id || ''),
      })
    } else if (execOptions?.subtaskId) {
      sessionKey = this.agentRuntime.buildSubtaskSessionKey({
        gatewayAgentId,
        agentKey,
        userId: mission.user_id,
        subtaskId: execOptions.subtaskId,
        campaignId: mission.campaign_id || null,
        spaceId: mission.space_id || null,
        orgId: mission.org_id ?? null,
      })
      lane = this.agentRuntime.buildSubtaskLane({
        missionId: mission.id,
        subtaskId: execOptions.subtaskId,
      })
    } else if (taskType === 'mission_quality_eval') {
      sessionKey = this.agentRuntime.buildEvalSessionKey({
        gatewayAgentId,
        agentKey,
        userId: mission.user_id,
        missionId: mission.id,
        orgId: mission.org_id ?? null,
      })
      lane = this.agentRuntime.buildEvalLane({ missionId: mission.id })
    } else {
      sessionKey = this.agentRuntime.buildMissionSessionKey({
        gatewayAgentId,
        agentKey,
        userId: mission.user_id,
        missionId: mission.id,
        campaignId: mission.campaign_id || null,
        spaceId: mission.space_id || null,
        orgId: mission.org_id ?? null,
      })
      lane = this.agentRuntime.buildMissionLane({ missionId: mission.id })
    }

    const target = routingTarget
    const openClawUrl = `${target.baseUrl}/api/artifacts/openclaw/responses`

    const instructions = this.buildStaticMissionInstructions(mission)
    const missionAttachmentContext = await this.buildMissionAttachmentContext(supabase, mission)
    const combinedCampaignContext = [campaignContext, missionAttachmentContext]
      .filter((part) => typeof part === 'string' && part.trim().length > 0)
      .join('\n\n')
    const input = this.buildMissionOpenClawInput(combinedCampaignContext, taskUserMessage)
    const tracePayload = JSON.stringify({ instructions, input })

    const traceStartedAt = Date.now()
    const requestId = randomUUID()
    const runId =
      mission.correlation_id != null && String(mission.correlation_id).trim().length > 0
        ? String(mission.correlation_id)
        : null
    const traceId = await this.missionTracing
      .startTrace({
        userId: mission.user_id,
        missionId: String(mission.id),
        runId,
        requestId,
        campaignId: mission.campaign_id || null,
        sessionKey,
        agentKey,
        taskType,
        systemPrompt: instructions,
        userPrompt: tracePayload,
        channel: execOptions?.channel ?? 'mission',
      })
      .catch(() => null)

    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-openclaw-internal': 'true',
      'x-correlation-id': String(mission.correlation_id ?? ''),
      'x-vibey-request-id': requestId,
      ...(traceId ? { 'x-vibey-trace-id': traceId } : {}),
      ...(runId ? { 'x-vibey-run-id': runId } : {}),
      'x-vibey-conversation-id': String(mission.id ?? ''),
      'x-mission-id': String(mission.id ?? ''),
      ...(mission.org_id ? { 'x-org-id': String(mission.org_id) } : {}),
      ...(execOptions?.subtaskId ? { 'x-subtask-id': execOptions.subtaskId } : {}),
      ...(execOptions?.identitySuffix
        ? { 'x-openclaw-identity-suffix': execOptions.identitySuffix }
        : {}),
      'x-openclaw-session-key': sessionKey,
      'x-openclaw-agent-id': gatewayAgentId,
    }
    const REQUEST_TIMEOUT_MS = Number(
      this.configService.get<number>('missions.openclawRequestTimeoutMs') || 5_100_000,
    )

    const parentMissionId =
      mission.parent_mission_id != null && mission.parent_mission_id !== ''
        ? String(mission.parent_mission_id)
        : ''

    const useSseStream = taskType === 'mission_execute'

    const requestBody: Record<string, unknown> = {
      model,
      stream: useSseStream,
      lane,
      input,
      instructions,
      max_output_tokens: 64_000,
      metadata: {
        correlation_id: String(mission.correlation_id ?? ''),
        mission_id: String(mission.id),
        user_id: String(mission.user_id),
        org_id: String(mission.org_id ?? ''),
        parent_mission_id: parentMissionId,
        agent_key: String(agentKey),
        ...(execOptions?.subtaskId ? { subtask_id: execOptions.subtaskId } : {}),
      },
    }

    let response: Response
    try {
      this.reportMissionRouteEvent({
        requestId,
        traceId,
        runId,
        mission,
        agentKey,
        stage: 'start',
        status: 'attempting',
        eventType: 'external_call',
        observability: { target: routingTargetState.source, model, task_type: taskType },
      })
      response = await this.userAgentApiClient.fetch(
        target,
        '/api/artifacts/openclaw/responses',
        {
          method: 'POST',
          headers: fetchHeaders,
          body: JSON.stringify(requestBody),
        },
        {
          signal: execOptions?.abortSignal,
          timeoutMs: REQUEST_TIMEOUT_MS,
          logTag: `mission=${mission.id} agent=${agentKey}`,
        },
      )
      this.reportMissionRouteEvent({
        requestId,
        traceId,
        runId,
        mission,
        agentKey,
        stage: 'response_headers',
        status: response.ok ? 'ok' : 'warn',
        eventType: 'external_call',
        statusCode: response.status,
        durationMs: Date.now() - traceStartedAt,
        observability: { target: routingTargetState.source, model, task_type: taskType },
      })
    } catch (fetchErr) {
      if (fetchErr instanceof OpenClawNonRetryableError) {
        throw fetchErr
      }
      this.missionTracing
        .failTrace(traceId, fetchErr instanceof Error ? fetchErr.message : String(fetchErr), {
          terminalStatus: 'failed',
          userVisibleOutcome: 'blocked',
          recoveryStatus: 'failed_unrecoverable',
          observability: { request_id: requestId, run_id: runId, mission_id: String(mission.id) },
        })
        .catch(() => {})
      this.reportMissionRouteEvent({
        requestId,
        traceId,
        runId,
        mission,
        agentKey,
        stage: 'upstream_failure',
        status: 'error',
        eventType: 'external_call',
        durationMs: Date.now() - traceStartedAt,
        errorCode: 'mission_openclaw_fetch_failed',
        observability: {
          target: routingTargetState.source,
          model,
          task_type: taskType,
          error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
        },
      })
      throw fetchErr
    }

    try {
      const ct = response.headers?.get?.('content-type') || ''
      const parentSigForStream = execOptions?.abortSignal
      const streamReadSignal =
        parentSigForStream !== undefined
          ? AbortSignal.any([AbortSignal.timeout(REQUEST_TIMEOUT_MS), parentSigForStream])
          : AbortSignal.timeout(REQUEST_TIMEOUT_MS)

      const traceToolSteps: MissionTraceToolStep[] = []
      const traceToolLabels: Record<string, string> = {}
      const traceToolArgs: Record<string, Record<string, unknown>> = {}
      let sseSystemPrompt: string | undefined

      let body: Record<string, unknown>
      if (useSseStream && ct.includes('text/event-stream') && response.body) {
        body = await consumeOpenResponsesSseStream(response.body, streamReadSignal, {
          onHeartbeat: async () => {
            await execOptions?.onStreamHeartbeat?.()
          },
          onTrace: (traceType, data) => {
            if (traceType === 'system_prompt' && typeof data.system_prompt === 'string') {
              sseSystemPrompt = data.system_prompt
            }
          },
          onToolStart: async (name, args, toolCallId) => {
            const { label } = resolveLabel(name, args)
            traceToolLabels[toolCallId || name] = label
            if (toolCallId && args) traceToolArgs[toolCallId] = args
            await execOptions?.onToolStart?.(name, args, toolCallId)
          },
          onToolUpdate: execOptions?.onToolUpdate,
          onToolDone: async (name, toolCallId, isError, action, result) => {
            if (
              !isError &&
              (name === 'read_document' || action === 'read_document') &&
              result &&
              typeof result === 'object' &&
              !Array.isArray(result)
            ) {
              const resultRecord = result as Record<string, unknown>
              const contentRef =
                resultRecord.content_ref &&
                typeof resultRecord.content_ref === 'object' &&
                !Array.isArray(resultRecord.content_ref)
                  ? (resultRecord.content_ref as Record<string, unknown>)
                  : null
              if (contentRef && typeof contentRef.mime_type === 'string') {
                const provider = detectMultimodalProvider(model)
                resultRecord.provider_content_block = buildProviderContentBlock(
                  provider,
                  contentRef,
                )
                await execOptions?.onToolUpdate?.(
                  name,
                  {
                    detail: `Prepared ${provider} multimodal attachment for read_document`,
                  },
                  toolCallId,
                )
              }
            }
            const key = toolCallId || name
            const label = traceToolLabels[key] ?? resolveLabel(name).label
            delete traceToolLabels[key]
            const failed = isError === true
            const errDetail = failed ? formatMissionToolFailureMessage(result) : undefined
            const args = toolCallId ? traceToolArgs[toolCallId] : undefined
            if (toolCallId) delete traceToolArgs[toolCallId]
            const normalizedFailure = failed ? normalizeAgentToolFailureFields(result) : {}
            traceToolSteps.push({
              name,
              label,
              status: failed ? 'failed' : 'completed',
              ...(toolCallId ? { toolCallId } : {}),
              ...(action ? { action } : {}),
              ...(args ? { args } : {}),
              ...(result !== undefined ? { result } : {}),
              isError: failed,
              ...(errDetail ? { error: errDetail } : {}),
              ...(normalizedFailure.error_code
                ? { error_code: normalizedFailure.error_code }
                : {}),
              ...(normalizedFailure.error_class
                ? { error_class: normalizedFailure.error_class }
                : {}),
              ...(normalizedFailure.workflow_class
                ? { workflow_class: normalizedFailure.workflow_class }
                : {}),
              ...(normalizedFailure.effect_state
                ? { effect_state: normalizedFailure.effect_state }
                : {}),
              ...(normalizedFailure.retry_policy
                ? { retry_policy: normalizedFailure.retry_policy }
                : {}),
              ...(normalizedFailure.observability
                ? { observability: normalizedFailure.observability }
                : {}),
            })
            await execOptions?.onToolDone?.(name, toolCallId, isError, action, result)
          },
          onThinkingDelta: execOptions?.onThinkingDelta,
          onOutputTextDelta: execOptions?.onOutputTextDelta,
        })
      } else {
        body = (await response.json()) as Record<string, unknown>
      }

      if (taskType === 'mission_execute' && execOptions?.onStreamHeartbeat) {
        await execOptions.onStreamHeartbeat()
      }

      const parsed = this.parseOpenResponsesBody(body)
      const content = parsed.text

      const rawMeta = body.metadata
      const meta =
        rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta)
          ? (rawMeta as Record<string, unknown>)
          : undefined
      const rawVt = meta?.vibey_trace
      const vibeyTrace =
        rawVt && typeof rawVt === 'object' && !Array.isArray(rawVt)
          ? (rawVt as Record<string, unknown>)
          : undefined
      const fullSystemPrompt =
        sseSystemPrompt ??
        (typeof vibeyTrace?.system_prompt === 'string' ? vibeyTrace.system_prompt : undefined)
      const llmInput =
        vibeyTrace?.llm_input &&
        typeof vibeyTrace.llm_input === 'object' &&
        !Array.isArray(vibeyTrace.llm_input)
          ? (vibeyTrace.llm_input as Record<string, unknown>)
          : undefined
      const llmOutput = vibeyTrace?.llm_output

      const messagesInputForTrace: Record<string, unknown> =
        llmInput ??
        ({
          source: 'mission_worker',
          task_type: taskType,
          instructions,
          input,
        } as Record<string, unknown>)

      const traceUsage = parsed.usage as
        | { input_tokens?: number; output_tokens?: number; total_tokens?: number }
        | undefined

      this.missionTracing
        .completeTrace(traceId, {
          response: content,
          toolSteps: traceToolSteps,
          usage: traceUsage
            ? {
                input_tokens: traceUsage.input_tokens,
                output_tokens: traceUsage.output_tokens,
                total_tokens: traceUsage.total_tokens,
              }
            : undefined,
          durationMs: Date.now() - traceStartedAt,
          fullSystemPrompt,
          llmInput: messagesInputForTrace,
          llmOutput,
          terminalStatus: 'done',
          userVisibleOutcome: content.trim().length > 0 ? 'output_visible' : 'no_visible_output',
          recoveryStatus: 'none',
          recoveryEvents: [],
          observability: {
            request_id: requestId,
            run_id: runId,
            mission_id: String(mission.id),
            failed_tool_count: traceToolSteps.filter((step) => step.status === 'failed').length,
          },
        })
        .catch(() => {})

      this.logger.log(`Mission ${mission.id} processed by ${agentKey}`)
      return {
        content,
        model,
        gateway_response_id: parsed.id,
        usage: parsed.usage || {},
        toolSteps: traceToolSteps,
      }
    } catch (err) {
      this.missionTracing
        .failTrace(traceId, err instanceof Error ? err.message : String(err), {
          terminalStatus: 'failed',
          userVisibleOutcome: 'blocked',
          recoveryStatus: 'failed_unrecoverable',
          recoveryEvents: [],
          observability: { request_id: requestId, run_id: runId, mission_id: String(mission.id) },
        })
        .catch(() => {})
      throw err
    }
  }

  /**
   * Session watchdog: same HTTP target as OpenClaw execution (user Fly vs shared agent-api).
   */
  async probeSessionActiveForUser(sessionKey: string, userId: string): Promise<boolean> {
    const supabase = this.databaseService.getClient()
    const target = await this.resolveAgentApiTargetForUser(supabase, userId)
    const gatewayToken = this.configService.get<string>('openclaw.gatewayToken') || ''
    const gatewayRoot = (
      target.machineId
        ? target.baseUrl
        : this.configService.get<string>('openclaw.gatewayUrl') || 'http://127.0.0.1:18789'
    ).replace(/\/+$/, '')
    const url = `${gatewayRoot}/tools/invoke`
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (gatewayToken) headers.Authorization = `Bearer ${gatewayToken}`
      if (target.machineId) headers['fly-force-instance-id'] = target.machineId
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tool: 'session_status',
          sessionKey,
          args: { sessionKey },
        }),
        signal: AbortSignal.timeout(15_000),
      })
      if (response.ok) return true
      const bodyText = await response.text().catch(() => '')
      if (/Unknown sessionKey|Unknown sessionId/i.test(bodyText)) return false
      return false
    } catch (error) {
      return false
    }
  }

  async resolveAgentApiTargetForUser(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ baseUrl: string; machineId: string | null }> {
    return (await this.resolveAgentApiTargetStateForUser(supabase, userId)).target
  }

  private async resolveAgentApiTargetStateForUser(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<AgentApiTargetState> {
    const fallbackUrl =
      process.env.AGENT_API_URL ||
      this.configService.get<string>('missionApi.agentApiUrl') ||
      'http://localhost:3003'
    const normalizedFallbackUrl = fallbackUrl.replace(/\/+$/, '')
    if (
      normalizedFallbackUrl.includes('localhost') ||
      normalizedFallbackUrl.includes('127.0.0.1')
    ) {
      return {
        target: { baseUrl: normalizedFallbackUrl, machineId: null },
        machineStatus: null,
        hasMachine: false,
        source: 'local',
      }
    }

    const { data } = await supabase
      .from('profiles')
      .select(
        [
          this.machineColumns.machineId,
          this.machineColumns.machineUrl,
          this.machineColumns.machineStatus,
          this.machineColumns.runtimeType,
          this.machineColumns.runtimeUrl,
        ].join(', '),
      )
      .eq('id', userId)
      .maybeSingle()
    const profile = resolveMachineProfileRow(
      data as unknown as Record<string, unknown> | null,
      this.machineColumns,
    )

    const runtimeUrl = profile.runtimeUrl ?? ''
    if (profile.runtimeType === 'shared_railway') {
      if (runtimeUrl) {
        this.logger.log(`[machine_target] user=${userId} source=shared_railway`)
        return {
          target: { baseUrl: runtimeUrl.replace(/\/+$/, ''), machineId: null },
          machineStatus: null,
          hasMachine: false,
          source: 'shared_railway',
        }
      }
      this.logger.warn(
        `[machine_target] user=${userId} shared_railway_missing_runtime_url fallback_to_fly`,
      )
    }

    const machineUrl = profile.machineUrl ?? ''
    const machineStatus = profile.machineStatus ?? ''
    const machineId = profile.machineId ?? ''

    if (machineId) {
      const baseUrl = machineUrl ? machineUrl.replace(/\/+$/, '') : normalizedFallbackUrl
      if (machineStatus !== 'running') {
        this.logger.log(
          `[machine_target] user=${userId} status_drift=${machineStatus || 'unknown'} pinning_anyway machine=${machineId}`,
        )
      }
      return {
        target: { baseUrl, machineId },
        machineStatus: machineStatus || null,
        hasMachine: true,
        source: 'fly',
      }
    }

    this.logger.log(`[machine_target] user=${userId} no_machine_id unpinned_fallback`)
    return {
      target: { baseUrl: normalizedFallbackUrl, machineId: null },
      machineStatus: null,
      hasMachine: false,
      source: 'fallback',
    }
  }

  private shouldSkipMachineWake(): boolean {
    const envSkip = (process.env.MISSIONS_SKIP_MACHINE_WAKE || '').toLowerCase() === 'true'
    return envSkip || this.configService.get<boolean>('missions.skipMachineWake') === true
  }

  private normalizeGatewayModel(modelId: string): string {
    const raw = (modelId || '').trim()
    if (!raw) return ''
    if (raw.startsWith('openclaw:')) return raw
    let normalized = raw
    while (normalized.startsWith('openrouter/openrouter/')) {
      normalized = normalized.replace(/^openrouter\//, '')
    }
    if (normalized.startsWith('openrouter/')) return normalized
    const lower = normalized.toLowerCase()
    if (lower.startsWith('openai-codex/')) return normalized
    if (lower.startsWith('anthropic-subscription/')) {
      return (
        ANTHROPIC_SUBSCRIPTION_GATEWAY_MODEL_IDS.get(lower) ??
        `anthropic/${normalized.slice('anthropic-subscription/'.length)}`
      )
    }
    if (lower === 'gpt-5.3-codex' || lower.startsWith('gpt-5.3-codex-')) {
      return `openai-codex/${normalized}`
    }
    if (lower === 'gpt-5.5-codex' || lower.startsWith('gpt-5.5-codex-')) {
      return `openai-codex/${normalized}`
    }
    if (lower.startsWith('openai/gpt-5.3-codex') || lower.startsWith('openai/gpt-5.5-codex')) {
      return normalized
    }
    return `openrouter/${normalized}`
  }

  private reportMissionRouteEvent(input: {
    requestId: string
    traceId: string | null
    runId: string | null
    mission: Record<string, any>
    agentKey: string
    eventType: string
    stage: string
    status: string
    statusCode?: number
    durationMs?: number
    errorCode?: string
    observability?: Record<string, unknown>
  }): void {
    const client = this.databaseService.getClient()
    const table = client.from('request_trace_events') as unknown as {
      insert?: (payload: Record<string, unknown>) => PromiseLike<{ error?: { message: string } | null }>
    }
    if (typeof table.insert !== 'function') return
    void Promise.resolve(
      table.insert({
        request_id: input.requestId,
        trace_id: input.traceId,
        run_id: input.runId,
        conversation_id: String(input.mission.id ?? ''),
        user_id: String(input.mission.user_id ?? ''),
        org_id: input.mission.org_id ? String(input.mission.org_id) : null,
        surface: 'mission-worker',
        service: 'mission-openclaw',
        route: '/api/artifacts/openclaw/responses',
        method: 'POST',
        event_type: input.eventType,
        stage: input.stage,
        status: input.status,
        status_code: input.statusCode ?? null,
        duration_ms: input.durationMs ?? null,
        error_code: input.errorCode ?? null,
        observability: {
          agent_key: input.agentKey,
          mission_id: String(input.mission.id ?? ''),
          ...input.observability,
        },
      }),
    )
      .then(({ error }) => {
        if (error) this.logger.warn(`Mission route event insert failed: ${error.message}`)
      })
      .catch(() => undefined)
  }

  private async resolveAgentSelectedModel(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<string | null> {
    let query = supabase.from('agents_registry').select('config').eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data } = await query.maybeSingle()
    const cfg =
      data?.config && typeof data.config === 'object'
        ? (data.config as Record<string, unknown>)
        : {}
    return typeof cfg.model_id === 'string' && cfg.model_id.trim().length > 0
      ? cfg.model_id.trim()
      : null
  }
}

const FREE_BASE_CREDITS = 3_000

type UsageRow = {
  base_allowance?: number | null
  base_credits_used?: number | null
  rollover_credits?: number | null
  purchased_credits_used?: number | null
  month?: string | null
}

async function sumCompletedPurchases(
  supabase: SupabaseClient,
  table: 'credit_purchases' | 'org_credit_purchases',
  ownerColumn: 'user_id' | 'org_id',
  ownerId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select('credits_purchased')
    .eq(ownerColumn, ownerId)
    .eq('status', 'completed')
  if (error) throw new Error(error.message)
  return (data ?? []).reduce((sum, row) => sum + Number(row.credits_purchased ?? 0), 0)
}

async function maxPurchasedCreditsUsed(
  supabase: SupabaseClient,
  table: 'monthly_credit_usage' | 'org_monthly_credit_usage',
  ownerColumn: 'user_id' | 'org_id',
  ownerId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select('purchased_credits_used')
    .eq(ownerColumn, ownerId)
  if (error) throw new Error(error.message)
  if (!data?.length) return 0
  return Math.max(0, ...data.map((row) => Number(row.purchased_credits_used ?? 0)))
}

async function resolvePersonalBaseAllowance(
  supabase: SupabaseClient,
  userId: string,
  usageRow: UsageRow | null,
): Promise<number> {
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'past_due'])
    .maybeSingle()
  if (sub?.plan_id) {
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('slug, base_credits')
      .eq('id', sub.plan_id)
      .maybeSingle()
    if (plan?.slug === 'free' || !plan?.slug) return FREE_BASE_CREDITS
    return FREE_BASE_CREDITS + Number(plan.base_credits ?? 0)
  }
  return Number(usageRow?.base_allowance ?? FREE_BASE_CREDITS)
}

async function resolvePersonalUsageRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<UsageRow | null> {
  const { data: activeSub } = await supabase
    .from('user_subscriptions')
    .select('current_period_start')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'past_due'])
    .not('current_period_start', 'is', null)
    .maybeSingle()

  const stripePeriodStart = activeSub?.current_period_start
    ? new Date(activeSub.current_period_start).toISOString().split('T')[0]
    : null

  if (stripePeriodStart) {
    const { data: rows, error } = await supabase
      .from('monthly_credit_usage')
      .select('base_allowance, base_credits_used, rollover_credits, purchased_credits_used, month')
      .eq('user_id', userId)
      .gte('month', stripePeriodStart)
    if (error) throw new Error(error.message)
    const usageRows = (rows ?? []) as UsageRow[]
    if (!usageRows.length) return null
    return usageRows.reduce((latest, row) =>
      String(row.month ?? '') > String(latest.month ?? '') ? row : latest,
    )
  }

  const { data, error } = await supabase
    .from('monthly_credit_usage')
    .select('base_allowance, base_credits_used, rollover_credits, purchased_credits_used, month')
    .eq('user_id', userId)
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data ?? null) as UsageRow | null
}

async function computePersonalCreditsRemaining(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const [totalPurchased, purchasedCreditsUsed, usageRow] = await Promise.all([
    sumCompletedPurchases(supabase, 'credit_purchases', 'user_id', userId),
    maxPurchasedCreditsUsed(supabase, 'monthly_credit_usage', 'user_id', userId),
    resolvePersonalUsageRow(supabase, userId),
  ])

  const purchasedAvailable = Math.max(0, totalPurchased - purchasedCreditsUsed)
  if (!usageRow) return purchasedAvailable

  const baseAllowance = await resolvePersonalBaseAllowance(supabase, userId, usageRow)
  const baseAvailable = Math.max(0, baseAllowance - Number(usageRow.base_credits_used ?? 0))
  const rolloverAvailable = Number(usageRow.rollover_credits ?? 0)
  return baseAvailable + rolloverAvailable + purchasedAvailable
}

async function computeOrgCreditsRemaining(
  supabase: SupabaseClient,
  orgId: string,
): Promise<number> {
  const [totalPurchased, purchasedCreditsUsed, balanceResult] = await Promise.all([
    sumCompletedPurchases(supabase, 'org_credit_purchases', 'org_id', orgId),
    maxPurchasedCreditsUsed(supabase, 'org_monthly_credit_usage', 'org_id', orgId),
    supabase
      .from('org_monthly_credit_usage')
      .select('base_allowance, base_credits_used, rollover_credits, purchased_credits_used')
      .eq('org_id', orgId)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (balanceResult.error) throw new Error(balanceResult.error.message)
  const balance = balanceResult.data as UsageRow | null
  const purchasedAvailable = Math.max(0, totalPurchased - purchasedCreditsUsed)
  if (!balance) return purchasedAvailable

  const baseAvailable = Math.max(
    0,
    Number(balance.base_allowance ?? 0) - Number(balance.base_credits_used ?? 0),
  )
  const rolloverAvailable = Number(balance.rollover_credits ?? 0)
  return baseAvailable + rolloverAvailable + purchasedAvailable
}
