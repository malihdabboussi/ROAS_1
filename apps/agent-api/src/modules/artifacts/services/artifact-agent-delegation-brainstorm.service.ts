import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactAgentDelegationRepository } from '../repositories/artifact-agent-delegation.repository'
import { ArtifactAgentDelegationContextService } from './artifact-agent-delegation-context.service'
import { ArtifactAgentDelegationStreamService } from './artifact-agent-delegation-stream.service'
import type { A2ATurn } from './artifact-agent-delegation.types'

export class ArtifactAgentDelegationBrainstormService {
  constructor(
    private readonly repository: ArtifactAgentDelegationRepository,
    private readonly context: ArtifactAgentDelegationContextService,
    private readonly stream: ArtifactAgentDelegationStreamService,
  ) {}

  async brainstormAgents(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<unknown> {
    const agentKeys = Array.isArray(data.agents)
      ? (data.agents as string[]).map((k) => String(k).trim()).filter(Boolean)
      : []
    const topic = String(data.topic ?? '').trim()
    const rounds = Math.max(1, Math.min(5, Number(data.rounds) || 2))
    const extraContext = typeof data.context === 'string' ? data.context.trim() : ''

    if (agentKeys.length < 2)
      return { success: false, error: 'brainstorm requires at least 2 agents in the agents array' }
    if (!topic) return { success: false, error: 'topic is required' }

    const userId = target.resolveUserId(sessionKey)
    const orgId = typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : null
    const campaignId = this.context.parseCampaignIdFromSessionKey(sessionKey)
    const callerAgentKey =
      typeof target.parseAgentIdFromSessionKey === 'function'
        ? (target.parseAgentIdFromSessionKey(sessionKey) ?? 'vibey')
        : 'vibey'

    const supabase: SupabaseClient = await target.getUserClient(userId, sessionKey)

    const [callerInfo, ...agentResolutions] = await Promise.all([
      this.context.resolveCallerInfo(supabase, callerAgentKey, userId, orgId),
      ...agentKeys.map((key) =>
        this.context.resolveTargetAgent(supabase, key, campaignId, userId, orgId),
      ),
    ])

    const callerImage = callerInfo.image
    const callerRole = callerInfo.role ?? ''
    const callerName = callerInfo.name || (callerAgentKey === 'vibey' ? 'Vibey' : callerAgentKey)

    const resolvedParticipants: Array<{
      agent_key: string
      name: string
      role: string
      image_url?: string
    }> = []
    for (let i = 0; i < agentKeys.length; i++) {
      const res = agentResolutions[i]
      if (!res || res.status !== 'available') {
        if (res?.status === 'not_found') {
          return {
            success: false,
            error: `Agent "${agentKeys[i]}" is not available: ${res.message}`,
            current_team: res.current_team,
            available_templates: res.available_templates,
            recovery_hint:
              res.current_team.length > 0
                ? `Replace "${agentKeys[i]}" with an agent_key from current_team, or hire a new one with approve_agent_hire using a role_key from available_templates, then retry brainstorm_agents.`
                : `No agents hired yet. Use approve_agent_hire with a role_key from available_templates to hire ${agentKeys.length} agent${agentKeys.length > 1 ? 's' : ''} first, then retry brainstorm_agents.`,
          }
        }
        if (res?.status === 'needs_hire') {
          return {
            success: false,
            error: `Agent "${agentKeys[i]}" is not hired yet.`,
            suggestions: res.suggestions,
            recovery_hint: `Use approve_agent_hire with one of the suggested role_key values, then retry brainstorm_agents.`,
          }
        }
        return {
          success: false,
          error: `Agent "${agentKeys[i]}" is not available: status=${res?.status}`,
        }
      }
      resolvedParticipants.push({
        agent_key: res.agentKey,
        name: res.name,
        role: res.role,
        image_url: res.imageUrl,
      })
    }

    const delegationId = crypto.randomUUID()
    const agentRuntime = target.agentRuntime ?? target.agentRuntimeService
    const conversationId =
      typeof target.parseConversationId === 'function'
        ? (target.parseConversationId(sessionKey) ?? delegationId)
        : delegationId

    await onProgress?.(
      `Starting brainstorm with ${resolvedParticipants.map((p) => p.name).join(', ')}...`,
    )

    const serviceClient: SupabaseClient = target.serviceClient
    await this.repository.insertDelegation(serviceClient, {
      id: delegationId,
      conversation_id: conversationId !== delegationId ? conversationId : null,
      caller_agent_key: callerAgentKey,
      target_agent_key: agentKeys.join(','),
      user_id: userId,
      org_id: orgId,
      campaign_id: campaignId,
      type: 'brainstorm',
      prompt: topic,
      participants: resolvedParticipants,
      config: { rounds, order: agentKeys },
      status: 'running',
    })

    const participantsForUI = resolvedParticipants.map((p) => ({
      id: p.agent_key,
      name: p.name,
      image: p.image_url,
      role: p.role,
    }))

    const turns: A2ATurn[] = [
      {
        from: callerAgentKey,
        fromName: callerName,
        fromImage: callerImage,
        content: `Brainstorm: ${topic}${extraContext ? `\n\n${extraContext}` : ''}`,
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
        targetAgent: agentKeys[0],
        targetAgentName: resolvedParticipants[0]?.name ?? agentKeys[0],
        targetAgentImage: resolvedParticipants[0]?.image_url,
        targetAgentRole: resolvedParticipants[0]?.role ?? '',
        delegationType: 'brainstorm',
        initialPrompt: topic,
        participants: participantsForUI,
        isComplete: true,
      }),
    )

    const accumulatedDiscussion: Array<{ agentName: string; round: number; content: string }> = []
    let turnCounter = 1

    try {
      const gatewayUrl =
        target.config?.get?.('OPENCLAW_GATEWAY_URL') ?? process.env.OPENCLAW_GATEWAY_URL
      const gatewayToken =
        target.config?.get?.('OPENCLAW_GATEWAY_TOKEN') ?? process.env.OPENCLAW_GATEWAY_TOKEN
      if (!gatewayUrl || !gatewayToken) throw new Error('Agent gateway not configured')

      for (let round = 1; round <= rounds; round++) {
        for (let ai = 0; ai < resolvedParticipants.length; ai++) {
          const agent = resolvedParticipants[ai]!

          const gatewayAgentId = agentRuntime
            ? agentRuntime.resolveGatewayAgentId(agent.agent_key, orgId, userId)
            : orgId
              ? `org-${orgId}-${agent.agent_key}`
              : agent.agent_key

          const delegationSessionKey = agentRuntime
            ? agentRuntime.buildDelegationSessionKey({
                targetAgentKey: agent.agent_key,
                callerAgentKey,
                userId,
                conversationId,
                delegationId: `${delegationId}-r${round}-${agent.agent_key}`,
                campaignId: campaignId ?? undefined,
                orgId: orgId ?? undefined,
              })
            : `agent:${gatewayAgentId}:brainstorm:${callerAgentKey}:${userId}:${conversationId}:${delegationId}-r${round}`

          await this.context.ensureDelegationRuntimeReady({
            target,
            userId,
            orgId,
            agentKey: agent.agent_key,
            gatewayAgentId,
          })

          const brainstormCtx = this.buildBrainstormContext(
            topic + (extraContext ? `\n\n${extraContext}` : ''),
            resolvedParticipants,
            accumulatedDiscussion,
            round,
            rounds,
          )

          const instructions = [
            `You are ${agent.name}, a ${agent.role}.`,
            `You are in a brainstorm session. Round ${round} of ${rounds}.`,
            'Contribute your unique expertise. Be specific and actionable.',
            'Do not delegate to other agents.',
            campaignId ? `CAMPAIGN_ID=${campaignId}` : '',
            orgId ? `ORG_ID=${orgId}` : '',
          ]
            .filter(Boolean)
            .join('\n')

          const inputItems: Array<Record<string, unknown>> = [
            { type: 'message', role: 'developer', content: brainstormCtx },
            { type: 'message', role: 'user', content: `Continue the brainstorm on: ${topic}` },
          ]

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
              from: agent.agent_key,
              fromName: agent.name,
              fromImage: agent.image_url,
              content: '',
              turnIndex: turnCounter++,
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
            targetAgentKey: agent.agent_key,
            targetName: agent.name,
            targetImage: agent.image_url,
            delegationId,
            onProgress,
          })

          for (const tt of toolTurns) {
            tt.turnIndex = turnCounter++
            turns.push(tt)
          }

          const responseTurn: A2ATurn = {
            from: agent.agent_key,
            fromName: agent.name,
            fromImage: agent.image_url,
            content: outputText,
            turnIndex: turnCounter++,
            turnType: 'message',
            timestamp: Date.now(),
          }
          turns.push(responseTurn)

          await onProgress?.(
            JSON.stringify({
              type: 'a2a_message',
              delegationId,
              ...responseTurn,
              isComplete: true,
            }),
          )

          accumulatedDiscussion.push({
            agentName: agent.name,
            round,
            content: outputText,
          })
        }
      }

