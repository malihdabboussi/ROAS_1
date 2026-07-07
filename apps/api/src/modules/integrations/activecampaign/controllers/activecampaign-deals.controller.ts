import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { ActiveCampaignApiService } from '../services/activecampaign-api.service'

@Controller('integrations/active-campaign')
export class ActiveCampaignDealsController {
  constructor(private readonly api: ActiveCampaignApiService) {}

  @Get('deals')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listDeals(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listDeals(user.id, query) }
  }

  @Get('deal-activities')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listDealActivities(
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string>,
  ) {
    return { success: true, data: await this.api.listDealActivities(user.id, query) }
  }

  @Get('deals/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getDeal(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getDeal(user.id, id) }
  }

  @Post('deals')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createDeal(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createDeal(user.id, body) }
  }

  @Put('deals/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateDeal(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateDeal(user.id, id, body) }
  }

  @Delete('deals/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteDeal(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deleteDeal(user.id, id) }
  }

  @Post('deal-notes')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createDealNote(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createDealNote(user.id, body) }
  }

  @Put('deal-notes/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateDealNote(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateDealNote(user.id, id, body) }
  }

  @Delete('deal-notes/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteDealNote(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deleteDealNote(user.id, id) }
  }

  @Get('pipelines')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listPipelines(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listPipelines(user.id, query) }
  }

  @Get('pipelines/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getPipeline(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getPipeline(user.id, id) }
  }

  @Post('pipelines')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createPipeline(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createPipeline(user.id, body) }
  }

  @Delete('pipelines/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deletePipeline(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deletePipeline(user.id, id) }
  }

  @Get('stages')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listStages(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listStages(user.id, query) }
  }

  @Get('stages/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getStage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getStage(user.id, id) }
  }

  @Post('stages')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createStage(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createStage(user.id, body) }
  }

  @Put('stages/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateStage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateStage(user.id, id, body) }
  }

  @Delete('stages/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteStage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deleteStage(user.id, id) }
  }
}
