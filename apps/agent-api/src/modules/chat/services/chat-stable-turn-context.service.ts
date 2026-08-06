import { BadRequestException, Injectable, type Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isModelStrategy, resolveModelForStrategy, type ChatScopeKind } from '@vibey/api-shared'
import type { ResolvedAgentPolicy } from '../../agent-policy/agent-policy.types'
import { AgentPolicyService } from '../../agent-policy/services/agent-policy.service'
import { AgentRuntimeReadinessService } from '../../agent-sync/services/agent-runtime-readiness.service'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { ChatContextRepository } from '../repositories/chat-context.repository'
import {
  applyChannelPrincipalBrainPolicy,
  type ChannelPrincipalUser,
} from './chat-channel-principal'
import {
  ChatModelInputService,
  type ChatModelSettings,
  type ResolvedChatModelSelection,
  type ValidatedModelSettings,
} from './chat-model-input.service'
import type { ChatStablePrewarmContext } from './chat-prewarm-context.service'

export interface ChatStableTurnContext {
  conversationCampaignId: string | undefined
  conversationAgentId: string | undefined
  resolvedCampaignId: string | undefined
  runtime: { gatewayAgentId: string; agentKey: string }
  resolvedAgentId: string
  configuredModel: string | null
  agentReg: Record<string, unknown> | null
  selectedModelInput: string
  selectedModelSource: 'request' | 'agent_config' | 'default'
  resolvedModelSelection: ResolvedChatModelSelection
  selectedSettings: ValidatedModelSettings
  gatewayModelId: string
  policyScope: { orgId: string | null; userId: string | null }
  hasCampaignAccess: boolean
  userBrainAccess: boolean
  resolvedPolicy: ResolvedAgentPolicy | null
  agentConfig: Record<string, unknown> | null | undefined
  useWikiContext: boolean
}

export interface ChatStableTurnContextInput {
  prewarmedStableContext: ChatStablePrewarmContext | null
  conversation: Record<string, unknown> | null
  dbSupabase: SupabaseClient
  dbOp: <T>(op: (client: SupabaseClient) => Promise<T>) => Promise<T>
  requestCampaignId: string | null
  hasMessageCampaignScope: boolean
  conversationId: string
  model?: string
  modelSettings?: ChatModelSettings
  userId: string
  orgId?: string
  campaignId?: string | null
  spaceId?: string | null
  scopeKind?: ChatScopeKind
  source?: string
  channelUser?: ChannelPrincipalUser
  sendSetupStatus: (message: string) => Promise<void>
  logger: Pick<Logger, 'warn'>
}

@Injectable()
export class ChatStableTurnContextService {
  constructor(
    private readonly agentRuntime: AgentRuntimeService,
    private readonly runtimeReadiness: AgentRuntimeReadinessService,
    private readonly chatContextRepository: ChatContextRepository,
    private readonly modelInputService: ChatModelInputService,
    private readonly agentPolicy?: AgentPolicyService,
  ) {}

