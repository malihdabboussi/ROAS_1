import { Module } from '@nestjs/common'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { GoHighLevelController } from './controllers/gohighlevel.controller'
import { GoHighLevelIntegration } from './integrations/gohighlevel.integration'
import { GoHighLevelApiService } from './services/gohighlevel-api.service'

@Module({
  controllers: [GoHighLevelController],
  providers: [GoHighLevelIntegration, IntegrationConnectionsRepository, GoHighLevelApiService],
  exports: [GoHighLevelIntegration, GoHighLevelApiService],
})
export class GoHighLevelModule {}
