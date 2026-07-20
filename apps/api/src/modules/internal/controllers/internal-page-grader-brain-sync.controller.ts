import { Controller, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import { PageGraderBrainSyncService } from '../../integrations/page-grader/services/page-grader-brain-sync.service'

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalPageGraderBrainSyncController {
  constructor(private readonly sync: PageGraderBrainSyncService) {}

  /** Hourly catch-up for mapped Page Grader clients. */
  @Post('page-grader/brain-sync/catch-up')
  @HttpCode(HttpStatus.OK)
  async catchUp(@Query('limit') limitRaw?: string) {
    const limit = Number(limitRaw ?? 50)
    return this.sync.catchUpMappedClients(Number.isFinite(limit) ? limit : 50)
  }
}
