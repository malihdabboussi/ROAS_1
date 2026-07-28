import { Module } from '@nestjs/common'
import { SharedContextModule } from '../shared/shared-context.module'
import { AgentSyncController } from './controllers/agent-sync.controller'
import { RuntimeIdentityController } from './controllers/runtime-identity.controller'
import { RuntimeSkillsController } from './controllers/runtime-skills.controller'
import { RuntimeIdentityGuard } from './guards/runtime-identity.guard'
import { SyncReadyInterceptor } from './interceptors/sync-ready.interceptor'
import { AgentSyncMaterializationRepository } from './repositories/agent-sync-materialization.repository'
import { AgentSyncRepository } from './repositories/agent-sync.repository'
import { AgentInstructionAuditService } from './services/agent-instruction-audit.service'
import { AgentInstructionRepairService } from './services/agent-instruction-repair.service'
import { AgentRuntimeReadinessService } from './services/agent-runtime-readiness.service'
import { AgentRuntimeSkillScopeService } from './services/agent-runtime-skill-scope.service'
import { AgentSyncAgentService } from './services/agent-sync-agent.service'
import { AgentSyncAllService } from './services/agent-sync-all.service'
import { AgentSyncBrainLibraryService } from './services/agent-sync-brain-library.service'
import { AgentSyncFileMaterializationService } from './services/agent-sync-file-materialization.service'
import { AgentSyncOrgAgentService } from './services/agent-sync-org-agent.service'
import { AgentSyncOrgSharedSkillsService } from './services/agent-sync-org-shared-skills.service'
import { AgentSyncPolicySkillService } from './services/agent-sync-policy-skill.service'
import { AgentSyncRequiredSkillsService } from './services/agent-sync-required-skills.service'
import { AgentSyncScopeService } from './services/agent-sync-scope.service'
import { AgentSyncVerificationService } from './services/agent-sync-verification.service'
import { AgentSyncService } from './services/agent-sync.service'

@Module({
  imports: [SharedContextModule],
  controllers: [AgentSyncController, RuntimeIdentityController, RuntimeSkillsController],
  providers: [
    AgentSyncMaterializationRepository,
    AgentSyncRepository,
    AgentSyncService,
    AgentInstructionAuditService,
    AgentInstructionRepairService,
    AgentRuntimeReadinessService,
    AgentRuntimeSkillScopeService,
    AgentSyncBrainLibraryService,
    AgentSyncFileMaterializationService,
    AgentSyncScopeService,
    AgentSyncPolicySkillService,
    AgentSyncVerificationService,
    AgentSyncAllService,
    AgentSyncAgentService,
    AgentSyncOrgAgentService,
    AgentSyncOrgSharedSkillsService,
    AgentSyncRequiredSkillsService,
    RuntimeIdentityGuard,
    SyncReadyInterceptor,
  ],
  exports: [
    AgentSyncService,
    AgentInstructionAuditService,
    AgentInstructionRepairService,
    AgentRuntimeReadinessService,
    AgentRuntimeSkillScopeService,
    SyncReadyInterceptor,
  ],
})
export class AgentSyncModule {}
