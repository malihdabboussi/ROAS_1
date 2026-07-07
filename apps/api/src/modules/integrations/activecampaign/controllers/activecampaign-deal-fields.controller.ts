import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { ActiveCampaignApiService } from '../services/activecampaign-api.service'

@Controller('integrations/active-campaign')
export class ActiveCampaignDealFieldsController {
  constructor(private readonly api: ActiveCampaignApiService) {}

  @Get('deal-custom-fields')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listDealCustomFields(
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string>,
  ) {
    return { success: true, data: await this.api.listDealCustomFields(user.id, query) }
  }

  @Get('deal-custom-fields/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getDealCustomField(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.getDealCustomField(user.id, id) }
  }

  @Post('deal-custom-fields')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createDealCustomField(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.createDealCustomField(user.id, body) }
  }

  @Put('deal-custom-fields/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateDealCustomField(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { success: true, data: await this.api.updateDealCustomField(user.id, id, body) }
  }

  @Delete('deal-custom-fields/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteDealCustomField(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return { success: true, data: await this.api.deleteDealCustomField(user.id, id) }
  }
}
