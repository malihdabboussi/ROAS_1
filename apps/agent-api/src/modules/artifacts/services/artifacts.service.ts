import { Injectable, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ErrorReporter,
  LoggerService,
  SupabaseClientFactory,
  SupabaseServiceClient,
} from '@vibey/api-shared'
import { AgentPolicyService } from '../../agent-policy/services/agent-policy.service'
import { AgentRuntimeReadinessService } from '../../agent-sync/services/agent-runtime-readiness.service'
import { AgentRuntimeSkillScopeService } from '../../agent-sync/services/agent-runtime-skill-scope.service'
import { CreditsService } from '../../billing/services/credits.service'
import { ProviderBillingAttemptsService } from '../../billing/services/provider-billing-attempts.service'
import { MemoriesRepository } from '../../brain/repositories/memories.repository'
import { BrainRetrievalService } from '../../brain/services/brain-retrieval.service'
import { CrystallizationService } from '../../brain/services/crystallization.service'
import { DocumentIngestionService } from '../../brain/services/document-ingestion.service'
import { EmbeddingService } from '../../brain/services/embedding.service'
import { EmotionalTaggingService } from '../../brain/services/emotional-tagging.service'
import { LinkExtractionService } from '../../brain/services/link-extraction.service'
import { SkIngestionService } from '../../brain/services/sk-ingestion.service'
import { StreamRegistryService } from '../../chat/services/stream-registry.service'
import { ComposioService } from '../../composio/services/composio.service'
import { ModalFileIoService } from '../../project-runtime/services/modal-file-io.service'
import { ProjectStorageSyncService } from '../../project-runtime/services/project-storage-sync.service'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { RequestContextService } from '../../shared/services/request-context.service'
import { SpaceAssetIndexService } from '../../spaces-retrieval/services/space-asset-index.service'
import { SpaceRetrievalService } from '../../spaces-retrieval/services/space-retrieval.service'
import { VibeyMcpDocsSearchService } from '../../vibey-mcp/services/vibey-mcp-docs-search.service'
import { ArtifactsService as LegacyArtifactsService } from '../legacy/artifacts-legacy.service'
import { ArtifactLegacyIntegrationsRepository } from '../repositories/artifact-legacy-integrations.repository'
import { ArtifactActionExecutionService } from './artifact-action-execution.service'
import { describeActionContract } from './artifact-action-schemas'
import { ACTION_METHOD_MAP, parseConversationIdFromSessionKey } from './artifact-action.registry'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactAgentDelegationService } from './artifact-agent-delegation.service'
import { ArtifactAnalyticsService } from './artifact-analytics.service'
import { ArtifactAuthorizationService } from './artifact-authorization.service'
import { ArtifactAvatarsService } from './artifact-avatars.service'
import { ArtifactBlogService } from './artifact-blog.service'
import { ArtifactBrainScholarService } from './artifact-brain-scholar.service'
import { ArtifactCalendarService } from './artifact-calendar.service'
import { ArtifactCampaignThemeService } from './artifact-campaign-theme.service'
import { ArtifactCanvasService } from './artifact-canvas.service'
import type { ArtifactCapabilityDomain } from './artifact-capability.policy'
import { ArtifactChannelContextService } from './artifact-channel-context.service'
import { ArtifactChannelMembersService } from './artifact-channel-members.service'
import { ArtifactCompanyCortexService } from './artifact-company-cortex.service'
import { ArtifactContactsService } from './artifact-contacts.service'
import { ArtifactConversationSearchService } from './artifact-conversation-search.service'
import { ArtifactCustomObjectsService } from './artifact-custom-objects.service'
import { ArtifactCustomerBrainService } from './artifact-customer-brain.service'
import { ArtifactDocumentsService } from './artifact-documents.service'
import { ArtifactDocxService } from './artifact-docx.service'
import { ArtifactDreamOpsService } from './artifact-dream-ops.service'
import { ArtifactEmailsService } from './artifact-emails.service'
import { ArtifactFlowBuilderService } from './artifact-flow-builder.service'
import { ArtifactFlowsService } from './artifact-flows.service'
import { ArtifactFormsService } from './artifact-forms.service'
import { ArtifactFunnelsService } from './artifact-funnels.service'
import { ArtifactIntegrationOrchestratorService } from './artifact-integration-orchestrator.service'
import { ArtifactMcpService } from './artifact-mcp.service'
import { ArtifactMediaProcessingService } from './artifact-media-processing.service'
import { ArtifactMissionsMediaService } from './artifact-missions-media.service'
import { ArtifactMissionsService } from './artifact-missions.service'
import { ArtifactNorthStarService } from './artifact-north-star.service'
import { ArtifactNotificationsService } from './artifact-notifications.service'
import { ArtifactOffersAdsService } from './artifact-offers-ads.service'
import { ArtifactPdfService } from './artifact-pdf.service'
import {
  ArtifactPostActionVerificationService,
  type ArtifactPostActionVerifier,
} from './artifact-post-action-verification.service'
import { ArtifactPresentationsService } from './artifact-presentations.service'
import { ArtifactProjectsService } from './artifact-projects.service'
import { ArtifactResearchService } from './artifact-research.service'
import { ArtifactResolverService } from './artifact-resolver.service'
import { ArtifactSequencesService } from './artifact-sequences.service'
import { ArtifactSessionContextService } from './artifact-session-context.service'
import { ArtifactSocialPostsService } from './artifact-social-posts.service'
import { ArtifactSpaceRetrievalService } from './artifact-space-retrieval.service'
import { ArtifactSpaceSchemaService } from './artifact-space-schema.service'
import { ArtifactStateMetaIntegrationsGithubTeamBrainService } from './artifact-state-meta-integrations-github-team-brain.service'
import { ArtifactStrategyService } from './artifact-strategy.service'
import { ArtifactSupabaseService } from './artifact-supabase.service'
import { ArtifactTasksService } from './artifact-tasks.service'
import { ArtifactThemesService } from './artifact-themes.service'
import { ArtifactVisualDocService } from './artifact-visual-doc.service'

