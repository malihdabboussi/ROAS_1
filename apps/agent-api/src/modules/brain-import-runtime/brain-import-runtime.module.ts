import { Module } from '@nestjs/common'
import { AgentSyncModule } from '../agent-sync/agent-sync.module'
import { ArtifactsModule } from '../artifacts/artifacts.module'
import { SharedContextModule } from '../shared/shared-context.module'
import { BrainImportRuntimeController } from './controllers/brain-import-runtime.controller'
import { BrainImportRuntimeService } from './services/brain-import-runtime.service'

@Module({
  imports: [AgentSyncModule, ArtifactsModule, SharedContextModule],
  controllers: [BrainImportRuntimeController],
  providers: [BrainImportRuntimeService],
})
export class BrainImportRuntimeModule {}
