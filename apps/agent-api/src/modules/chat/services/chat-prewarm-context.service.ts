import { BadRequestException, Injectable, Optional, type Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isModelStrategy, resolveModelForStrategy } from '@vibey/api-shared'
import { isChatTimingLogsEnabled } from '../../../lib/debug/chat-timing-logs'
import type { ResolvedAgentPolicy } from '../../agent-policy/agent-policy.types'
import { AgentPolicyService } from '../../agent-policy/services/agent-policy.service'
import { AgentRuntimeReadinessService } from '../../agent-sync/services/agent-runtime-readiness.service'
import { BrainContextService } from '../../brain/services/brain-context.service'
import { ConversationsRepository } from '../../conversations/repositories/conversations.repository'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { ChatContextRepository } from '../repositories/chat-context.repository'
import { CampaignContextService } from './campaign-context.service'
import { ChatAccessTokenService } from './chat-access-token.service'
import { ChatDocumentContextService } from './chat-document-context.service'
import { ChatModelInputService } from './chat-model-input.service'
import {
  ChatPrewarmCacheService,
  type ChatPrewarmCacheStatus,
  type ChatPrewarmCacheStore,
} from './chat-prewarm-cache.service'
import type {
  ChatAgentPrewarmContext,
  ChatAgentPrewarmContextResolution,
  ChatStablePrewarmContext,
  ChatStablePrewarmContextResolution,
  PrewarmChatContextOptions,
  PrewarmDbAccess,
} from './chat-prewarm-context.types'
import {
  deserializeResolvedAgentPolicy,
  serializeResolvedAgentPolicy,
} from './chat-prewarm-policy-codec'
import { ChatProfileContextService } from './chat-profile-context.service'
import { IntegrationContextService } from './integration-context.service'

export type {
  ChatAgentPrewarmContext,
  ChatAgentPrewarmContextResolution,
  ChatStablePrewarmContext,
  ChatStablePrewarmContextResolution,
  PrewarmChatContextOptions,
} from './chat-prewarm-context.types'

function normalizeScopeId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

@Injectable()
export class ChatPrewarmContextService {
  constructor(
    private readonly agentRuntime: AgentRuntimeService,
    private readonly runtimeReadiness: AgentRuntimeReadinessService,
    private readonly brainContext: BrainContextService,
    private readonly campaignContext: CampaignContextService,
    private readonly integrationContext: IntegrationContextService,
    private readonly conversations: ConversationsRepository,
    private readonly chatContextRepository: ChatContextRepository,
    @Optional() private readonly chatPrewarmCache: ChatPrewarmCacheService | undefined,
    @Optional() private readonly agentPolicy: AgentPolicyService | undefined,
    private readonly chatAccessTokenService: ChatAccessTokenService,
    private readonly chatDocumentContextService: ChatDocumentContextService,
    private readonly chatModelInputService: ChatModelInputService,
    private readonly chatProfileContextService: ChatProfileContextService,
  ) {}

  createPrewarmCacheKey(options: PrewarmChatContextOptions): string | null {
    const campaignKey = normalizeScopeId(options.campaignId)
    const canonicalSpaceId = campaignKey ? null : (options.spaceId ?? null)
    const canonicalScopeKind = campaignKey ? 'campaign' : (options.scopeKind ?? null)
    const conversationId = normalizeScopeId(options.conversationId)
    if (!conversationId) return null
    return (
      this.chatPrewarmCache?.createKey({
        kind: 'conversation',
        userId: options.userId,
        orgId: options.orgId ?? null,
        conversationId,
        agentKey: options.agentKey ?? null,
        campaignId: campaignKey,
        spaceId: canonicalSpaceId,
        scopeKind: canonicalScopeKind,
        model: options.model ?? null,
        modelSettings: options.modelSettings ?? null,
        source: options.source ?? 'studio',
      }) ?? null
    )
  }

  createAgentPrewarmCacheKey(options: PrewarmChatContextOptions): string | null {
    const agentKey = normalizeScopeId(options.agentKey)
    if (!agentKey) return null
    return (
      this.chatPrewarmCache?.createKey({
        kind: 'agent',
        userId: options.userId,
        orgId: options.orgId ?? null,
        agentKey,
        model: options.model ?? null,
        modelSettings: options.modelSettings ?? null,
        source: options.source ?? 'studio',
      }) ?? null
    )
  }

