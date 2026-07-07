import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { BrainAuthGuard } from '../guards/brain-auth.guard'
import { BrainImportJobStatusService } from '../services/brain-import-job-status.service'

@Controller('brain/import-jobs')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class ImportJobStatusController {
  constructor(private readonly jobStatus: BrainImportJobStatusService) {}

  @Get('notifications/pending')
  async listPendingNotifications(
    @CurrentUser() user: { id: string },
    @OrgContext() _scope: RequestScope,
  ) {
    const jobs = await this.jobStatus.listPendingNotifications(user.id)
    return { success: true, jobs }
  }

  @Get('active')
  async listActiveJobs(
    @CurrentUser() user: { id: string },
    @OrgContext() _scope: RequestScope,
    @Query('brainId') brainId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('targetBrain') targetBrain?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const parsedLimit = Number.parseInt(limitRaw ?? '', 10)
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined
    const scope = brainId?.trim()
      ? { brainId: brainId.trim(), limit }
      : campaignId?.trim()
        ? { campaignId: campaignId.trim(), limit }
        : targetBrain?.trim() === 'user'
          ? { targetBrain: 'user' as const, limit }
          : limit
            ? { limit }
            : undefined
    const jobs = await this.jobStatus.listActiveJobs(user.id, scope)
    return { success: true, jobs }
  }

  @Post('notifications/ack')
  @HttpCode(HttpStatus.OK)
  async acknowledgeNotifications(
    @CurrentUser() user: { id: string },
    @Body() body: { jobIds?: string[] },
    @OrgContext() _scope: RequestScope,
  ) {
    const jobIds = (body.jobIds ?? []).filter((id) => typeof id === 'string' && id.length > 0)
    await this.jobStatus.acknowledgeNotifications(user.id, jobIds)
    return { success: true }
  }

  @Delete(':jobId')
  @HttpCode(HttpStatus.OK)
  async cancelJob(
    @CurrentUser() user: { id: string },
    @Param('jobId') jobId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    const cancelled = await this.jobStatus.cancelJob(user.id, jobId)
    if (!cancelled) throw new BadRequestException('Job not found or already completed')
    return { success: true }
  }

  @Post(':jobId/retry')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  async retryJob(
    @CurrentUser() user: { id: string },
    @Param('jobId') jobId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    const retried = await this.jobStatus.retryJob(user.id, jobId)
    if (!retried) throw new BadRequestException('Job not found or not in failed state')
    return { success: true }
  }

  @Delete(':jobId/dismiss')
  @HttpCode(HttpStatus.OK)
  async dismissJob(
    @CurrentUser() user: { id: string },
    @Param('jobId') jobId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    const dismissed = await this.jobStatus.dismissJob(user.id, jobId)
    if (!dismissed) throw new BadRequestException('Job not found or still active')
    return { success: true }
  }

  @Get(':jobId')
  async getJob(
    @CurrentUser() user: { id: string },
    @Param('jobId') jobId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    const job = await this.jobStatus.getJobStatus(user.id, jobId)
    if (!job) throw new BadRequestException('Job not found')
    return { success: true, job }
  }
}
