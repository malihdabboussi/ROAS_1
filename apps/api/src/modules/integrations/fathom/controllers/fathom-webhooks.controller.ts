import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Request, Response } from 'express'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import { InternalAuthGuard } from '../../../funnels/guards/internal-auth.guard'
import { CreateFathomWebhookSchema } from '../dto/fathom.dto'
import { FathomApiService } from '../services/fathom-api.service'
import { FathomOAuthService } from '../services/fathom-oauth.service'
import { FathomWebhookService } from '../services/fathom-webhook.service'

@Controller('integrations/fathom')
export class FathomWebhooksController {
  private readonly logger = new Logger(FathomWebhooksController.name)

  constructor(
    private readonly api: FathomApiService,
    private readonly oauth: FathomOAuthService,
    private readonly webhookService: FathomWebhookService,
  ) {}

  @Post('webhooks')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createWebhook(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const validation = CreateFathomWebhookSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const webhook = await this.api.createWebhook(supabase, user.id, validation.data)
    return { success: true, webhook }
  }

  @Get('webhooks')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listWebhooks(@Supabase() supabase: SupabaseClient, @CurrentUser() user: { id: string }) {
    const webhooks = await this.api.listWebhooks(supabase, user.id)
    return { success: true, webhooks }
  }

  @Delete('webhooks/:webhookId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteWebhook(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('webhookId') webhookId: string,
  ) {
    await this.api.deleteWebhook(supabase, user.id, webhookId)
    return { success: true }
  }

  /**
   * One-off migration: move every connected account's Fathom webhook from this
   * legacy door to the shared meeting door. Called by
   * `scripts/roas/reregister-fathom-webhooks.sh`.
   */
  @Post('internal/reregister-webhooks')
  @UseGuards(InternalAuthGuard)
  async reregisterWebhooks() {
    const result = await this.oauth.reregisterAllWebhooks()
    return { success: true, ...result }
  }

  /** Legacy door. Deleted once re-registration has run in production. */
  @Post('webhook')
  async receiveWebhook(@Req() req: Request, @Res() res: Response) {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    const signature = (req.headers['x-fathom-signature'] ||
      req.headers['x-webhook-signature'] ||
      '') as string

    try {
      await this.webhookService.processWebhookAsync(rawBody, signature)
      res.status(200).json({ status: 'processed' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Legacy Fathom webhook processing failed: ${msg}`)
      res.status(200).json({ status: 'accepted' })
    }
  }
}