  async prewarmChatContext(
    options: PrewarmChatContextOptions,
    logger: Pick<Logger, 'log' | 'warn'>,
  ): Promise<{
    ok: true
    cache_key: string
    reused: boolean
    cache_status: ChatPrewarmCacheStatus
    store: ChatPrewarmCacheStore
    duration_ms: number
    agent_cache_key?: string
    agent_reused?: boolean
    agent_cache_status?: ChatPrewarmCacheStatus
    agent_store?: ChatPrewarmCacheStore
    agent_duration_ms?: number
  }> {
    const prewarmTimingLogsEnabled = isChatTimingLogsEnabled()
    const result = await this.resolveStablePrewarmContextForTurn(options, logger)
    if (prewarmTimingLogsEnabled) {
      logger.log(
        `[ChatPrewarm] done conversationId=${options.conversationId} userId=${options.userId} orgId=${options.orgId ?? 'none'} cache_key=${result.cache_key} reused=${result.reused} cache_status=${result.cache_status} store=${result.store} duration_ms=${result.duration_ms}`,
      )
    }
    return {
      ok: true,
      cache_key: result.cache_key,
      reused: result.reused,
      cache_status: result.cache_status,
      store: result.store,
      duration_ms: result.duration_ms,
      ...(result.agent_cache_key ? { agent_cache_key: result.agent_cache_key } : {}),
      ...(typeof result.agent_reused === 'boolean' ? { agent_reused: result.agent_reused } : {}),
      ...(result.agent_cache_status ? { agent_cache_status: result.agent_cache_status } : {}),
      ...(result.agent_store ? { agent_store: result.agent_store } : {}),
      ...(typeof result.agent_duration_ms === 'number'
        ? { agent_duration_ms: result.agent_duration_ms }
        : {}),
    }
  }

  async prewarmAgentChatContext(
    options: PrewarmChatContextOptions,
    logger: Pick<Logger, 'log' | 'warn'>,
  ): Promise<{
    ok: true
    cache_key: string
    reused: boolean
    cache_status: ChatPrewarmCacheStatus
    store: ChatPrewarmCacheStore
    duration_ms: number
  }> {
    const result = await this.resolveAgentPrewarmContextForTurn(options, logger)
    return {
      ok: true,
      cache_key: result.cache_key,
      reused: result.reused,
      cache_status: result.cache_status,
      store: result.store,
      duration_ms: result.duration_ms,
    }
  }

  async resolveStablePrewarmContextForTurn(
    options: PrewarmChatContextOptions,
    logger: Pick<Logger, 'log' | 'warn'>,
  ): Promise<ChatStablePrewarmContextResolution> {
    const startedAt = Date.now()
    const cacheKey = this.createPrewarmCacheKey(options)
    if (!cacheKey || !this.chatPrewarmCache) {
      const built = await this.buildStablePrewarmContextWithMetadata(options, logger)
      return {
        context: built.context,
        cache_key: cacheKey ?? 'uncached',
        reused: false,
        cache_status: 'built_on_send',
        store: 'memory',
        duration_ms: Date.now() - startedAt,
        ...this.toAgentResolutionMetadata(built.agentPrewarm),
      }
    }

    let agentPrewarm: ChatAgentPrewarmContextResolution | null = null
    const result = await this.chatPrewarmCache.getOrBuildDetailed(
      cacheKey,
      async () => {
        const built = await this.buildStablePrewarmContextWithMetadata(options, logger)
        agentPrewarm = built.agentPrewarm
        return built.context
      },
      {
        serialize: (value) => this.serializeStablePrewarmContext(value),
        deserialize: (value) => this.deserializeStablePrewarmContext(value),
      },
    )
    return {
      context: result.value,
      cache_key: result.cacheKey,
      reused: result.reused,
      cache_status: result.cacheStatus,
      store: result.store,
      duration_ms: Date.now() - startedAt,
      ...(result.cacheStatus === 'built_on_send'
        ? this.toAgentResolutionMetadata(agentPrewarm)
        : {}),
    }
  }

