import { Module } from '@nestjs/common'
import { BrainModule } from '../brain/brain.module'
import { ConversationsModule } from '../conversations/conversations.module'
import { UserAgentApiModule } from '../user-agent-api/user-agent-api.module'
import { MeetingActionReconciliationController } from './controllers/meeting-action-reconciliation.controller'
import { MeetingFollowUpReviewController } from './controllers/meeting-follow-up-review.controller'
import { MeetingMergeController } from './controllers/meeting-merge.controller'
import { MeetingWorkspaceResolutionController } from './controllers/meeting-workspace-resolution.controller'
import { MeetingWorkspaceController } from './controllers/meeting-workspace.controller'
import { MeetingActionReconciliationRepository } from './repositories/meeting-action-reconciliation.repository'
import { MeetingCallMatchingRepository } from './repositories/meeting-call-matching.repository'
import { MeetingMergeRepository } from './repositories/meeting-merge.repository'
import { MeetingProviderActionsRepository } from './repositories/meeting-provider-actions.repository'
import { MeetingRecapRepository } from './repositories/meeting-recap.repository'
import { MeetingRecordingBackfillRepository } from './repositories/meeting-recording-backfill.repository'
import { MeetingWorkspaceAgendaRepository } from './repositories/meeting-workspace-agenda.repository'
import { MeetingWorkspaceReadRepository } from './repositories/meeting-workspace-read.repository'
import { MeetingWorkspaceResolutionRepository } from './repositories/meeting-workspace-resolution.repository'
import { MeetingWorkspaceStateRepository } from './repositories/meeting-workspace-state.repository'
import { MeetingWorkspaceRepository } from './repositories/meeting-workspace.repository'
import { MeetingActionReconciliationService } from './services/meeting-action-reconciliation.service'
import { MeetingConversationDeduplicationService } from './services/meeting-conversation-deduplication.service'
import { MeetingFollowUpReviewService } from './services/meeting-follow-up-review.service'
import { MeetingItemMaterializeService } from './services/meeting-item-materialize.service'
import { MeetingMergeService } from './services/meeting-merge.service'
import { MeetingRelatedCallsService } from './services/meeting-related-calls.service'
import { MeetingSourceIngestionService } from './services/meeting-source-ingestion.service'
import { MeetingWorkspaceService } from './services/meeting-workspace.service'

@Module({
  imports: [BrainModule, ConversationsModule, UserAgentApiModule],
  controllers: [
    MeetingWorkspaceController,
    MeetingWorkspaceResolutionController,
    MeetingMergeController,
    MeetingFollowUpReviewController,
    MeetingActionReconciliationController,
  ],
  providers: [
    MeetingWorkspaceRepository,
    MeetingActionReconciliationRepository,
    MeetingWorkspaceAgendaRepository,
    MeetingMergeRepository,
    MeetingMergeService,
    MeetingProviderActionsRepository,
    MeetingCallMatchingRepository,
    MeetingWorkspaceResolutionRepository,
    MeetingRecordingBackfillRepository,
    MeetingRecapRepository,
    MeetingWorkspaceReadRepository,
    MeetingWorkspaceStateRepository,
    MeetingConversationDeduplicationService,
    MeetingActionReconciliationService,
    MeetingSourceIngestionService,
    MeetingWorkspaceService,
    MeetingItemMaterializeService,
    MeetingRelatedCallsService,
    MeetingFollowUpReviewService,
  ],
  exports: [
    MeetingRecordingBackfillRepository,
    MeetingSourceIngestionService,
    MeetingWorkspaceService,
    MeetingRelatedCallsService,
  ],
})
export class MeetingsModule {}
