import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DatabaseService } from './services/database.service'

@Global()
@Module({
  providers: [
    {
      provide: DatabaseService,
      useFactory: (configService: ConfigService) => new DatabaseService(configService),
      inject: [ConfigService],
    },
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
