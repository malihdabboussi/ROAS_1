import { Body, Controller, Logger, Post, Res, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Response } from 'express'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { DelegateToAgentSchema, type DelegateToAgentDto } from '../dto'
import { CanvasDelegationService } from '../services/canvas-delegation.service'

@Controller('canvas')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class CanvasDelegationController {
  private readonly logger = new Logger(CanvasDelegationController.name)

  constructor(private readonly canvasDelegationService: CanvasDelegationService) {}

  @Post('delegate-to-agent')
  @UseGuards(CreditsGuard)
  @RequireOrgRole('editor')
  @Throttle({ default: { ttl: 60000, limit: 8 } })
  async delegateToAgent(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    this.logger.log(`POST /canvas/delegate-to-agent - user: ${user.id}`)

    const parsed = DelegateToAgentSchema.safeParse(body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.issues,
      })
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    try {
      await this.canvasDelegationService.delegateToAgentStream(
        supabase,
        user.id,
        parsed.data as DelegateToAgentDto,
        async (type: string, data: Record<string, unknown>) => {
          res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
        },
        scope.orgId,
      )
      res.write('data: [DONE]\n\n')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      this.logger.error(`Canvas delegate stream error: ${message}`)
      res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`)
      res.write('data: [DONE]\n\n')
    } finally {
      res.end()
    }
  }
}
