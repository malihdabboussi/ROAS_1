import { Module } from '@nestjs/common'
import { MissionsModule } from '../missions/missions.module'
import { AgencyTeamController } from './controllers/agency-team.controller'
import { AgentCheckpointsController } from './controllers/agent-checkpoints.controller'
import { AgentConfigController } from './controllers/agent-config.controller'
import { AgentSkillsController } from './controllers/agent-skills.controller'
import { AgentWidgetController } from './controllers/agent-widget.controller'
import { AgentWorkflowsController } from './controllers/agent-workflows.controller'
import { AgentsController } from './controllers/agents.controller'
import { SkillCatalogController } from './controllers/skill-catalog.controller'
import { AgentsRepository } from './repositories/agents.repository'
import { AgentsService } from './services/agents.service'

@Module({
  imports: [MissionsModule],
  controllers: [
    AgencyTeamController,
    SkillCatalogController,
    AgentsController,
    AgentConfigController,
    AgentWidgetController,
    AgentSkillsController,
    AgentWorkflowsController,
    AgentCheckpointsController,
  ],
  providers: [AgentsService, AgentsRepository],
})
export class AgentsModule {}
