import { Module } from '@nestjs/common'
import { MissionsModule } from '../missions/missions.module'
import { UserAgentApiModule } from '../user-agent-api/user-agent-api.module'
import { EnterpriseSkillBuilderSessionsController } from './enterprise/enterprise-skill-builder-sessions.controller'
import { EnterpriseSkillBuilderController } from './enterprise/enterprise-skill-builder.controller'
import { EnterpriseSkillBuilderService } from './enterprise/enterprise-skill-builder.service'
import { InternalEnterpriseSkillsController } from './enterprise/internal-enterprise-skills.controller'
import { AdminRepository } from './repositories/admin.repository'

@Module({
  imports: [MissionsModule, UserAgentApiModule],
  controllers: [
    EnterpriseSkillBuilderController,
    EnterpriseSkillBuilderSessionsController,
    InternalEnterpriseSkillsController,
  ],
  providers: [AdminRepository, EnterpriseSkillBuilderService],
  exports: [EnterpriseSkillBuilderService],
})
export class AdminEnterpriseModule {}
