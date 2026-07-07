import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { FanbasisApiService } from '../services/fanbasis-api.service'

@Controller('integrations/fanbasis')
export class FanbasisWebhookSubscriptionsController {
  constructor(private readonly api: FanbasisApiService) {}

  @Post('webhook-subscriptions')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createWebhookSubscription(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
  ) {
    const data = await this.api.createWebhookSubscription(user.id, body)
    return { success: true, data }
  }

  @Get('webhook-subscriptions')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getWebhookSubscriptions(@CurrentUser() user: { id: string }) {
    const data = await this.api.getWebhookSubscriptions(user.id)
    return { success: true, data }
  }

  @Delete('webhook-subscriptions/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteWebhookSubscription(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const data = await this.api.deleteWebhookSubscription(user.id, id)
    return { success: true, data }
  }

  @Post('webhook-subscriptions/:id/test')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async testWebhookSubscription(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const data = await this.api.testWebhookSubscription(user.id, id)
    return { success: true, data }
  }
}
