import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { FanbasisApiService } from '../services/fanbasis-api.service'

@Controller('integrations/fanbasis')
export class FanbasisTransactionsController {
  constructor(private readonly api: FanbasisApiService) {}

  @Get('transactions')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getTransactions(
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string>,
  ) {
    const data = await this.api.getTransactions(user.id, query)
    return { success: true, data }
  }

  @Get('transactions/:transactionId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getTransaction(
    @CurrentUser() user: { id: string },
    @Param('transactionId') transactionId: string,
  ) {
    const data = await this.api.getTransaction(user.id, transactionId)
    return { success: true, data }
  }

  @Get('checkout-sessions/:id/transactions')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getCheckoutSessionTransactions(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Query() query: Record<string, string>,
  ) {
    const data = await this.api.getCheckoutSessionTransactions(user.id, id, query)
    return { success: true, data }
  }

  @Post('checkout-sessions/transactions/:transactionId/refund')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async refundTransaction(
    @CurrentUser() user: { id: string },
    @Param('transactionId') transactionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const data = await this.api.refundTransaction(user.id, transactionId, body)
    return { success: true, data }
  }
}
