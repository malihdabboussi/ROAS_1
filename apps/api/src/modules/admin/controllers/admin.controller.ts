import { Controller, Get, Logger, Param, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, RoleGuard, Roles } from '@vibey/api-shared'
import { MachinePoolService } from '../../machines/services/machine-pool.service'
import { AdminAccountDetailService } from '../services/admin-account-detail.service'
import { AdminService } from '../services/admin.service'

@Controller('admin')
@UseGuards(AuthGuard, RoleGuard)
@Roles('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name)

  constructor(
    private readonly adminService: AdminService,
    private readonly adminAccountDetailService: AdminAccountDetailService,
    private readonly machinePoolService: MachinePoolService,
  ) {}

  @Get('check')
  check() {
    return { ok: true }
  }

  @Get('machine-pool-status')
  async getMachinePoolStatus() {
    return this.machinePoolService.getStatus()
  }

  @Post('machine-pool/replenish')
  async replenishMachinePool() {
    return this.machinePoolService.replenishPool()
  }

  @Get('dashboard')
  async getDashboard(@Query('scope') scope?: string) {
    try {
      return await this.adminService.getDashboard(scope)
    } catch (err: any) {
      this.logger.error(`getDashboard failed: ${err?.message ?? err}`, err?.stack)
      throw err
    }
  }

  @Get('users')
  async getUsers() {
    return this.adminService.getUsers()
  }

  @Get('users/:id/dashboard')
  async getUserDashboard(
    @Param('id') id: string,
    @Query('days') days?: string,
    @Query('rangeOnly') rangeOnly?: string,
  ) {
    return this.adminAccountDetailService.getUserDashboard(
      id,
      days,
      rangeOnly === '1' || rangeOnly === 'true',
    )
  }

  @Get('orgs')
  async getOrgs() {
    return this.adminService.getOrgs()
  }

  @Get('orgs/:id/dashboard')
  async getOrgDashboard(
    @Param('id') id: string,
    @Query('days') days?: string,
    @Query('rangeOnly') rangeOnly?: string,
  ) {
    return this.adminAccountDetailService.getOrgDashboard(
      id,
      days,
      rangeOnly === '1' || rangeOnly === 'true',
    )
  }
}
