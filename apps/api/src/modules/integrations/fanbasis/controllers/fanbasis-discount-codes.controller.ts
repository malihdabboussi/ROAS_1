import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { FanbasisApiService } from '../services/fanbasis-api.service'

@Controller('integrations/fanbasis')
export class FanbasisDiscountCodesController {
  constructor(private readonly api: FanbasisApiService) {}

  @Get('discount-codes')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listDiscountCodes(
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string>,
  ) {
    const data = await this.api.listDiscountCodes(user.id, query)
    return { success: true, data }
  }

  @Post('discount-codes')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createDiscountCode(
    @CurrentUser() user: { id: string },
    @Body() body: Record<string, unknown>,
  ) {
    const data = await this.api.createDiscountCode(user.id, body)
    return { success: true, data }
  }

  @Get('discount-codes/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getDiscountCode(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const data = await this.api.getDiscountCode(user.id, id)
    return { success: true, data }
  }

  @Put('discount-codes/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateDiscountCode(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const data = await this.api.updateDiscountCode(user.id, id, body)
    return { success: true, data }
  }

  @Delete('discount-codes/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteDiscountCode(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const data = await this.api.deleteDiscountCode(user.id, id)
    return { success: true, data }
  }
}
