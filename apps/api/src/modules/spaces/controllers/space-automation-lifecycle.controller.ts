import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  AutomationIdParamSchema,
  CreateAutomationSchema,
  SpaceIdParamSchema,
  UpdateAutomationSchema,
  type AutomationIdParam,
  type CreateAutomationDto,
  type SpaceIdParam,
  type UpdateAutomationDto,
} from '../dto'
import { SpaceAutomationsRepository } from '../repositories/space-automations.repository'
import { SpacesRepository } from '../repositories/spaces.repository'
import { assertAutomationValidWhenEnabled } from '../services/space-automation-publishable'
import { SpaceAutomationControllerPolicyService } from '../services/space-automation-controller-policy.service'
import { SpaceAutomationService } from '../services/space-automation.service'
import { SpacePermissionsService } from '../services/space-permissions.service'

@Controller('spaces/:id/automations')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, RoleGuard)
export class SpaceAutomationLifecycleController {
  constructor(
    private readonly repo: SpacesRepository,
    private readonly automationsRepo: SpaceAutomationsRepository,
    private readonly automationService: SpaceAutomationService,
    private readonly permissionsService: SpacePermissionsService,
    private readonly controllerPolicy: SpaceAutomationControllerPolicyService,
  ) {}

  @Get()
  async list(
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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Body(new ZodValidationPipe(CreateAutomationSchema)) body: CreateAutomationDto,
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
    this.controllerPolicy.assertCanUseFathomSource(body, scope.orgRole)

    const space = await this.repo.findSpaceByIdForAccess(supabase, params.id)
    if (!space) throw new BadRequestException('Space not found')
    const newAutomation = (await this.automationsRepo.create(
      supabase,
      space as { id: string; user_id: string; org_id?: string | null },
      user.id,
      body,
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

  @Patch(':automationId')
  async update(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(AutomationIdParamSchema)) aParams: AutomationIdParam,
    @Body(new ZodValidationPipe(UpdateAutomationSchema)) body: UpdateAutomationDto,
    @OrgContext() scope: RequestScope,
  ) {
    const effectiveLevel = await this.permissionsService.assertCanAccessSpace(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      'edit',
      scope.orgId,
    )
    const existing = (await this.automationsRepo.findById(
      supabase,
      params.id,
      aParams.automationId,
    )) as Record<string, unknown> | null
    if (!existing) throw new BadRequestException('Automation not found')
    this.controllerPolicy.assertCanMutateAutomation(existing, user.id, effectiveLevel)

    const merged = { ...existing, ...body } as Record<string, unknown>
    this.controllerPolicy.assertCanUseFathomSource(merged as { trigger?: never }, scope.orgRole)
    if (merged.enabled === true) {
      assertAutomationValidWhenEnabled(merged)
    }

    const updated = (await this.automationsRepo.update(
      supabase,
      params.id,
      aParams.automationId,
      body,
      {
        expectedUpdatedAt:
          typeof existing.updated_at === 'string' ? existing.updated_at : undefined,
      },
    )) as Record<string, unknown>
    await this.automationService.syncExternalTriggerForAutomation(
      supabase,
      user.id,
      scope.orgId ?? null,
      params.id,
      updated,
    )
    await this.controllerPolicy.syncScheduleColumns(supabase, params.id, updated)
    return updated
  }

  @Delete(':automationId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(AutomationIdParamSchema)) aParams: AutomationIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    const effectiveLevel = await this.permissionsService.assertCanAccessSpace(
      supabase,
      user.id,
      scope.orgRole,
      params.id,
      'edit',
      scope.orgId,
    )
    const target = (await this.automationsRepo.findById(
      supabase,
      params.id,
      aParams.automationId,
    )) as Record<string, unknown> | null
    if (!target) throw new BadRequestException('Automation not found')
    this.controllerPolicy.assertCanMutateAutomation(target, user.id, effectiveLevel)
    await this.automationService.disableExternalTriggerForAutomation(
      supabase,
      params.id,
      aParams.automationId,
    )
    await this.automationsRepo.delete(supabase, params.id, aParams.automationId)
    return { deleted: true }
  }
}
