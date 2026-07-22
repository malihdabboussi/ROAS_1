import { Controller, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import { PageGraderBrainSyncService } from '../../integrations/page-grader/services/page-grader-brain-sync.service'
import { PageGraderMeetingSyncService } from '../../integrations/page-grader/services/page-grader-meeting-sync.service'

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalPageGraderBrainSyncController {
  constructor(
    private readonly sync: PageGraderBrainSyncService,
    private readonly meetings: PageGraderMeetingSyncService,
  ) {}

  /** Hourly catch-up for mapped Page Grader clients. */
  @Post('page-grader/brain-sync/catch-up')
  @HttpCode(HttpStatus.OK)
  async catchUp(@Query('limit') limitRaw?: string) {
    const limit = Number(limitRaw ?? 50)
    return this.sync.catchUpMappedClients(Number.isFinite(limit) ? limit : 50)
  }

  /** Retry and backfill Fathom call rows into mapped Page Grader clients. */
  @Post('page-grader/meetings/catch-up')
  @HttpCode(HttpStatus.OK)
  async catchUpMeetings(@Query('limit') limitRaw?: string) {
    const limit = Number(limitRaw ?? 100)
    return this.meetings.catchUp(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100)
  }
}
