import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { DriveSyncService } from './drive-sync.service'

@Controller('integrations/google-drive/push')
export class DrivePushWebhookController {
  constructor(private readonly driveSyncService: DriveSyncService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.ACCEPTED)
  async webhook(
    @Headers('x-goog-channel-id') channelId: string,
    @Headers('x-goog-channel-token') channelToken?: string,
    @Headers('x-goog-resource-state') resourceState?: string,
    @Body() _body?: Record<string, unknown>,
  ) {
    if (!channelId) {
      return { success: true, accepted: false, enqueued: false }
    }
    const result = await this.driveSyncService.handleDrivePushNotification({
      channelId,
      channelToken,
      resourceState,
    })
    return { success: true, ...result }
  }
}
