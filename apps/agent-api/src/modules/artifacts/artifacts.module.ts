import { Module } from '@nestjs/common'
import { SharedModule } from '@vibey/api-shared'
import { AgentSyncModule } from '../agent-sync/agent-sync.module'
import { AgentBillingModule } from '../billing/billing.module'
import { BrainModule } from '../brain/brain.module'
import { BrowserSessionsModule } from '../browser-sessions/browser-sessions.module'
import { ChatModule } from '../chat/chat.module'
import { ComposioModule } from '../composio/composio.module'
import { McpModule } from '../mcp/mcp.module'
import { ProjectRuntimeModule } from '../project-runtime/project-runtime.module'
import { SpacesRetrievalModule } from '../spaces-retrieval/spaces-retrieval.module'
import { VibeyMcpDocsSearchService } from '../vibey-mcp/services/vibey-mcp-docs-search.service'
import { ArtifactOpenClawProxyController } from './controllers/artifact-openclaw-proxy.controller'
import { ArtifactsController } from './controllers/artifacts.controller'
import { ArtifactMissionsMediaDeepgramClient } from './integrations/artifact-missions-media-deepgram.client'
import { ArtifactMissionsMediaDownloadClient } from './integrations/artifact-missions-media-download.client'
import { ArtifactMissionsMediaGeminiClient } from './integrations/artifact-missions-media-gemini.client'
import { ArtifactMissionsMediaProcessClient } from './integrations/artifact-missions-media-process.client'
import { ArtifactMissionsMediaScrapeCreatorsClient } from './integrations/artifact-missions-media-scrape-creators.client'
import { ArtifactMissionsMediaYoutubeTranscriptClient } from './integrations/artifact-missions-media-youtube-transcript.client'
import { ArtifactAgentDelegationRepository } from './repositories/artifact-agent-delegation.repository'
import { ArtifactAnalyticsRepository } from './repositories/artifact-analytics.repository'
import { ArtifactAvatarsRepository } from './repositories/artifact-avatars.repository'
import { ArtifactBlogRepository } from './repositories/artifact-blog.repository'
import { ArtifactBrainCognitionRepository } from './repositories/artifact-brain-cognition.repository'
import { ArtifactBrainNarrativeRepository } from './repositories/artifact-brain-narrative.repository'
import { ArtifactBrainScholarRepository } from './repositories/artifact-brain-scholar.repository'
import { ArtifactCanvasRepository } from './repositories/artifact-canvas.repository'
import { ArtifactChannelContextRepository } from './repositories/artifact-channel-context.repository'
import { ArtifactChannelMembersRepository } from './repositories/artifact-channel-members.repository'
import { ArtifactCompanyCortexRepository } from './repositories/artifact-company-cortex.repository'
import { ArtifactContactNotesRepository } from './repositories/artifact-contact-notes.repository'
import { ArtifactContactTimelineRepository } from './repositories/artifact-contact-timeline.repository'
import { ArtifactContactsRepository } from './repositories/artifact-contacts.repository'
import { ArtifactConversationSearchRepository } from './repositories/artifact-conversation-search.repository'
import { ArtifactCustomObjectsRepository } from './repositories/artifact-custom-objects.repository'
import { ArtifactCustomerBrainRepository } from './repositories/artifact-customer-brain.repository'
import { ArtifactDocumentFilesRepository } from './repositories/artifact-document-files.repository'
import { ArtifactDocumentsRepository } from './repositories/artifact-documents.repository'
import { ArtifactEmailsRepository } from './repositories/artifact-emails.repository'
import { ArtifactFlowBuilderRepository } from './repositories/artifact-flow-builder.repository'
import { ArtifactFlowsRepository } from './repositories/artifact-flows.repository'
import { ArtifactFormsRepository } from './repositories/artifact-forms.repository'
import { ArtifactFunnelFilesRepository } from './repositories/artifact-funnel-files.repository'
import { ArtifactFunnelHistoryRepository } from './repositories/artifact-funnel-history.repository'
import { ArtifactFunnelsRepository } from './repositories/artifact-funnels.repository'
import { ArtifactLegacyIntegrationsRepository } from './repositories/artifact-legacy-integrations.repository'
import { ArtifactLegacyMediaGenerateRepository } from './repositories/artifact-legacy-media-generate.repository'
import { ArtifactLegacyRuntimeRepository } from './repositories/artifact-legacy-runtime.repository'
import { ArtifactLegacySessionCampaignRepository } from './repositories/artifact-legacy-session-campaign.repository'
import { ArtifactLegacyStateMetaRepository } from './repositories/artifact-legacy-state-meta.repository'
import { ArtifactLegacyTeamBrainRepository } from './repositories/artifact-legacy-team-brain.repository'
import { ArtifactLegacyRepository } from './repositories/artifact-legacy.repository'
import { ArtifactMcpRepository } from './repositories/artifact-mcp.repository'
import { ArtifactMediaAssetsRepository } from './repositories/artifact-media-assets.repository'
import { ArtifactMediaJobsRepository } from './repositories/artifact-media-jobs.repository'
import { ArtifactMissionContextRepository } from './repositories/artifact-mission-context.repository'
import { ArtifactMissionDeliverablesRepository } from './repositories/artifact-mission-deliverables.repository'
import { ArtifactMissionsRepository } from './repositories/artifact-missions.repository'
import { ArtifactNorthStarRepository } from './repositories/artifact-north-star.repository'
import { ArtifactNotificationsRepository } from './repositories/artifact-notifications.repository'
import { ArtifactOffersAdsRepository } from './repositories/artifact-offers-ads.repository'
import { ArtifactPresentationsRepository } from './repositories/artifact-presentations.repository'
import { ArtifactSequencesRepository } from './repositories/artifact-sequences.repository'
import { ArtifactSkillAssetsRepository } from './repositories/artifact-skill-assets.repository'
import { ArtifactSocialPostsRepository } from './repositories/artifact-social-posts.repository'
import { ArtifactSpaceItemsRepository } from './repositories/artifact-space-items.repository'
import { ArtifactSpaceSchemaRepository } from './repositories/artifact-space-schema.repository'
import { ArtifactStrategyRepository } from './repositories/artifact-strategy.repository'
import { ArtifactTasksRepository } from './repositories/artifact-tasks.repository'
import { ArtifactThemesRepository } from './repositories/artifact-themes.repository'
import { ArtifactVisualDocRepository } from './repositories/artifact-visual-doc.repository'
import { ArtifactAdCampaignActionsService } from './services/artifact-ad-campaign-actions.service'
import { ArtifactAdCoreActionsService } from './services/artifact-ad-core-actions.service'
import { ArtifactAtlasBrainContextService } from './services/artifact-atlas-brain-context.service'
import { ArtifactAuthorizationService } from './services/artifact-authorization.service'
import { ArtifactAvatarsService } from './services/artifact-avatars.service'
import { ArtifactBlogService } from './services/artifact-blog.service'
import { ArtifactBrainAccessService } from './services/artifact-brain-access.service'
import { ArtifactBrainBeliefActionsService } from './services/artifact-brain-belief-actions.service'
import { ArtifactBrainIngestionActionsService } from './services/artifact-brain-ingestion-actions.service'
import { ArtifactBrainLintActionsService } from './services/artifact-brain-lint-actions.service'
import { ArtifactBrainNarrativeActionsService } from './services/artifact-brain-narrative-actions.service'
import { ArtifactBrainPerspectiveActionsService } from './services/artifact-brain-perspective-actions.service'
import { ArtifactBrainReadActionsService } from './services/artifact-brain-read-actions.service'
import { ArtifactBrainSearchActionsService } from './services/artifact-brain-search-actions.service'
import { ArtifactBrainTimelineActionsService } from './services/artifact-brain-timeline-actions.service'
import { ArtifactCampaignBrainContextService } from './services/artifact-campaign-brain-context.service'
import { ArtifactCampaignThemeService } from './services/artifact-campaign-theme.service'
import { ArtifactContactsService } from './services/artifact-contacts.service'
import { ArtifactConversationSearchService } from './services/artifact-conversation-search.service'
import { ArtifactCustomObjectsService } from './services/artifact-custom-objects.service'
import { ArtifactDocumentsService } from './services/artifact-documents.service'
import { ArtifactDocxService } from './services/artifact-docx.service'
import { ArtifactEmailsService } from './services/artifact-emails.service'
import { ArtifactFlowBuilderBlueprintService } from './services/artifact-flow-builder-blueprint.service'
import { ArtifactFlowBuilderClarificationService } from './services/artifact-flow-builder-clarification.service'
import { ArtifactFlowBuilderContextService } from './services/artifact-flow-builder-context.service'
import { ArtifactFlowBuilderPlanService } from './services/artifact-flow-builder-plan.service'
import { ArtifactFlowBuilderSessionService } from './services/artifact-flow-builder-session.service'
import { ArtifactFlowBuilderService } from './services/artifact-flow-builder.service'
import { ArtifactFunnelFileActionsService } from './services/artifact-funnel-file-actions.service'
import { ArtifactFunnelFileSupportService } from './services/artifact-funnel-file-support.service'
import { ArtifactFunnelHistoryService } from './services/artifact-funnel-history.service'
import { ArtifactFunnelPageBundleService } from './services/artifact-funnel-page-bundle.service'
import { ArtifactFunnelPageService } from './services/artifact-funnel-page.service'
import { ArtifactFunnelsService } from './services/artifact-funnels.service'
import { ArtifactLegacyAgentStateService } from './services/artifact-legacy-agent-state.service'
import { ArtifactLegacyCampaignTeamService } from './services/artifact-legacy-campaign-team.service'
import { ArtifactLegacyMediaProviderService } from './services/artifact-legacy-media-provider.service'
import { ArtifactLegacyMetaApiService } from './services/artifact-legacy-meta-api.service'
import { ArtifactLegacyRuntimeApiService } from './services/artifact-legacy-runtime-api.service'
import { ArtifactLegacyRuntimeErrorService } from './services/artifact-legacy-runtime-error.service'
import { ArtifactLegacyTeamBrainMemoryService } from './services/artifact-legacy-team-brain-memory.service'
import { ArtifactMcpService } from './services/artifact-mcp.service'
import { ArtifactMediaJobsSweeperService } from './services/artifact-media-jobs-sweeper.service'
import { ArtifactMediaProcessingService } from './services/artifact-media-processing.service'
import { ArtifactMissionApiActionsService } from './services/artifact-mission-api-actions.service'
import { ArtifactMissionManagerActionsService } from './services/artifact-mission-manager-actions.service'
import { ArtifactMissionsMediaService } from './services/artifact-missions-media.service'
import { ArtifactMissionsService } from './services/artifact-missions.service'
import { ArtifactOffersAdsService } from './services/artifact-offers-ads.service'
import { ArtifactPdfRenderNormalizerService } from './services/artifact-pdf-render-normalizer.service'
import { ArtifactPdfRenderTextService } from './services/artifact-pdf-render-text.service'
import { ArtifactPdfRenderService } from './services/artifact-pdf-render.service'
import { ArtifactPdfService } from './services/artifact-pdf.service'
import { ArtifactPresentationBundleService } from './services/artifact-presentation-bundle.service'
import { ArtifactPresentationLegacyEditService } from './services/artifact-presentation-legacy-edit.service'
import { ArtifactPresentationsService } from './services/artifact-presentations.service'
import { ArtifactProjectRuntimeActionsService } from './services/artifact-project-runtime-actions.service'
import { ArtifactProjectValidationService } from './services/artifact-project-validation.service'
import { ArtifactResolverService } from './services/artifact-resolver.service'
import { ArtifactSequencesService } from './services/artifact-sequences.service'
import { ArtifactSessionContextService } from './services/artifact-session-context.service'
import { ArtifactSessionKeyParserService } from './services/artifact-session-key-parser.service'
import { ArtifactSkillAssetFetcherService } from './services/artifact-skill-asset-fetcher.service'
import { ArtifactSocialPostPublishingService } from './services/artifact-social-post-publishing.service'
import { ArtifactSpaceRetrievalService } from './services/artifact-space-retrieval.service'
import { ArtifactSpaceSchemaService } from './services/artifact-space-schema.service'
import { ArtifactStateMetaIntegrationsGithubTeamBrainService } from './services/artifact-state-meta-integrations-github-team-brain.service'
import { ArtifactTasksService } from './services/artifact-tasks.service'
import { ArtifactThemesService } from './services/artifact-themes.service'
import { ArtifactUserBrainTopicSynthesisService } from './services/artifact-user-brain-topic-synthesis.service'
import { ArtifactVisualDocService } from './services/artifact-visual-doc.service'
import { ArtifactsService } from './services/artifacts.service'
import { MissionContextEnricherService } from './services/mission-context-enricher.service'

