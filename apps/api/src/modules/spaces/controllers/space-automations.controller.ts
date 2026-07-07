import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
  RoleGuard,
  Roles,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  AutomationIdParamSchema,
  CreateDraftAutomationSchema,
  SpaceIdParamSchema,
  type AutomationIdParam,
  type CreateAutomationDto,
  type SpaceIdParam,
} from '../dto'
import { SpaceAutomationsRepository } from '../repositories/space-automations.repository'
import { SpaceAutomationControllerPolicyService } from '../services/space-automation-controller-policy.service'
import { SpaceAutomationService } from '../services/space-automation.service'
import { SpacePermissionsService } from '../services/space-permissions.service'
import { SpacesRepository } from '../repositories/spaces.repository'

@Controller('spaces/:id/automations')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, RoleGuard)
export class SpaceAutomationsController {
  constructor(
    private readonly repo: SpacesRepository,
    private readonly automationsRepo: SpaceAutomationsRepository,
    private readonly automationService: SpaceAutomationService,
    private readonly permissionsService: SpacePermissionsService,
    private readonly controllerPolicy: SpaceAutomationControllerPolicyService,
  ) {}

  @Get('flows')
  @Roles('admin')
  async listFlows(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
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
    return this.automationsRepo.listBySpace(supabase, params.id)
  }

  @Get('flows/:automationId')
  @Roles('admin')
  async getFlow(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(AutomationIdParamSchema)) aParams: AutomationIdParam,
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
    const flow = await this.automationsRepo.findById(supabase, params.id, aParams.automationId)
    if (!flow) throw new BadRequestException('Flow not found')
    return flow
  }

  @Post('flows/drafts')
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createFlowDraft(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Body() body: Record<string, unknown>,
    @OrgContext() scope: RequestScope,
  ) {
    await this.permissionsService.assertCanAccessSpace(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      'edit',
      scope.orgId,
    )
    const draftBody = CreateDraftAutomationSchema.parse({
      ...body,
      is_draft: true,
      enabled: false,
    }) as CreateAutomationDto
    this.controllerPolicy.assertCanUseFathomSource(draftBody, scope.orgRole)
    const space = await this.repo.findSpaceByIdForAccess(supabase, params.id)
    if (!space) throw new BadRequestException('Space not found')
    const newAutomation = (await this.automationsRepo.create(
      supabase,
      space as { id: string; user_id: string; org_id?: string | null },
      user.id,
      draftBody,
    )) as Record<string, unknown>
    await this.automationService.syncExternalTriggerForAutomation(
      supabase,
      user.id,
      scope.orgId ?? null,
      params.id,
      newAutomation,
    )
    await this.controllerPolicy.syncScheduleColumns(supabase, params.id, newAutomation)
    return newAutomation
  }
}
