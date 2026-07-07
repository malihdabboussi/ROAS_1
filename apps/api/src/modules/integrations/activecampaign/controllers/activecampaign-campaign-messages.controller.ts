import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { ActiveCampaignApiService } from '../services/activecampaign-api.service'

@Controller('integrations/active-campaign')
export class ActiveCampaignCampaignMessagesController {
  constructor(private readonly api: ActiveCampaignApiService) {}

  @Get('campaigns')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listCampaigns(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listCampaigns(user.id, query) }
  }

  @Get('campaigns/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getCampaign(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getCampaign(user.id, id) }
  }

  @Post('campaigns')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createCampaign(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createCampaign(user.id, body) }
  }

  @Put('campaigns/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateCampaign(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateCampaign(user.id, id, body) }
  }

  @Get('campaigns/:id/links')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getCampaignLinks(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getCampaignLinks(user.id, id) }
  }

  @Get('messages')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listMessages(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listMessages(user.id, query) }
  }

  @Get('messages/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getMessage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getMessage(user.id, id) }
  }

  @Post('messages')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createMessage(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createMessage(user.id, body) }
  }

  @Put('messages/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateMessage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateMessage(user.id, id, body) }
  }

  @Delete('messages/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteMessage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deleteMessage(user.id, id) }
  }

  @Get('fields')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listCustomFields(
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string>,
  ) {
    return { success: true, data: await this.api.listCustomFields(user.id, query) }
  }

  @Get('fields/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getCustomField(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getCustomField(user.id, id) }
  }

  @Post('fields')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createCustomField(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.createCustomField(user.id, body) }
  }

  @Put('fields/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateCustomField(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateCustomField(user.id, id, body) }
  }
}
