import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import {
  getAgentRuntimeRedisConnection,
  getAgentRuntimeRedisPrefix,
} from './agent-runtime-redis.config'
import { AgentRuntimeAutoscalerService } from './autoscaler/agent-runtime-autoscaler.service'
import { RailwayReplicaClient } from './autoscaler/railway-replica-client'
import { AgentRuntimeBrainImportProcessor } from './processors/agent-runtime-brain-import.processor'
import { AgentRuntimeChatProcessor } from './processors/agent-runtime-chat-shadow.processor'
import {
  AGENT_RUNTIME_BRAIN_IMPORT_QUEUE,
  AGENT_RUNTIME_CHAT_QUEUE,
} from './types/agent-runtime.types'

@Module({
  imports: [
    BullModule.registerQueueAsync(
      {
        name: AGENT_RUNTIME_CHAT_QUEUE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          name: AGENT_RUNTIME_CHAT_QUEUE,
          connection: getAgentRuntimeRedisConnection(configService),
          prefix: getAgentRuntimeRedisPrefix(configService),
        }),
      },
      {
        name: AGENT_RUNTIME_BRAIN_IMPORT_QUEUE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          name: AGENT_RUNTIME_BRAIN_IMPORT_QUEUE,
          connection: getAgentRuntimeRedisConnection(configService),
          prefix: getAgentRuntimeRedisPrefix(configService),
        }),
      },
    ),
  ],
  providers: [
    AgentRuntimeChatProcessor,
    AgentRuntimeBrainImportProcessor,
    AgentRuntimeAutoscalerService,
    RailwayReplicaClient,
  ],
  exports: [BullModule],
})
export class AgentRuntimeModule {}
