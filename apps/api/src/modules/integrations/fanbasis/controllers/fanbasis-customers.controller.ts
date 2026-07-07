import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { FanbasisApiService } from '../services/fanbasis-api.service'

@Controller('integrations/fanbasis')
export class FanbasisCustomersController {
  constructor(private readonly api: FanbasisApiService) {}

  @Get('customers')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getCustomers(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    const data = await this.api.getCustomers(user.id, query)
    return { success: true, data }
  }

  @Post('customers/:customerId/charge')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async chargeCustomer(
    @CurrentUser() user: { id: string },
    @Param('customerId') customerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const data = await this.api.chargeCustomer(user.id, customerId, body)
    return { success: true, data }
  }

  @Get('customers/:customerId/payment-methods')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getCustomerPaymentMethods(
    @CurrentUser() user: { id: string },
    @Param('customerId') customerId: string,
  ) {
    const data = await this.api.getCustomerPaymentMethods(user.id, customerId)
    return { success: true, data }
  }

  @Get('subscribers')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getSubscribers(
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string>,
  ) {
    const data = await this.api.getSubscribers(user.id, query)
    return { success: true, data }
  }
}
