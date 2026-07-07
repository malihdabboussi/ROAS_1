import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { SharedModule } from '@vibey/api-shared'
import { HealthController } from './health.controller'
import { AgentPolicyModule } from './modules/agent-policy/agent-policy.module'
import { AgentSyncModule } from './modules/agent-sync/agent-sync.module'
import { ChatModule } from './modules/chat/chat.module'
import { ObservabilityModule } from './modules/observability/observability.module'
import { SharedContextModule } from './modules/shared/shared-context.module'
import { resolveAgentApiEnvFilePaths } from './lib/agent-api-env'

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveAgentApiEnvFilePaths(),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    SharedModule,
    SharedContextModule,
    AgentPolicyModule,
    AgentSyncModule,
    ObservabilityModule,
    ChatModule,
  ],
})
export class RuntimeChatAppModule {}
