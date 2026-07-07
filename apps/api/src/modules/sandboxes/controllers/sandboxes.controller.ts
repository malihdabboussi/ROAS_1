import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { SandboxIdleManagerService } from '../services/sandbox-idle-manager.service'
import { SandboxService } from '../services/sandbox.service'

@Controller('sandboxes')
export class SandboxesController {
  constructor(
    private readonly sandboxService: SandboxService,
    private readonly idleManager: SandboxIdleManagerService,
  ) {}

  @Post(':projectId/ensure-running')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
  async ensureRunning(
    @Param('projectId') projectId: string,
    @Body() body: { resetNextCache?: boolean } | undefined,
    @Supabase() supabase: SupabaseClient,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.sandboxService.ensureRunning(supabase, projectId, body ?? {})
  }

  @Post(':projectId/terminate')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
  async terminate(
    @Param('projectId') projectId: string,
    @Supabase() supabase: SupabaseClient,
    @OrgContext() _scope: RequestScope,
  ) {
    await this.sandboxService.terminate(supabase, projectId)
    return { status: 'terminated' }
  }

  @Get(':projectId/status')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getStatus(
    @Param('projectId') projectId: string,
    @Supabase() supabase: SupabaseClient,
    @OrgContext() _scope: RequestScope,
  ) {
    const status = await this.sandboxService.getStatus(supabase, projectId)
    return { projectId, status }
  }

  @Post('idle-check')
  async idleCheckPost(@Headers('authorization') authHeader: string) {
    return this.runIdleCheck(authHeader)
  }

  @Get('idle-check')
  async idleCheckGet(@Headers('authorization') authHeader: string) {
    return this.runIdleCheck(authHeader)
  }

  private async runIdleCheck(authHeader: string) {
    const expected = process.env.CRON_SECRET
    if (!expected || authHeader !== `Bearer ${expected}`) {
      throw new UnauthorizedException('Invalid cron secret')
    }
    return this.idleManager.checkIdleSandboxes()
  }
}
