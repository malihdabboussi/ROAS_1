import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { BrainImportJobsService } from '../../brain/services/brain-import-jobs.service'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import { PageGraderBrainSyncService } from '../../integrations/page-grader/services/page-grader-brain-sync.service'

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalBrainImportJobsController {
  constructor(
    private readonly importJobs: BrainImportJobsService,
    private readonly pageGraderBrainSync: PageGraderBrainSyncService,
  ) {}

  /**
   * POST /api/internal/brain/import-jobs/enqueue-due
   */
  @Post('brain/import-jobs/enqueue-due')
  @HttpCode(HttpStatus.ACCEPTED)
  async enqueueDueBrainImportJobs() {
    await this.importJobs.enqueueDueJobs()
    // Hourly catch-up for mapped Page Grader → campaign brain sync.
    await this.pageGraderBrainSync.catchUpMappedClients(50)
    return { success: true }
  }

  /**
   * POST /api/internal/brain/import-jobs/:jobId/process
   */
  @Post('brain/import-jobs/:jobId/process')
  @HttpCode(HttpStatus.OK)
  async processBrainImportJob(@Param('jobId') jobId: string) {
    const normalizedJobId = jobId?.trim()
    if (!normalizedJobId) {
      throw new BadRequestException('jobId is required')
    }
    await this.importJobs.processRuntimeJob(normalizedJobId)
    return { success: true, job_id: normalizedJobId }
  }

  /**
   * POST /api/internal/brain/import-jobs/:jobId/claim
   */
  @Post('brain/import-jobs/:jobId/claim')
  @HttpCode(HttpStatus.OK)
  async claimBrainImportJob(@Param('jobId') jobId: string) {
    const normalizedJobId = jobId?.trim()
    if (!normalizedJobId) {
      throw new BadRequestException('jobId is required')
    }
    const result = await this.importJobs.claimRuntimeJobForExternalExecution(normalizedJobId)
    return { success: true, ...result }
  }

  /**
   * POST /api/internal/brain/import-jobs/:jobId/progress
   */
  @Post('brain/import-jobs/:jobId/progress')
  @HttpCode(HttpStatus.OK)
  async progressBrainImportJob(
    @Param('jobId') jobId: string,
    @Body()
    body: { attempts?: number; chunksCompleted?: number; chunksTotal?: number },
  ) {
    const normalizedJobId = jobId?.trim()
    if (!normalizedJobId) {
      throw new BadRequestException('jobId is required')
    }
    if (!Number.isFinite(body?.attempts)) {
      throw new BadRequestException('attempts is required')
    }
    return this.importJobs.markRuntimeJobProgress(normalizedJobId, {
      attempts: Number(body.attempts),
      chunksCompleted: body.chunksCompleted,
      chunksTotal: body.chunksTotal,
    })
  }

  /**
   * POST /api/internal/brain/import-jobs/:jobId/succeed
   */
  @Post('brain/import-jobs/:jobId/succeed')
  @HttpCode(HttpStatus.OK)
  async succeedBrainImportJob(
    @Param('jobId') jobId: string,
    @Body() body: { attempts?: number; result?: Record<string, unknown> | null },
  ) {
    const normalizedJobId = jobId?.trim()
    if (!normalizedJobId) {
      throw new BadRequestException('jobId is required')
    }
    if (!Number.isFinite(body?.attempts)) {
      throw new BadRequestException('attempts is required')
    }
    return this.importJobs.succeedRuntimeJob(normalizedJobId, {
      attempts: Number(body.attempts),
      result: body.result ?? null,
    })
  }

  /**
   * POST /api/internal/brain/import-jobs/:jobId/fail
   */
  @Post('brain/import-jobs/:jobId/fail')
  @HttpCode(HttpStatus.OK)
  async failBrainImportJob(
    @Param('jobId') jobId: string,
    @Body() body: { attempts?: number; message?: string | null },
  ) {
    const normalizedJobId = jobId?.trim()
    if (!normalizedJobId) {
      throw new BadRequestException('jobId is required')
    }
    if (!Number.isFinite(body?.attempts)) {
      throw new BadRequestException('attempts is required')
    }
    return this.importJobs.failRuntimeJob(normalizedJobId, {
      attempts: Number(body.attempts),
      message: body.message ?? null,
    })
  }
}
