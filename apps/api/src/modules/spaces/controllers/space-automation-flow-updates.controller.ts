import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
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
import {
  AutomationIdParamSchema,
  SpaceIdParamSchema,
  UpdateAutomationSchema,
  type AutomationIdParam,
  type SpaceIdParam,
  type UpdateAutomationDto,
} from '../dto'
import { SpaceAutomationsRepository } from '../repositories/space-automations.repository'
import { SpaceAutomationControllerPolicyService } from '../services/space-automation-controller-policy.service'
import { SpaceAutomationService } from '../services/space-automation.service'
import { SpacePermissionsService } from '../services/space-permissions.service'
import { SpaceWebhooksService } from '../services/space-webhooks.service'

const FlowValidationSchema = z
  .object({
    automation_id: z.string().uuid().optional(),
    flow: z.record(z.string(), z.unknown()).optional(),
    name: z.string().optional(),
    trigger: z.record(z.string(), z.unknown()).optional(),
    actions: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough()

@Controller('spaces/:id/automations')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, RoleGuard)
export class SpaceAutomationFlowUpdatesController {
  constructor(
    private readonly automationsRepo: SpaceAutomationsRepository,
    private readonly automationService: SpaceAutomationService,
    private readonly permissionsService: SpacePermissionsService,
    private readonly controllerPolicy: SpaceAutomationControllerPolicyService,
    private readonly webhooksService: SpaceWebhooksService,
  ) {}

  @Patch('flows/:automationId')
  @Roles('admin')
  async updateFlowDraft(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(AutomationIdParamSchema)) aParams: AutomationIdParam,
    @Body() body: Record<string, unknown>,
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
    if (!existing) throw new BadRequestException('Flow not found')
    this.controllerPolicy.assertCanMutateAutomation(existing, user.id, effectiveLevel)
    const draftBody = UpdateAutomationSchema.parse({
      ...body,
      is_draft: true,
      enabled: false,
    }) as UpdateAutomationDto
    const merged = { ...existing, ...draftBody } as Record<string, unknown>
    this.controllerPolicy.assertCanUseFathomSource(merged as { trigger?: never }, scope.orgRole)
    const updated = (await this.automationsRepo.update(
      supabase,
      params.id,
      aParams.automationId,
      draftBody,
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

  @Post('flows/validate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async validateFlowDraft(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Body(new ZodValidationPipe(FlowValidationSchema)) body: z.infer<typeof FlowValidationSchema>,
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
    const candidate = body.automation_id
      ? ((await this.automationsRepo.findById(supabase, params.id, body.automation_id)) as Record<
          string,
          unknown
        > | null)
      : ((body.flow ?? body) as Record<string, unknown>)
    if (!candidate) throw new BadRequestException('Flow not found')
    return this.controllerPolicy.validateFlowCandidate(candidate)
  }

  @Post('flows/:automationId/publish')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async publishFlow(
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
    const existing = (await this.automationsRepo.findById(
      supabase,
      params.id,
      aParams.automationId,
    )) as Record<string, unknown> | null
    if (!existing) throw new BadRequestException('Flow not found')
    this.controllerPolicy.assertCanMutateAutomation(existing, user.id, effectiveLevel)
    this.controllerPolicy.assertCanUseFathomSource(existing as { trigger?: never }, scope.orgRole)
    await this.webhooksService.assertEndpointUsableForTrigger(supabase, params.id, existing.trigger)
    const validation = this.controllerPolicy.validateFlowCandidate(existing)
    if (!validation.valid) throw new BadRequestException(validation.errors.join('; '))
    const updated = (await this.automationsRepo.update(
      supabase,
      params.id,
      aParams.automationId,
      { is_draft: false, enabled: true },
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
    return { flow: updated, validation }
  }
}
