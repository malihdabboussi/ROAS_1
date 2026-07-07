import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { FanbasisApiService } from '../services/fanbasis-api.service'

@Controller('integrations/fanbasis')
export class FanbasisCheckoutSessionsController {
  constructor(private readonly api: FanbasisApiService) {}

  @Post('checkout-sessions')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createCheckoutSession(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
  ) {
    const data = await this.api.createCheckoutSession(user.id, body)
    return { success: true, data }
  }

  @Get('checkout-sessions/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getCheckoutSession(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const data = await this.api.getCheckoutSession(user.id, id)
    return { success: true, data }
  }

  @Delete('checkout-sessions/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteCheckoutSession(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const data = await this.api.deleteCheckoutSession(user.id, id)
    return { success: true, data }
  }

  @Post('checkout-sessions/embedded')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createEmbeddedCheckoutSession(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
  ) {
    const data = await this.api.createEmbeddedCheckoutSession(user.id, body)
    return { success: true, data }
  }
}
