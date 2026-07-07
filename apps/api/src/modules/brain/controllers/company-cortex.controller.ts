import { BadRequestException, Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  type RequestScope,
} from '@vibey/api-shared'
import { BrainAuthGuard } from '../guards/brain-auth.guard'
import { CompanyCortexService } from '../services/company-cortex.service'

@Controller('brain')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class CompanyCortexController {
  constructor(private readonly companyCortex: CompanyCortexService) {}

  @Get('company/status')
  @RequireOrgRole('editor')
  async getCompanyCortexStatus(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    if (!scope.orgId) throw new BadRequestException('Company Cortex requires an organization')
    const brain = await this.companyCortex.getOrCreateCompanyCortex({
      ownerId: user.id,
      orgId: scope.orgId,
    })
    const settings = await this.companyCortex.getOrCreateCompanyCortexSettings({
      ownerId: user.id,
      orgId: scope.orgId,
    })
    return {
      success: true,
      brain_id: brain.id,
      enabled: settings.enabled,
      settings,
    }
  }

  @Patch('company/settings')
  @RequireOrgRole('admin')
  async updateCompanyCortexSettings(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body()
    body: {
      enabled?: boolean
      schedule?: string
      localTime?: string
      timezone?: string
      lookbackHours?: number
      minActivityThreshold?: number
    },
  ) {
    if (!scope.orgId) throw new BadRequestException('Company Cortex requires an organization')
    const settings = await this.companyCortex.updateCompanyCortexSettings({
      ownerId: user.id,
      orgId: scope.orgId,
      enabled: body.enabled,
      schedule: body.schedule,
      localTime: body.localTime,
      timezone: body.timezone,
      lookbackHours: body.lookbackHours,
      minActivityThreshold: body.minActivityThreshold,
    })
    return {
      success: true,
      brain_id: settings.brain_id,
      enabled: settings.enabled,
      settings,
    }
  }

  @Get('company/objects')
  @RequireOrgRole('editor')
  async getCompanyCortexObjects(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    if (!scope.orgId) throw new BadRequestException('Company Cortex requires an organization')
    const objects = await this.companyCortex.listCompanyCortexObjects({
      ownerId: user.id,
      orgId: scope.orgId,
    })
    return { success: true, objects }
  }

  @Get('company/signals')
  @RequireOrgRole('editor')
  async getCompanyCortexSignals(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    if (!scope.orgId) throw new BadRequestException('Company Cortex requires an organization')
    const signals = await this.companyCortex.listCompanyCortexSignals({
      ownerId: user.id,
      orgId: scope.orgId,
      status: 'proposed',
    })
    return { success: true, signals }
  }

  @Patch('company/signals/:signalId')
  @RequireOrgRole('admin')
  async updateCompanyCortexSignal(
    @Param('signalId') signalId: string,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: { decision?: string; status?: string; note?: string },
  ) {
    if (!scope.orgId) throw new BadRequestException('Company Cortex requires an organization')
    const signal = await this.companyCortex.reviewCompanyCortexSignal({
      ownerId: user.id,
      orgId: scope.orgId,
      signalId,
      decision: body.decision,
      status: body.status,
      note: body.note,
    })
    return { success: true, signal }
  }
}
