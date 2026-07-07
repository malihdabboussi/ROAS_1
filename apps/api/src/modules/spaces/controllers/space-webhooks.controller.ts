import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
  CreateSpaceWebhookEndpointSchema,
  SpaceIdParamSchema,
  SpaceWebhookEventsQuerySchema,
  UpdateSpaceWebhookEndpointSchema,
  WebhookEndpointIdParamSchema,
  type CreateSpaceWebhookEndpointDto,
  type SpaceIdParam,
  type SpaceWebhookEventsQuery,
  type UpdateSpaceWebhookEndpointDto,
  type WebhookEndpointIdParam,
} from '../dto'
import { SpacePermissionsService } from '../services/space-permissions.service'
import { SpaceWebhooksService } from '../services/space-webhooks.service'

@Controller('spaces/:id/automations/webhooks')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, RoleGuard)
export class SpaceWebhooksController {
  constructor(
    private readonly permissionsService: SpacePermissionsService,
    private readonly webhooksService: SpaceWebhooksService,
  ) {}

  @Get()
  @Roles('admin')
  async listWebhooks(
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
    return this.webhooksService.listEndpoints(supabase, params.id)
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createWebhook(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Body(new ZodValidationPipe(CreateSpaceWebhookEndpointSchema))
    body: CreateSpaceWebhookEndpointDto,
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
    return this.webhooksService.createEndpoint(
      supabase,
      user.id,
      scope.orgId ?? null,
      params.id,
      body,
    )
  }

  @Patch(':endpointId')
  @Roles('admin')
  async updateWebhook(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(WebhookEndpointIdParamSchema))
    endpointParams: WebhookEndpointIdParam,
    @Body(new ZodValidationPipe(UpdateSpaceWebhookEndpointSchema))
    body: UpdateSpaceWebhookEndpointDto,
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
    return this.webhooksService.updateEndpoint(supabase, params.id, endpointParams.endpointId, body)
  }

  @Delete(':endpointId')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async deleteWebhook(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(WebhookEndpointIdParamSchema))
    endpointParams: WebhookEndpointIdParam,
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
    return this.webhooksService.deleteEndpoint(supabase, params.id, endpointParams.endpointId)
  }

  @Post(':endpointId/rotate-secret')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async rotateSecret(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(WebhookEndpointIdParamSchema))
    endpointParams: WebhookEndpointIdParam,
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
    return this.webhooksService.rotateSecret(supabase, params.id, endpointParams.endpointId)
  }

  @Get(':endpointId/events')
  @Roles('admin')
  async listEvents(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(WebhookEndpointIdParamSchema))
    endpointParams: WebhookEndpointIdParam,
    @Query(new ZodValidationPipe(SpaceWebhookEventsQuerySchema))
    query: SpaceWebhookEventsQuery,
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
    return this.webhooksService.listEvents(
      supabase,
      params.id,
      endpointParams.endpointId,
      query.limit,
    )
  }
}
