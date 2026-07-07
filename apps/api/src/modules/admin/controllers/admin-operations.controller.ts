import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, RoleGuard, Roles } from '@vibey/api-shared'
import { AdminService } from '../services/admin.service'
import { InstructionGovernanceService } from '../services/instruction-governance.service'

@Controller('admin')
@UseGuards(AuthGuard, RoleGuard)
@Roles('admin')
export class AdminOperationsController {
  constructor(
    private readonly adminService: AdminService,
    private readonly instructionGovernanceService: InstructionGovernanceService,
  ) {}

  @Get('finances')
  async getFinances(
    @Query('days') days?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('scope') scope?: string,
  ) {
    return this.adminService.getFinances({ days, from, to, scope })
  }

  @Get('operations')
  async getOperations() {
    return this.adminService.getOperations()
  }

  @Get('errors')
  async getErrors(@Query('user_name') userName?: string) {
    return this.adminService.getErrors({ userName })
  }

  @Get('traces')
  async getAgentTraces(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('user_id') userId?: string,
    @Query('channel') channel?: string,
    @Query('user_name') userName?: string,
  ) {
    return this.adminService.getAgentTraces({ status, limit, userId, channel, userName })
  }

  @Get('traces/:id')
  async getAgentTraceById(@Param('id') id: string) {
    return this.adminService.getAgentTraceById(id)
  }

  @Get('request-traces/:requestId')
  async getRequestTraceByRequestId(@Param('requestId') requestId: string) {
    return this.adminService.getRequestTraceByRequestId(requestId)
  }

  @Patch('errors/:id/resolve')
  async resolveError(@Param('id') id: string) {
    return this.adminService.resolveError(id)
  }

  @Get('mission-reliability')
  async getMissionReliability() {
    return this.adminService.getMissionReliability()
  }

  @Get('instruction-governance')
  async getInstructionGovernance(
    @Query('agent_key') agentKey?: string,
    @Query('user_id') userId?: string,
    @Query('org_id') orgId?: string,
  ) {
    return this.instructionGovernanceService.audit({
      ...(agentKey ? { agent_key: agentKey } : {}),
      ...(userId ? { user_id: userId } : {}),
      ...(orgId ? { org_id: orgId } : {}),
    })
  }

  @Post('instruction-governance/repair')
  async repairInstructionGovernance(
    @Body() body?: { agent_key?: string; user_id?: string; org_id?: string },
  ) {
    return this.instructionGovernanceService.repair(body ?? {})
  }
}
