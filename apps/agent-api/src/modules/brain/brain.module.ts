import { Module } from '@nestjs/common'
import { AgentSyncModule } from '../agent-sync/agent-sync.module'
import { AgentBillingModule } from '../billing/billing.module'
import { BrainEvalProbeController } from './controllers/brain-eval-probe.controller'
import { BrainLiveController } from './controllers/brain-live.controller'
import { BrainLiveGateway } from './gateways/brain-live.gateway'
import { BrainAuthGuard } from './guards/brain-auth.guard'
import { BrainLiveOpenClawGatewayClient } from './integrations/brain-live-openclaw-gateway.client'
import { BrainContextRepository } from './repositories/brain-context.repository'
import { BrainEmotionalIntelligenceRepository } from './repositories/brain-emotional-intelligence.repository'
import { BrainEvalProbeRepository } from './repositories/brain-eval-probe.repository'
import { BrainIngestionRepository } from './repositories/brain-ingestion.repository'
import { BrainLiveDocumentRepository } from './repositories/brain-live-document.repository'
import { BrainLiveRepository } from './repositories/brain-live.repository'
import { BrainRetrievalAccessRepository } from './repositories/brain-retrieval-access.repository'
import { BrainRetrievalContextRepository } from './repositories/brain-retrieval-context.repository'
import { BrainRetrievalRelationRepository } from './repositories/brain-retrieval-relation.repository'
import { BrainRetrievalSearchRepository } from './repositories/brain-retrieval-search.repository'
import { BrainRuntimeRepository } from './repositories/brain-runtime.repository'
import { MemoriesRepository } from './repositories/memories.repository'
import { SnapshotsRepository } from './repositories/snapshots.repository'
import { BrainContextSupportService } from './services/brain-context-support.service'
import { BrainContextService } from './services/brain-context.service'
import { BrainEvalProbeService } from './services/brain-eval-probe.service'
import { BrainEvidenceIngestionService } from './services/brain-evidence-ingestion.service'
import { BrainLiveActionsService } from './services/brain-live-actions.service'
import { BrainLiveDelegationStreamService } from './services/brain-live-delegation-stream.service'
import { BrainLiveDelegationService } from './services/brain-live-delegation.service'
import { BrainLiveDocumentService } from './services/brain-live-document.service'
import { BrainLiveToolDeclarationsService } from './services/brain-live-tool-declarations.service'
import { BrainLiveTranscriptService } from './services/brain-live-transcript.service'
import { BrainLiveService } from './services/brain-live.service'
import { BrainOpsHookService } from './services/brain-ops-hook.service'
import { BrainRerankerService } from './services/brain-reranker.service'
import { BrainRetrievalQueryExpansionService } from './services/brain-retrieval-query-expansion.service'
import { BrainRetrievalRelatedContextService } from './services/brain-retrieval-related-context.service'
import { BrainRetrievalSearchLaneService } from './services/brain-retrieval-search-lane.service'
import { BrainRetrievalTimingService } from './services/brain-retrieval-timing.service'
import { BrainRetrievalService } from './services/brain-retrieval.service'
import { BrainSpotlightService } from './services/brain-spotlight.service'
import { BrainSufficiencyService } from './services/brain-sufficiency.service'
import { CompanyContextCompilerService } from './services/company-context-compiler.service'
import { ContentDedupeService } from './services/content-dedupe.service'
import { ConversationProcessingService } from './services/conversation-processing.service'
import { CrystallizationService } from './services/crystallization.service'
import { DocumentExtractionService } from './services/document-extraction.service'
import { DocumentIngestionService } from './services/document-ingestion.service'
import { EmbeddingService } from './services/embedding.service'
import { EmotionalIntelligenceService } from './services/emotional-intelligence.service'
import { EmotionalTaggingService } from './services/emotional-tagging.service'
import { GeminiOcrService } from './services/gemini-ocr.service'
import { GraphService } from './services/graph.service'
import { LinkExtractionService } from './services/link-extraction.service'
import { MemoriesService } from './services/memories.service'
import { PendingCapturesService } from './services/pending-captures.service'
import { ScholarContextService } from './services/scholar-context.service'
import { SkIngestionService } from './services/sk-ingestion.service'
import { SnapshotsService } from './services/snapshots.service'
import { VoiceAssignmentService } from './services/voice-assignment.service'

/**
 * BrainModule (Agent Backend)
 *
 * Provides Brain services for ChatModule AI context and Atlas tool execution.
 * Includes BrainLiveGateway (WebSocket) + BrainLiveController for voice sessions.
 */
@Module({
  imports: [AgentSyncModule, AgentBillingModule],
  controllers: [BrainLiveController, BrainEvalProbeController],
  providers: [
    BrainAuthGuard,
    BrainEvidenceIngestionService,
    BrainLiveGateway,
    BrainLiveActionsService,
    BrainLiveDelegationService,
    BrainLiveOpenClawGatewayClient,
    BrainLiveDelegationStreamService,
    BrainLiveDocumentService,
    BrainLiveService,
    BrainLiveToolDeclarationsService,
    BrainLiveTranscriptService,
    BrainContextService,
    BrainContextSupportService,
    BrainEvalProbeService,
    BrainSpotlightService,
    BrainRerankerService,
    BrainRetrievalQueryExpansionService,
    BrainRetrievalRelatedContextService,
    BrainRetrievalSearchLaneService,
    BrainRetrievalService,
    BrainRetrievalTimingService,
    BrainSufficiencyService,
    CompanyContextCompilerService,
    ContentDedupeService,
    CrystallizationService,
    ConversationProcessingService,
    DocumentExtractionService,
    DocumentIngestionService,
    EmbeddingService,
    EmotionalTaggingService,
    EmotionalIntelligenceService,
    GeminiOcrService,
    GraphService,
    LinkExtractionService,
    BrainContextRepository,
    BrainEmotionalIntelligenceRepository,
    BrainEvalProbeRepository,
    BrainIngestionRepository,
    BrainLiveDocumentRepository,
    BrainLiveRepository,
    BrainRetrievalAccessRepository,
    BrainRetrievalContextRepository,
    BrainRetrievalRelationRepository,
    BrainRetrievalSearchRepository,
    BrainRuntimeRepository,
    MemoriesRepository,
    MemoriesService,
    PendingCapturesService,
    ScholarContextService,
    SkIngestionService,
    SnapshotsRepository,
    SnapshotsService,
    BrainOpsHookService,
    VoiceAssignmentService,
  ],
  exports: [
    BrainAuthGuard,
    BrainEvidenceIngestionService,
    BrainLiveService,
    BrainContextService,
    BrainSpotlightService,
    BrainRerankerService,
    BrainRetrievalService,
    BrainSufficiencyService,
    CompanyContextCompilerService,
    ContentDedupeService,
    CrystallizationService,
    ConversationProcessingService,
    DocumentExtractionService,
    DocumentIngestionService,
    EmbeddingService,
    EmotionalTaggingService,
    GeminiOcrService,
    LinkExtractionService,
    MemoriesService,
    MemoriesRepository,
    PendingCapturesService,
    SkIngestionService,
    BrainOpsHookService,
    VoiceAssignmentService,
  ],
})
export class BrainModule {}
