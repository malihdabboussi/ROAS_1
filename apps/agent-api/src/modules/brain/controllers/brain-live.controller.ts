import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { Request } from 'express'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { SyncReadyInterceptor } from '../../agent-sync/interceptors/sync-ready.interceptor'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { BrainLiveService, type LiveSessionScope } from '../services/brain-live.service'

@Controller('brain')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
@UseInterceptors(SyncReadyInterceptor)
export class BrainLiveController {
  private readonly logger = new Logger(BrainLiveController.name)

  constructor(
    private readonly brainLiveService: BrainLiveService,
    private readonly config: ConfigService,
  ) {}

  @Post('live-session')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  createLiveSession(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() reqScope: RequestScope,
    @Body()
    body: {
      scope?: LiveSessionScope
      conversationId?: string
      voiceName?: string
      reconnect?: boolean
    },
    @Headers('authorization') authHeader: string | undefined,
    @Req() req: Request,
  ) {
    this.logger.log(
      `POST /brain/live-session - User: ${user.id} scope=${body.scope?.type ?? 'user'} conv=${body.conversationId ?? 'none'} reconnect=${!!body.reconnect}`,
    )
    const accessToken = authHeader?.replace(/^Bearer\s+/i, '') ?? ''
    const session = this.brainLiveService.createSession(
      user.id,
      reqScope.orgId ?? null,
      body.scope,
      body.conversationId,
      body.voiceName,
      accessToken,
    )

    const machineUrl = this.resolveMachineWsUrl(req)

    let delegations: ReturnType<typeof this.brainLiveService.listActiveDelegationsForSession> = []
    if (body.reconnect && body.conversationId && body.scope?.agentId) {
      delegations = this.brainLiveService.listActiveDelegationsForSession(
        user.id,
        reqScope.orgId ?? null,
        body.conversationId,
        body.scope.agentId,
      )
    }

    return { sessionId: session.id, wsUrl: machineUrl, delegations }
  }

  private resolveMachineWsUrl(req: Request): string | null {
    const flyMachineUrl = this.config.get<string>('FLY_MACHINE_URL')
    if (flyMachineUrl) {
      const base = flyMachineUrl.replace(/^https?:\/\//, '')
      return `wss://${base}`
    }

    const host = req.headers['host']
    if (host && !host.includes('localhost')) {
      return `wss://${host}`
    }

    return null
  }
}
