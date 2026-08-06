import { randomUUID } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import {
  buildAgentAccessSummary,
  buildDisabledNativeActions,
  buildEnabledToolkits,
} from '../../agent-policy/agent-access-summary'
import type { ResolvedAgentPolicy } from '../../agent-policy/agent-policy.types'
import { AgentPolicyService } from '../../agent-policy/services/agent-policy.service'
import { AgentRuntimeReadinessService } from '../../agent-sync/services/agent-runtime-readiness.service'
import {
  CAMPAIGN_CONTEXT_POLICY_ACTIONS,
  PERSONAL_BRAIN_POLICY_ACTIONS,
} from '../../artifacts/services/artifact-access-policy-actions'
import { BrainContextService } from '../../brain/services/brain-context.service'
import { DocumentParserService } from '../../chat/services/document-parser.service'
import {
  OpenClawProxyService,
  type OpenClawInputMessage,
  type TraceRecoveryEvent,
} from '../../chat/services/openclaw-proxy.service'
import { TracingService } from '../../chat/services/tracing.service'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { RequestContextService } from '../../shared/services/request-context.service'
import {
  ChannelAgentRepository,
  type ChannelMembershipRow,
  type ChannelMessageRow,
  type ChannelRecord,
} from '../repositories/channel-agent.repository'
import { ChannelAgentInputService } from './channel-agent-input.service'
import { ChannelAgentProgressService } from './channel-agent-progress.service'

type ChannelScopeKind = 'campaign' | 'shared_space'

interface InvokePayload {
  channel_id: string
  message_id: string
  agent_key: string
  user_id: string
  org_id: string | null
  /** Resolved at the api boundary from the request's `space_id`. */
  space_id?: string | null
  /** Resolved campaign for the active space (parity with studio chat scope). */
  campaign_id?: string | null
  /** `campaign` when campaign_id is present, `shared_space` otherwise. */
  scope_kind?: ChannelScopeKind | null
}

const CONTEXT_MESSAGE_LIMIT = 20
const INVOKE_TIMEOUT_MS = 600_000

/** Serialize agent-api → OpenClaw /v1/responses `input` for traces (ground truth; gateway `llm_input.messages` is often empty or not yet merged at trace time). */
function openClawInputToTrace(msgs: OpenClawInputMessage[]) {
  return msgs.map((m) => {
    const c = m.content
    if (typeof c === 'string') {
      return { type: m.type, role: m.role, content: c }
    }
    if (Array.isArray(c)) {
      return { type: m.type, role: m.role, content: `[${c.length} content parts]` }
    }
    return { type: m.type, role: m.role, content: String(c) }
  })
}

@Injectable()
export class ChannelAgentService {
  private readonly logger = new Logger(ChannelAgentService.name)
  private readonly inputService: ChannelAgentInputService
  private readonly progressService: ChannelAgentProgressService

  constructor(
    private readonly repository: ChannelAgentRepository,
    private readonly openClaw: OpenClawProxyService,
    private readonly agentRuntime: AgentRuntimeService,
    private readonly tracing: TracingService,
    private readonly runtimeReadiness: AgentRuntimeReadinessService,
    private readonly brainContext: BrainContextService,
    private readonly requestContext: RequestContextService,
    private readonly documentParser: DocumentParserService,
    private readonly agentPolicy?: AgentPolicyService,
    inputService?: ChannelAgentInputService,
    progressService?: ChannelAgentProgressService,
  ) {
    this.inputService = inputService ?? new ChannelAgentInputService()
    this.progressService = progressService ?? new ChannelAgentProgressService(repository)
  }

