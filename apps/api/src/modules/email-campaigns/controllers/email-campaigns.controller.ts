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
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { EmailSendSchema, PendingSendApproveSchema } from '../dto/email-campaigns.dto'
import { EmailOrchestratorService } from '../services/email-orchestrator.service'

@Controller('email-campaigns')
export class EmailCampaignsController {
  constructor(private readonly orchestrator: EmailOrchestratorService) {}

  @Post('send')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async send(
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    const validation = EmailSendSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.orchestrator.send(user.id, validation.data, scope.orgId)
    return { ...result, success: true }
  }

  @Get('providers')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getProviders(@CurrentUser() user: { id: string }, @OrgContext() scope: RequestScope) {
    const providers = await this.orchestrator.getConnectedEmailProviders(user.id, scope.orgId)
    return { success: true, providers }
  }

  @Get('provider-audiences')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getProviderAudiences(
    @CurrentUser() user: { id: string },
    @Query('provider') provider: string,
    @OrgContext() scope: RequestScope,
  ) {
    if (!provider) {
      throw new HttpException(
        { success: false, error: 'provider query param is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const audiences = await this.orchestrator.getProviderAudiences(user.id, provider, scope.orgId)
    return { ...audiences, success: true }
  }

  @Post('approve')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async approvePendingSend(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
  ) {
    const validation = PendingSendApproveSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException({ success: false, error: 'Invalid request' }, HttpStatus.BAD_REQUEST)
    }
    const result = await this.orchestrator.approvePendingSend(
      validation.data.pending_send_id,
      user.id,
      scope.orgId,
    )
    return { ...result, success: true }
  }

  @Post('cancel')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async cancelPendingSend(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
  ) {
    const validation = PendingSendApproveSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException({ success: false, error: 'Invalid request' }, HttpStatus.BAD_REQUEST)
    }
    const result = await this.orchestrator.cancelPendingSend(
      validation.data.pending_send_id,
      user.id,
      scope.orgId,
    )
    return { ...result, success: true }
  }

  @Get('provider-senders')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getProviderSenders(
    @CurrentUser() user: { id: string },
    @Query('provider') provider: string,
    @OrgContext() scope: RequestScope,
  ) {
    if (!provider) {
      throw new HttpException(
        { success: false, error: 'provider query param is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.orchestrator.getProviderSenders(user.id, provider, scope.orgId)
    return {
      success: true,
      senders: result.senders,
      provider_settings_url: result.provider_settings_url,
    }
  }

  @Get('capabilities')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getCapabilities(@OrgContext() _scope: RequestScope) {
    const caps = await this.orchestrator.getProviderCapabilities()
    return { success: true, capabilities: caps }
  }
}