@Injectable()
export class ArtifactsService extends LegacyArtifactsService {
  private readonly actionRegistry: Record<string, ArtifactActionHandler>
  private readonly authzService: ArtifactAuthorizationService
  private readonly sessionContextService: ArtifactSessionContextService
  private readonly campaignThemeService: ArtifactCampaignThemeService
  private readonly artifactResolverService = new ArtifactResolverService()
  private readonly integrationsRepository = new ArtifactLegacyIntegrationsRepository()
  private readonly actionExecutionService = new ArtifactActionExecutionService(
    new ArtifactPostActionVerificationService(),
  )
  private readonly integrationOrchestrator = new ArtifactIntegrationOrchestratorService()
  private readonly composioService: ComposioService
  readonly brainRetrievalService?: BrainRetrievalService
  readonly crystallizationService: CrystallizationService
  readonly documentIngestionService: DocumentIngestionService
  readonly linkExtractionService: LinkExtractionService
  readonly skIngestionService: SkIngestionService
  readonly spaceAssetIndexService?: SpaceAssetIndexService
  readonly spaceRetrievalService?: SpaceRetrievalService
  readonly streamRegistry: StreamRegistryService | null

  constructor(
    config: ConfigService,
    errorLogger: LoggerService,
    requestContext: RequestContextService,
    private readonly billingCredits: CreditsService,
    embeddingService: EmbeddingService,
    emotionalTagging: EmotionalTaggingService,
    memoriesRepo: MemoriesRepository,
    svc: SupabaseServiceClient,
    clientFactory: SupabaseClientFactory,
    composioService: ComposioService,
    crystallizationService: CrystallizationService,
    documentIngestionService: DocumentIngestionService,
    linkExtractionService: LinkExtractionService,
    skIngestionService: SkIngestionService,
    artifactMissionsMedia: ArtifactMissionsMediaService,
    modalFileIo?: ModalFileIoService,
    storageSync?: ProjectStorageSyncService,
    private readonly artifactMcpService?: ArtifactMcpService,
    errorReporter?: ErrorReporter,
    streamRegistry?: StreamRegistryService,
    private readonly agentPolicyService?: AgentPolicyService,
    private readonly agentRuntime?: AgentRuntimeService,
    private readonly runtimeReadiness?: AgentRuntimeReadinessService,
    brainRetrievalService?: BrainRetrievalService,
    private readonly docsSearch?: VibeyMcpDocsSearchService,
    spaceAssetIndexService?: SpaceAssetIndexService,
    spaceRetrievalService?: SpaceRetrievalService,
    private readonly runtimeSkillScope?: AgentRuntimeSkillScopeService,
    @Optional()
    private readonly artifactVisualDocService: ArtifactVisualDocService = new ArtifactVisualDocService(),
    @Optional()
    readonly providerBillingAttempts?: ProviderBillingAttemptsService,
  ) {
    super(
      config,
      errorLogger,
      requestContext,
      billingCredits,
      embeddingService,
      emotionalTagging,
      memoriesRepo,
      svc,
      clientFactory,
      errorReporter,
      undefined,
      providerBillingAttempts,
    )

    this.streamRegistry = streamRegistry ?? null
    this.crystallizationService = crystallizationService
    this.documentIngestionService = documentIngestionService
    this.linkExtractionService = linkExtractionService
    this.skIngestionService = skIngestionService
    this.brainRetrievalService = brainRetrievalService
    this.spaceAssetIndexService = spaceAssetIndexService
    this.spaceRetrievalService = spaceRetrievalService

    this.authzService = new ArtifactAuthorizationService()
    this.sessionContextService = new ArtifactSessionContextService()
    this.campaignThemeService = new ArtifactCampaignThemeService()
    this.composioService = composioService

    this.actionRegistry = {
      describe_action: (data) => this.describeAction(data),
      search_vibey_docs: (data) => this.searchVibeyDocs(data),
      ...new ArtifactOffersAdsService().getHandlers(this as any),
      ...new ArtifactFunnelsService().getHandlers(this as any),
      ...new ArtifactFormsService().getHandlers(this as any),
      ...new ArtifactDocumentsService().getHandlers(this as any),
      ...new ArtifactEmailsService().getHandlers(this as any),
      ...new ArtifactDocxService().getHandlers(this as any),
      ...new ArtifactPdfService().getHandlers(this as any),
      ...new ArtifactPresentationsService().getHandlers(this as any),
      ...new ArtifactSequencesService().getHandlers(this as any),
      ...new ArtifactAvatarsService().getHandlers(this as any),
      ...new ArtifactThemesService().getHandlers(this as any),
      ...new ArtifactMediaProcessingService().getHandlers(this as any),
      ...new ArtifactContactsService().getHandlers(this as any),
      ...new ArtifactConversationSearchService().getHandlers(this as any),
      ...new ArtifactTasksService().getHandlers(this as any),
      ...new ArtifactCalendarService().getHandlers(this as any),
      ...new ArtifactSpaceSchemaService().getHandlers(this as any),
      ...new ArtifactFlowsService().getHandlers(this as any),
      ...new ArtifactFlowBuilderService().getHandlers(this as any),
      ...new ArtifactSpaceRetrievalService().getHandlers(this as any),
      ...new ArtifactResearchService().getHandlers(this as any),
      ...this.artifactVisualDocService.getHandlers(this as any),
      ...new ArtifactMissionsService().getHandlers(this as any),
      ...artifactMissionsMedia.getHandlers(this as any),
      ...new ArtifactCanvasService().getHandlers(this as any),
      ...new ArtifactNorthStarService().getHandlers(this as any),
      ...new ArtifactStateMetaIntegrationsGithubTeamBrainService().getHandlers(this as any),
      ...new ArtifactSocialPostsService().getHandlers(this as any),
      ...new ArtifactBlogService().getHandlers(this as any),
      ...(() => {
        const projectsSvc = new ArtifactProjectsService()
        if (modalFileIo && storageSync) {
          projectsSvc.setRuntimeServices(modalFileIo, storageSync)
        }
        return projectsSvc.getHandlers(this as any)
      })(),
      ...new ArtifactCustomObjectsService().getHandlers(this as any),
      ...new ArtifactBrainScholarService().getHandlers(this as any),
      ...new ArtifactCompanyCortexService().getHandlers(this as any),
      ...new ArtifactCustomerBrainService().getHandlers(this as any),
      ...new ArtifactDreamOpsService().getHandlers(this as any),
      ...new ArtifactStrategyService().getHandlers(this as any),
      ...new ArtifactAnalyticsService().getHandlers(this as any),
      ...new ArtifactNotificationsService().getHandlers(this as any),
      ...(artifactMcpService?.getHandlers(this as any) ?? {}),
      ...new ArtifactAgentDelegationService().getHandlers(this as any),
      ...new ArtifactChannelMembersService().getHandlers(this as any),
      ...new ArtifactChannelContextService().getHandlers(this as any),
      ...new ArtifactSupabaseService().getHandlers(this as any),
    }
  }

