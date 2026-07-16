import { Module } from '@nestjs/common'
import { MissionsModule } from '../missions/missions.module'
import { SpacesModule } from '../spaces/spaces.module'
import { SpaceTemplatesController } from './controllers/space-templates.controller'
import { SpaceTemplatesRepository } from './repositories/space-templates.repository'
import { SpaceTemplatesService } from './services/space-templates.service'

@Module({
  imports: [SpacesModule, MissionsModule],
  controllers: [SpaceTemplatesController],
  providers: [SpaceTemplatesService, SpaceTemplatesRepository],
  exports: [SpaceTemplatesService],
})
export class SpaceTemplatesModule {}
