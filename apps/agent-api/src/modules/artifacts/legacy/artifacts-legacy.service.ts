import type { GoogleGenAI } from '@google/genai'
import { Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ErrorReporter,
  LoggerService,
  SupabaseClientFactory,
  SupabaseServiceClient,
  UserSessionMintService,
} from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { MemoriesRepository } from '../../brain/repositories/memories.repository'
import { EmbeddingService } from '../../brain/services/embedding.service'
import { EmotionalTaggingService } from '../../brain/services/emotional-tagging.service'
import { OpenRouterCostService } from '../../chat/services/openrouter-cost.service'
import {
  RequestContextService,
  type AgentCheckpointSnapshot,
} from '../../shared/services/request-context.service'
import { ArtifactLegacyRepository } from '../repositories/artifact-legacy.repository'
import { type ArtifactCapabilityPolicy } from '../services/artifact-capability.policy'
import { ArtifactLegacyIntegrationsService } from '../services/artifact-legacy-integrations.service'
import { ArtifactLegacyMediaGenerateService } from '../services/artifact-legacy-media-generate.service'
import { ArtifactLegacyMediaStatusService } from '../services/artifact-legacy-media-status.service'
import { ArtifactLegacyRuntimeCoreService } from '../services/artifact-legacy-runtime-core.service'
import { ArtifactLegacySessionCampaignService } from '../services/artifact-legacy-session-campaign.service'
import { ArtifactLegacyStateMetaService } from '../services/artifact-legacy-state-meta.service'
import { ArtifactLegacyTeamBrainService } from '../services/artifact-legacy-team-brain.service'
import { ArtifactsLegacyCheckpointService } from './artifacts-legacy-checkpoint.service'
import { ArtifactsLegacyOpenClawCostService } from './artifacts-legacy-openclaw-cost.service'
import { ArtifactsLegacyOpenClawProxyService } from './artifacts-legacy-openclaw-proxy.service'
import type {
  ArtifactLegacyPersistMissionDeliverableInput,
  ArtifactLegacyPersistMissionDeliverableResult,
} from './artifacts-legacy.types'

@Injectable()
export class ArtifactsService {
  private readonly logger = new Logger(ArtifactsService.name)
  private static readonly GENERAL_SYSTEM_KIND = 'general'
  private readonly serviceClient: SupabaseClient
  private readonly supabaseUrl: string
  private readonly supabaseAnonKey: string
  private readonly replicateApiToken: string
  private readonly geminiApiKey: string
  private readonly openRouterApiKey: string
  private themeTableNamePromise: Promise<'branding_themes' | 'themes'> | null = null

  private readonly OPENROUTER_IMAGE_MODEL = 'google/gemini-3.1-flash-image'
  private readonly OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
  private readonly mediaGenerateService = new ArtifactLegacyMediaGenerateService()
  private readonly mediaStatusService = new ArtifactLegacyMediaStatusService()
  private readonly runtimeCoreService = new ArtifactLegacyRuntimeCoreService()
  protected readonly sessionCampaignService = new ArtifactLegacySessionCampaignService()
  private readonly userSessionMint: UserSessionMintService
  private readonly stateMetaService = new ArtifactLegacyStateMetaService()
  private readonly integrationsService = new ArtifactLegacyIntegrationsService()
  private readonly teamBrainService = new ArtifactLegacyTeamBrainService()
  private readonly legacyRepository = new ArtifactLegacyRepository()
  private readonly openClawCostService: ArtifactsLegacyOpenClawCostService
  private readonly openClawProxyService: ArtifactsLegacyOpenClawProxyService
  private readonly checkpointService: ArtifactsLegacyCheckpointService