  async resolveAgentPrewarmContextForTurn(
    options: PrewarmChatContextOptions,
    logger: Pick<Logger, 'log' | 'warn'>,
  ): Promise<ChatAgentPrewarmContextResolution> {
    const startedAt = Date.now()
    const cacheKey = this.createAgentPrewarmCacheKey(options)
    if (!cacheKey || !this.chatPrewarmCache) {
      const context = await this.buildAgentPrewarmContext(options, logger)
      return {
        context,
        cache_key: cacheKey ?? 'uncached',
        reused: false,
        cache_status: 'built_on_send',
        store: 'memory',
        duration_ms: Date.now() - startedAt,
      }
    }

    const result = await this.chatPrewarmCache.getOrBuildDetailed(
      cacheKey,
      () => this.buildAgentPrewarmContext(options, logger),
      {
        serialize: (value) => this.serializeAgentPrewarmContext(value),
        deserialize: (value) => this.deserializeAgentPrewarmContext(value),
      },
    )
    return {
      context: result.value,
      cache_key: result.cacheKey,
      reused: result.reused,
      cache_status: result.cacheStatus,
      store: result.store,
      duration_ms: Date.now() - startedAt,
    }
  }

  async buildStablePrewarmContext(
    options: PrewarmChatContextOptions,
    logger: Pick<Logger, 'log' | 'warn'>,
  ): Promise<ChatStablePrewarmContext> {
    return (await this.buildStablePrewarmContextWithMetadata(options, logger)).context
  }