  bustRuntimeSkillCatalogCacheForAgent(agentKey: string, sessionKey?: string): void {
    const userId = String((this as any).resolveUserId?.(sessionKey) ?? '').trim()
    const orgId =
      typeof (this as any).resolveOrgId === 'function'
        ? (this as any).resolveOrgId(sessionKey)
        : null
    this.runtimeSkillScope?.bustRuntimeSkillCatalogCache({
      agentKey,
      ...(userId ? { userId } : {}),
      orgId: orgId ?? null,
    })
  }

  async assertCreditsForSession(
    sessionKey?: string,
    metadata?: Record<string, unknown>,
    orgIdHeader?: string,
  ): Promise<void> {
    if (sessionKey?.includes('::admin-skill-builder')) return
    const metadataUserId = typeof metadata?.user_id === 'string' ? metadata.user_id.trim() : ''
    const userId = metadataUserId || String((this as any).resolveUserId?.(sessionKey) ?? '').trim()
    if (!userId) throw new Error('Unable to resolve user for credit check')

    const metadataOrgId = typeof metadata?.org_id === 'string' ? metadata.org_id.trim() : ''
    const headerOrgId = typeof orgIdHeader === 'string' ? orgIdHeader.trim() : ''
    const sessionOrgId =
      typeof (this as any).resolveOrgId === 'function'
        ? (this as any).resolveOrgId(sessionKey)
        : null
    await this.billingCredits.assertHasAvailableCredits(
      userId,
      metadataOrgId || headerOrgId || sessionOrgId || null,
    )
  }

