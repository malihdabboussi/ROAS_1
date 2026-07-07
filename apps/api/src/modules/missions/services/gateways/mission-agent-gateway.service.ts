import { randomUUID } from 'node:crypto'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { UserAgentApiService } from '../../../user-agent-api/services/user-agent-api.service'
import { MissionServiceRoleClientRepository } from '../../repositories/mission-service-role-client.repository'
import { MissionsRepository } from '../../repositories/missions.repository'

export interface AgentRuntimeInspectionResult {
  ready?: boolean
  reasons?: string[]
  [key: string]: unknown
}

export interface AgentSkillsSyncDetailedResult {
  ok: boolean
  synced: number
  expected: number
  failed: Array<Record<string, unknown>>
  retried: number
  retriedOk: number
  healthy: boolean
  inspection?: AgentRuntimeInspectionResult
}

@Injectable()
export class MissionAgentGatewayService {
  private readonly logger = new Logger(MissionAgentGatewayService.name)
  private static readonly BRAIN_JOB_STREAM_IDLE_TIMEOUT_MS = 120_000
  private static readonly BRAIN_JOB_READINESS_TIMEOUT_MS = 120_000
  private readonly serviceRoleClientRepository: MissionServiceRoleClientRepository
  private readonly missionsRepository: MissionsRepository

  constructor(
    @Optional() @Inject(UserAgentApiService) private readonly userAgentApi?: UserAgentApiService,
    @Optional() serviceRoleClientRepository?: MissionServiceRoleClientRepository,
    @Optional() missionsRepository?: MissionsRepository,
  ) {
    this.serviceRoleClientRepository =
      serviceRoleClientRepository ?? new MissionServiceRoleClientRepository()
    this.missionsRepository = missionsRepository ?? new MissionsRepository()
  }

  private requireUserAgentApi(): UserAgentApiService {
    if (!this.userAgentApi) {
      throw new Error('UserAgentApiService not available')
    }
    return this.userAgentApi
  }

  private isSharedRuntime(): boolean {
    return process.env.AGENT_RUNTIME_MODE?.trim() === 'shared'
  }

  private resolveGatewayAgentId(agentKey: string, userId: string, orgId?: string | null): string {
    const key = agentKey.trim() || 'vibey'
    if (orgId) return `org-${orgId}-${key}`
    const scopedUserId = userId.trim()
    if (this.isSharedRuntime() && scopedUserId) return `user-${scopedUserId}-${key}`
    return key
  }

  private buildBrainJobSessionKey(input: {
    gatewayAgentId: string
    agentKey: string
    userId: string
    campaignId?: string
    targetBrain?: string
    brainId?: string
    orgId?: string | null
  }): string {
    const campaignSuffix = input.campaignId ? `::campaign:${input.campaignId}` : ''
    const brainSuffix = input.targetBrain
      ? `::brain:${input.targetBrain}${input.brainId ? `:${input.brainId}` : ''}`
      : ''
    const orgSuffix = input.orgId ? `::org:${input.orgId}` : ''
    return `agent:${input.gatewayAgentId}:${input.agentKey}-brain-job-${input.userId}:${Date.now()}${campaignSuffix}${brainSuffix}${orgSuffix}`
  }

