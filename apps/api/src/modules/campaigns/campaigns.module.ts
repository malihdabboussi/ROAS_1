import { forwardRef, Module } from '@nestjs/common'
import { BillingModule } from '../billing/billing.module'
import { BrainModule } from '../brain/brain.module'
import { ComposioModule } from '../composio/composio.module'
import { VercelIntegration } from '../domains/integrations/vercel.integration'
import { FathomModule } from '../integrations/fathom/fathom.module'
import { FirefliesModule } from '../integrations/fireflies/fireflies.module'
import { MetaModule } from '../integrations/meta/meta.module'
import { MissionsModule } from '../missions/missions.module'
import { ProgramsModule } from '../programs/programs.module'
import { SpaceRetrievalModule } from '../space-retrieval/space-retrieval.module'
import { SpacesModule } from '../spaces/spaces.module'
import { UsersModule } from '../users/users.module'
import { AdArtifactsController } from './controllers/ad-artifacts.controller'
import { AdCampaignArtifactsController } from './controllers/ad-campaign-artifacts.controller'
import { AdCopyGenerationArtifactsController } from './controllers/ad-copy-generation-artifacts.controller'
import { AdGenerationArtifactsController } from './controllers/ad-generation-artifacts.controller'
import { AdSetArtifactsController } from './controllers/ad-set-artifacts.controller'
import { AdSetLifecycleArtifactsController } from './controllers/ad-set-lifecycle-artifacts.controller'
import { ArtifactListsController } from './controllers/artifact-lists.controller'
import { ArtifactResourceReadsController } from './controllers/artifact-resource-reads.controller'
import { ArtifactsController } from './controllers/artifacts.controller'
import { AvatarLifecycleArtifactsController } from './controllers/avatar-lifecycle-artifacts.controller'
import { AvatarReadArtifactsController } from './controllers/avatar-read-artifacts.controller'
import { BlogPostArtifactsController } from './controllers/blog-post-artifacts.controller'
import { CampaignAgentsController } from './controllers/campaign-agents.controller'
import { CampaignAnalyticsController } from './controllers/campaign-analytics.controller'
import { CampaignKnowledgeGraphController } from './controllers/campaign-knowledge-graph.controller'
import { CampaignKnowledgeImportsController } from './controllers/campaign-knowledge-imports.controller'
import { CampaignKnowledgeNodesController } from './controllers/campaign-knowledge-nodes.controller'
import { CampaignsController } from './controllers/campaigns.controller'
import { DocumentArtifactsController } from './controllers/document-artifacts.controller'
import { DocumentListArtifactsController } from './controllers/document-list-artifacts.controller'
import { InternalCampaignKnowledgeController } from './controllers/internal-campaign-knowledge.controller'
import { OfferSequenceLifecycleArtifactsController } from './controllers/offer-sequence-lifecycle-artifacts.controller'
import { PresentationAssetArtifactsController } from './controllers/presentation-asset-artifacts.controller'
import { PresentationLifecycleArtifactsController } from './controllers/presentation-lifecycle-artifacts.controller'
import { SequenceEmailArtifactsController } from './controllers/sequence-email-artifacts.controller'
import { SocialPostArtifactsController } from './controllers/social-post-artifacts.controller'
import { StrategyNodesController } from './controllers/strategy-nodes.controller'
import { WorkflowsController } from './controllers/workflows.controller'
import { CampaignAccessRepository } from './repositories/campaign-access.repository'
import { CampaignAdVariationMediaRepository } from './repositories/campaign-ad-variation-media.repository'
import { CampaignArtifactAdsRepository } from './repositories/campaign-artifact-ads.repository'
import { CampaignArtifactContentRepository } from './repositories/campaign-artifact-content.repository'
import { CampaignArtifactDocumentsRepository } from './repositories/campaign-artifact-documents.repository'
import { CampaignArtifactMoveRepository } from './repositories/campaign-artifact-move.repository'
import { CampaignArtifactOffersRepository } from './repositories/campaign-artifact-offers.repository'
import { CampaignArtifactPresentationsRepository } from './repositories/campaign-artifact-presentations.repository'
import { CampaignArtifactSequencesRepository } from './repositories/campaign-artifact-sequences.repository'
import { CampaignKnowledgeRepository } from './repositories/campaign-knowledge.repository'
import { CampaignSocialInsightsRepository } from './repositories/campaign-social-insights.repository'
import { CampaignsRepository } from './repositories/campaigns.repository'
import { StrategyNodesRepository } from './repositories/strategy-nodes.repository'
import { WorkflowEdgeDeleteCleanupRepository } from './repositories/workflow-edge-delete-cleanup.repository'
import { WorkflowsRepository } from './repositories/workflows.repository'
import { AdVariationGeneratorService } from './services/ad-variation-generator.service'
import { ArtifactsService } from './services/artifacts.service'
import { CampaignsService } from './services/campaigns.service'
import { MainDashboardService } from './services/main-dashboard.service'
import { SocialInsightsService } from './services/social-insights.service'
import { StrategyNodesService } from './services/strategy-nodes.service'
import { WorkflowEdgeDeleteCleanupService } from './services/workflow-edge-delete-cleanup.service'
import { WorkflowsService } from './services/workflows.service'

