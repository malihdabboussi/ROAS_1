import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SpacesModule } from '../../spaces/spaces.module'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { PageGraderController } from './controllers/page-grader.controller'
import { PageGraderIntegration } from './integrations/page-grader.integration'
import { PageGraderApiService } from './services/page-grader-api.service'

@Module({
  imports: [ConfigModule, SpacesModule],
  controllers: [PageGraderController],
  providers: [PageGraderIntegration, PageGraderApiService, IntegrationConnectionsRepository],
  exports: [PageGraderApiService, PageGraderIntegration],
})
export class PageGraderModule {}
