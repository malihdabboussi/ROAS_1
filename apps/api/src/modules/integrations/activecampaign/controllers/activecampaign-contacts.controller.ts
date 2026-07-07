import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { ActiveCampaignApiService } from '../services/activecampaign-api.service'

@Controller('integrations/active-campaign')
export class ActiveCampaignContactsController {
  constructor(private readonly api: ActiveCampaignApiService) {}

  @Get('contacts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listContacts(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listContacts(user.id, query) }
  }

  @Get('contacts/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getContact(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getContact(user.id, id) }
  }

  @Post('contacts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createContact(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createContact(user.id, body) }
  }

  @Put('contacts/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateContact(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateContact(user.id, id, body) }
  }

  @Delete('contacts/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteContact(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deleteContact(user.id, id) }
  }

  @Post('contacts/sync')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async syncContact(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.syncContact(user.id, body) }
  }

  @Get('contacts/:id/field-values')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getContactFieldValues(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getContactFieldValues(user.id, id) }
  }

  @Get('contacts/:id/automations')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getContactAutomations(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getContactAutomations(user.id, id) }
  }

  @Get('contacts/:id/deals')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getContactDeals(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getContactDeals(user.id, id) }
  }

  @Get('contacts/:id/score')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getContactScore(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getContactScore(user.id, id) }
  }

  @Post('contact-tags')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async addContactTag(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.addContactTag(user.id, body) }
  }

  @Delete('contact-tags/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async removeContactTag(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.removeContactTag(user.id, id) }
  }

  @Post('contact-lists')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateListStatus(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateListStatus(user.id, body) }
  }
}
