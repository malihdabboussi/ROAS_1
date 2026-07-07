import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { ActiveCampaignApiService } from '../services/activecampaign-api.service'

@Controller('integrations/active-campaign')
export class ActiveCampaignOperationsController {
  constructor(private readonly api: ActiveCampaignApiService) {}

  @Get('webhooks')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listWebhooks(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listWebhooks(user.id, query) }
  }

  @Get('webhooks/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getWebhook(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getWebhook(user.id, id) }
  }

  @Post('webhooks')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createWebhook(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createWebhook(user.id, body) }
  }

  @Put('webhooks/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateWebhook(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateWebhook(user.id, id, body) }
  }

  @Delete('webhooks/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteWebhook(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deleteWebhook(user.id, id) }
  }

  @Get('tasks')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listTasks(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listTasks(user.id, query) }
  }

  @Get('tasks/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getTask(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getTask(user.id, id) }
  }

  @Post('tasks')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createTask(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createTask(user.id, body) }
  }

  @Put('tasks/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateTask(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateTask(user.id, id, body) }
  }

  @Get('users')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listUsers(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listUsers(user.id, query) }
  }

  @Get('users/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getUser(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getUser(user.id, id) }
  }

  @Get('forms')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listForms(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listForms(user.id, query) }
  }

  @Get('forms/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getForm(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getForm(user.id, id) }
  }

  @Get('segments')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listSegments(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listSegments(user.id, query) }
  }

  @Get('segments/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getSegment(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getSegment(user.id, id) }
  }

  @Get('scores')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listScores(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listScores(user.id, query) }
  }

  @Get('scores/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getScore(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getScore(user.id, id) }
  }
}
