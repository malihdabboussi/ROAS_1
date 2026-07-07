import { Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, RoleGuard, Roles } from '@vibey/api-shared'
import { IdleManagerService } from '../../machines/services/idle-manager.service'
import { AdminService } from '../services/admin.service'
import { UnitEconomicsService } from '../services/unit-economics.service'

@Controller('admin')
@UseGuards(AuthGuard, RoleGuard)
@Roles('admin')
export class AdminInfrastructureController {
  constructor(
    private readonly adminService: AdminService,
    private readonly idleManagerService: IdleManagerService,
    private readonly unitEconomicsService: UnitEconomicsService,
  ) {}

  @Get('machines')
  async getMachineStats() {
    return this.idleManagerService.getMachineStats()
  }

  @Get('unit-economics')
  async getUnitEconomics() {
    return this.unitEconomicsService.getUnitEconomics()
  }

  @Get('billing-health')
  async getBillingHealth(@Query('days') days?: string) {
    return this.adminService.getBillingHealth(Number(days) || 7)
  }

  @Post('billing-health/:id/resolve')
  async resolveBillingHealthItem(@Param('id') id: string) {
    return this.adminService.resolveBillingHealthItem(id)
  }

  @Post('billing-health/reconcile')
  async reconcileBillingHealth(@Headers('authorization') auth?: string) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
      return { error: 'Unauthorized' }
    }
    return this.adminService.runBillingReconciliation()
  }

  @Post('purge-orphan-agent-brains')
  async purgeOrphanAgentBrains(@Query('dryRun') dryRun?: string, @Query('limit') limit?: string) {
    const dry = dryRun !== 'false'
    const parsedLimit = limit ? Number(limit) : undefined
    return this.adminService.purgeOrphanAgentBrains({
      dryRun: dry,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    })
  }
}
