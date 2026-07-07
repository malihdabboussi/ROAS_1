import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import configuration from './config/configuration'
import { getRedisConnection } from './config/redis.config'
import { DatabaseModule } from './lib/database.module'
import { AdminModule } from './modules/admin/admin.module'
import { AgentRuntimeModule } from './modules/agent-runtime/agent-runtime.module'
import { BrainOpsModule } from './modules/brain-ops/brain-ops.module'
import { DreamOpsModule } from './modules/dream-ops/dream-ops.module'
import { WorkerLoggerModule } from './modules/logger'
import { AppErrorsModule } from './modules/logger/error-reporter'
import { MissionsModule } from './modules/missions/missions.module'
import { ProviderBillingModule } from './modules/provider-billing/provider-billing.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: getRedisConnection(configService),
        defaultJobOptions: {
          removeOnComplete: { age: 24 * 3600 },
          removeOnFail: { age: 7 * 24 * 3600 },
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
        prefix: configService.get<string>('redis.queuePrefix') || 'bull',
      }),
    }),

    DatabaseModule,
    AppErrorsModule,
    WorkerLoggerModule,
    AdminModule,
    AgentRuntimeModule,
    MissionsModule,
    ProviderBillingModule,
    BrainOpsModule,
    DreamOpsModule,
  ],
})
export class AppModule {}
