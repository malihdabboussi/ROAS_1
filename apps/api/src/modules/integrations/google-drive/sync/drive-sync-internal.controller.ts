import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common'
import { DriveSyncService } from './drive-sync.service'

@Controller('internal/integrations/google-drive/drive-mappings')
export class DriveSyncInternalController {
  constructor(private readonly driveSyncService: DriveSyncService) {}

  @Post(':id/run-sync')
  @HttpCode(HttpStatus.OK)
  async runSync(
    @Param('id') mappingId: string,
    @Headers('x-internal-token') internalToken: string,
    @Body() body: { reason?: 'manual' | 'cron' | 'initial' | 'push'; userId?: string },
  ) {
    const expectedToken = process.env.INTERNAL_API_TOKEN ?? ''
    if (!expectedToken || internalToken !== expectedToken) {
      throw new ForbiddenException('Invalid internal token')
    }

    if (!mappingId) {
      throw new BadRequestException('mapping id is required')
    }

    const result = await this.driveSyncService.runSyncForMapping(mappingId)
    return { ...result, reason: body?.reason ?? 'cron' }
  }
}
