import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { BullModule, InjectQueue } from '@nestjs/bullmq'
import { Module, OnModuleInit } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import type { Queue } from 'bullmq'
import {
  getAgentRuntimeRedisConnection,
  getAgentRuntimeRedisPrefix,
} from '../agent-runtime/agent-runtime-redis.config'
import { AgentRuntimeModule } from '../agent-runtime/agent-runtime.module'
import {
  AGENT_RUNTIME_AUTOMATION_QUEUE,
  AGENT_RUNTIME_BRAIN_IMPORT_QUEUE,
  AGENT_RUNTIME_CHAT_QUEUE,
} from '../agent-runtime/types/agent-runtime.types'
import { BRAIN_OPS_QUEUE } from '../brain-ops/types'
import { MISSIONS_QUEUE } from '../missions/types'

@Module({
  imports: [
    AgentRuntimeModule,
    BullModule.registerQueue({ name: MISSIONS_QUEUE }),
    BullModule.registerQueue({ name: BRAIN_OPS_QUEUE }),
    BullModule.registerQueueAsync({
      name: AGENT_RUNTIME_AUTOMATION_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        name: AGENT_RUNTIME_AUTOMATION_QUEUE,
        connection: getAgentRuntimeRedisConnection(configService),
        prefix: getAgentRuntimeRedisPrefix(configService),
      }),
    }),
  ],
})
export class AdminModule implements OnModuleInit {
  private readonly serverAdapter = new ExpressAdapter()

  constructor(
    @InjectQueue(AGENT_RUNTIME_CHAT_QUEUE) private readonly chatQueue: Queue,
    @InjectQueue(MISSIONS_QUEUE) private readonly missionsQueue: Queue,
    @InjectQueue(BRAIN_OPS_QUEUE) private readonly brainOpsQueue: Queue,
    @InjectQueue(AGENT_RUNTIME_BRAIN_IMPORT_QUEUE) private readonly brainImportQueue: Queue,
    @InjectQueue(AGENT_RUNTIME_AUTOMATION_QUEUE) private readonly automationQueue: Queue,
  ) {
    this.serverAdapter.setBasePath('/admin/queues')
  }

  onModuleInit() {
    createBullBoard({
      queues: [
        new BullMQAdapter(this.chatQueue),
        new BullMQAdapter(this.missionsQueue),
        new BullMQAdapter(this.brainOpsQueue),
        new BullMQAdapter(this.brainImportQueue),
        new BullMQAdapter(this.automationQueue),
      ],
      serverAdapter: this.serverAdapter,
    })
  }

  getServerAdapter(): ExpressAdapter {
    return this.serverAdapter
  }
}