  constructor(
    private readonly config: ConfigService,
    private readonly errorLogger: LoggerService,
    private readonly requestContext: RequestContextService,
    private readonly credits: CreditsService,
    private readonly embeddingService: EmbeddingService,
    private readonly emotionalTagging: EmotionalTaggingService,
    private readonly memoriesRepo: MemoriesRepository,
    private readonly svc: SupabaseServiceClient,
    private readonly clientFactory: SupabaseClientFactory,
    protected readonly errorReporter?: ErrorReporter,
    @Optional() private readonly openRouterCostService?: OpenRouterCostService,
  ) {
    this.supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL')
    this.supabaseAnonKey = this.config.getOrThrow<string>('SUPABASE_ANON_KEY')
    this.serviceClient = svc.client
    this.replicateApiToken = this.config.get<string>('REPLICATE_API_TOKEN', '')
    this.geminiApiKey =
      this.config.get<string>('GEMINI_API_KEY', '') || this.config.get<string>('GOOGLE_API_KEY', '')
    this.openRouterApiKey = this.config.get<string>('OPENROUTER_API_KEY', '')
    this.userSessionMint = new UserSessionMintService(this.svc)
    this.openClawCostService = new ArtifactsLegacyOpenClawCostService(
      this.credits,
      this.legacyRepository,
      this.serviceClient,
      this.logger,
      this.openRouterCostService,
    )
    this.openClawProxyService = new ArtifactsLegacyOpenClawProxyService(
      this.config,
      this.logger,
      this.credits,
      this.openClawCostService,
      this.errorReporter,
    )
    this.checkpointService = new ArtifactsLegacyCheckpointService(
      this.legacyRepository,
      this.serviceClient,
      this.requestContext,
      (key) => this.parseConversationId(key),
    )
  }

  private getGoogleClient(): GoogleGenAI | null {
    if (!this.geminiApiKey) return null
    const { GoogleGenAI: GenAI } = require('@google/genai')
    return new GenAI({ apiKey: this.geminiApiKey })
  }

  private async getThemeTableName(): Promise<'branding_themes' | 'themes'> {
    return this.sessionCampaignService.getThemeTableName(this as any)
  }

  async proxyOpenClawChatCompletions(
    body: Record<string, unknown>,
    sessionKey: string,
    gatewayAgentId: string,
    orgIdHeader?: string,
  ): Promise<unknown> {
    return this.openClawProxyService.proxyOpenClawChatCompletions(
      body,
      sessionKey,
      gatewayAgentId,
      orgIdHeader,
      (key) => this.resolveOrgId(key),
    )
  }

  async proxyOpenClawResponsesStream(
    res: import('express').Response,
    body: Record<string, unknown>,
    sessionKey: string,
    gatewayAgentId: string,
    hop?: { correlationId?: string; missionId?: string; subtaskId?: string; orgId?: string },
    upstreamTrace?: { sentryTrace?: string; baggage?: string },
  ): Promise<void> {
    return this.openClawProxyService.proxyOpenClawResponsesStream(
      res,
      body,
      sessionKey,
      gatewayAgentId,
      hop,
      upstreamTrace,
      (key) => this.resolveOrgId(key),
    )
  }

  async proxyOpenClawResponses(
    body: Record<string, unknown>,
    sessionKey: string,
    gatewayAgentId: string,
    hop?: { correlationId?: string; missionId?: string; subtaskId?: string; orgId?: string },
    upstreamTrace?: { sentryTrace?: string; baggage?: string },
  ): Promise<unknown> {
    return this.openClawProxyService.proxyOpenClawResponses(
      body,
      sessionKey,
      gatewayAgentId,
      hop,
      upstreamTrace,
      (key) => this.resolveOrgId(key),
    )
  }

  private async getAccessTokenFromSessionKey(sessionKey: string, userId: string): Promise<string> {
    return this.sessionCampaignService.getAccessTokenFromSessionKey(this as any, sessionKey, userId)
  }

  private async getUserClient(userId: string, sessionKey: string): Promise<SupabaseClient> {
    return this.sessionCampaignService.getUserClient(this as any, userId, sessionKey)
  }

  private parseUserId(sessionKey: string): string | null {
    return this.sessionCampaignService.parseUserId(sessionKey)
  }

  private parseConversationId(sessionKey: string): string | null {
    return this.sessionCampaignService.parseConversationId(sessionKey)
  }

  private isMissionSessionKey(sessionKey: string): boolean {
    return this.sessionCampaignService.isMissionSessionKey(sessionKey)
  }

  private resolveUserId(sessionKey?: string): string {
    return this.sessionCampaignService.resolveUserId(sessionKey)
  }

  resolveOrgId(sessionKey?: string): string | null {
    if (!sessionKey) return null
    const fromSessionSuffix = this.sessionCampaignService.parseOrgIdFromSessionKey(sessionKey)
    if (fromSessionSuffix) return fromSessionSuffix
    const conversationId = this.parseConversationId(sessionKey)
    if (conversationId) {
      const ctx = this.requestContext.get(conversationId)
      if (ctx?.orgId) return ctx.orgId
    }
    return this.sessionCampaignService.parseOrgIdFromGatewayPrefix(sessionKey)
  }

