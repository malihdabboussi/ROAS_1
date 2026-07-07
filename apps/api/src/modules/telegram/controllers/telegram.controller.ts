import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Response } from 'express'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  ConnectTelegramDtoSchema,
  ValidateTokenDtoSchema,
  type ConnectTelegramDto,
  type ValidateTokenDto,
} from '../dto/telegram.dto'
import { TelegramService } from '../services/telegram.service'
import type { TelegramUpdate } from '../types/telegram.types'

@Controller('telegram')
@UseGuards(AuthGuard, OrgContextGuard, ThrottlerGuard)
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('validate-token')
  async validateToken(@Body(new ZodValidationPipe(ValidateTokenDtoSchema)) body: ValidateTokenDto) {
    const botInfo = await this.telegramService.validateToken(body.bot_token)
    return {
      valid: true,
      bot_id: botInfo.id,
      bot_username: botInfo.username,
      bot_first_name: botInfo.first_name,
    }
  }

  @Post('connect')
  async connect(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body(new ZodValidationPipe(ConnectTelegramDtoSchema)) body: ConnectTelegramDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.telegramService.connectAgent(
      supabase,
      user.id,
      body.agent_key,
      body.bot_token,
      scope.orgId,
    )
  }

  @Delete('disconnect/:agentKey')
  async disconnect(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @OrgContext() scope: RequestScope,
  ) {
    await this.telegramService.disconnectAgent(supabase, user.id, agentKey, scope.orgId)
    return { ok: true }
  }

  @Get('channels')
  async listChannels(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.telegramService.listChannels(supabase, user.id, scope.orgId)
  }

  @Patch('channel/:agentKey/toggle')
  async toggleChannel(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Body() body: { is_active: boolean },
    @OrgContext() scope: RequestScope,
  ) {
    return this.telegramService.toggleChannel(
      supabase,
      user.id,
      agentKey,
      body.is_active,
      scope.orgId,
    )
  }

  @Patch('channel/:agentKey/visibility')
  async setVisibility(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Body() body: { is_public: boolean },
    @OrgContext() scope: RequestScope,
  ) {
    return this.telegramService.setVisibility(
      supabase,
      user.id,
      agentKey,
      body.is_public,
      scope.orgId,
    )
  }

  @Patch('channel/:agentKey/settings')
  async updateChannelSettings(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Body() body: { default_campaign_id?: string | null },
    @OrgContext() scope: RequestScope,
  ) {
    return this.telegramService.updateChannelSettings(
      supabase,
      user.id,
      agentKey,
      { default_campaign_id: body.default_campaign_id ?? null },
      scope.orgId,
    )
  }

  @Get('verify-status/:agentKey')
  async getVerificationStatus(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.telegramService.getVerificationStatus(supabase, user.id, agentKey, scope.orgId)
  }
}

@Controller('webhooks/telegram')
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name)

  constructor(private readonly telegramService: TelegramService) {}

  @Post(':agentKey')
  async handleWebhook(
    @Param('agentKey') agentKey: string,
    @Headers('x-telegram-bot-api-secret-token') secretToken: string | undefined,
    @Body() update: TelegramUpdate,
    @Res() res: Response,
  ) {
    res.status(200).json({ ok: true })

    this.telegramService.handleWebhook(agentKey, secretToken, update).catch((err) => {
      this.logger.error(`Telegram webhook failed for agent ${agentKey}: ${(err as Error).message}`)
    })
  }
}
