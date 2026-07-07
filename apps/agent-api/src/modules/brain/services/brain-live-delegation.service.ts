import { randomUUID } from 'crypto'
import type { Logger } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AgentRuntimeReadinessService } from '../../agent-sync/services/agent-runtime-readiness.service'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { BrainLiveRepository } from '../repositories/brain-live.repository'
import { BrainLiveDelegationStreamService } from './brain-live-delegation-stream.service'
import type { DelegationState, LiveDelegationSummary, LiveSession } from './brain-live.types'

type DelegationEventHandler = (type: string, data: Record<string, unknown>) => void

interface StartDelegationInput {
  session: LiveSession
  task: string
  onEvent: DelegationEventHandler
  delegations: Map<string, DelegationState>
  config: ConfigService
  agentRuntime: AgentRuntimeService
  runtimeReadiness: AgentRuntimeReadinessService
  liveRepository: BrainLiveRepository
  supabase: SupabaseClient
  logger: Logger
  delegationStream: BrainLiveDelegationStreamService
  resolveCampaignId: (session: LiveSession) => Promise<string | null>
}

interface QueueMessageInput {
  delegationId: string | undefined
  message: string
  onEvent: DelegationEventHandler
  delegations: Map<string, DelegationState>
  config: ConfigService
  delegationStream: BrainLiveDelegationStreamService
}

@Injectable()
export class BrainLiveDelegationService {
  async startDelegation(input: StartDelegationInput): Promise<string> {
    const delegationId = randomUUID()
    const { session, task } = input
    const agentKey = session.scope.agentId ?? 'vibey'
    const convId = session.conversationId ?? session.id
    const state: DelegationState = {
      id: delegationId,
      status: 'running',
      toolSteps: [],
      currentTool: null,
      content: '',
      orderedBlocks: [],
      startedAt: Date.now(),
      userId: session.userId,
      orgId: session.orgId,
      conversationId: convId,
      agentId: agentKey,
      task: task.slice(0, 500),
    }
    input.delegations.set(delegationId, state)
    const campaignId = await input.resolveCampaignId(session)

    const gatewayAgentId = input.agentRuntime.resolveGatewayAgentId(
      agentKey,
      session.orgId,
      session.userId,
    )
    await input.runtimeReadiness.ensureRuntimeReady({
      userId: session.userId,
      orgId: session.orgId,
      agentKey,
      gatewayAgentId,
    })
    const sessionKey = input.agentRuntime.buildDelegationSessionKey({
      targetAgentKey: agentKey,
      callerAgentKey: 'voice',
      userId: session.userId,
      conversationId: convId,
      delegationId,
      campaignId: campaignId ?? undefined,
      orgId: session.orgId ?? undefined,
    })

    state.sessionKey = sessionKey
    state.gatewayAgentId = gatewayAgentId

    const gatewayUrl = input.config.get<string>('OPENCLAW_GATEWAY_URL') ?? 'http://localhost:18789'
    const gatewayToken = input.config.get<string>('OPENCLAW_GATEWAY_TOKEN') ?? ''

    const payload = {
      input: await this.buildDelegationInput(input),
      model: `openclaw:${gatewayAgentId}`,
      stream: true,
      metadata: {
        user_id: session.userId,
        org_id: session.orgId ?? undefined,
        campaign_id: campaignId ?? undefined,
        channel: 'voice',
      },
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${gatewayToken}`,
      'x-openclaw-session-key': sessionKey,
    }

    void input.delegationStream.streamDelegation({
      delegationId,
      gatewayUrl,
      headers,
      payload,
      state,
      onEvent: input.onEvent,
    })

    return delegationId
  }

  async checkDelegation(
    delegations: Map<string, DelegationState>,
    delegationId: string | undefined,
    waitSeconds?: number,
  ): Promise<Record<string, unknown>> {
    let resolvedId = delegationId
    if (!resolvedId) {
      const latest = [...delegations.values()].sort((a, b) => b.startedAt - a.startedAt)[0]
      if (latest) resolvedId = latest.id
    }
    if (!resolvedId)
      return {
        status: 'no_active_delegations',
        message: 'No tasks are currently running or recently completed.',
      }

    if (waitSeconds && waitSeconds > 0) {
      const maxWait = Math.min(waitSeconds, 30)
      const deadline = Date.now() + maxWait * 1000
      while (Date.now() < deadline) {
        const s = delegations.get(resolvedId)
        if (!s || s.status !== 'running') break
        await new Promise<void>((r) => setTimeout(r, 500))
      }
    }
    const state = delegations.get(resolvedId)
    if (!state) return { status: 'not_found', delegation_id: resolvedId }
    const elapsed = Math.round((Date.now() - state.startedAt) / 1000)
    const snapshot: Record<string, unknown> = {
      delegation_id: resolvedId,
      status: state.status,
      elapsed_seconds: elapsed,
      tools_completed: state.toolSteps.filter((s) => s.status === 'completed').length,
      tools_failed: state.toolSteps.filter((s) => s.status === 'failed').length,
      tool_labels: state.toolSteps.map((s) => s.label),
      current_tool: state.currentTool,
    }
    if (state.status === 'running') {
      snapshot.instruction =
        'Task is still running. Narrate progress to the user, then IMMEDIATELY call check_delegation again to continue monitoring.'
    }
    if (state.status === 'completed' || state.status === 'failed') {
      snapshot.content =
        state.content.length > 2000 ? state.content.slice(0, 2000) + '...' : state.content
      snapshot.instruction =
        'Task finished. Summarize what was done and ask the user what they want to do next.'
      delegations.delete(resolvedId)
    }
    return snapshot
  }

  async queueMessage(input: QueueMessageInput): Promise<Record<string, unknown>> {
    let resolvedId = input.delegationId
    if (!resolvedId) {
      const running = [...input.delegations.values()]
        .filter((d) => d.status === 'running')
        .sort((a, b) => b.startedAt - a.startedAt)[0]
      if (running) resolvedId = running.id
    }
    if (!resolvedId) {
      return { success: false, error: 'No running delegation found to send message to.' }
    }

    const state = input.delegations.get(resolvedId)
    if (!state) {
      return { success: false, error: `Delegation ${resolvedId} not found.` }
    }
    if (state.status !== 'running') {
      return {
        success: false,
        error: `Delegation ${resolvedId} is ${state.status}, not running. Use delegate_work to start a new task.`,
      }
    }
    if (!state.sessionKey || !state.gatewayAgentId) {
      return { success: false, error: 'Delegation session key not available for message queuing.' }
    }

    const gatewayUrl = input.config.get<string>('OPENCLAW_GATEWAY_URL') ?? 'http://localhost:18789'
    const gatewayToken = input.config.get<string>('OPENCLAW_GATEWAY_TOKEN') ?? ''

    const payload = {
      input: [{ type: 'message', role: 'user', content: input.message }],
      model: `openclaw:${state.gatewayAgentId}`,
      stream: true,
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${gatewayToken}`,
      'x-openclaw-session-key': state.sessionKey,
    }

    void input.delegationStream.streamQueuedMessage({
      delegationId: resolvedId,
      gatewayUrl,
      headers,
      payload,
      state,
      onEvent: input.onEvent,
    })

    return {
      success: true,
      delegation_id: resolvedId,
      message:
        'Follow-up message sent to running task. The agent will process it as a continuation.',
      instruction:
        'Message queued into the running task. Call check_delegation to monitor progress, or narrate to the user that you sent the update.',
    }
  }