  private async captureAgentCheckpointSnapshot(
    userId: string,
    orgId: string | null,
    agentKey: string,
  ): Promise<AgentCheckpointSnapshot> {
    return this.checkpointService.captureAgentCheckpointSnapshot(userId, orgId, agentKey)
  }

  private async recordAgentCheckpointMutation(
    sessionKey: string | undefined,
    agentKey: string,
    summary: unknown,
    preSnapshot: AgentCheckpointSnapshot | null,
  ): Promise<void> {
    this.checkpointService.recordAgentCheckpointMutation(sessionKey, agentKey, summary, preSnapshot)
  }

  private async resolveCampaignId(
    supabase: SupabaseClient,
    input: Record<string, unknown>,
    userId: string,
    sessionKey?: string,
  ): Promise<string | null> {
    return this.sessionCampaignService.resolveCampaignId(
      this as any,
      supabase,
      input,
      userId,
      sessionKey,
    )
  }

  private parseThemeId(value: unknown): string | null {
    return this.sessionCampaignService.parseThemeId(value)
  }

  private async validateThemeOwnership(
    supabase: SupabaseClient,
    userId: string,
    themeId: string,
  ): Promise<void> {
    return this.sessionCampaignService.validateThemeOwnership(
      this as any,
      supabase,
      userId,
      themeId,
    )
  }

  private async resolveThemeId(
    supabase: SupabaseClient,
    input: Record<string, unknown>,
    userId: string,
    campaignId: string | null,
  ): Promise<string | null> {
    return this.sessionCampaignService.resolveThemeId(
      this as any,
      supabase,
      input,
      userId,
      campaignId,
    )
  }

