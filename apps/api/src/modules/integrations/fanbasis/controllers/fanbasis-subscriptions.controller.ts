import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { FanbasisApiService } from '../services/fanbasis-api.service'

@Controller('integrations/fanbasis')
export class FanbasisSubscriptionsController {
  constructor(private readonly api: FanbasisApiService) {}

  @Get('checkout-sessions/:productId/subscriptions')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getProductSubscriptions(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
    @Query() query: Record<string, string>,
  ) {
    const data = await this.api.getProductSubscriptions(user.id, productId, query)
    return { success: true, data }
  }

  @Get('checkout-sessions/:id/session-subscriptions')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getCheckoutSessionSubscriptions(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Query() query: Record<string, string>,
  ) {
    const data = await this.api.getCheckoutSessionSubscriptions(user.id, id, query)
    return { success: true, data }
  }

  @Delete('checkout-sessions/:sessionId/subscriptions/:subscriptionId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async cancelSubscription(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
    @Param('subscriptionId') subscriptionId: string,
  ) {
    const data = await this.api.cancelSubscription(user.id, sessionId, subscriptionId)
    return { success: true, data }
  }

  @Post('checkout-sessions/:sessionId/extend-subscription')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async extendSubscription(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const data = await this.api.extendSubscription(user.id, sessionId, body)
    return { success: true, data }
  }
}