  listActiveDelegationsForSession(
    delegations: Map<string, DelegationState>,
    userId: string,
    orgId: string | null,
    conversationId: string,
    agentId: string,
  ): LiveDelegationSummary[] {
    const RECENT_COMPLETED_MS = 5 * 60 * 1000
    const now = Date.now()
    const results: LiveDelegationSummary[] = []
    for (const d of delegations.values()) {
      if (d.userId !== userId) continue
      if (d.conversationId !== conversationId) continue
      if (d.agentId !== agentId) continue
      if (d.status !== 'running') {
        if (!d.completedAt || now - d.completedAt > RECENT_COMPLETED_MS) continue
      }
      results.push({
        delegationId: d.id,
        task: d.task ?? '',
        status: d.status,
        currentTool: d.currentTool,
        toolSteps: d.toolSteps,
        content: d.content.length > 4000 ? d.content.slice(0, 4000) + '...' : d.content,
        orderedBlocks: structuredClone(d.orderedBlocks),
        startedAt: d.startedAt,
        completedAt: d.completedAt,
      })
    }
    return results.sort((a, b) => a.startedAt - b.startedAt)
  }

  async buildDelegationInput(
    input: Pick<
      StartDelegationInput,
      'liveRepository' | 'logger' | 'session' | 'supabase' | 'task'
    >,
  ): Promise<Array<{ type: string; role: string; content: string }>> {
    const messages: Array<{ type: string; role: string; content: string }> = []

    if (input.session.conversationId) {
      try {
        const dbMessages = await input.liveRepository.listDelegationInputMessages(
          input.supabase,
          input.session.conversationId,
        )
        if (dbMessages?.length) {
          for (const msg of dbMessages) {
            const role = String(msg.role ?? '')
            const content = String(msg.content ?? '').trim()
            if (!content || (role !== 'user' && role !== 'assistant')) continue
            messages.push({
              type: 'message',
              role,
              content: content.length > 500 ? content.slice(0, 500) + '...' : content,
            })
          }
        }
      } catch (err) {
        input.logger.warn(
          `delegation_history_load_failed conv=${input.session.conversationId} err=${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    messages.push({ type: 'message', role: 'user', content: input.task })
    return messages
  }
}