  private async isMediaGenerationEnabled(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<boolean> {
    return this.sessionCampaignService.isMediaGenerationEnabled(supabase, campaignId)
  }

  private async getMediaGenerationStatus(input: Record<string, unknown>, sessionKey?: string) {
    return this.sessionCampaignService.getMediaGenerationStatus(this as any, input, sessionKey)
  }

  private async emitProgress(
    onProgress: ((message: string) => void | Promise<void>) | undefined,
    message: string,
  ): Promise<void> {
    return this.runtimeCoreService.emitProgress(onProgress, message)
  }

  private async authorizeAction(
    action: string,
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    return this.runtimeCoreService.authorizeAction(this as any, action, data, sessionKey)
  }

  private async authorizeSkillTarget(
    supabase: SupabaseClient,
    userId: string,
    callerPolicy: ArtifactCapabilityPolicy,
    callerAgentKey: string,
    targetAgentKey: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    return this.runtimeCoreService.authorizeSkillTarget(
      supabase,
      userId,
      callerPolicy,
      callerAgentKey,
      targetAgentKey,
    )
  }

  private authorizeIntegrationSubAction(
    policy: ArtifactCapabilityPolicy,
    data: Record<string, unknown>,
  ): { allowed: boolean; reason?: string } {
    return this.runtimeCoreService.authorizeIntegrationSubAction(policy, data)
  }

  private async resolveMissionContext(
    sessionKey: string,
    userId: string,
  ): Promise<{ missionId: string; campaignId: string | null }> {
    return this.runtimeCoreService.resolveMissionContext(this as any, sessionKey, userId)
  }

  private async resolveMissionIdForSession(
    sessionKey: string,
    userId: string,
  ): Promise<string | null> {
    return this.runtimeCoreService.resolveMissionIdForSession(this as any, sessionKey, userId)
  }

  private async persistMissionDeliverable(
    input: ArtifactLegacyPersistMissionDeliverableInput,
  ): Promise<ArtifactLegacyPersistMissionDeliverableResult> {
    return this.runtimeCoreService.persistMissionDeliverable(
      this as any,
      input,
    ) as Promise<ArtifactLegacyPersistMissionDeliverableResult>
  }

  private async mainApiCall(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    sessionKey?: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    return this.runtimeCoreService.mainApiCall(this as any, method, path, sessionKey, body)
  }

  private async mainApiCallMissionSession(
    method: string,
    path: string,
    userId: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    return this.runtimeCoreService.mainApiCallMissionSessionDirect(
      this as any,
      method,
      path,
      userId,
      body,
    )
  }

  private async mainApiCallMissionSessionDirect(
    method: string,
    path: string,
    userId: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    return this.runtimeCoreService.mainApiCallMissionSessionDirect(
      this as any,
      method,
      path,
      userId,
      body,
    )
  }

  private requireMissionId(input: Record<string, unknown>): string {
    return this.runtimeCoreService.requireMissionId(input)
  }

  private async generateImage(input: Record<string, unknown>, sessionKey?: string) {
    return this.mediaGenerateService.generateImage(this as any, input, sessionKey)
  }

  private async generateVideo(input: Record<string, unknown>, sessionKey?: string) {
    return this.mediaGenerateService.generateVideo(this as any, input, sessionKey)
  }

  private async getVideoStatus(input: Record<string, unknown>, sessionKey?: string) {
    return this.mediaStatusService.getVideoStatus(this as any, input, sessionKey)
  }

  private resolveAgentIdForState(sessionKey?: string): string {
    return this.stateMetaService.resolveAgentIdForState(this as any, sessionKey)
  }

  private async updateState(input: Record<string, unknown>, sessionKey?: string) {
    return this.stateMetaService.updateState(this as any, input, sessionKey)
  }

  private async patchState(input: Record<string, unknown>, sessionKey?: string) {
    return this.stateMetaService.patchState(this as any, input, sessionKey)
  }

  private async getState(sessionKey?: string) {
    return this.stateMetaService.getState(this as any, sessionKey)
  }

  private async metaApiCall(
    method: 'GET' | 'POST',
    path: string,
    sessionKey?: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    return this.stateMetaService.metaApiCall(this as any, method, path, sessionKey, body)
  }

  private async checkIntegrationConnection(data: Record<string, unknown>, sessionKey?: string) {
    return this.stateMetaService.checkIntegrationConnection(this as any, data, sessionKey)
  }

  private async checkMetaConnection(sessionKey?: string) {
    return this.stateMetaService.checkMetaConnection(this as any, sessionKey)
  }

  private async listMetaAdAccounts(sessionKey?: string) {
    return this.stateMetaService.listMetaAdAccounts(this as any, sessionKey)
  }

  private async listMetaPages(sessionKey?: string) {
    return this.stateMetaService.listMetaPages(this as any, sessionKey)
  }

  private async resolveMetaInstagramUserId(
    pageId: string,
    sessionKey?: string,
  ): Promise<string | undefined> {
    return this.stateMetaService.resolveMetaInstagramUserId(this as any, pageId, sessionKey)
  }

  private async publishAdToMeta(data: Record<string, unknown>, sessionKey?: string) {
    return this.stateMetaService.publishAdToMeta(this as any, data, sessionKey)
  }

  private async updateAdCampaignOnMeta(data: Record<string, unknown>, sessionKey?: string) {
    return this.stateMetaService.updateAdCampaignOnMeta(this as any, data, sessionKey)
  }

  private async updateAdSetOnMeta(data: Record<string, unknown>, sessionKey?: string) {
    return this.stateMetaService.updateAdSetOnMeta(this as any, data, sessionKey)
  }

  private async persistMetaPublishDefaults(
    adCampaignId: string,
    defaults: {
      ad_account_id?: string
      page_id?: string
      instagram_user_id?: string
    },
    sessionKey?: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    return this.stateMetaService.persistMetaPublishDefaults(
      this as any,
      adCampaignId,
      defaults,
      sessionKey,
    )
  }

  private async getMetaAdStatus(data: Record<string, unknown>, sessionKey?: string) {
    return this.stateMetaService.getMetaAdStatus(this as any, data, sessionKey)
  }

  private async getMetaAdsInsights(data: Record<string, unknown>, sessionKey?: string) {
    return this.stateMetaService.getMetaAdsInsights(this as any, data, sessionKey)
  }

  private async getDeliveryEstimate(data: Record<string, unknown>, sessionKey?: string) {
    return this.stateMetaService.getDeliveryEstimate(this as any, data, sessionKey)
  }

  private async listMetaAudiences(data: Record<string, unknown>, sessionKey?: string) {
    return this.stateMetaService.listMetaAudiences(this as any, data, sessionKey)
  }

  private async createMetaCustomAudience(data: Record<string, unknown>, sessionKey?: string) {
    return this.stateMetaService.createMetaCustomAudience(this as any, data, sessionKey)
  }

  private async createMetaLookalikeAudience(data: Record<string, unknown>, sessionKey?: string) {
    return this.stateMetaService.createMetaLookalikeAudience(this as any, data, sessionKey)
  }

  private async listMetaPixelEvents(data: Record<string, unknown>, sessionKey?: string) {
    return this.stateMetaService.listMetaPixelEvents(this as any, data, sessionKey)
  }

  private async createMetaPixelEvent(data: Record<string, unknown>, sessionKey?: string) {
    return this.stateMetaService.createMetaPixelEvent(this as any, data, sessionKey)
  }

  private async getIntegrationCapabilities(sessionKey?: string) {
    return this.integrationsService.getIntegrationCapabilities(this as any, sessionKey)
  }

  private async useIntegration(data: Record<string, unknown>, sessionKey?: string) {
    return this.integrationsService.useIntegration(this as any, data, sessionKey)
  }

  private async routeComposioIntegration(
    service: string,
    integrationAction: string,
    params: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    return this.integrationsService.routeComposioIntegration(
      this as any,
      service,
      integrationAction,
      params,
      sessionKey,
    )
  }

  private async resolveIntegrationExecutionMode(
    integrationId: string,
  ): Promise<'legacy' | 'composio'> {
    return this.integrationsService.resolveIntegrationExecutionMode(this as any, integrationId)
  }

  private async logError(action: string, error: unknown, sessionKey?: string) {
    return this.teamBrainService.logError(this as any, action, error, sessionKey)
  }

  private resolveCreditAwareError(error: unknown): string | null {
    return this.teamBrainService.resolveCreditAwareError(error)
  }

  private mapIntegrationIdToComposioToolkit(integrationId: string): string {
    return this.integrationsService.mapIntegrationIdToComposioToolkit(integrationId)
  }

  private async hrListTeam(_input: Record<string, unknown>, sessionKey?: string) {
    return this.teamBrainService.hrListTeam(this as any, _input, sessionKey)
  }

  private async auditTeamAgentsAndSkills(input: Record<string, unknown>, sessionKey?: string) {
    return this.teamBrainService.auditTeamAgentsAndSkills(this as any, input, sessionKey)
  }

  private async compareTeamSkillCoverage(input: Record<string, unknown>, sessionKey?: string) {
    return this.teamBrainService.compareTeamSkillCoverage(this as any, input, sessionKey)
  }

  private async summarizeAgentCapabilities(input: Record<string, unknown>, sessionKey?: string) {
    return this.teamBrainService.summarizeAgentCapabilities(this as any, input, sessionKey)
  }

  private async listCampaignTeam(input: Record<string, unknown>, sessionKey?: string) {
    return this.teamBrainService.listCampaignTeam(this as any, input, sessionKey)
  }

  private async assignAgentToCampaign(input: Record<string, unknown>, sessionKey?: string) {
    return this.teamBrainService.assignAgentToCampaign(this as any, input, sessionKey)
  }

  private async unassignAgentFromCampaign(input: Record<string, unknown>, sessionKey?: string) {
    return this.teamBrainService.unassignAgentFromCampaign(this as any, input, sessionKey)
  }

  private async hrCreateAgent(input: Record<string, unknown>, sessionKey?: string) {
    return this.teamBrainService.hrCreateAgent(this as any, input, sessionKey)
  }

  private async hrGetAgent(input: Record<string, unknown>, sessionKey?: string) {
    return this.teamBrainService.hrGetAgent(this as any, input, sessionKey)
  }

  private async hrUpdateAgent(input: Record<string, unknown>, sessionKey?: string) {
    return this.teamBrainService.hrUpdateAgent(this as any, input, sessionKey)
  }

  private async saveMemory(input: Record<string, unknown>, sessionKey?: string) {
    return this.teamBrainService.saveMemory(this as any, input, sessionKey)
  }

  private async searchMemory(input: Record<string, unknown>, sessionKey?: string) {
    return this.teamBrainService.searchMemory(this as any, input, sessionKey)
  }

  private parseAgentIdFromSessionKey(sessionKey: string): string | null {
    return this.sessionCampaignService.parseAgentIdFromSessionKey(sessionKey)
  }
}