  async buildAgentPrewarmContext(
    options: PrewarmChatContextOptions,
    logger: Pick<Logger, 'log' | 'warn'>,
  ): Promise<ChatAgentPrewarmContext> {
    const { model, modelSettings, userId, orgId, source } = options
    const agentKey = normalizeScopeId(options.agentKey)
    const db = await this.createPrewarmDbAccess(options)
    const runtime = await this.agentRuntime.resolveConversationRuntime(
      db.getSupabase(),
      userId,
      agentKey ?? undefined,
      orgId,
    )
    const resolvedAgentId = runtime.agentKey
    await this.runtimeReadiness.ensureRuntimeReady({
      userId,
      orgId: orgId ?? null,
      agentKey: runtime.agentKey,
      gatewayAgentId: runtime.gatewayAgentId,
    })

    const requestedModel = this.chatModelInputService.normalizeModelValue(model)
    const [configuredModel, agentReg] = await Promise.all([
      db
        .dbOp((s) =>
          this.chatModelInputService.resolveAgentConfiguredModel(s, userId, resolvedAgentId, orgId),
        )
        .catch(() => null),
      db
        .dbOp(async (s) => {
          const { data, error } = await this.chatContextRepository.findAgentRegistration(s, {
            userId,
            agentKey: resolvedAgentId,
            orgId,
          })
          if (error) throw error
          return data as Record<string, unknown> | null
        })
        .catch(() => null),
    ])
    const selectedModelInput = requestedModel ?? configuredModel ?? 'auto'
    const selectedModelSource =
      requestedModel !== null ? 'request' : configuredModel !== null ? 'agent_config' : 'default'
    const resolvedModelSelection = isModelStrategy(selectedModelInput)
      ? resolveModelForStrategy(selectedModelInput, 'chat')
      : { modelId: selectedModelInput, reason: 'manual_chat' }
    const selectedSettings = await this.chatModelInputService.validateModelSettings(
      resolvedModelSelection.modelId,
      this.chatModelInputService.mergeResolvedModelSettings(resolvedModelSelection, modelSettings),
    )
    const gatewayModelId = selectedSettings.resolvedModelId
    if ((agentReg as Record<string, unknown> | null)?.is_active === false) {
      throw new BadRequestException(`Agent '${resolvedAgentId}' is deactivated`)
    }

    const policyScope = { orgId: orgId ?? null, userId: orgId ? null : userId }
    let hasCampaignAccess = false
    let userBrainAccess = false
    let resolvedPolicy: ResolvedAgentPolicy | null = null
    if (this.agentPolicy) {
      try {
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

    if (this.agentPolicy && (source === 'slack' || source === 'telegram')) {
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

    const agentConfig = (agentReg as Record<string, unknown> | null)?.config as
      | Record<string, unknown>
      | null
      | undefined
    const useWikiContext = agentConfig?.capability_domain === 'support'
    const [userProfileSummary, teamRosterSummary, integrationSummary, agentBrainPresence] =
      await Promise.all([
        hasCampaignAccess
          ? this.chatProfileContextService.buildUserProfileSummary(userId, orgId).catch((err) => {
              logger.warn(`User profile context failed: ${err}`)
              return ''
            })
          : Promise.resolve(''),
        resolvedAgentId === 'atlas' || resolvedAgentId === 'hr'
          ? this.chatProfileContextService
              .buildTeamRosterContext(userId, orgId, resolvedAgentId)
              .catch((err) => {
                logger.warn(`Team roster context failed: ${err}`)
                return ''
              })
          : Promise.resolve(''),
        hasCampaignAccess
          ? this.integrationContext
              .buildIntegrationContext(userId, resolvedAgentId, orgId)
              .catch((err) => {
                logger.warn(`Integration context failed: ${err}`)
                return ''
              })
          : Promise.resolve(''),
        this.brainContext.resolveAgentBrainPresence(userId, resolvedAgentId, orgId).catch((err) => {
          logger.warn(`Agent brain presence resolve failed: ${err}`)
          return { hasAgentBrain: false, brainId: null }
        }),
      ])

    return {
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
      userProfileSummary,
      teamRosterSummary,
      integrationSummary,
      agentBrainPresence,
    }
  }

  private async buildStablePrewarmContextWithMetadata(
    options: PrewarmChatContextOptions,
    logger: Pick<Logger, 'log' | 'warn'>,
  ): Promise<{
    context: ChatStablePrewarmContext
    agentPrewarm: ChatAgentPrewarmContextResolution | null
  }> {
    const { conversationId, userId, campaignId, spaceId, scopeKind, orgId, source } = options
    const resolvedConversationId = normalizeScopeId(conversationId)
    if (!resolvedConversationId) throw new BadRequestException('Missing conversation_id')
    const db = await this.createPrewarmDbAccess(options)
    const requestCampaignId = normalizeScopeId(campaignId)
    const hasMessageCampaignScope = campaignId !== undefined
    const conversation = await db.dbOp((s) =>
      orgId
        ? this.conversations.findByIdOrgScoped(s, resolvedConversationId, orgId)
        : this.conversations.findByIdScoped(s, resolvedConversationId, userId, orgId),
    )
    const conversationCampaignId =
      (conversation?.campaign_id as string | null | undefined) ?? undefined
    const conversationAgentId = (conversation?.agent_id as string | null | undefined) ?? undefined
    const resolvedCampaignId =
      hasMessageCampaignScope && (spaceId || scopeKind === 'personal' || scopeKind === 'campaign')
        ? (requestCampaignId ?? undefined)
        : (conversationCampaignId ?? requestCampaignId ?? undefined)
    const agentPrewarm = await this.resolveAgentPrewarmContextForTurn(
      {
        ...options,
        agentKey: options.agentKey ?? conversationAgentId,
      },
      logger,
    )
    const agentContext = agentPrewarm.context
    const resolvedChannel =
      source === 'telegram' ? 'telegram' : source === 'slack' ? 'slack' : 'studio'
    const skipPreviousImages = resolvedChannel !== 'studio'
    const [previousImageUrls, campaignTeamSummary, campaignSummary, themeSummary] =
      await Promise.all([
        skipPreviousImages
          ? Promise.resolve([] as Array<{ filename: string; url: string }>)
          : this.chatDocumentContextService
              .loadPreviousImageUrls(resolvedConversationId)
              .catch((err) => {
                logger.warn(`Failed to load previous image URLs: ${err}`)
                return [] as Array<{ filename: string; url: string }>
              }),
        agentContext.hasCampaignAccess
          ? this.chatProfileContextService
              .buildCampaignTeamContext(resolvedCampaignId)
              .catch((err) => {
                logger.warn(`Campaign team context failed: ${err}`)
                return ''
              })
          : Promise.resolve(''),
        agentContext.hasCampaignAccess && resolvedCampaignId
          ? this.campaignContext
              .buildCampaignSummary(userId, resolvedCampaignId, orgId)
              .catch((err) => {
                logger.warn(`Campaign context failed: ${err}`)
                return ''
              })
          : Promise.resolve(''),
        agentContext.hasCampaignAccess && resolvedCampaignId
          ? this.campaignContext
              .buildThemeSummary(userId, resolvedCampaignId, orgId)
              .catch((err) => {
                logger.warn(`Theme context failed: ${err}`)
                return ''
              })
          : Promise.resolve(''),
      ])

    return {
      agentPrewarm,
      context: {
        conversation: conversation as Record<string, unknown> | null,
        conversationCampaignId,
        conversationAgentId,
        resolvedCampaignId,
        ...agentContext,
        previousImageUrls,
        campaignTeamSummary,
        campaignSummary,
        themeSummary,
      },
    }
  }

  private serializeStablePrewarmContext(context: ChatStablePrewarmContext): string {
    return JSON.stringify({
      ...context,
      resolvedPolicy: serializeResolvedAgentPolicy(context.resolvedPolicy),
    })
  }

  private deserializeStablePrewarmContext(value: string): ChatStablePrewarmContext {
    const parsed = JSON.parse(value) as Omit<ChatStablePrewarmContext, 'resolvedPolicy'> & {
      resolvedPolicy?: (Omit<ResolvedAgentPolicy, 'effective'> & { effective?: string[] }) | null
    }
    return {
      ...parsed,
      resolvedPolicy: parsed.resolvedPolicy
        ? deserializeResolvedAgentPolicy(parsed.resolvedPolicy)
        : null,
    }
  }

  private serializeAgentPrewarmContext(context: ChatAgentPrewarmContext): string {
    return JSON.stringify({
      ...context,
      resolvedPolicy: serializeResolvedAgentPolicy(context.resolvedPolicy),
    })
  }

  private deserializeAgentPrewarmContext(value: string): ChatAgentPrewarmContext {
    const parsed = JSON.parse(value) as Omit<ChatAgentPrewarmContext, 'resolvedPolicy'> & {
      resolvedPolicy?: (Omit<ResolvedAgentPolicy, 'effective'> & { effective?: string[] }) | null
    }
    return {
      ...parsed,
      resolvedPolicy: parsed.resolvedPolicy
        ? deserializeResolvedAgentPolicy(parsed.resolvedPolicy)
        : null,
    }
  }

  private async createPrewarmDbAccess(
    options: PrewarmChatContextOptions,
  ): Promise<PrewarmDbAccess> {
    let dbSupabase = options.supabase
    let currentAccessToken = options.accessToken
    let currentRefreshToken = options.refreshToken?.trim().length
      ? options.refreshToken.trim()
      : null
    const refreshDbAuth = async (): Promise<void> => {
      if (!currentRefreshToken) throw new Error('Missing refresh token')
      const refreshed = await this.chatAccessTokenService.refreshAccessToken(currentRefreshToken)
      currentAccessToken = refreshed.accessToken
      currentRefreshToken = refreshed.refreshToken ?? currentRefreshToken
      dbSupabase = this.chatAccessTokenService.createRlsClient(currentAccessToken)
    }
    const dbOp = async <T>(op: (client: SupabaseClient) => Promise<T>): Promise<T> => {
      try {
        return await op(dbSupabase)
      } catch (err) {
        if (currentRefreshToken && this.chatAccessTokenService.isJwtExpiredDbError(err)) {
          await refreshDbAuth()
          return await op(dbSupabase)
        }
        throw err
      }
    }
    if (
      currentRefreshToken &&
      this.chatAccessTokenService.isJwtExpiredOrNearExpiry(currentAccessToken, 60)
    ) {
      await refreshDbAuth()
    }

    return {
      dbOp,
      getSupabase: () => dbSupabase,
    }
  }

  private toAgentResolutionMetadata(
    result: ChatAgentPrewarmContextResolution | null,
  ): Omit<
    ChatStablePrewarmContextResolution,
    'context' | 'cache_key' | 'reused' | 'cache_status' | 'store' | 'duration_ms'
  > {
    if (!result) return {}
    return {
      agent_cache_key: result.cache_key,
      agent_reused: result.reused,
      agent_cache_status: result.cache_status,
      agent_store: result.store,
      agent_duration_ms: result.duration_ms,
    }
  }
}
