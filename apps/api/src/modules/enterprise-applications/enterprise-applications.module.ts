import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EnterpriseApplicationController } from './controllers/enterprise-application.controller'
import { EnterpriseApplicationRepository } from './repositories/enterprise-application.repository'
import { EnterpriseApplicationService } from './services/enterprise-application.service'

@Module({
  imports: [ConfigModule],
  controllers: [EnterpriseApplicationController],
  providers: [EnterpriseApplicationService, EnterpriseApplicationRepository],
  exports: [EnterpriseApplicationService],
})
export class EnterpriseApplicationsModule {}
