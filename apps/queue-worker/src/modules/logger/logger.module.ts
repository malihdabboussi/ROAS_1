import { Global, Module } from '@nestjs/common'
import { QueueLoggerService } from './logger.service'

@Global()
@Module({
  providers: [QueueLoggerService],
  exports: [QueueLoggerService],
})
export class QueueLoggerModule {}
