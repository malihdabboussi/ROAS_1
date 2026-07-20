import { BullModule } from '@nestjs/bullmq'
import { forwardRef, Module } from '@nestjs/common'
import { AGENT_RUNTIME_BRAIN_IMPORT_QUEUE } from '../agent-runtime/agent-runtime-queues'
import { BillingModule } from '../billing/billing.module'
import { SpaceRetrievalModule } from '../space-retrieval/space-retrieval.module'
import { BrainCortexMaxController } from './controllers/brain-cortex-max.controller'
import { BrainCrossSuggestionsController } from './controllers/brain-cross-suggestions.controller'
import { CompanyCortexController } from './controllers/company-cortex.controller'
import { CustomerBrainController } from './controllers/customer-brain.controller'
import { EmotionalController } from './controllers/emotional.controller'
import { GraphController } from './controllers/graph.controller'
import { ImportJobStatusController } from './controllers/import-job-status.controller'
import { ImportJobsController } from './controllers/import-jobs.controller'
import { MemoriesCrudController } from './controllers/memories-crud.controller'
import { MemoriesStatusController } from './controllers/memories-status.controller'
import { MemoriesController } from './controllers/memories.controller'
import { PageGraderClientImportController } from './controllers/page-grader-client-import.controller'
import { PendingCapturesController } from './controllers/pending-captures.controller'
import { SearchController } from './controllers/search.controller'
import { SkMutationsController } from './controllers/sk-mutations.controller'
import { SkQueryController } from './controllers/sk-query.controller'
import { SkController } from './controllers/sk.controller'
import { SnapshotsController } from './controllers/snapshots.controller'
import { BrainAuthGuard } from './guards/brain-auth.guard'
import { BrainAuthImpersonationRepository } from './repositories/brain-auth-impersonation.repository'
import { BrainCortexMaxRepository } from './repositories/brain-cortex-max.repository'
import { BrainCrossPollinatorRepository } from './repositories/brain-cross-pollinator.repository'
import { BrainCrossSuggestionsRepository } from './repositories/brain-cross-suggestions.repository'
import { BrainEvidenceRepository } from './repositories/brain-evidence.repository'
import { BrainGraphRepository } from './repositories/brain-graph.repository'
import { BrainHandoffTargetRepository } from './repositories/brain-handoff-target.repository'
import { BrainHandoffRepository } from './repositories/brain-handoff.repository'
import { BrainImportJobStatusRepository } from './repositories/brain-import-job-status.repository'
import { BrainImportJobsInputRepository } from './repositories/brain-import-jobs-input.repository'
import { BrainImportJobsRuntimeRepository } from './repositories/brain-import-jobs-runtime.repository'
import { BrainNodeTransferRepository } from './repositories/brain-node-transfer.repository'
import { BrainOpsHookRepository } from './repositories/brain-ops-hook.repository'
import { BrainPermissionsRepository } from './repositories/brain-permissions.repository'
import { BrainRetrievalArtifactsRepository } from './repositories/brain-retrieval-artifacts.repository'
import { BrainRetrievalRepository } from './repositories/brain-retrieval.repository'
import { CompanyCortexRepository } from './repositories/company-cortex.repository'
import { ContentDedupeRepository } from './repositories/content-dedupe.repository'
import { CustomerBrainRepository } from './repositories/customer-brain.repository'
import { EmotionalIntelligenceRepository } from './repositories/emotional-intelligence.repository'
import { EmotionalTaggingRepository } from './repositories/emotional-tagging.repository'
import { FeedbackRepository } from './repositories/feedback.repository'
import { GraphRequestRepository } from './repositories/graph-request.repository'
import { MeetingIngestionRepository } from './repositories/meeting-ingestion.repository'
import { MemoriesRepository } from './repositories/memories.repository'
import { MemoryBrainResolver } from './repositories/memory-brain-resolver'
import { MemoryStatsRepository } from './repositories/memory-stats.repository'
import { PendingCapturesRepository } from './repositories/pending-captures.repository'
import { ScholarContextRepository } from './repositories/scholar-context.repository'
import { SearchRepository } from './repositories/search.repository'
import { SkIngestionRepository } from './repositories/sk-ingestion.repository'
import { SkRepository } from './repositories/sk.repository'
import { SnapshotsRepository } from './repositories/snapshots.repository'
import { BrainCortexMaxService } from './services/brain-cortex-max.service'
import { BrainCrossPollinatorService } from './services/brain-cross-pollinator.service'
import { BrainCrossSuggestionsService } from './services/brain-cross-suggestions.service'
import { BrainEvidenceIngestionService } from './services/brain-evidence-ingestion.service'
import { BrainHandoffBrainCopyService } from './services/brain-handoff-brain-copy.service'
import { BrainHandoffTargetResolverService } from './services/brain-handoff-target-resolver.service'
import { BrainHandoffService } from './services/brain-handoff.service'
import { BrainImportJobRequestsService } from './services/brain-import-job-requests.service'
import { BrainImportJobStatusService } from './services/brain-import-job-status.service'
import { BrainImportJobsService } from './services/brain-import-jobs.service'
import { BrainImportRuntimeProcessor } from './services/brain-import-runtime.processor'
import { BrainNodeTransferCopyService } from './services/brain-node-transfer-copy.service'
import { BrainNodeTransferService } from './services/brain-node-transfer.service'
import { BrainOpsHookService } from './services/brain-ops-hook.service'
import { BrainPermissionsService } from './services/brain-permissions.service'
import { BrainRerankerService } from './services/brain-reranker.service'
import { BrainRetrievalService } from './services/brain-retrieval.service'
import { BrainSufficiencyService } from './services/brain-sufficiency.service'
import { CompanyCortexService } from './services/company-cortex.service'
import { ContentDedupeService } from './services/content-dedupe.service'
import { ConversationProcessingService } from './services/conversation-processing.service'
import { CrystallizationService } from './services/crystallization.service'
import { CustomerBrainMemoryWriteService } from './services/customer-brain-memory-write.service'
import { CustomerBrainService } from './services/customer-brain.service'
import { DocumentExtractionService } from './services/document-extraction.service'
import { EmbeddingService } from './services/embedding.service'
import { EmotionalIntelligenceService } from './services/emotional-intelligence.service'
import { EmotionalTaggingService } from './services/emotional-tagging.service'
import { FeedbackService } from './services/feedback.service'
import { GeminiOcrService } from './services/gemini-ocr.service'
import { GraphRequestService } from './services/graph-request.service'
import { GraphService } from './services/graph.service'
import { LinkExtractionService } from './services/link-extraction.service'
import { MemoriesService } from './services/memories.service'
import { PageGraderBrainPackageIngestService } from './services/page-grader-brain-package-ingest.service'
import { PageGraderClientImportService } from './services/page-grader-client-import.service'
import { PendingCapturesService } from './services/pending-captures.service'
import { ScholarContextService } from './services/scholar-context.service'
import { SearchService } from './services/search.service'
import { SkService } from './services/sk.service'
import { SnapshotsService } from './services/snapshots.service'

