import { Module } from '@nestjs/common'
import { AgentTeamsModule } from '../agent-teams/agent-teams.module'
import { ChannelsModule } from '../channels/channels.module'
import { DmModule } from '../dm/dm.module'
import { MissionsModule } from '../missions/missions.module'
import { TeamRosterModule } from '../team-roster/team-roster.module'
import { SidebarController } from './controllers/sidebar.controller'
import { SidebarService } from './services/sidebar.service'

@Module({
  imports: [AgentTeamsModule, ChannelsModule, DmModule, MissionsModule, TeamRosterModule],
  controllers: [SidebarController],
  providers: [SidebarService],
})
export class SidebarModule {}
