import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RoleGuard,
  Roles,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { SpaceIdParamSchema, type SpaceIdParam } from '../dto'
import { SpaceFlowCapabilityService } from '../services/space-flow-capability.service'
import { SpacePermissionsService } from '../services/space-permissions.service'

const FlowCapabilitySearchSchema = z
  .object({
    query: z.string().optional(),
    kind: z.enum(['trigger', 'action']).optional(),
    category: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional(),
    cursor: z.string().optional(),
  })
  .strict()

const FlowCapabilityIdParamSchema = z.object({
  capabilityId: z.string().min(1).max(240),
})

@Controller('spaces/:id/automations')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, RoleGuard)
export class SpaceAutomationCapabilitiesController {
  constructor(
    private readonly permissionsService: SpacePermissionsService,
    private readonly flowCapabilityService: SpaceFlowCapabilityService,
  ) {}

  @Post('capabilities/search')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async searchFlowCapabilities(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Body(new ZodValidationPipe(FlowCapabilitySearchSchema))
    body: z.infer<typeof FlowCapabilitySearchSchema>,
    @OrgContext() scope: RequestScope,
  ) {
    await this.permissionsService.assertCanAccessSpace(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      'view',
      scope.orgId,
    )
    return this.flowCapabilityService.search(body)
  }

  @Get('capabilities/:capabilityId')
  @Roles('admin')
  async getFlowCapability(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(FlowCapabilityIdParamSchema))
    cParams: z.infer<typeof FlowCapabilityIdParamSchema>,
    @OrgContext() scope: RequestScope,
  ) {
    await this.permissionsService.assertCanAccessSpace(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      'view',
      scope.orgId,
    )
    const capability = this.flowCapabilityService.get(cParams.capabilityId)
    if (!capability) throw new BadRequestException('Capability not found')
    return capability
  }
}
