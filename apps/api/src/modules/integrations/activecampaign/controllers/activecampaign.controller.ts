import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard } from '@vibey/api-shared'
import { ConnectActiveCampaignSchema } from '../dto/activecampaign.dto'
import { ActiveCampaignApiService } from '../services/activecampaign-api.service'

@Controller('integrations/active-campaign')
export class ActiveCampaignController {
  constructor(private readonly api: ActiveCampaignApiService) {}

  // ── Auth ──

  @Get('status')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async status(@CurrentUser() user: { id: string }) {
    const result = await this.api.getStatus(user.id)
    return { success: true, ...result }
  }

  @Post('connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async connect(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const validation = ConnectActiveCampaignSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.api.connect(user.id, validation.data.apiUrl, validation.data.apiKey)
    return { success: true, ...result }
  }

  @Post('disconnect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async disconnect(@CurrentUser() user: { id: string }) {
    await this.api.disconnect(user.id)
    return { success: true }
  }

  /**
   * Paginated ActiveCampaign contacts for Studio “import” picker (safe for large accounts).
   */
  @Get('crm-import-contacts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async crmImportContacts(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    const st = await this.api.getStatus(user.id)
    if (!st.connected) {
      throw new NotFoundException('ActiveCampaign is not connected')
    }
    const page = await this.api.listContactsForStudio(user.id, { limit, offset, search })
    return { success: true, ...page }
  }

}
