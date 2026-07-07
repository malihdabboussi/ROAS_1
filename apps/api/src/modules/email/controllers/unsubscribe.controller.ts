import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { EmailUnsubscribeService } from '../services/email-unsubscribe.service'

@Controller('email/unsubscribe')
export class UnsubscribeController {
  constructor(private readonly emailUnsubscribeService: EmailUnsubscribeService) {}

  @Get(':token')
  async checkStatus(@Param('token') token: string) {
    return this.emailUnsubscribeService.checkStatus(token)
  }

  @Post(':token')
  async processUnsubscribe(@Param('token') token: string) {
    return this.emailUnsubscribeService.processUnsubscribe(token)
  }

  @Post(':token/all')
  async unsubscribeFromAll(@Param('token') token: string) {
    return this.emailUnsubscribeService.processUnsubscribe(token)
  }

  @Get(':token/preferences')
  async getPreferences(@Param('token') token: string) {
    return this.emailUnsubscribeService.getPreferences(token)
  }

  @Post(':token/preferences')
  async updatePreferences(
    @Param('token') token: string,
    @Body() body: { updates?: Array<{ groupId: number; subscribed: boolean }> },
  ) {
    return this.emailUnsubscribeService.updatePreferences(token, body)
  }
}
