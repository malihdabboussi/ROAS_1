import { Module } from '@nestjs/common'
import { MachinesModule } from '../machines/machines.module'
import { UserAgentApiRepository } from './repositories/user-agent-api.repository'
import { UserAgentApiService } from './services/user-agent-api.service'

@Module({
  imports: [MachinesModule],
  providers: [UserAgentApiService, UserAgentApiRepository],
  exports: [UserAgentApiService],
})
export class UserAgentApiModule {}
