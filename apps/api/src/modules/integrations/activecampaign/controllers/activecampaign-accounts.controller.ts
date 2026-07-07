import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { ActiveCampaignApiService } from '../services/activecampaign-api.service'

@Controller('integrations/active-campaign')
export class ActiveCampaignAccountsController {
  constructor(private readonly api: ActiveCampaignApiService) {}

  @Get('accounts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listAccounts(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listAccounts(user.id, query) }
  }

  @Get('accounts/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getAccount(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getAccount(user.id, id) }
  }

  @Post('accounts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createAccount(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createAccount(user.id, body) }
  }

  @Put('accounts/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateAccount(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateAccount(user.id, id, body) }
  }

  @Delete('accounts/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteAccount(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deleteAccount(user.id, id) }
  }

  @Post('account-notes')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createAccountNote(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.createAccountNote(user.id, body) }
  }

  @Get('automations')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listAutomations(
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string>,
  ) {
    return { success: true, data: await this.api.listAutomations(user.id, query) }
  }

  @Post('contact-automations')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async addContactToAutomation(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.addContactToAutomation(user.id, body) }
  }

  @Delete('contact-automations/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async removeContactFromAutomation(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.removeContactFromAutomation(user.id, id) }
  }
}
