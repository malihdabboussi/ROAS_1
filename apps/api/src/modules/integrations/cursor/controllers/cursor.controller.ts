import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Request, Response } from 'express'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { IntegrationsCoreService } from '../../services/integrations-core.service'
import { ConnectCursorSchema, DisconnectCursorSchema } from '../dto/cursor.dto'
import { CursorApiService } from '../services/cursor-api.service'
import { CursorWebhookService } from '../services/cursor-webhook.service'

@Controller('integrations/cursor')
export class CursorController {
  constructor(
    private readonly api: CursorApiService,
    private readonly webhook: CursorWebhookService,
    private readonly integrationsCore: IntegrationsCoreService,
  ) {}

  @Get('connections')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listConnections(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    const connections = await this.api.listConnections(supabase, user.id, scope.orgId ?? null)
    return { success: true, connections }
  }

  @Post('connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async connect(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
  ) {
    const validation = ConnectCursorSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }

    const scopeMode = this.integrationsCore.resolveScopeMode(scope, validation.data.connectionScope)
    if (scopeMode === 'org_shared' && scope.orgRole !== 'admin' && scope.orgRole !== 'owner') {
      throw new HttpException(
        { success: false, error: 'Only org admin/owner can share a connection with the org.' },
        HttpStatus.FORBIDDEN,
      )
    }

    await this.api.validateAndConnect(validation.data.apiKey)

    const now = new Date().toISOString()
    const row = {
      integration_id: 'cursor',
      provider: 'cursor',
      status: 'connected',
      access_token: validation.data.apiKey,
      refresh_token: null,
      token_expires_at: null,
      connected_at: now,
      error_message: null,
      metadata: {
        webhook_secret: validation.data.webhookSecret ?? '',
      },
      connection_label: `Cursor (${validation.data.apiKey.slice(0, 8)}…)`,
    }

    if (scopeMode === 'org_shared') {
      const result = await this.integrationsCore.insertOrgSharedIntegration(supabase, scope, row)
      if (result.error) throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST)
      return { success: true, connection_id: result.id }
    }

    const result = await this.integrationsCore.upsertPersonalScopedIntegration(supabase, scope, row)
    if (result.error) throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST)
    return { success: true, connection_id: result.id }
  }

  @Post('disconnect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async disconnect(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
  ) {
    const validation = DisconnectCursorSchema.safeParse(body ?? {})
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }

    await this.api.disconnectConnection(supabase, user.id, validation.data.connectionId)
    return { success: true }
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async cursorWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('x-webhook-signature') signature?: string,
    @Headers('x-webhook-id') webhookId?: string,
  ) {
    const rawBody = req.rawBody
    if (!rawBody) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: 'Missing raw body' })
    }

    const result = await this.webhook.handleEvent({
      rawBody,
      signature,
      webhookId,
    })

    if (result.success) {
      return res.status(result.status).json({ success: true })
    }
    return res.status(result.status).json({ success: false, error: result.error })
  }
}
