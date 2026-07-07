import { Module } from '@nestjs/common'
import { SpacesModule } from '../spaces/spaces.module'
import { SpaceTemplatesController } from './controllers/space-templates.controller'
import { SpaceTemplatesRepository } from './repositories/space-templates.repository'
import { SpaceTemplatesService } from './services/space-templates.service'

@Module({
  imports: [SpacesModule],
  controllers: [SpaceTemplatesController],
  providers: [SpaceTemplatesService, SpaceTemplatesRepository],
  exports: [SpaceTemplatesService],
})
export class SpaceTemplatesModule {}
