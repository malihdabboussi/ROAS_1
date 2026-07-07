import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactAgentDelegationRepository } from '../repositories/artifact-agent-delegation.repository'
import { ArtifactAgentDelegationContextService } from './artifact-agent-delegation-context.service'
import { ArtifactAgentDelegationStreamService } from './artifact-agent-delegation-stream.service'
import type { A2ATurn } from './artifact-agent-delegation.types'

export class ArtifactAgentDelegationQueryService {
  constructor(
    private readonly repository: ArtifactAgentDelegationRepository,
    private readonly context: ArtifactAgentDelegationContextService,
    private readonly stream: ArtifactAgentDelegationStreamService,
  ) {}

  async askAgent(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<unknown> {
    const targetAgentKey = String(data.target_agent_key ?? '').trim()
    const prompt = String(data.prompt ?? '').trim()
    if (!targetAgentKey) return { success: false, error: 'target_agent_key is required' }
    if (!prompt) return { success: false, error: 'prompt is required' }

    const delegationCheck = this.context.checkDelegationAllowed(sessionKey, targetAgentKey)
    if (!delegationCheck.allowed) {
      return { success: false, error: delegationCheck.error }
    }

    const userId = target.resolveUserId(sessionKey)
    const orgId = typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : null
    const campaignId = this.context.parseCampaignIdFromSessionKey(sessionKey)
    const callerAgentKey =
      typeof target.parseAgentIdFromSessionKey === 'function'
        ? (target.parseAgentIdFromSessionKey(sessionKey) ?? 'vibey')
        : 'vibey'

    const supabase: SupabaseClient = await target.getUserClient(userId, sessionKey)
    const [resolution, callerInfo] = await Promise.all([
      this.context.resolveTargetAgent(supabase, targetAgentKey, campaignId, userId, orgId),
      this.context.resolveCallerInfo(supabase, callerAgentKey, userId, orgId),
    ])
    const callerImage = callerInfo.image
    const callerRole = callerInfo.role ?? ''
    const callerName = callerInfo.name || (callerAgentKey === 'vibey' ? 'Vibey' : callerAgentKey)

    if (resolution.status === 'needs_hire') {
      return {
        success: true,
        delegation_status: 'needs_hire',
        suggestions: resolution.suggestions,
        original_action: 'ask_agent',
        original_prompt: prompt,
        ui_blocks: [
          {
            type: 'agent_hire_suggestion',
            suggestions: resolution.suggestions,
            originalAction: 'ask_agent',
            originalPrompt: prompt,
            campaignId,
            status: 'pending',
          },
        ],
      }
    }

    if (resolution.status === 'needs_assign') {
      return {
        success: true,
        delegation_status: 'needs_assign',
        agent: { agent_key: resolution.agentKey, name: resolution.name, role: resolution.role },
        campaign_id: campaignId,
        message: `${resolution.name} is on the team but not assigned to this campaign. Assign them first.`,
      }
    }

    if (resolution.status === 'not_found') {
      return {
        success: false,
        error: resolution.message,
        current_team: resolution.current_team,
        available_templates: resolution.available_templates,
        recovery_hint:
          resolution.current_team.length > 0
            ? `Pick an agent from current_team (use their agent_key as target_agent_key), or hire a new one with approve_agent_hire using a role_key from available_templates.`
            : `No agents hired yet. Use approve_agent_hire with a role_key from available_templates to hire one, then retry.`,
      }
    }

    const delegationId = crypto.randomUUID()
    const agentRuntime = target.agentRuntime ?? target.agentRuntimeService
    const conversationId =
      typeof target.parseConversationId === 'function'
        ? (target.parseConversationId(sessionKey) ?? delegationId)
        : delegationId

    await onProgress?.(`Asking ${resolution.name}...`)

    const serviceClient: SupabaseClient = target.serviceClient
    await this.repository.insertDelegation(serviceClient, {
      id: delegationId,
      conversation_id: conversationId !== delegationId ? conversationId : null,
      caller_agent_key: callerAgentKey,
      target_agent_key: resolution.agentKey,
      user_id: userId,
      org_id: orgId,
      campaign_id: campaignId,
      type: 'query',
      prompt,
      status: 'running',
    })

    const turns: A2ATurn[] = [
      {
        from: callerAgentKey,
        fromName: callerName,
        fromImage: callerImage,
        content: prompt,
        turnIndex: 0,
        turnType: 'message',
        timestamp: Date.now(),
      },
    ]

    await onProgress?.(
      JSON.stringify({
        type: 'a2a_message',
        delegationId,
        ...turns[0],
        callerAgent: callerAgentKey,
        callerAgentName: callerName,
        callerAgentImage: callerImage,
        callerAgentRole: callerRole,
        targetAgent: resolution.agentKey,
        targetAgentName: resolution.name,
        targetAgentImage: resolution.imageUrl,
        targetAgentRole: resolution.role,
        delegationType: 'query',
        initialPrompt: prompt,
        isComplete: true,
      }),
    )

    try {
      const gatewayUrl =
        target.config?.get?.('OPENCLAW_GATEWAY_URL') ?? process.env.OPENCLAW_GATEWAY_URL
      const gatewayToken =
        target.config?.get?.('OPENCLAW_GATEWAY_TOKEN') ?? process.env.OPENCLAW_GATEWAY_TOKEN

      if (!gatewayUrl || !gatewayToken) {
        throw new Error('Agent gateway not configured')
      }

      const nextDepth = delegationCheck.depth + 1
      const nextChain = [...delegationCheck.chain, callerAgentKey]
      const gatewayAgentId = agentRuntime
        ? agentRuntime.resolveGatewayAgentId(resolution.agentKey, orgId, userId)
        : orgId
          ? `org-${orgId}-${resolution.agentKey}`
          : resolution.agentKey

      await this.context.ensureDelegationRuntimeReady({
        target,
        userId,
        orgId,
        agentKey: resolution.agentKey,
        gatewayAgentId,
      })

      const delegationSessionKey = agentRuntime
        ? agentRuntime.buildDelegationSessionKey({
            targetAgentKey: resolution.agentKey,
            callerAgentKey,
            userId,
            conversationId,
            delegationId,
            campaignId: campaignId ?? undefined,
            orgId: orgId ?? undefined,
            depth: nextDepth,
            chain: nextChain,
          })
        : `agent:${gatewayAgentId}:delegation:${callerAgentKey}:${userId}:${conversationId}:${delegationId}::depth:${nextDepth}::chain:${nextChain.join(',')}`

      const instructions = [
        `You are ${resolution.name}, a ${resolution.role}.`,
        `Another agent (${callerAgentKey}) is asking you a question on behalf of the user.`,
        'Answer concisely and helpfully.',
        campaignId ? `CAMPAIGN_ID=${campaignId}` : '',
        orgId ? `ORG_ID=${orgId}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      const historyContext = await this.context.buildDelegationHistoryContext(
        serviceClient,
        resolution.agentKey,
        conversationId !== delegationId ? conversationId : '',
        delegationId,
      )

      const inputItems: Array<Record<string, unknown>> = []
      if (historyContext) {
        inputItems.push({ type: 'message', role: 'developer', content: historyContext })
      }
      inputItems.push({ type: 'message', role: 'user', content: prompt })

      const body = {
        model: `openclaw:${gatewayAgentId}`,
        input: inputItems,
        instructions,
        metadata: { user_id: userId, delegation_id: delegationId },
      }

      await onProgress?.(
        JSON.stringify({
          type: 'a2a_message',
          delegationId,
          from: resolution.agentKey,
          fromName: resolution.name,
          fromImage: resolution.imageUrl,
          content: '',
          turnIndex: 1,
          turnType: 'thinking',
          timestamp: Date.now(),
          isComplete: false,
        }),
      )

      const { outputText, toolTurns } = await this.stream.streamDelegation({
        gatewayUrl,
        gatewayToken,
        delegationSessionKey,
        gatewayAgentId,
        body,
        targetAgentKey: resolution.agentKey,
        targetName: resolution.name,
        targetImage: resolution.imageUrl,
        delegationId,
        onProgress,
      })

      const responseTurn: A2ATurn = {
        from: resolution.agentKey,
        fromName: resolution.name,
        fromImage: resolution.imageUrl,
        content: outputText,
        turnIndex: toolTurns.length + 2,
        turnType: 'message',
        timestamp: Date.now(),
      }
      turns.push(...toolTurns, responseTurn)

      await onProgress?.(
        JSON.stringify({
          type: 'a2a_message',
          delegationId,
          ...responseTurn,
          isComplete: true,
        }),
      )

      await this.repository.updateDelegation(serviceClient, {
        delegationId,
        payload: {
          status: 'completed',
          response: outputText,
          turns,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - turns[0].timestamp,
        },
      })

      await onProgress?.(
        JSON.stringify({
          type: 'a2a_message',
          delegationId,
          delegationStatus: 'completed',
          from: callerAgentKey,
          fromName: callerName,
          content: '',
          turnIndex: -1,
          turnType: 'message',
          timestamp: Date.now(),
          isComplete: true,
        }),
      )

      return {
        success: true,
        delegation_id: delegationId,
        delegation_status: 'completed',
        target_agent: resolution.agentKey,
        target_agent_name: resolution.name,
        response: outputText,
        ui_blocks: [
          {
            type: 'agent_conversation',
            delegationId,
            callerAgent: callerAgentKey,
            callerAgentName: callerName,
            callerAgentImage: callerImage,
            callerAgentRole: callerRole,
            targetAgent: resolution.agentKey,
            targetAgentName: resolution.name,
            targetAgentImage: resolution.imageUrl,
            targetAgentRole: resolution.role,
            delegationType: 'query',
            initialPrompt: prompt,
            turns,
            status: 'completed',
          },
        ],
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Delegation failed'
      await this.repository.updateDelegation(serviceClient, {
        delegationId,
        payload: {
          status: 'failed',
          response_metadata: { error: errMsg },
          completed_at: new Date().toISOString(),
        },
      })

      return { success: false, error: errMsg, delegation_id: delegationId }
    }
  }
}