  async resolve(input: ChatStableTurnContextInput): Promise<ChatStableTurnContext> {
    const {
      prewarmedStableContext,
      conversation,
      dbSupabase,
      dbOp,
      requestCampaignId,
      hasMessageCampaignScope,
      conversationId,
      model,
      modelSettings,
      userId,
      orgId,
      campaignId,
      spaceId,
      scopeKind,
      source,
      channelUser,
      sendSetupStatus,
      logger,
    } = input

    let conversationCampaignId: string | undefined
    let conversationAgentId: string | undefined
    let resolvedCampaignId: string | undefined
    let runtime: { gatewayAgentId: string; agentKey: string }
    let resolvedAgentId: string
    let configuredModel: string | null
    let agentReg: Record<string, unknown> | null
    let selectedModelInput: string
    let selectedModelSource: 'request' | 'agent_config' | 'default'
    let resolvedModelSelection: ResolvedChatModelSelection
    let selectedSettings: ValidatedModelSettings
    let gatewayModelId: string
    let policyScope: { orgId: string | null; userId: string | null } = {
      orgId: orgId ?? null,
      userId: orgId ? null : userId,
    }
    let hasCampaignAccess = false
    let userBrainAccess = false
    let resolvedPolicy: ResolvedAgentPolicy | null = null
    let agentConfig: Record<string, unknown> | null | undefined
    let useWikiContext = false

    if (prewarmedStableContext) {
      conversationCampaignId = prewarmedStableContext.conversationCampaignId
      conversationAgentId = prewarmedStableContext.conversationAgentId
      resolvedCampaignId = prewarmedStableContext.resolvedCampaignId
      runtime = prewarmedStableContext.runtime
      resolvedAgentId = prewarmedStableContext.resolvedAgentId
      configuredModel = prewarmedStableContext.configuredModel
      agentReg = prewarmedStableContext.agentReg
      const requestedModel = this.modelInputService.normalizeModelValue(model)
      selectedModelInput = requestedModel ?? configuredModel ?? 'auto'
      selectedModelSource =
        requestedModel !== null ? 'request' : configuredModel !== null ? 'agent_config' : 'default'
      resolvedModelSelection = isModelStrategy(selectedModelInput)
        ? resolveModelForStrategy(selectedModelInput, 'chat')
        : { modelId: selectedModelInput, reason: 'manual_chat' }
      selectedSettings = await this.modelInputService.validateModelSettings(
        resolvedModelSelection.modelId,
        this.modelInputService.mergeResolvedModelSettings(resolvedModelSelection, modelSettings),
      )
      gatewayModelId = selectedSettings.resolvedModelId
      policyScope = prewarmedStableContext.policyScope
      hasCampaignAccess = prewarmedStableContext.hasCampaignAccess
      userBrainAccess = prewarmedStableContext.userBrainAccess
      resolvedPolicy = prewarmedStableContext.resolvedPolicy
      agentConfig = prewarmedStableContext.agentConfig
      useWikiContext = prewarmedStableContext.useWikiContext
    } else {
      conversationCampaignId = (conversation?.campaign_id as string | null | undefined) ?? undefined
      conversationAgentId = (conversation?.agent_id as string | null | undefined) ?? undefined
      resolvedCampaignId =
        hasMessageCampaignScope && (spaceId || scopeKind === 'personal' || scopeKind === 'campaign')
          ? (requestCampaignId ?? undefined)
          : (conversationCampaignId ?? requestCampaignId ?? undefined)
      await sendSetupStatus('Finding the right agent')
      runtime = await this.agentRuntime.resolveConversationRuntime(
        dbSupabase,
        userId,
        conversationAgentId,
        orgId,
      )
      resolvedAgentId = runtime.agentKey
      await sendSetupStatus('Turning on your agent')
      await this.runtimeReadiness.ensureRuntimeReady({
        userId,
        orgId: orgId ?? null,
        agentKey: runtime.agentKey,
        gatewayAgentId: runtime.gatewayAgentId,
      })
      await sendSetupStatus('Choosing the best model')
      const requestedModel = this.modelInputService.normalizeModelValue(model)
      ;[configuredModel, agentReg] = await Promise.all([
        dbOp((s) =>
          this.modelInputService.resolveAgentConfiguredModel(s, userId, resolvedAgentId, orgId),
        ).catch(() => null),
        dbOp(async (s) => {
          const { data, error } = await this.chatContextRepository.findAgentRegistration(s, {
            userId,
            agentKey: resolvedAgentId,
            orgId,
          })
          if (error) throw error
          return data as Record<string, unknown> | null
        }).catch(() => null),
      ])
      selectedModelInput = requestedModel ?? configuredModel ?? 'auto'
      selectedModelSource =
        requestedModel !== null ? 'request' : configuredModel !== null ? 'agent_config' : 'default'
      resolvedModelSelection = isModelStrategy(selectedModelInput)
        ? resolveModelForStrategy(selectedModelInput, 'chat')
        : { modelId: selectedModelInput, reason: 'manual_chat' }
      selectedSettings = await this.modelInputService.validateModelSettings(
        resolvedModelSelection.modelId,
        this.modelInputService.mergeResolvedModelSettings(resolvedModelSelection, modelSettings),
      )
      gatewayModelId = selectedSettings.resolvedModelId
    }

    if (!prewarmedStableContext && this.agentPolicy) {
      try {
        await sendSetupStatus('Checking agent access')
        resolvedPolicy = await this.agentPolicy.resolveAgentPolicy(resolvedAgentId, policyScope)
        hasCampaignAccess = resolvedPolicy.effective.has('campaign_context:*')
        // Role defaults (e.g. vibey read_brain_personal), not only team effective grants.
        userBrainAccess = await this.agentPolicy.canAgentUseCapability(
          resolvedAgentId,
          'brain_access',
          'personal',
          policyScope,
        )
      } catch (err) {
        logger.warn(`policy resolve failed for ${resolvedAgentId}: ${err}`)
      }
    }

    userBrainAccess = applyChannelPrincipalBrainPolicy({
      source,
      policyAllowsPersonalBrain: userBrainAccess,
      channelUser,
    })

    if (
      !prewarmedStableContext &&
      this.agentPolicy &&
      (source === 'slack' || source === 'telegram')
    ) {
      try {
        const allowedChannel = await this.agentPolicy.canAgentUseCapability(
          resolvedAgentId,
          'channel',
          source,
          policyScope,
        )
        if (!allowedChannel) {
          const enforce = (process.env.AGENT_TEAMS_ENFORCE ?? 'true').toLowerCase() !== 'false'
          if (enforce) {
            throw new BadRequestException(
              `Agent '${resolvedAgentId}' team does not grant channel '${source}'`,
            )
          }
          logger.warn(
            `[AGENT_TEAMS_ENFORCE=false] would have blocked channel '${source}' for agent='${resolvedAgentId}'`,
          )
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err
        logger.warn(`channel policy resolve failed: ${err}`)
      }
    }

    if (!prewarmedStableContext) {
      agentConfig = (agentReg as Record<string, unknown> | null)?.config as
        | Record<string, unknown>
        | null
        | undefined
      useWikiContext = agentConfig?.capability_domain === 'support'
    }

    if ((agentReg as Record<string, unknown> | null)?.is_active === false) {
      throw new BadRequestException(`Agent '${resolvedAgentId}' is deactivated`)
    }

    if (conversationCampaignId && campaignId && conversationCampaignId !== campaignId) {
      logger.warn(
        `Campaign mismatch: conversation=${conversationCampaignId} request=${campaignId} conversationId=${conversationId}`,
      )
    }

    return {
      conversationCampaignId,
      conversationAgentId,
      resolvedCampaignId,
      runtime,
      resolvedAgentId,
      configuredModel,
      agentReg,
      selectedModelInput,
      selectedModelSource,
      resolvedModelSelection,
      selectedSettings,
      gatewayModelId,
      policyScope,
      hasCampaignAccess,
      userBrainAccess,
      resolvedPolicy,
      agentConfig,
      useWikiContext,
    }
  }
}
