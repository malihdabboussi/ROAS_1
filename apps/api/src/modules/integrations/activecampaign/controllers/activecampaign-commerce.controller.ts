import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { ActiveCampaignApiService } from '../services/activecampaign-api.service'

@Controller('integrations/active-campaign')
export class ActiveCampaignCommerceController {
  constructor(private readonly api: ActiveCampaignApiService) {}

  @Get('saved-responses')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listSavedResponses(
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string>,
  ) {
    return { success: true, data: await this.api.listSavedResponses(user.id, query) }
  }

  @Get('saved-responses/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getSavedResponse(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getSavedResponse(user.id, id) }
  }

  @Post('saved-responses')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createSavedResponse(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.createSavedResponse(user.id, body) }
  }

  @Put('saved-responses/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateSavedResponse(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateSavedResponse(user.id, id, body) }
  }

  @Delete('saved-responses/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteSavedResponse(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deleteSavedResponse(user.id, id) }
  }

  @Post('tracking/events')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async trackEvent(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.trackEvent(user.id, body) }
  }

  @Get('ecom-orders')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listOrders(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listOrders(user.id, query) }
  }

  @Get('ecom-orders/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getOrder(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getOrder(user.id, id) }
  }

  @Post('ecom-orders')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createOrder(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createOrder(user.id, body) }
  }

  @Put('ecom-orders/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateOrder(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateOrder(user.id, id, body) }
  }

  @Delete('ecom-orders/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteOrder(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deleteOrder(user.id, id) }
  }

  @Get('ecom-customers')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listEcomCustomers(
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string>,
  ) {
    return { success: true, data: await this.api.listEcomCustomers(user.id, query) }
  }

  @Get('addresses')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listAddresses(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listAddresses(user.id, query) }
  }

  @Post('addresses')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createAddress(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createAddress(user.id, body) }
  }

  @Delete('addresses/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteAddress(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deleteAddress(user.id, id) }
  }
}
