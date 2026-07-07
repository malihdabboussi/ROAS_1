import { Module } from '@nestjs/common'
import { BillingModule } from '../billing/billing.module'
import { BrainModule } from '../brain/brain.module'
import { MachinesModule } from '../machines/machines.module'
import { MediaModule } from '../media/media.module'
import { SpaceRetrievalModule } from '../space-retrieval/space-retrieval.module'
import { SpacesModule } from '../spaces/spaces.module'
import { UserAgentApiModule } from '../user-agent-api/user-agent-api.module'
import { AgentCheckpointsController } from './controllers/agent-checkpoints.controller'
import { InternalAgentsController } from './controllers/internal-agents.controller'
import { InternalMissionAwarenessActionsController } from './controllers/internal-mission-awareness-actions.controller'
import { InternalMissionAwarenessController } from './controllers/internal-mission-awareness.controller'
import { InternalMissionManagerController } from './controllers/internal-mission-manager.controller'
import { InternalMissionsController } from './controllers/internal-missions.controller'
import { MissionsFeedbackController } from './controllers/missions-feedback.controller'
import { MissionsLifecycleController } from './controllers/missions-lifecycle.controller'
import { MissionsQueryController } from './controllers/missions-query.controller'
import { MissionsStatusController } from './controllers/missions-status.controller'
import { MissionsSubtasksController } from './controllers/missions-subtasks.controller'
import { MissionsUserController } from './controllers/missions-user.controller'
import { MissionsController } from './controllers/missions.controller'
import { AgentCheckpointsRepository } from './repositories/agent-checkpoints.repository'
import { MissionAvatarRepository } from './repositories/mission-avatar.repository'
import { MissionHumanSubtaskRepository } from './repositories/mission-human-subtask.repository'
import { MissionInternalRepository } from './repositories/mission-internal.repository'
import { MissionSkillSeederRepository } from './repositories/mission-skill-seeder.repository'
import { MissionServiceRoleClientRepository } from './repositories/mission-service-role-client.repository'
import { MissionsPlanDecisionRepository } from './repositories/missions-plan-decision.repository'
import { MissionsUserOperationsRepository } from './repositories/missions-user-operations.repository'
import { MissionsRepository } from './repositories/missions.repository'
import { AgentCheckpointsService } from './services/agent-checkpoints.service'
import { AgentManagementService } from './services/agent-management.service'
import { AgentOnboardingService } from './services/agent-onboarding.service'
import { AgentProvisioningService } from './services/agent-provisioning.service'
import { AgentSkillManagementService } from './services/agent-skill-management.service'
import { MissionAgentGatewayService } from './services/gateways/mission-agent-gateway.service'
import { MissionAvatarService } from './services/media/mission-avatar.service'
import { MissionHumanSubtaskService } from './services/mission-human-subtask.service'
import { MissionInternalService } from './services/mission-internal.service'
import { MissionLifecycleNativeTxService } from './services/mission-lifecycle-native-tx.service'
import { MissionLifecycleService } from './services/mission-lifecycle.service'
import { MissionListSummaryService } from './services/mission-list-summary.service'
import { MissionOutboxService } from './services/mission-outbox.service'
import { MissionPermissionsService } from './services/mission-permissions.service'
import { MissionsAccessApprovalService } from './services/missions-access-approval.service'
import { MissionsAgentOperationsService } from './services/missions-agent-operations.service'
import { MissionsCancellationService } from './services/missions-cancellation.service'
import { MissionsCreationService } from './services/missions-creation.service'
import { MissionsExecutionService } from './services/missions-execution.service'
import { MissionsInternalOperationsService } from './services/missions-internal-operations.service'
import { MissionsPlanDecisionService } from './services/missions-plan-decision.service'
import { MissionsQueryService } from './services/missions-query.service'
import { MissionsUserOperationsService } from './services/missions-user-operations.service'
import { MissionSkillSeederService } from './services/skills/mission-skill-seeder.service'
import { AgentTemplateCatalogSeederService } from './services/templates/agent-template-catalog-seeder.service'
import { MissionAgentTemplateService } from './services/templates/mission-agent-template.service'

@Module({
  imports: [
    BillingModule,
    BrainModule,
    MediaModule,
    MachinesModule,
    SpacesModule,
    SpaceRetrievalModule,
    UserAgentApiModule,
  ],
  controllers: [
    MissionsController,
    MissionsUserController,
    MissionsQueryController,
    MissionsLifecycleController,
    MissionsStatusController,
    MissionsSubtasksController,
    MissionsFeedbackController,
    AgentCheckpointsController,
    InternalMissionsController,
    InternalMissionAwarenessController,
    InternalMissionManagerController,
    InternalMissionAwarenessActionsController,
    InternalAgentsController,
  ],
  providers: [
    MissionsQueryService,
    MissionsCreationService,
    MissionsExecutionService,
    MissionsAccessApprovalService,
    MissionsPlanDecisionService,
    MissionsCancellationService,
    MissionsInternalOperationsService,
    MissionsUserOperationsService,
    MissionsAgentOperationsService,
    AgentCheckpointsService,
    AgentCheckpointsRepository,
    MissionsRepository,
    MissionAvatarRepository,
    MissionHumanSubtaskRepository,
    MissionInternalRepository,
    MissionSkillSeederRepository,
    MissionServiceRoleClientRepository,
    MissionsPlanDecisionRepository,
    MissionsUserOperationsRepository,
    MissionOutboxService,
    MissionPermissionsService,
    MissionListSummaryService,
    MissionLifecycleNativeTxService,
    MissionLifecycleService,
    MissionInternalService,
    MissionHumanSubtaskService,
    MissionAgentGatewayService,
    MissionAgentTemplateService,
    AgentTemplateCatalogSeederService,
    MissionSkillSeederService,
    MissionAvatarService,
    AgentOnboardingService,
    AgentProvisioningService,
    AgentSkillManagementService,
    AgentManagementService,
  ],
  exports: [
    MissionsQueryService,
    MissionsCreationService,
    MissionsExecutionService,
    MissionsAccessApprovalService,
    MissionsPlanDecisionService,
    MissionsCancellationService,
    MissionsInternalOperationsService,
    MissionsAgentOperationsService,
    AgentCheckpointsService,
    MissionsRepository,
    MissionServiceRoleClientRepository,
    MissionAgentGatewayService,
  ],
})
export class MissionsModule {}
