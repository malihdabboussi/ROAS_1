import { Global, Module } from '@nestjs/common'
import { AgentRuntimeRepository } from './repositories/agent-runtime.repository'
import { AgentRuntimeService } from './services/agent-runtime.service'
import { OpenClawGatewayService } from './services/openclaw-gateway.service'
import { RequestContextService } from './services/request-context.service'

@Global()
@Module({
  providers: [
    RequestContextService,
    AgentRuntimeRepository,
    AgentRuntimeService,
    OpenClawGatewayService,
  ],
  exports: [RequestContextService, AgentRuntimeService, OpenClawGatewayService],
})
export class SharedContextModule {}