@Module({
  imports: [
    BillingModule,
    BrainModule,
    ComposioModule,
    MetaModule,
    UsersModule,
    FathomModule,
    FirefliesModule,
    SpacesModule,
    SpaceRetrievalModule,
    ProgramsModule,
    forwardRef(() => MissionsModule),
  ],
  controllers: [
    CampaignsController,
    CampaignAgentsController,
    CampaignAnalyticsController,
    CampaignKnowledgeNodesController,
    CampaignKnowledgeImportsController,
    CampaignKnowledgeGraphController,
    ArtifactsController,
    ArtifactListsController,
    AdCampaignArtifactsController,
    AdSetArtifactsController,
    AdGenerationArtifactsController,
    AdCopyGenerationArtifactsController,
    AdSetLifecycleArtifactsController,
    DocumentListArtifactsController,
    ArtifactResourceReadsController,
    SequenceEmailArtifactsController,
    PresentationAssetArtifactsController,
    AvatarReadArtifactsController,
    AdArtifactsController,
    DocumentArtifactsController,
    BlogPostArtifactsController,
    OfferSequenceLifecycleArtifactsController,
    PresentationLifecycleArtifactsController,
    AvatarLifecycleArtifactsController,
    SocialPostArtifactsController,
    WorkflowsController,
    StrategyNodesController,
    InternalCampaignKnowledgeController,
  ],
  providers: [
    CampaignsService,
    CampaignKnowledgeRepository,
    CampaignsRepository,
    CampaignAccessRepository,
    CampaignAdVariationMediaRepository,
    CampaignArtifactAdsRepository,
    CampaignArtifactContentRepository,
    CampaignArtifactDocumentsRepository,
    CampaignArtifactMoveRepository,
    CampaignArtifactOffersRepository,
    CampaignArtifactPresentationsRepository,
    CampaignArtifactSequencesRepository,
    CampaignSocialInsightsRepository,
    AdVariationGeneratorService,
    ArtifactsService,
    SocialInsightsService,
    MainDashboardService,
    WorkflowEdgeDeleteCleanupService,
    WorkflowEdgeDeleteCleanupRepository,
    WorkflowsService,
    WorkflowsRepository,
    StrategyNodesService,
    StrategyNodesRepository,
    VercelIntegration,
  ],
  exports: [
    CampaignsService,
    CampaignKnowledgeRepository,
    CampaignsRepository,
    ArtifactsService,
    AdVariationGeneratorService,
    SocialInsightsService,
    MainDashboardService,
    WorkflowEdgeDeleteCleanupService,
    WorkflowsService,
    WorkflowsRepository,
    StrategyNodesService,
    StrategyNodesRepository,
  ],
})
export class CampaignsModule {}
