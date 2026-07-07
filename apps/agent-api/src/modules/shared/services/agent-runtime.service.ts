import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { canonicalAgentKey } from '@vibey/agent-policy'
import { AgentRuntimeRepository } from '../repositories/agent-runtime.repository'

type AgentLevel = 'system' | 'c_level' | 'manager' | 'employee'

interface AgentRuntimeContext {
  agentKey: string
  level: AgentLevel
  gatewayAgentId: string
}

@Injectable()
export class AgentRuntimeService {
  constructor(private readonly repository: AgentRuntimeRepository = new AgentRuntimeRepository()) {}

  private isSharedRuntime(): boolean {
    return process.env.AGENT_RUNTIME_MODE?.trim() === 'shared'
  }

  resolveGatewayAgentId(agentKey?: string, orgId?: string | null, userId?: string | null): string {
    const key = agentKey?.trim() || 'vibey'
    if (orgId) return `org-${orgId}-${key}`
    const scopedUserId = userId?.trim()
    if (this.isSharedRuntime() && scopedUserId) return `user-${scopedUserId}-${key}`
    return key
  }

  async resolveConversationRuntime(
    supabase: SupabaseClient,
    userId: string,
    conversationAgentKey?: string,
    orgId?: string | null,
  ): Promise<AgentRuntimeContext> {
    // Conversations created under shared runtime may store the gateway-scoped
    // id (`user-<uuid>-vibey`); registry/policy only know the canonical key.
    const agentKey = canonicalAgentKey(conversationAgentKey ?? '') || 'vibey'

    const level = await this.repository.findAgentLevel(supabase, { userId, orgId, agentKey })

    const normalizedLevel =
      level === undefined || level === null
        ? agentKey === 'vibey'
          ? 'system'
          : 'employee'
        : this.normalizeLevel(level)
    return {
      agentKey,
      level: normalizedLevel,
      gatewayAgentId: this.resolveGatewayAgentId(agentKey, orgId, userId),
    }
  }

  buildChatSessionKey(input: {
    gatewayAgentId: string
    agentKey: string
    userId: string
    conversationId: string
    campaignId?: string
    spaceId?: string
    orgId?: string
    includeScopeSegments?: boolean
  }): string {
    const id = input.gatewayAgentId
    const base = `agent:${id}:${id}-${input.userId}-${input.conversationId}`
    if (input.includeScopeSegments) return this.appendScopeSegments(base, input)
    return input.orgId ? `${base}::org:${input.orgId}` : base
  }

  buildDelegationSessionKey(input: {
    targetAgentKey: string
    callerAgentKey: string
    userId: string
    conversationId: string
    delegationId: string
    campaignId?: string
    spaceId?: string
    orgId?: string
    depth?: number
    chain?: string[]
  }): string {
    const depth = input.depth ?? 1
    const chain = input.chain ?? [input.callerAgentKey]
    const targetId = this.resolveGatewayAgentId(input.targetAgentKey, input.orgId, input.userId)
    const base = `agent:${targetId}:delegation:${input.callerAgentKey}:${input.userId}:${input.conversationId}:${input.delegationId}`
    let key = this.appendScopeSegments(base, input)
    key = `${key}::depth:${depth}::chain:${chain.join(',')}`
    return key
  }

  private appendScopeSegments(
    base: string,
    input: { campaignId?: string; spaceId?: string; orgId?: string },
  ): string {
    let key = input.campaignId ? `${base}::campaign:${input.campaignId}` : base
    if (input.spaceId) key = `${key}::space:${input.spaceId}`
    if (input.orgId) key = `${key}::org:${input.orgId}`
    return key
  }

  private normalizeLevel(level: unknown): AgentLevel {
    if (level === 'system' || level === 'c_level' || level === 'manager' || level === 'employee') {
      return level
    }
    return 'employee'
  }
}
