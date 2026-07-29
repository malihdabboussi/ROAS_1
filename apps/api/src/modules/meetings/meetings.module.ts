import { Module } from '@nestjs/common'
import { ConversationsModule } from '../conversations/conversations.module'
import { MeetingWorkspaceController } from './controllers/meeting-workspace.controller'
import { MeetingRecapRepository } from './repositories/meeting-recap.repository'
import { MeetingRecordingBackfillRepository } from './repositories/meeting-recording-backfill.repository'
import { MeetingWorkspaceReadRepository } from './repositories/meeting-workspace-read.repository'
import { MeetingWorkspaceStateRepository } from './repositories/meeting-workspace-state.repository'
import { MeetingWorkspaceRepository } from './repositories/meeting-workspace.repository'
import { MeetingSourceIngestionService } from './services/meeting-source-ingestion.service'
import { MeetingWorkspaceService } from './services/meeting-workspace.service'

@Module({
  imports: [ConversationsModule],
  controllers: [MeetingWorkspaceController],
  providers: [
    MeetingWorkspaceRepository,
    MeetingRecordingBackfillRepository,
    MeetingRecapRepository,
    MeetingWorkspaceReadRepository,
    MeetingWorkspaceStateRepository,
    MeetingSourceIngestionService,
    MeetingWorkspaceService,
  ],
  exports: [
    MeetingRecordingBackfillRepository,
    MeetingSourceIngestionService,
    MeetingWorkspaceService,
  ],
})
export class MeetingsModule {}
