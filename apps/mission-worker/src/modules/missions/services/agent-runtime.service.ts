import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type AgentLevel = 'system' | 'c_level' | 'manager' | 'employee'

interface RuntimeAgentContext {
  level: AgentLevel
  gatewayAgentId: string
}

@Injectable()
export class AgentRuntimeService {
  private isSharedRuntime(): boolean {
    return process.env.AGENT_RUNTIME_MODE?.trim() === 'shared'
  }

  resolveGatewayAgentId(
    agentKey?: string,
    orgId?: string | null,
    userId?: string | null,
    opts?: { forceShared?: boolean },
  ): string {
    const key = agentKey?.trim() || 'vibey'
    if (orgId) return `org-${orgId}-${key}`
    const scopedUserId = userId?.trim()
    if ((opts?.forceShared || this.isSharedRuntime()) && scopedUserId) {
      return `user-${scopedUserId}-${key}`
    }
    return key
  }

  async resolveRuntimeAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<RuntimeAgentContext> {
    let query = supabase.from('agents_registry').select('level').eq('agent_key', agentKey)
    if (orgId) {
      query = query.eq('org_id', orgId).is('user_id', null)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const [{ data }, forceShared] = await Promise.all([
      query.maybeSingle(),
      this.resolveForceSharedPersonalRuntime(supabase, userId, orgId),
    ])

    const level = this.normalizeLevel(data?.level)
    return {
      level,
      gatewayAgentId: this.resolveGatewayAgentId(agentKey, orgId, userId, { forceShared }),
    }
  }

  private async resolveForceSharedPersonalRuntime(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<boolean> {
    if (orgId) return false
    if (this.isSharedRuntime()) return true
    const { data } = await supabase
      .from('profiles')
      .select('agent_runtime_type')
      .eq('id', userId)
      .maybeSingle()
    return String(data?.agent_runtime_type ?? '').trim() === 'shared_railway'
  }

  buildMissionSessionKey(input: {
    gatewayAgentId: string
    agentKey: string
    userId: string
    missionId: string
    campaignId?: string | null
    spaceId?: string | null
    orgId?: string | null
  }): string {
    const base = `agent:${input.gatewayAgentId}:mission:${input.agentKey}:${input.userId}:${input.missionId}`
    return this.appendScopeSuffixes(base, input)
  }

  buildSubtaskSessionKey(input: {
    gatewayAgentId: string
    agentKey: string
    userId: string
    subtaskId: string
    campaignId?: string | null
    spaceId?: string | null
    orgId?: string | null
  }): string {
    const base = `agent:${input.gatewayAgentId}:subtask:${input.agentKey}:${input.userId}:${input.subtaskId}`
    return this.appendScopeSuffixes(base, input)
  }

  buildStateSessionKey(input: {
    gatewayAgentId: string
    agentKey: string
    userId: string
    orgId?: string | null
  }): string {
    let key = `agent:${input.gatewayAgentId}:state:${input.agentKey}:${input.userId}`
    if (input.orgId) key = `${key}::org:${input.orgId}`
    return key
  }

  buildEvalSessionKey(input: {
    gatewayAgentId: string
    agentKey: string
    userId: string
    missionId: string
    orgId?: string | null
  }): string {
    let key = `agent:${input.gatewayAgentId}:eval:${input.agentKey}:${input.userId}:${input.missionId}`
    if (input.orgId) key = `${key}::org:${input.orgId}`
    return key
  }

  buildBrainOpsSessionKey(input: {
    gatewayAgentId: string
    agentKey: string
    userId: string
    outboxId: string
    targetBrainId?: string | null
    orgId?: string | null
  }): string {
    let key = `agent:${input.gatewayAgentId}:brain_ops:${input.agentKey}:${input.userId}:${input.outboxId}`
    if (input.targetBrainId) key = `${key}::brain:${input.targetBrainId}`
    if (input.orgId) key = `${key}::org:${input.orgId}`
    return key
  }

  buildDreamOpsSessionKey(input: {
    gatewayAgentId: string
    userId: string
    runId: string
    orgId: string
  }): string {
    return `agent:${input.gatewayAgentId}:dream_ops:hr:${input.userId}:${input.runId}::org:${input.orgId}`
  }

  buildMissionLane(input: { missionId: string }): string {
    return `mission:${input.missionId}`
  }

  buildSubtaskLane(input: { missionId: string; subtaskId: string }): string {
    return `mission:${input.missionId}:subtask:${input.subtaskId}`
  }

  buildEvalLane(input: { missionId: string }): string {
    return `mission:${input.missionId}:eval`
  }

  buildBrainOpsLane(input: { userId: string; outboxId: string; orgId?: string | null }): string {
    return `brain:${input.orgId ?? input.userId}:${input.outboxId}`
  }

  buildDreamOpsLane(input: { orgId: string; userId: string; runId: string }): string {
    return `dream_ops:${input.orgId}:${input.userId}:${input.runId}`
  }

  private normalizeLevel(level: unknown): AgentLevel {
    if (level === 'system' || level === 'c_level' || level === 'manager' || level === 'employee') {
      return level
    }
    return 'employee'
  }

  private appendScopeSuffixes(
    base: string,
    input: { campaignId?: string | null; spaceId?: string | null; orgId?: string | null },
  ): string {
    let key = input.campaignId ? `${base}::campaign:${input.campaignId}` : base
    if (input.spaceId) key = `${key}::space:${input.spaceId}`
    if (input.orgId) key = `${key}::org:${input.orgId}`
    return key
  }
}
