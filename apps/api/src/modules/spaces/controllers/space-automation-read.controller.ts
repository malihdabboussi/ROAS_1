import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RoleGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  AutomationIdParamSchema,
  SpaceIdParamSchema,
  TestAutomationSchema,
  type AutomationIdParam,
  type SpaceIdParam,
  type TestAutomationDto,
} from '../dto'
import { SpaceAutomationReadService } from '../services/space-automation-read.service'
import { SpaceAutomationService } from '../services/space-automation.service'

@Controller('spaces/:id/automations')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, RoleGuard)
export class SpaceAutomationReadController {
  constructor(
    private readonly automationService: SpaceAutomationService,
    private readonly automationReadService: SpaceAutomationReadService,
  ) {}

  @Get('fathom-sources')
  async listFathomSources(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.automationReadService.listFathomSources(user, supabase, params.id, scope)
  }

  @Get('runs')
  async listRuns(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
  ) {
    return this.automationReadService.listRuns(supabase, params.id)
  }

  @Post(':automationId/test')
  @HttpCode(HttpStatus.OK)
  async test(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(AutomationIdParamSchema)) aParams: AutomationIdParam,
    @Body(new ZodValidationPipe(TestAutomationSchema)) body: TestAutomationDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.automationService.dryRun(aParams.automationId, {
      supabase,
      userId: user.id,
      orgId: scope.orgId,
      spaceId: params.id,
      itemId: body.item_id,
      depth: 0,
    })
  }
}
