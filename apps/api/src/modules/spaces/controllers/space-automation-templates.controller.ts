import { BadRequestException, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
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
import { CONNECTED_APP_FLOW_TRIGGERS } from '../data/connected-app-flow-triggers'
import {
  CreateAutomationSchema,
  SpaceIdParamSchema,
  TemplateKeyParamSchema,
  type SpaceIdParam,
  type TemplateKeyParam,
} from '../dto'
import { SpaceAutomationTemplatesRepository } from '../repositories/space-automation-templates.repository'
import { SpaceAutomationsRepository } from '../repositories/space-automations.repository'
import { SpacesRepository } from '../repositories/spaces.repository'
import { SpaceAutomationControllerPolicyService } from '../services/space-automation-controller-policy.service'
import { SpaceAutomationService } from '../services/space-automation.service'
import { SpacePermissionsService } from '../services/space-permissions.service'

@Controller('spaces/:id/automations')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, RoleGuard)
export class SpaceAutomationTemplatesController {
  constructor(
    private readonly repo: SpacesRepository,
    private readonly automationsRepo: SpaceAutomationsRepository,
    private readonly templatesRepo: SpaceAutomationTemplatesRepository,
    private readonly automationService: SpaceAutomationService,
    private readonly permissionsService: SpacePermissionsService,
    private readonly controllerPolicy: SpaceAutomationControllerPolicyService,
  ) {}

  @Get('connected-app-triggers')
  async listConnectedAppTriggers(
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
    return CONNECTED_APP_FLOW_TRIGGERS
  }

  @Get('templates')
  async listTemplates(
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
    return this.templatesRepo.listActive(supabase)
  }

  @Post('templates/:templateKey/install')
  @HttpCode(HttpStatus.CREATED)
  async installTemplate(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(TemplateKeyParamSchema)) tParams: TemplateKeyParam,
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

    const template = await this.templatesRepo.findActiveByKey(supabase, tParams.templateKey)
    if (!template) throw new BadRequestException('Template not found')

    const body = CreateAutomationSchema.parse(template.body)
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
    await this.templatesRepo.incrementInstallCount(supabase, tParams.templateKey)
    return newAutomation
  }
}
