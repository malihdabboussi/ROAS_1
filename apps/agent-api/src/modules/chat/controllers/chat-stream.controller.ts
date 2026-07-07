import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
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
import { SyncReadyInterceptor } from '../../agent-sync/interceptors/sync-ready.interceptor'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import {
  ChatStreamHttpService,
  type ChatMessageBody,
  type ChatStopBody,
} from '../services/chat-stream-http.service'

@Controller('chat')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, CreditsGuard)
@UseInterceptors(SyncReadyInterceptor)
export class ChatStreamController {
  constructor(private readonly chatStreamHttp: ChatStreamHttpService) {}

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async sendMessage(
    @Body() body: ChatMessageBody,
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Req() req: Request & { token?: string },
    @Res() res: Response,
  ) {
    await this.chatStreamHttp.sendMessage(body, user, supabase, scope, req, res)
  }

  @Post('stop')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async stopStream(
    @Body() body: ChatStopBody,
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Res() res: Response,
  ) {
    await this.chatStreamHttp.stopStream(body, user, supabase, scope, res)
  }
}