@Module({
  imports: [
    SharedModule,
    AgentSyncModule,
    AgentBillingModule,
    BrainModule,
    BrowserSessionsModule,
    ChatModule,
    ComposioModule,
    McpModule,
    ProjectRuntimeModule,
    SpacesRetrievalModule,
  ],
  controllers: [ArtifactsController, ArtifactOpenClawProxyController],
  providers: [
    ArtifactsService,
    ArtifactMcpService,
    MissionContextEnricherService,
    ArtifactSessionContextService,
    ArtifactCampaignThemeService,
    ArtifactCustomObjectsService,
    ArtifactAuthorizationService,
    ArtifactResolverService,
    ArtifactDocxService,
    ArtifactAdCampaignActionsService,
    ArtifactAdCoreActionsService,
    ArtifactAtlasBrainContextService,
    ArtifactBrainAccessService,
    ArtifactBrainBeliefActionsService,
    ArtifactBrainIngestionActionsService,
    ArtifactBrainLintActionsService,
    ArtifactBrainNarrativeActionsService,
    ArtifactBrainPerspectiveActionsService,
    ArtifactBrainReadActionsService,
    ArtifactBrainSearchActionsService,
    ArtifactBrainTimelineActionsService,
    ArtifactUserBrainTopicSynthesisService,
    ArtifactCampaignBrainContextService,
    ArtifactOffersAdsService,
    ArtifactFunnelFileSupportService,
    ArtifactFunnelPageBundleService,
    ArtifactFunnelPageService,
    ArtifactFunnelFileActionsService,
    ArtifactFunnelHistoryService,
    ArtifactFunnelsService,
    ArtifactLegacyAgentStateService,
    ArtifactLegacyCampaignTeamService,
    ArtifactLegacyRuntimeApiService,
    ArtifactLegacyRuntimeErrorService,
    ArtifactLegacyTeamBrainMemoryService,
    ArtifactLegacyMetaApiService,
    ArtifactLegacyMediaProviderService,
    ArtifactMediaJobsSweeperService,
    ArtifactDocumentsService,
    ArtifactEmailsService,
    ArtifactFlowBuilderBlueprintService,
    ArtifactFlowBuilderClarificationService,
    ArtifactFlowBuilderContextService,
    ArtifactFlowBuilderPlanService,
    ArtifactFlowBuilderSessionService,
    ArtifactFlowBuilderService,
    ArtifactPdfRenderNormalizerService,
    ArtifactPdfRenderTextService,
    ArtifactPdfRenderService,
    ArtifactPdfService,
    ArtifactPresentationBundleService,
    ArtifactPresentationLegacyEditService,
    ArtifactPresentationsService,
    ArtifactProjectRuntimeActionsService,
    ArtifactProjectValidationService,
    ArtifactSequencesService,
    ArtifactSessionKeyParserService,
    ArtifactSkillAssetFetcherService,
    ArtifactSpaceRetrievalService,
    ArtifactAvatarsService,
    ArtifactThemesService,
    ArtifactMissionsService,
    ArtifactMissionApiActionsService,
    ArtifactMissionManagerActionsService,
    ArtifactContactsService,
    ArtifactConversationSearchService,
    ArtifactTasksService,
    ArtifactSpaceSchemaService,
    ArtifactMediaProcessingService,
    ArtifactMissionsMediaDeepgramClient,
    ArtifactMissionsMediaDownloadClient,
    ArtifactMissionsMediaGeminiClient,
    ArtifactMissionsMediaProcessClient,
    ArtifactMissionsMediaScrapeCreatorsClient,
    ArtifactMissionsMediaYoutubeTranscriptClient,
    ArtifactMissionsMediaService,
    ArtifactStateMetaIntegrationsGithubTeamBrainService,
    ArtifactBlogService,
    ArtifactVisualDocService,
    ArtifactSocialPostPublishingService,
    ArtifactAnalyticsRepository,
    ArtifactAgentDelegationRepository,
    ArtifactAvatarsRepository,
    ArtifactBrainCognitionRepository,
    ArtifactBrainNarrativeRepository,
    ArtifactBrainScholarRepository,
    ArtifactBlogRepository,
    ArtifactCanvasRepository,
    ArtifactChannelMembersRepository,
    ArtifactChannelContextRepository,
    ArtifactCompanyCortexRepository,
    ArtifactContactNotesRepository,
    ArtifactContactTimelineRepository,
    ArtifactConversationSearchRepository,
    ArtifactContactsRepository,
    ArtifactCustomObjectsRepository,
    ArtifactCustomerBrainRepository,
    ArtifactDocumentFilesRepository,
    ArtifactDocumentsRepository,
    ArtifactEmailsRepository,
    ArtifactFlowBuilderRepository,
    ArtifactFlowsRepository,
    ArtifactFormsRepository,
    ArtifactFunnelFilesRepository,
    ArtifactFunnelHistoryRepository,
    ArtifactFunnelsRepository,
    ArtifactLegacyIntegrationsRepository,
    ArtifactLegacyRepository,
    ArtifactLegacyRuntimeRepository,
    ArtifactLegacyMediaGenerateRepository,
    ArtifactLegacySessionCampaignRepository,
    ArtifactLegacyStateMetaRepository,
    ArtifactLegacyTeamBrainRepository,
    ArtifactMcpRepository,
    ArtifactMediaAssetsRepository,
    ArtifactMediaJobsRepository,
    ArtifactMissionDeliverablesRepository,
    ArtifactMissionContextRepository,
    ArtifactMissionsRepository,
    ArtifactNorthStarRepository,
    ArtifactNotificationsRepository,
    ArtifactOffersAdsRepository,
    ArtifactPresentationsRepository,
    ArtifactSequencesRepository,
    ArtifactSocialPostsRepository,
    ArtifactSkillAssetsRepository,
    ArtifactSpaceItemsRepository,
    ArtifactSpaceSchemaRepository,
    ArtifactStrategyRepository,
    ArtifactTasksRepository,
    ArtifactThemesRepository,
    ArtifactVisualDocRepository,
    VibeyMcpDocsSearchService,
  ],
  exports: [ArtifactsService],
})
export class ArtifactsModule {}