  private async ensureAgentRuntimeReady(input: {
    userId: string
    agentKey: string
    orgId?: string | null
    gatewayAgentId: string
  }): Promise<void> {
    const timeoutMs =
      Number(process.env.AGENT_RUNTIME_READINESS_TIMEOUT_MS) ||
      Number(process.env.BRAIN_IMPORT_RUNTIME_READINESS_TIMEOUT_MS) ||
      MissionAgentGatewayService.BRAIN_JOB_READINESS_TIMEOUT_MS

    await this.requireUserAgentApi().invoke(
      input.userId,
      `/api/agents/${encodeURIComponent(input.agentKey)}/ensure-ready`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-openclaw-internal': 'true' },
        body: JSON.stringify({
          user_id: input.userId,
          ...(input.orgId ? { org_id: input.orgId } : {}),
          gateway_agent_id: input.gatewayAgentId,
        }),
      },
      {
        timeoutMs,
        logTag: `brain_job_runtime_ready user=${input.userId} agent=${input.agentKey}`,
      },
    )
  }

  getServiceRoleClient(): SupabaseClient {
    return this.serviceRoleClientRepository.getClient()
  }

  async triggerAgentSkillsSync(
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<boolean> {
    const result = await this.triggerAgentSkillsSyncDetailed(userId, agentKey, orgId, false)
    return result?.ok === true && result.healthy === true && result.synced > 0
  }

  async triggerAgentSkillsSyncDetailed(
    userId: string,
    agentKey: string,
    orgId?: string | null,
    inspect = true,
  ): Promise<AgentSkillsSyncDetailedResult | null> {
    const payload = { user_id: userId, ...(orgId ? { org_id: orgId } : {}) }
    try {
      const res = await this.requireUserAgentApi().invoke(
        userId,
        `/api/agents/${agentKey}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-openclaw-internal': 'true' },
          body: JSON.stringify({ ...payload, ...(inspect ? { inspect: true } : {}) }),
        },
        { logTag: `agent_skills_sync user=${userId} agent=${agentKey}` },
      )
      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as Partial<AgentSkillsSyncDetailedResult>
        return {
          ok: body.ok === true,
          synced: typeof body.synced === 'number' ? body.synced : 0,
          expected: typeof body.expected === 'number' ? body.expected : 0,
          failed: Array.isArray(body.failed) ? body.failed : [],
          retried: typeof body.retried === 'number' ? body.retried : 0,
          retriedOk: typeof body.retriedOk === 'number' ? body.retriedOk : 0,
          healthy: body.healthy === true,
          inspection: body.inspection,
        }
      }
    } catch (err) {
      this.logger.warn(`Agent skills sync failed: ${(err as Error).message}`)
    }
    return null
  }

  async triggerFullSync(userId: string): Promise<boolean> {
    try {
      const res = await this.requireUserAgentApi().invoke(
        userId,
        `/api/agents/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-openclaw-internal': 'true' },
          body: JSON.stringify({ user_id: userId }),
        },
        { logTag: `agent_full_sync user=${userId}` },
      )
      return res.ok
    } catch (err) {
      this.logger.warn(`Agent full sync failed: ${(err as Error).message}`)
      return false
    }
  }

  async triggerOrgAgentSync(orgId: string, agentKey: string): Promise<void> {
    const supabase = this.getServiceRoleClient()
    const memberUserIds = await this.missionsRepository.listActiveOrgMemberUserIds(supabase, orgId)
    if (!memberUserIds.length) return

    await Promise.allSettled(
      memberUserIds.map((userId) => this.triggerAgentSkillsSync(userId, agentKey, orgId)),
    )
  }

  async callArtifactAction(
    userId: string,
    action: string,
    data: Record<string, unknown>,
    timeoutMs = 120_000,
    opts?: { agentKey?: string; conversationId?: string; campaignId?: string | null },
  ): Promise<Record<string, unknown> | null> {
    const agentKey = opts?.agentKey?.trim() || 'atlas'
    const conversationId = opts?.conversationId?.trim() || randomUUID()
    const campaignSuffix = opts?.campaignId ? `::campaign:${opts.campaignId}` : ''
    const sessionKey = `agent:gateway:mission:${agentKey}:${userId}:${conversationId}${campaignSuffix}`

    try {
      const res = await this.requireUserAgentApi().invoke(
        userId,
        '/api/artifacts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-openclaw-internal': 'true',
            'x-session-key': sessionKey,
          },
          body: JSON.stringify({ action, data }),
        },
        { timeoutMs, logTag: `artifact_action action=${action} user=${userId}` },
      )
      if (res.ok) {
        return (await res.json()) as Record<string, unknown>
      }
      this.logger.warn(`Artifact action ${action} returned ${res.status}`)
    } catch (err) {
      this.logger.warn(`Artifact action ${action} failed: ${(err as Error).message}`)
    }
    return null
  }

  async callOpenClawForBrainJob(
    userId: string,
    agentKey: string,
    systemPrompt: string,
    userPrompt: string,
    campaignId?: string,
    targetBrain?: string,
    brainId?: string,
    orgId?: string | null,
    opts?: { lane?: string },
  ): Promise<Record<string, unknown>> {
    const normalizedAgentKey = agentKey.trim() || 'vibey'
    const normalizedOrgId = orgId?.trim() || null
    const gatewayAgentId = this.resolveGatewayAgentId(normalizedAgentKey, userId, normalizedOrgId)
    const sessionKey = this.buildBrainJobSessionKey({
      gatewayAgentId,
      agentKey: normalizedAgentKey,
      userId,
      campaignId,
      targetBrain,
      brainId,
      orgId: normalizedOrgId,
    })
    const lane =
      opts?.lane?.trim() ||
      `brain:${normalizedOrgId ?? userId}:${brainId || targetBrain || normalizedAgentKey}`

    await this.ensureAgentRuntimeReady({
      userId,
      agentKey: normalizedAgentKey,
      orgId: normalizedOrgId,
      gatewayAgentId,
    })

    const body = {
      model: `openclaw:${gatewayAgentId}`,
      stream: true,
      lane,
      input: userPrompt,
      instructions: systemPrompt,
      metadata: {
        user_id: userId,
        agent_key: normalizedAgentKey,
        ...(normalizedOrgId ? { org_id: normalizedOrgId } : {}),
      },
    }

    const res = await this.requireUserAgentApi().invoke(
      userId,
      '/api/artifacts/openclaw/responses',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openclaw-internal': 'true',
          'x-openclaw-session-key': sessionKey,
          'x-openclaw-agent-id': gatewayAgentId,
          ...(normalizedOrgId ? { 'x-org-id': normalizedOrgId } : {}),
        },
        body: JSON.stringify(body),
      },
      {
        timeoutMs: 900_000,
        logTag: `brain_job user=${userId} agent=${normalizedAgentKey}`,
      },
    )

    const ct = (res.headers.get('content-type') ?? '').toLowerCase()
    if (ct.includes('text/event-stream')) {
      return this.readBrainJobSseResponse(res)
    }

    const text = await res.text()
    return text ? (JSON.parse(text) as Record<string, unknown>) : { success: true }
  }

  private async readBrainJobSseResponse(response: Response): Promise<Record<string, unknown>> {
    if (!response.body) return { success: true }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let accumulatedText = ''
    let completedResponse: Record<string, unknown> | null = null

    while (true) {
      const chunk = await this.readWithIdleTimeout(
        reader,
        MissionAgentGatewayService.BRAIN_JOB_STREAM_IDLE_TIMEOUT_MS,
      )
      if (chunk.done) break
      if (!chunk.value) continue

      buffer += decoder.decode(chunk.value, { stream: true })

      let splitAt = buffer.indexOf('\n\n')
      while (splitAt >= 0) {
        const rawEvent = buffer.slice(0, splitAt)
        buffer = buffer.slice(splitAt + 2)
        const parsed = this.parseSseEvent(rawEvent)
        if (!parsed) {
          splitAt = buffer.indexOf('\n\n')
          continue
        }
        if (parsed === '[DONE]') {
          splitAt = buffer.indexOf('\n\n')
          continue
        }
        const eventText = this.extractSseText(parsed)
        if (eventText) accumulatedText += eventText
        if (parsed.type === 'response.completed' && parsed.response) {
          completedResponse = parsed.response as Record<string, unknown>
        }
        if (parsed.type === 'response.failed') {
          throw new Error(this.extractSseFailureReason(parsed))
        }
        splitAt = buffer.indexOf('\n\n')
      }
    }

    if (completedResponse) return completedResponse
    if (accumulatedText.trim().length > 0) return { content: accumulatedText }
    return { success: true }
  }

  private async readWithIdleTimeout(
    reader: { read: () => Promise<{ done: boolean; value?: Uint8Array }> },
    idleTimeoutMs: number,
  ): Promise<{ done: boolean; value?: Uint8Array }> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        reader.read(),
        new Promise<{ done: boolean; value?: Uint8Array }>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  `Brain job stream stalled (no chunks for ${Math.floor(idleTimeoutMs / 1000)}s)`,
                ),
              ),
            idleTimeoutMs,
          )
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  private parseSseEvent(rawEvent: string): Record<string, unknown> | '[DONE]' | null {
    const lines = rawEvent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
    if (lines.length === 0) return null
    const payload = lines.join('\n')
    if (payload === '[DONE]') return '[DONE]'
    try {
      return JSON.parse(payload) as Record<string, unknown>
    } catch {
      return null
    }
  }

  private extractSseText(event: Record<string, unknown>): string {
    if (typeof event.delta === 'string') return event.delta
    if (typeof event.text === 'string') return event.text
    if (typeof event.content === 'string') return event.content

    const choices = event.choices as
      | Array<{ delta?: { content?: string }; message?: { content?: string } }>
      | undefined
    const choiceText = choices?.[0]?.delta?.content ?? choices?.[0]?.message?.content
    if (typeof choiceText === 'string') return choiceText

    const response = event.response as Record<string, unknown> | undefined
    if (!response) return ''
    if (typeof response.output_text === 'string') return response.output_text

    const output = response.output as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(output)) return ''
    const chunks: string[] = []
    for (const item of output) {
      const content = item.content as Array<Record<string, unknown>> | string | undefined
      if (typeof content === 'string') {
        chunks.push(content)
        continue
      }
      if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part.text === 'string') chunks.push(part.text)
        }
      }
    }
    return chunks.join('')
  }

  private extractSseFailureReason(event: Record<string, unknown>): string {
    const error = event.error as Record<string, unknown> | undefined
    if (error && typeof error.message === 'string') return error.message
    if (typeof event.message === 'string') return event.message
    return 'OpenClaw stream failed'
  }

  async registerAgentInGateway(
    userId: string,
    agentKey: string,
    name: string,
    definitions: Array<{ file_name: string; content: string }>,
  ): Promise<boolean> {
    try {
      const res = await this.requireUserAgentApi().invoke(
        userId,
        `/api/agents/${agentKey}/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-openclaw-internal': 'true' },
          body: JSON.stringify({ user_id: userId, name, definitions }),
        },
        { logTag: `register_agent user=${userId} agent=${agentKey}` },
      )
      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as { ok?: boolean }
        return body.ok === true
      }
    } catch (err) {
      this.logger.warn(`Gateway register call failed for ${agentKey}: ${(err as Error).message}`)
    }
    return false
  }
}