  async invoke(payload: InvokePayload): Promise<void> {
    const { channel_id, message_id, agent_key, user_id, org_id } = payload
    const spaceId = payload.space_id ?? null
    let campaignId = payload.campaign_id ?? null
    let scopeKind: ChannelScopeKind | null =
      payload.scope_kind ?? (campaignId ? 'campaign' : spaceId ? 'shared_space' : null)

    const { data: triggerMsg, error: triggerErr } = await this.repository.findTriggerMessage(
      message_id,
      channel_id,
    )

    if (triggerErr || !triggerMsg) {
      this.logger.error(`Trigger message not found: ${message_id} — ${triggerErr?.message}`)
      return
    }

    const trigger = triggerMsg as ChannelMessageRow

    const { data: channel } = await this.repository.findChannel(channel_id)

    const channelRow = channel as ChannelRecord | null
    const channelName = channelRow?.name ?? 'unknown'
    const channelDesc = channelRow?.description ?? ''
    const channelOrgId = channelRow?.org_id ?? null
    const channelMetadata = channelRow?.metadata ?? {}

    // Channel campaign binding fallback: covers invocations fired before the
    // caller stamped scope (retries, pre-binding messages) and keeps the
    // binding authoritative even when the invoke payload is stale.
    const boundCampaignId =
      typeof channelMetadata.default_campaign_id === 'string' && channelMetadata.default_campaign_id
        ? channelMetadata.default_campaign_id
        : null
    if (!campaignId && boundCampaignId) {
      campaignId = boundCampaignId
      scopeKind = 'campaign'
    }

    const isThreadReply = !!trigger.reply_to_id
    let parentMessage: ChannelMessageRow | null = null
    let threadParentId: string

    if (isThreadReply) {
      threadParentId = trigger.reply_to_id!
      const { data: parentRow } = await this.repository.findMessage(threadParentId)
      parentMessage = (parentRow as ChannelMessageRow) ?? null
    } else {
      threadParentId = message_id
    }

    const { data: memberships } = await this.repository.listMemberships(channel_id)

    const senderNames = new Map<string, string>()
    for (const m of (memberships ?? []) as ChannelMembershipRow[]) {
      if (m.member_type === 'user' && m.user_id) {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
        const name = (profile as { full_name?: string })?.full_name ?? 'User'
        senderNames.set(m.user_id, name)
      }
      if (m.member_type === 'agent' && m.agent_key) {
        senderNames.set(m.agent_key, m.agent_key)
      }
    }
    senderNames.set('system', 'System')

    const runtime = await this.agentRuntime.resolveConversationRuntime(
      this.repository.client,
      user_id,
      agent_key,
      org_id,
    )

    const sessionKey = this.agentRuntime.buildChatSessionKey({
      gatewayAgentId: runtime.gatewayAgentId,
      agentKey: runtime.agentKey,
      userId: user_id,
      conversationId: threadParentId,
      campaignId: campaignId ?? undefined,
      spaceId: spaceId ?? undefined,
      orgId: org_id ?? undefined,
    })

    // Store request context for artifact tools to resolve campaign_id /
    // space_id / org_id during the OpenClaw run — parity with chat.service.
    // Accept-token is empty here (internal invoke); downstream services fall
    // back to `getAccessTokenFromSessionKey`. Keyed by `threadParentId` to
    // match `parseConversationIdFromSessionKey` in artifact-action.registry.
    this.requestContext.set(
      threadParentId,
      user_id,
      campaignId,
      '',
      null,
      null,
      org_id ?? null,
      'studio',
      null,
      spaceId,
      scopeKind ?? 'unknown',
    )

    const isBrainstorm = !!(parentMessage?.metadata as Record<string, unknown>)?.brainstorm
    const hasMentions = !!((trigger.metadata as Record<string, unknown>)?.mentions as unknown[])
      ?.length

    const multiAgentFormat =
      'Messages prefixed with [Name]: are from other participants in this thread — you have full visibility of all messages shared here.'
    let promptFraming: string
    if (isBrainstorm) {
      promptFraming = `You are participating in a brainstorm with other agents and humans. ${multiAgentFormat} Build on what others have said but add your own distinct insights.`
    } else if (isThreadReply && !hasMentions) {
      promptFraming = `You are in a conversation thread with other participants. ${multiAgentFormat} Continue the conversation naturally.`
    } else {
      promptFraming = `The user @mentioned you in the channel. ${multiAgentFormat} Respond helpfully.`
    }

    let channelContextLine = ''
    if (campaignId) {
      const { data: boundCampaign } = await this.repository.findCampaignName(campaignId)
      const boundCampaignName = (boundCampaign as { name?: string })?.name ?? 'campaign'
      channelContextLine = `CHANNEL_CONTEXT: This channel is bound to campaign "${boundCampaignName}" (id: ${campaignId}). Use this campaign for avatars, offers, and brain lookups. Never fall back to the General campaign.`
    } else if (channelOrgId) {
      channelContextLine = `CHANNEL_CONTEXT: CHANNEL_ID=${channel_id}. No campaign is bound to this channel yet. Do NOT assume the General campaign for avatars, offers, or brain lookups — it is usually empty. Before any campaign-scoped lookup, call discover_channel_context with this CHANNEL_ID. If it returns exactly one plausible campaign, call set_channel_context to bind it and tell the user you did. If it returns several, a confirmation card is shown to the user — ask them to pick and wait; do not guess and do not retry empty lookups.`
    }

    const instructionParts = [
      `CONVERSATION_ID=${channel_id}`,
      `THREAD_ID=${threadParentId}`,
      `Channel: #${channelName}`,
      channelDesc ? `Description: ${channelDesc}` : '',
      channelContextLine,
      promptFraming,
    ].filter(Boolean)

    const gatewayInstructions = instructionParts.join('\n')
    const triggerText = trigger.content?.replace(/<[^>]+>/g, '').trim() ?? ''
    const policyScope = { orgId: org_id ?? null, userId: org_id ? null : user_id }
    let resolvedPolicy: ResolvedAgentPolicy | null = null
    let hasCampaignAccess = false
    let userBrainAccess = false
    if (this.agentPolicy) {
      try {
        resolvedPolicy = await this.agentPolicy.resolveAgentPolicy(runtime.agentKey, policyScope)
        hasCampaignAccess = resolvedPolicy.effective.has('campaign_context:*')
        userBrainAccess = await this.agentPolicy.canAgentUseCapability(
          runtime.agentKey,
          'brain_access',
          'personal',
          policyScope,
        )
      } catch (err) {
        this.logger.warn(`Channel agent policy resolve failed: ${err}`)
      }
    }
    const agentBrainPresence = await this.brainContext
      .resolveAgentBrainPresence(user_id, runtime.agentKey, org_id)
      .catch((err) => {
        this.logger.warn(`Channel agent brain presence resolve failed: ${err}`)
        return { hasAgentBrain: false, brainId: null }
      })
    const disabledNativeActions = buildDisabledNativeActions({
      hasUserBrain: userBrainAccess,
      hasCampaignContext: hasCampaignAccess,
      personalBrainActions: PERSONAL_BRAIN_POLICY_ACTIONS,
      campaignContextActions: CAMPAIGN_CONTEXT_POLICY_ACTIONS,
    })
    const enabledToolkitsForGateway = buildEnabledToolkits(resolvedPolicy)
    const accessSummary =
      (process.env.AGENT_ACCESS_SUMMARY_IN_CONTEXT ?? 'true').toLowerCase() !== 'false'
        ? buildAgentAccessSummary({
            agentKey: runtime.agentKey,
            hasUserBrain: userBrainAccess,
            hasCampaignContext: hasCampaignAccess,
            hasOwnAgentBrain: agentBrainPresence.hasAgentBrain,
            deniedBrainActions: !userBrainAccess ? PERSONAL_BRAIN_POLICY_ACTIONS : undefined,
            deniedCampaignActions: !hasCampaignAccess ? CAMPAIGN_CONTEXT_POLICY_ACTIONS : undefined,
          })
        : ''
    const brainSummary = await this.brainContext
      .buildFullContext(user_id, runtime.agentKey, triggerText, org_id, false, userBrainAccess)
      .catch((err) => {
        this.logger.warn(`Channel agent brain context failed: ${err}`)
        return ''
      })
    const contextSummary = [accessSummary, brainSummary].filter(Boolean).join('\n\n')

    let input: OpenClawInputMessage[]

    if (isThreadReply) {
      const { data: threadRows } = await this.repository.listThreadReplies(threadParentId)

      const { data: channelContextRows } = await this.repository.listPreviousTopLevelMessages(
        channel_id,
        parentMessage?.created_at ?? trigger.created_at,
        CONTEXT_MESSAGE_LIMIT,
      )

      const allThreadMessages: ChannelMessageRow[] = [
        ...(parentMessage ? [parentMessage] : []),
        ...((threadRows ?? []) as ChannelMessageRow[]),
      ]
      const priorOwnRepliesInThread = allThreadMessages.filter(
        (m) => m.sender_type === 'agent' && m.sender_id === agent_key && m.id !== trigger.id,
      ).length

      input = this.inputService.buildDeltaInput(allThreadMessages, trigger, agent_key, senderNames)
      const channelContextInput = this.inputService.buildChannelContextInput(
        ((channelContextRows ?? []) as ChannelMessageRow[]).reverse(),
        senderNames,
      )
      if (channelContextInput.length > 0) {
        input = [...channelContextInput, ...input]
      }

      this.logger.log(
        `[ChannelAgent] thread=${threadParentId} agent=${agent_key} inputCount=${input.length} threadMsgs=${allThreadMessages.length}`,
      )
    } else {
      const { data: contextRows } = await this.repository.listPreviousChannelMessages(
        channel_id,
        trigger.created_at,
        CONTEXT_MESSAGE_LIMIT,
      )

      const contextMessages = ((contextRows ?? []) as ChannelMessageRow[]).reverse()

      const channelContextInput = this.inputService.buildChannelContextInput(
        contextMessages,
        senderNames,
      )
      if (channelContextInput.length > 0) {
        input = [
          ...channelContextInput,
          {
            type: 'message',
            role: 'user',
            content: trigger.content?.replace(/<[^>]+>/g, '').trim() ?? '',
          },
        ]
      } else {
        input = [
          {
            type: 'message',
            role: 'user',
            content: trigger.content?.replace(/<[^>]+>/g, '').trim() ?? '',
          },
        ]
      }
    }

    if (contextSummary) {
      input = [
        { type: 'message', role: 'user', content: `[CONTEXT]\n${contextSummary}` },
        { type: 'message', role: 'assistant', content: 'Context received.' },
        ...input,
      ]
    }

    const attachmentUrls = this.inputService.getAttachmentUrls(trigger.metadata)
    if (attachmentUrls.length > 0) {
      const documents = await this.inputService.resolveChannelAttachments({
        urls: attachmentUrls,
        userId: user_id,
        orgId: org_id,
        channelId: channel_id,
        campaignId,
        documentParser: this.documentParser,
        logger: this.logger,
      })
      this.inputService.applyAttachmentsToInput(input, documents)
    }

    let responseContent = ''
    const progressTracker = this.progressService.createTracker({
      messageId: message_id,
      agentKey: agent_key,
      logger: this.logger,
    })
    const progressSend = progressTracker.send

    const streamStartedAt = Date.now()
    const requestId = randomUUID()
    const userMessage = triggerText
    const traceId = await this.tracing
      .startTrace({
        userId: user_id,
        conversationId: channel_id,
        messageId: message_id,
        requestId,
        campaignId: campaignId ?? undefined,
        sessionKey,
        userMessage,
        systemPrompt: gatewayInstructions,
        historyLength: input.length,
        channel: 'studio',
        agentKey: agent_key,
        orgId: org_id,
        gatewayAgentId: runtime.gatewayAgentId,
      })
      .catch(() => null)
    const recoveryEvents: TraceRecoveryEvent[] = []

    try {
      await this.runtimeReadiness.ensureRuntimeReady({
        userId: user_id,
        orgId: org_id,
        agentKey: runtime.agentKey,
        gatewayAgentId: runtime.gatewayAgentId,
      })

      let usedRetry = false
      let result = await this.openClaw.streamCompletion({
        input,
        instructions: gatewayInstructions,
        send: progressSend,
        agentId: runtime.gatewayAgentId,
        sessionKey,
        conversationId: channel_id,
        traceId,
        messageId: message_id,
        requestId,
        userId: user_id,
        signal: AbortSignal.timeout(INVOKE_TIMEOUT_MS),
        enabledToolkits: enabledToolkitsForGateway,
        disabledNativeActions,
      })

      if (result.failed && this.isRetryableFailure(result.failed) && !result.content.trim()) {
        usedRetry = true
        const retryReason = result.failed
        this.logger.warn(
          `Channel agent retrying: agent=${agent_key} msg=${message_id} reason=${result.failed}`,
        )
        await this.progressService
          .updateMessageProgress(message_id, agent_key, 'retrying')
          .catch(() => {})
        progressTracker.resetResponseContent()

        result = await this.openClaw.streamCompletion({
          input,
          instructions: gatewayInstructions,
          send: progressSend,
          agentId: runtime.gatewayAgentId,
          sessionKey: `${sessionKey}::retry`,
          conversationId: channel_id,
          traceId,
          messageId: message_id,
          requestId,
          userId: user_id,
          signal: AbortSignal.timeout(INVOKE_TIMEOUT_MS),
          enabledToolkits: enabledToolkitsForGateway,
          disabledNativeActions,
        })
        recoveryEvents.push({
          type: 'channel_empty_failure_retry',
          status: result.failed ? 'failed' : 'recovered',
          reason: retryReason,
          at: new Date().toISOString(),
        })
      }

      responseContent = result.content || progressTracker.getResponseContent()

      if (result.failed) {
        this.logger.error(`Agent ${agent_key} failed: ${result.failed}`)
        this.tracing
          .failTrace(traceId, result.failed, {
            terminalStatus: 'failed',
            userVisibleOutcome: 'blocked',
            recoveryStatus: 'failed_unrecoverable',
            recoveryEvents: [...recoveryEvents, ...(result.recoveryEvents ?? [])],
            observability: { request_id: requestId, message_id, used_retry: usedRetry },
          })
          .catch(() => {})
        await this.progressService.updateAgentStatus(message_id, agent_key, 'failed')
        return
      }

      if (!responseContent.trim()) {
        this.logger.warn(`Agent ${agent_key} produced empty response for message ${message_id}`)
        this.tracing
          .failTrace(traceId, 'empty_response', {
            terminalStatus: 'failed',
            userVisibleOutcome: 'blocked',
            recoveryStatus: 'failed_unrecoverable',
            recoveryEvents: [...recoveryEvents, ...(result.recoveryEvents ?? [])],
            observability: { request_id: requestId, message_id, used_retry: usedRetry },
          })
          .catch(() => {})
        await this.progressService.updateAgentStatus(message_id, agent_key, 'failed')
        return
      }

      const replyTarget = trigger.reply_to_id ?? message_id
      const orderedBlocksForReply = progressTracker.finalBlocks()
      const toolSteps = progressTracker.toolSteps(orderedBlocksForReply)
      const replyMetadata: Record<string, unknown> = {}
      if (orderedBlocksForReply.length > 0) {
        replyMetadata.content_blocks_ordered = orderedBlocksForReply
      }
      if (toolSteps.length > 0) {
        replyMetadata.tool_steps = toolSteps
      }
      const { error: insertErr } = await this.repository.insertAgentReply({
        channel_id,
        sender_type: 'agent',
        sender_id: agent_key,
        content: responseContent.trim(),
        content_blocks: null,
        metadata: replyMetadata,
        reply_to_id: replyTarget,
      })

      if (insertErr) {
        this.logger.error(`Failed to write agent reply: ${insertErr.message}`)
        this.tracing
          .failTrace(traceId, `insert_failed: ${insertErr.message}`, {
            terminalStatus: 'failed',
            userVisibleOutcome: 'blocked',
            recoveryStatus: 'failed_unrecoverable',
            recoveryEvents: [...recoveryEvents, ...(result.recoveryEvents ?? [])],
            observability: { request_id: requestId, message_id, used_retry: usedRetry },
          })
          .catch(() => {})
        await this.progressService.updateAgentStatus(message_id, agent_key, 'failed')
        return
      }

      const durationMs = Date.now() - streamStartedAt
      const gatewayLlmInput =
        result.llmInput && typeof result.llmInput === 'object' && !Array.isArray(result.llmInput)
          ? (result.llmInput as Record<string, unknown>)
          : {}
      const requestInputForTrace = openClawInputToTrace(input)
      const messagesInputForTrace: Record<string, unknown> = {
        ...gatewayLlmInput,
        channel_openclaw_request: {
          input: requestInputForTrace,
          is_thread_reply: isThreadReply,
          message_id: message_id,
        },
        channel_trace_note:
          'openclaw llm_input.messages is session snapshot before prompt(); may be []. Use channel_openclaw_request for exact request input.',
      }
      this.tracing
        .completeTrace(traceId, {
          response: responseContent.trim(),
          toolSteps,
          usage: result.usage,
          durationMs,
          fullSystemPrompt: result.fullSystemPrompt,
          llmInput: messagesInputForTrace,
          llmOutput: result.llmOutput,
          terminalStatus: 'done',
          userVisibleOutcome: [...recoveryEvents, ...(result.recoveryEvents ?? [])].some(
            (event) => event.status === 'recovered',
          )
            ? 'recovered_output'
            : 'output_visible',
          recoveryStatus: [...recoveryEvents, ...(result.recoveryEvents ?? [])].some(
            (event) => event.status === 'recovered',
          )
            ? 'recovered'
            : 'none',
          recoveryEvents: [...recoveryEvents, ...(result.recoveryEvents ?? [])],
          observability: { request_id: requestId, message_id, used_retry: usedRetry },
        })
        .catch(() => {})

      await this.progressService.updateAgentStatus(message_id, agent_key, 'completed')
      this.logger.log(
        `Agent ${agent_key} responded to message ${message_id} in channel ${channel_id}`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Channel agent invocation failed: ${msg}`)
      this.tracing
        .failTrace(traceId, msg, {
          terminalStatus: 'failed',
          userVisibleOutcome: 'blocked',
          recoveryStatus: 'failed_unrecoverable',
          recoveryEvents,
          observability: { request_id: requestId, message_id },
        })
        .catch(() => {})
      await this.progressService.updateAgentStatus(message_id, agent_key, 'failed')
    }
  }

  async invokeBrainstorm(payload: {
    channel_id: string
    message_id: string
    parent_message_id: string
    agent_keys: string[]
    user_id: string
    org_id: string | null
    space_id?: string | null
    campaign_id?: string | null
    scope_kind?: ChannelScopeKind | null
  }): Promise<void> {
    const { channel_id, message_id, parent_message_id, agent_keys, user_id, org_id } = payload

    for (const agent_key of agent_keys) {
      try {
        await this.progressService
          .updateMessageProgress(message_id, agent_key, 'starting')
          .catch(() => {})
        await this.invoke({
          channel_id,
          message_id,
          agent_key,
          user_id,
          org_id,
          space_id: payload.space_id ?? null,
          campaign_id: payload.campaign_id ?? null,
          scope_kind: payload.scope_kind ?? null,
        })
      } catch (err) {
        this.logger.error(`Brainstorm agent ${agent_key} failed: ${err}`)
      }
    }

    this.logger.log(
      `Brainstorm complete: ${agent_keys.length} agents for parent=${parent_message_id}`,
    )
  }

  private isRetryableFailure(failed: string | undefined): boolean {
    if (!failed) return false
    const msg = failed.toLowerCase()
    return (
      msg.includes('stream_stalled') ||
      msg.includes('overloaded') ||
      msg.includes('rate limit') ||
      msg.includes('too many requests') ||
      msg.includes('service unavailable')
    )
  }
}