  async executeAction(
    action: string,
    data: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<unknown> {
    return this.actionExecutionService.executeAction(
      this as any,
      this.actionRegistry,
      this.authzService,
      this.artifactResolverService,
      action,
      data,
      sessionKey,
      onProgress,
    )
  }

  async resolveCampaignIdByNameReadOnly(
    supabase: SupabaseClient,
    userId: string,
    campaignName: string,
    orgId?: string | null,
  ): Promise<string> {
    return this.sessionCampaignService.resolveCampaignIdByNameReadOnly(
      supabase,
      userId,
      campaignName,
      orgId,
    )
  }

  async bindConversationToNamedCampaign(
    supabase: SupabaseClient,
    userId: string,
    sessionKey: string | undefined,
    campaignId: string,
  ): Promise<void> {
    await this.sessionCampaignService.bindConversationToNamedCampaign(
      supabase,
      userId,
      sessionKey,
      campaignId,
    )
  }

  getActionRegistryForTests(): Record<string, ArtifactActionHandler> {
    return this.actionRegistry
  }

  setPostActionVerifierForTests(verifier: ArtifactPostActionVerifier): void {
    this.actionExecutionService.setPostActionVerifierForTests(verifier)
  }

  describeAction(data: Record<string, unknown>): Record<string, unknown> {
    const actionName = String(data.action_name ?? data.action ?? '').trim()
    if (!actionName) {
      return { success: false, error: 'action_name is required' }
    }
    const contract = describeActionContract(actionName)
    if (!contract) {
      return {
        success: false,
        error: `No structured action contract found for ${actionName}`,
        action: actionName,
      }
    }
    return {
      success: true,
      ...contract,
    }
  }

  async searchVibeyDocs(data: Record<string, unknown>): Promise<unknown> {
    if (!this.docsSearch) throw new Error('VibeyMcpDocsSearchService is not configured')
    return this.docsSearch.search({
      query: String(data.query ?? ''),
      ...(data.match_count !== undefined ? { match_count: Number(data.match_count) } : {}),
      ...(data.min_similarity !== undefined ? { min_similarity: Number(data.min_similarity) } : {}),
    })
  }

  getActionMethodMapForTests(): Record<string, string> {
    return ACTION_METHOD_MAP
  }

  getSessionContextServiceForTests(): ArtifactSessionContextService {
    return this.sessionContextService
  }

  resolveAgentMessageId(sessionKey?: string): string | null {
    const conversationId = parseConversationIdFromSessionKey(sessionKey)
    if (!conversationId || typeof (this as any).requestContext?.getAgentMessageId !== 'function') {
      return null
    }
    return (this as any).requestContext.getAgentMessageId(conversationId)
  }

  getCampaignThemeServiceForTests(): ArtifactCampaignThemeService {
    return this.campaignThemeService
  }

  async useComposioTool(data: Record<string, unknown>, sessionKey?: string): Promise<unknown> {
    return this.integrationOrchestrator.useComposioTool(this as any, data, sessionKey)
  }

  async getIntegration(data: Record<string, unknown>, sessionKey?: string): Promise<unknown> {
    return this.integrationOrchestrator.getIntegration(this as any, data, sessionKey)
  }

  async searchAvailableIntegrations(
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    return this.integrationOrchestrator.searchAvailableIntegrations(this as any, data, sessionKey)
  }

  async initiateIntegrationConnect(
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    return this.integrationOrchestrator.initiateIntegrationConnect(this as any, data, sessionKey)
  }

  private async resolveComposioConfig(
    integrationId: string,
    toolkitSlug: string,
  ): Promise<{
    integration_id: string
    toolkit_slug: string
    auth_config_id: string | null
    enabled: boolean
    execution_mode: 'legacy' | 'composio'
  } | null> {
    return this.integrationOrchestrator.resolveComposioConfig(
      this as any,
      integrationId,
      toolkitSlug,
    )
  }

  private pickPreferredIntegrationRow(
    rows: Array<Record<string, unknown>>,
    requestedRowId: string,
    userId: string,
  ): Record<string, unknown> | null {
    return new ArtifactIntegrationOrchestratorService().pickPreferredIntegrationRow(
      rows,
      requestedRowId,
      userId,
    )
  }

  private async resolveAgentDomain(sessionKey?: string): Promise<ArtifactCapabilityDomain | null> {
    return this.integrationOrchestrator.resolveAgentDomain(this as any, sessionKey)
  }
}
