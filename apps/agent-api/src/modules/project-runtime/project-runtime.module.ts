import { forwardRef, Module } from '@nestjs/common'
import { AgentSyncModule } from '../agent-sync/agent-sync.module'
import { AgentSyncService } from '../agent-sync/services/agent-sync.service'
import { AgentBillingModule } from '../billing/billing.module'
import { ProjectAgentCallController } from './controllers/project-agent-call.controller'
import { ProjectAppsProxyController } from './controllers/project-apps-proxy.controller'
import { ProjectFilesController } from './controllers/project-files.controller'
import { ProjectRuntimeRepository } from './repositories/project-runtime.repository'
import { ModalFileIoService } from './services/modal-file-io.service'
import { ProjectAgentCallService } from './services/project-agent-call.service'
import { ProjectAppsProxyService } from './services/project-apps-proxy.service'
import { ProjectDiskHydrationService } from './services/project-disk-hydration.service'
import { ProjectFilesService } from './services/project-files.service'
import { ProjectStorageSyncService } from './services/project-storage-sync.service'

@Module({
  imports: [AgentBillingModule, forwardRef(() => AgentSyncModule)],
  controllers: [ProjectAppsProxyController, ProjectAgentCallController, ProjectFilesController],
  providers: [
    ProjectDiskHydrationService,
    ProjectStorageSyncService,
    ProjectAgentCallService,
    ProjectAppsProxyService,
    ProjectFilesService,
    ProjectRuntimeRepository,
    ModalFileIoService,
    { provide: 'AgentSyncService', useExisting: AgentSyncService },
  ],
  exports: [ProjectStorageSyncService, ProjectDiskHydrationService, ModalFileIoService],
})
export class ProjectRuntimeModule {}
