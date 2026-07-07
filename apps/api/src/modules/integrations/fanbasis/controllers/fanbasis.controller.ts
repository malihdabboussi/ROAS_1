import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { FanbasisApiService } from '../services/fanbasis-api.service'

@Controller('integrations/fanbasis')
export class FanbasisController {
  constructor(private readonly api: FanbasisApiService) {}

  @Get('status')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async status(@CurrentUser() user: { id: string }) {
    const result = await this.api.getStatus(user.id)
    return { success: true, ...result }
  }

  @Post('connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async connect(@CurrentUser() user: { id: string }, @Body() body: { apiKey?: string }) {
    const apiKey = body?.apiKey?.trim()
    if (!apiKey) {
      throw new HttpException(
        { success: false, error: 'API key is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.api.connect(user.id, apiKey)
    return { success: true, ...result }
  }

  @Post('disconnect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async disconnect(@CurrentUser() user: { id: string }) {
    await this.api.disconnect(user.id)
    return { success: true }
  }

  // ── Products ──
  @Get('products')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listProducts(@CurrentUser() user: { id: string }, @Query() query: Record<string, string>) {
    const data = await this.api.listProducts(user.id, query)
    return { success: true, data }
  }
}
