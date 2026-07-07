import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EmailCampaignsController } from './controllers/email-campaigns.controller'
import { EmailCampaignsRepository } from './repositories/email-campaigns.repository'
import { EmailActiveCampaignService } from './services/email-active-campaign.service'
import { EmailOrchestratorService } from './services/email-orchestrator.service'
import { EmailProviderDirectoryService } from './services/email-provider-directory.service'

@Module({
  imports: [ConfigModule],
  controllers: [EmailCampaignsController],
  providers: [
    EmailCampaignsRepository,
    EmailActiveCampaignService,
    EmailProviderDirectoryService,
    EmailOrchestratorService,
  ],
  exports: [EmailOrchestratorService],
})
export class EmailCampaignsModule {}
