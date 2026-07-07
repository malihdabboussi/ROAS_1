import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BillingModule } from '../billing/billing.module'
import { ProviderBillingModule } from '../provider-billing/provider-billing.module'
import { SlackModule } from '../slack/slack.module'
import { TeamRosterController } from './controllers/team-roster.controller'
import { TeamRosterRepository } from './repositories/team-roster.repository'
import { TeamRosterSlackLearnerService } from './services/team-roster-slack-learner.service'
import { TeamRosterService } from './services/team-roster.service'

@Module({
  imports: [ConfigModule, SlackModule, BillingModule, ProviderBillingModule],
  controllers: [TeamRosterController],
  providers: [TeamRosterService, TeamRosterRepository, TeamRosterSlackLearnerService],
  exports: [TeamRosterService, TeamRosterRepository],
})
export class TeamRosterModule {}
