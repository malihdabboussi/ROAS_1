import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { ActiveCampaignApiService } from '../services/activecampaign-api.service'

@Controller('integrations/active-campaign')
export class ActiveCampaignContentController {
  constructor(private readonly api: ActiveCampaignApiService) {}

  @Get('notes')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listNotes(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listNotes(user.id, query) }
  }

  @Get('notes/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getNote(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getNote(user.id, id) }
  }

  @Post('notes')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createNote(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createNote(user.id, body) }
  }

  @Put('notes/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateNote(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateNote(user.id, id, body) }
  }

  @Delete('notes/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteNote(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deleteNote(user.id, id) }
  }

  @Get('tags')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listTags(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listTags(user.id, query) }
  }

  @Get('tags/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getTag(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getTag(user.id, id) }
  }

  @Post('tags')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createTag(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createTag(user.id, body) }
  }

  @Put('tags/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateTag(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateTag(user.id, id, body) }
  }

  @Delete('tags/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteTag(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deleteTag(user.id, id) }
  }

  @Get('lists')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listLists(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    return { success: true, data: await this.api.listLists(user.id, query) }
  }

  @Get('lists/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getList(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getList(user.id, id) }
  }

  @Post('lists')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createList(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.api.createList(user.id, body) }
  }

  @Put('lists/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateList(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateList(user.id, id, body) }
  }

  @Delete('lists/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteList(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deleteList(user.id, id) }
  }
}
