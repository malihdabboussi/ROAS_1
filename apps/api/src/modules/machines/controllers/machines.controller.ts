import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
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
import { IdleManagerService } from '../services/idle-manager.service'
import { MachinePoolService } from '../services/machine-pool.service'
import { MachineProvisionAccessService } from '../services/machine-provision-access.service'
import { MachineReconciliationService } from '../services/machine-reconciliation.service'
import type { AgentRuntimeRequirement } from '../services/machine-runtime-capabilities.service'
import { MachinesService } from '../services/machines.service'

type EnsureRunningBody = {
  required_runtime?: AgentRuntimeRequirement
}

@Controller('machines')
export class MachinesController {
  constructor(
    private readonly machinesService: MachinesService,
    private readonly idleManager: IdleManagerService,
    private readonly machinePool: MachinePoolService,
    private readonly machineReconciliation: MachineReconciliationService,
    private readonly provisionAccess: MachineProvisionAccessService,
  ) {}

  @Post('provision')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
  async provision(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Body() body: { invite_code?: string } | undefined,
  ) {
    const hasActiveSub = await this.provisionAccess.hasActiveSubscription(supabase, user.id)
    const hasRuntimeEligibleOrgAccess = hasActiveSub
      ? true
      : await this.provisionAccess.hasRuntimeEligibleOrgAccess(supabase, user.id, scope)

    if (!hasActiveSub && !hasRuntimeEligibleOrgAccess) {
      const inviteCode = typeof body?.invite_code === 'string' ? body.invite_code.trim() : ''
      if (!inviteCode) {
        throw new ForbiddenException(
          'Active subscription, non-viewer org role, or valid invite code required to provision a machine',
        )
      }
      await this.provisionAccess.redeemInviteCodeForFreeSubscription(user.id, inviteCode)
    }

    return this.machinesService.provision(supabase, user.id)
  }

  @Post('ensure-running')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
  async ensureRunning(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Body() body?: EnsureRunningBody,
  ) {
    const hasActiveSub = await this.provisionAccess.hasActiveSubscription(supabase, user.id)
    const hasRuntimeEligibleOrgAccess = hasActiveSub
      ? true
      : await this.provisionAccess.hasRuntimeEligibleOrgAccess(supabase, user.id, scope)
    if (!hasActiveSub && !hasRuntimeEligibleOrgAccess) {
      throw new ForbiddenException('A non-viewer org role or active subscription is required')
    }
    return this.machinesService.ensureRunning(supabase, user.id, {
      requiredRuntime: this.normalizeRequiredRuntime(body?.required_runtime),
    })
  }

  @Post('idle-check')
  async idleCheckPost(@Headers('authorization') authHeader: string) {
    return this.runIdleCheck(authHeader)
  }

  @Get('idle-check')
  async idleCheckGet(@Headers('authorization') authHeader: string) {
    return this.runIdleCheck(authHeader)
  }

  @Post('pool-replenish')
  async poolReplenishPost(@Headers('authorization') authHeader: string) {
    return this.runPoolReplenish(authHeader)
  }

  @Get('pool-replenish')
  async poolReplenishGet(@Headers('authorization') authHeader: string) {
    return this.runPoolReplenish(authHeader)
  }

  @Post('reconcile')
  async reconcilePost(@Headers('authorization') authHeader: string) {
    return this.runReconcile(authHeader)
  }

  @Get('reconcile')
  async reconcileGet(@Headers('authorization') authHeader: string) {
    return this.runReconcile(authHeader)
  }

  private async runIdleCheck(authHeader: string) {
    const expected = process.env.CRON_SECRET
    if (!expected || authHeader !== `Bearer ${expected}`) {
      throw new UnauthorizedException('Invalid cron secret')
    }
    return this.idleManager.checkIdleMachines()
  }

  private async runPoolReplenish(authHeader: string) {
    const expected = process.env.CRON_SECRET
    if (!expected || authHeader !== `Bearer ${expected}`) {
      throw new UnauthorizedException('Invalid cron secret')
    }
    return this.machinePool.replenishPool()
  }

  private async runReconcile(authHeader: string) {
    const expected = process.env.CRON_SECRET
    if (!expected || authHeader !== `Bearer ${expected}`) {
      throw new UnauthorizedException('Invalid cron secret')
    }
    return this.machineReconciliation.reconcileRuntimeState()
  }

  private normalizeRequiredRuntime(value: unknown): AgentRuntimeRequirement | undefined {
    return value === 'chat' || value === 'work' ? value : undefined
  }
}