@Module({
  imports: [
    BillingModule,
    forwardRef(() => SpaceRetrievalModule),
    BullModule.registerQueue({ name: AGENT_RUNTIME_BRAIN_IMPORT_QUEUE }),
  ],
  controllers: [
    SnapshotsController,
    MemoriesController,
    MemoriesStatusController,
    MemoriesCrudController,
    ImportJobsController,
    ImportJobStatusController,
    GraphController,
    CompanyCortexController,
    CustomerBrainController,
    BrainCortexMaxController,
    EmotionalController,
    PendingCapturesController,
    SearchController,
    SkController,
    SkQueryController,
    SkMutationsController,
    BrainCrossSuggestionsController,
    PageGraderClientImportController,
  ],
  providers: [
    BrainAuthGuard,
    BrainAuthImpersonationRepository,
    BrainCortexMaxRepository,
    BrainCortexMaxService,
    BrainEvidenceRepository,
    BrainEvidenceIngestionService,
    BrainCrossPollinatorRepository,
    BrainCrossPollinatorService,
    BrainCrossSuggestionsRepository,
    BrainCrossSuggestionsService,
    BrainGraphRepository,
    BrainHandoffRepository,
    BrainHandoffTargetRepository,
    BrainImportJobStatusRepository,
    BrainImportJobsInputRepository,
    BrainImportJobsRuntimeRepository,
    BrainNodeTransferRepository,
    BrainOpsHookRepository,
    BrainPermissionsRepository,
    BrainHandoffBrainCopyService,
    BrainHandoffTargetResolverService,
    BrainHandoffService,
    BrainImportJobRequestsService,
    BrainImportJobStatusService,
    BrainImportJobsService,
    BrainImportRuntimeProcessor,
    BrainNodeTransferCopyService,
    BrainNodeTransferService,
    BrainPermissionsService,
    BrainRerankerService,
    BrainRetrievalArtifactsRepository,
    BrainRetrievalRepository,
    BrainRetrievalService,
    BrainSufficiencyService,
    ContentDedupeRepository,
    ContentDedupeService,
    CompanyCortexRepository,
    CompanyCortexService,
    ConversationProcessingService,
    CrystallizationService,
    CustomerBrainRepository,
    CustomerBrainMemoryWriteService,
    CustomerBrainService,
    DocumentExtractionService,
    EmbeddingService,
    EmotionalTaggingService,
    EmotionalIntelligenceService,
    EmotionalIntelligenceRepository,
    EmotionalTaggingRepository,
    FeedbackRepository,
    FeedbackService,
    GeminiOcrService,
    GraphRequestRepository,
    GraphRequestService,
    GraphService,
    LinkExtractionService,
    MeetingIngestionRepository,
    MemoryBrainResolver,
    MemoryStatsRepository,
    MemoriesRepository,
    MemoriesService,
    PageGraderBrainPackageIngestService,
    PageGraderClientImportService,
    PendingCapturesRepository,
    PendingCapturesService,
    ScholarContextRepository,
    ScholarContextService,
    SearchRepository,
    SearchService,
    SkIngestionRepository,
    SkRepository,
    SkService,
    SnapshotsRepository,
    SnapshotsService,
    BrainOpsHookService,
  ],
  exports: [
    BrainAuthGuard,
    BrainCortexMaxService,
    BrainEvidenceIngestionService,
    BrainHandoffService,
    BrainImportJobStatusService,
    BrainImportJobsService,
    BrainNodeTransferService,
    BrainPermissionsService,
    BrainRerankerService,
    BrainRetrievalService,
    BrainSufficiencyService,
    BrainCrossSuggestionsService,
    CompanyCortexService,
    ConversationProcessingService,
    CrystallizationService,
    CustomerBrainService,
    DocumentExtractionService,
    EmbeddingService,
    EmotionalTaggingService,
    LinkExtractionService,
    MemoriesService,
    PageGraderBrainPackageIngestService,
    PageGraderClientImportService,
    ScholarContextService,
    SearchService,
    SkService,
    SnapshotsService,
    BrainOpsHookService,
  ],
})
export class BrainModule {}
