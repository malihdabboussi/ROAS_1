import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Request } from 'express'
import { SyncReadyInterceptor } from '../../agent-sync/interceptors/sync-ready.interceptor'
import { CreditsService } from '../../billing/services/credits.service'
import {
  resolveBrainLiveMachineId,
  resolveBrainLiveMachineWsUrl,
} from '../../brain/brain-live-ws-url'
import { BrainLiveService, type LiveSessionScope } from '../../brain/services/brain-live.service'
import { PublicAgentGuard } from '../guards/public-agent.guard'
import { PublicAgentService } from '../services/public-agent.service'

@Controller('public-brain')
@UseGuards(PublicAgentGuard, ThrottlerGuard)
@UseInterceptors(SyncReadyInterceptor)
export class PublicBrainController {
  private readonly logger = new Logger(PublicBrainController.name)

  constructor(
    private readonly brainLiveService: BrainLiveService,
    private readonly publicAgentService: PublicAgentService,
    private readonly config: ConfigService,
    private readonly creditsService: CreditsService,
  ) {}

  @Post('live-session')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async createLiveSession(
    @Body() body: { scope?: LiveSessionScope; conversationId?: string; voiceName?: string },
    @Req()
    req: Request & {
      publicAgent?: { userId: string | null; orgId: string | null; agentKey: string }
    },
  ) {
    const { userId, orgId, agentKey } = req.publicAgent!
    const owner = await this.publicAgentService.resolveOwnerContext({ userId, orgId })
    await this.creditsService.assertHasAvailableCredits(owner.actingUserId, owner.orgId)

    this.logger.log(
      `Public brain live-session: user=${owner.actingUserId} agent=${agentKey} conv=${body.conversationId ?? 'none'}`,
    )

    const scope: LiveSessionScope = body.scope ?? {
      type: 'agent' as const,
      agentId: agentKey,
    }

    const machineId = resolveBrainLiveMachineId(req)
    const session = this.brainLiveService.createSession(
      owner.actingUserId,
      owner.orgId,
      scope,
      body.conversationId,
      body.voiceName,
      owner.accessToken,
      machineId,
    )

    const machineUrl = resolveBrainLiveMachineWsUrl(
      req,
      this.config.get<string>('FLY_MACHINE_URL'),
    )

    return {
      sessionId: session.id,
      wsUrl: machineUrl,
      machineId,
      userId: owner.actingUserId,
    }
  }
}
