import { Global, Module } from '@nestjs/common'
import { WorkerLoggerService } from './logger.service'

@Global()
@Module({
  providers: [WorkerLoggerService],
  exports: [WorkerLoggerService],
})
export class WorkerLoggerModule {}
