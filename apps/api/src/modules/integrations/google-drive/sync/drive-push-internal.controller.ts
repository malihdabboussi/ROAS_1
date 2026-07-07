import { Controller, Headers, HttpCode, HttpException, HttpStatus, Post } from '@nestjs/common'
import { DriveSyncService } from './drive-sync.service'

@Controller('internal/integrations/google-drive/push')
export class DrivePushInternalController {
  constructor(private readonly driveSyncService: DriveSyncService) {}

  @Post('renew-due')
  @HttpCode(HttpStatus.OK)
  async renewDue(@Headers('x-internal-token') internalToken: string) {
    const expectedToken = process.env.INTERNAL_API_TOKEN ?? ''
    if (!expectedToken || internalToken !== expectedToken) {
      throw new HttpException({ success: false, error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED)
    }
    const result = await this.driveSyncService.renewDuePushChannels()
    return { success: true, ...result }
  }
}