      await this.repository.updateDelegation(serviceClient, {
        delegationId,
        payload: {
          status: 'completed',
          response: accumulatedDiscussion
            .map((t) => `[R${t.round}] ${t.agentName}: ${t.content}`)
            .join('\n\n'),
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
        participants: resolvedParticipants.map((p) => p.name),
        rounds_completed: rounds,
        ui_blocks: [
          {
            type: 'agent_conversation',
            delegationId,
            callerAgent: callerAgentKey,
            callerAgentName: callerName,
            callerAgentImage: callerImage,
            callerAgentRole: callerRole,
            targetAgent: agentKeys[0],
            targetAgentName: resolvedParticipants[0]?.name ?? '',
            targetAgentImage: resolvedParticipants[0]?.image_url,
            targetAgentRole: resolvedParticipants[0]?.role ?? '',
            delegationType: 'brainstorm',
            initialPrompt: topic,
            participants: participantsForUI,
            turns,
            status: 'completed',
          },
        ],
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Brainstorm failed'
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

  private buildBrainstormContext(
    topic: string,
    participants: Array<{ agent_key: string; name: string; role: string }>,
    accumulatedTurns: Array<{ agentName: string; round: number; content: string }>,
    currentRound: number,
    totalRounds: number,
  ): string {
    const participantList = participants.map((p) => `${p.name} (${p.role})`).join(', ')
    const lines = [
      `[BRAINSTORM CONTEXT — Round ${currentRound}/${totalRounds}]`,
      `Topic: ${topic}`,
      `Participants: ${participantList}`,
      '',
    ]

    if (accumulatedTurns.length > 0) {
      let lastRound = 0
      for (const t of accumulatedTurns) {
        if (t.round !== lastRound) {
          lines.push(`ROUND ${t.round}:`)
          lastRound = t.round
        }
        const preview = t.content.length > 800 ? t.content.slice(0, 800) + '...' : t.content
        lines.push(`${t.agentName}: ${preview}`)
        lines.push('')
      }
    }

    lines.push(
      currentRound === 1
        ? 'Share your perspective on the topic. Be specific, actionable, and bring your unique expertise.'
        : 'Build on the ideas above. Add new angles, challenge weak points, and refine the strongest ideas.',
    )

    return lines.join('\n')
  }
}
