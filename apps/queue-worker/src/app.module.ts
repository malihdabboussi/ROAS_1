import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import configuration from './config/configuration'
import { getRedisConnection } from './config/redis.config'
import { DatabaseModule } from './lib/database.module'
import { AdminModule } from './modules/admin/admin.module'
import { BroadcastEmailsModule } from './modules/broadcast-emails/broadcast-emails.module'
import { CrmSyncModule } from './modules/crm-sync/crm-sync.module'
import { DriveSyncModule } from './modules/drive-sync/drive-sync.module'
import { QueueLoggerModule } from './modules/logger'
import { AppErrorsModule } from './modules/logger/error-reporter'
import { SharedModule } from './modules/shared'
import { SingleEmailsModule } from './modules/single-emails/single-emails.module'
import { SlackSyncModule } from './modules/slack-sync/slack-sync.module'
import { SocialPostsModule } from './modules/social-posts/social-posts.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: getRedisConnection(configService),
        prefix: configService.get<string>('redis.queuePrefix') || 'bull',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 60000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      }),
      inject: [ConfigService],
    }),

    DatabaseModule,
    AppErrorsModule,
    QueueLoggerModule,
    SharedModule,

    SingleEmailsModule,
    BroadcastEmailsModule,
    SocialPostsModule,
    CrmSyncModule,
    DriveSyncModule,
    SlackSyncModule,

    AdminModule,
  ],
})
export class AppModule {}
