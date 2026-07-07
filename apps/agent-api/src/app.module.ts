import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { SharedModule } from '@vibey/api-shared'
import { HealthController } from './health.controller'
import { AdminSkillBuilderModule } from './modules/admin-skill-builder/admin-skill-builder.module'
import { AgentPolicyModule } from './modules/agent-policy/agent-policy.module'
import { AgentSyncModule } from './modules/agent-sync/agent-sync.module'
import { ArtifactsModule } from './modules/artifacts/artifacts.module'
import { AgentBillingModule } from './modules/billing/billing.module'
import { BrainImportRuntimeModule } from './modules/brain-import-runtime/brain-import-runtime.module'
import { BrainModule } from './modules/brain/brain.module'
import { ChannelAgentModule } from './modules/channel-agent/channel-agent.module'
import { ChatModule } from './modules/chat/chat.module'
import { ConversationsModule } from './modules/conversations/conversations.module'
import { ObservabilityModule } from './modules/observability/observability.module'
import { ProjectRuntimeModule } from './modules/project-runtime/project-runtime.module'
import { PublicAgentModule } from './modules/public-agent/public-agent.module'
import { SessionsModule } from './modules/sessions/sessions.module'
import { SharedContextModule } from './modules/shared/shared-context.module'
import { TaskAgentModule } from './modules/task-agent/task-agent.module'
import { VibeyMcpModule } from './modules/vibey-mcp/vibey-mcp.module'
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
    AdminSkillBuilderModule,
    AgentSyncModule,
    AgentBillingModule,
    ConversationsModule,
    BrainImportRuntimeModule,
    BrainModule,
    ChatModule,
    ObservabilityModule,
    ChannelAgentModule,
    TaskAgentModule,
    ArtifactsModule,
    VibeyMcpModule,
    PublicAgentModule,
    ProjectRuntimeModule,
    SessionsModule,
  ],
})
export class AppModule {}
