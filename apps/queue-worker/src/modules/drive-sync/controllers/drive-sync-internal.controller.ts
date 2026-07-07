import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common'
import { DriveSyncService } from '../services/drive-sync.service'
import type { DriveSyncJobData } from '../types/drive-sync.types'

@Controller('internal/drive-sync')
export class DriveSyncInternalController {
  constructor(private readonly driveSyncService: DriveSyncService) {}

  @Post('enqueue')
  @HttpCode(HttpStatus.ACCEPTED)
  async enqueue(
    @Headers('x-internal-token') internalToken: string,
    @Body() body: Partial<DriveSyncJobData>,
  ) {
    const expectedToken = process.env.INTERNAL_API_TOKEN ?? ''
    if (!expectedToken || internalToken !== expectedToken) {
      throw new ForbiddenException('Invalid internal token')
    }

    if (!body.mappingId || !body.userId || !body.reason) {
      throw new BadRequestException('mappingId, userId, and reason are required')
    }

    await this.driveSyncService.enqueueManual({
      mappingId: body.mappingId,
      userId: body.userId,
      reason: body.reason,
    })

    return { accepted: true, mappingId: body.mappingId, reason: body.reason }
  }
}
