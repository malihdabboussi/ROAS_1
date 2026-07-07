import { Module } from '@nestjs/common'
import { SegmentsController } from './controllers/segments.controller'
import { SegmentsRepository } from './repositories/segments.repository'
import { SegmentsService } from './services/segments.service'

@Module({
  controllers: [SegmentsController],
  providers: [SegmentsService, SegmentsRepository],
  exports: [SegmentsService, SegmentsRepository],
})
export class SegmentsModule {}
