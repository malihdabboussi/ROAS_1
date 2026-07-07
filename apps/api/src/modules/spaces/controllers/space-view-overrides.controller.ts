import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
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
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  SpaceIdParamSchema,
  ViewIdParamSchema,
  ViewOverrideBodySchema,
  type SpaceIdParam,
  type ViewIdParam,
  type ViewOverrideBodyDto,
} from '../dto'
import { SpacesRepository } from '../repositories/spaces.repository'

const RESTRICTED_VIEW_IDS = new Set([
  'contacts',
  'campaign_overview',
  'social_reporting',
  'funnel_analytics',
  'email_analytics',
  'ads_performance',
  'finance_overview',
])

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 5,
  admin: 4,
  creator: 3,
  editor: 2,
  viewer: 1,
}

function hasEditorRole(scope: RequestScope): boolean {
  if (!scope.orgRole) return true
  return (ROLE_HIERARCHY[scope.orgRole] ?? 0) >= ROLE_HIERARCHY.editor
}

function assertRestrictedViewAccess(scope: RequestScope, viewId: string): void {
  if (!RESTRICTED_VIEW_IDS.has(viewId)) return
  if (hasEditorRole(scope)) return
  throw new ForbiddenException('Editor role required for contacts/reporting views')
}

@Controller('spaces')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpaceViewOverridesController {
  constructor(private readonly repo: SpacesRepository) {}

  @Get(':id/view-overrides')
  async list(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
  ) {
    return this.repo.findViewOverrides(supabase, params.id, user.id)
  }

  @Patch(':id/view-overrides/:viewId')
  async upsert(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(ViewIdParamSchema)) viewParams: ViewIdParam,
    @Body(new ZodValidationPipe(ViewOverrideBodySchema)) body: ViewOverrideBodyDto,
    @OrgContext() scope: RequestScope,
  ) {
    assertRestrictedViewAccess(scope, viewParams.viewId)
    return this.repo.upsertViewOverride(
      supabase,
      params.id,
      user.id,
      viewParams.viewId,
      body.overrides,
    )
  }

  @Delete(':id/view-overrides/:viewId')
  async remove(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(ViewIdParamSchema)) viewParams: ViewIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    assertRestrictedViewAccess(scope, viewParams.viewId)
    return this.repo.deleteViewOverride(supabase, params.id, user.id, viewParams.viewId)
  }

  @Post(':id/views/:viewId/save-for-everyone')
  async saveForEveryone(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(SpaceIdParamSchema)) params: SpaceIdParam,
    @Param(new ZodValidationPipe(ViewIdParamSchema)) viewParams: ViewIdParam,
    @Body(new ZodValidationPipe(ViewOverrideBodySchema)) body: ViewOverrideBodyDto,
    @OrgContext() scope: RequestScope,
  ) {
    if (!scope.orgId || !scope.orgRole) {
      throw new ForbiddenException('Only available in org context')
    }
    if ((ROLE_HIERARCHY[scope.orgRole] ?? 0) < ROLE_HIERARCHY.admin) {
      throw new ForbiddenException('Only admins and owners can save for everyone')
    }
    assertRestrictedViewAccess(scope, viewParams.viewId)

    const space = await this.repo.findSpaceById(supabase, user.id, params.id, scope.orgId)
    if (!space) throw new ForbiddenException('Space not found')

    const schema = (space as Record<string, unknown>).schema as {
      views?: Record<string, unknown>[]
    } | null
    if (!schema?.views) throw new ForbiddenException('Invalid space schema')

    const viewId = viewParams.viewId
    const resolvedView = body.overrides
    const nextViews = schema.views.map((v) =>
      (v as { id?: string }).id === viewId ? { ...v, ...resolvedView } : v,
    )
    const nextSchema = { ...schema, views: nextViews }

    await this.repo.updateSpace(supabase, user.id, params.id, { schema: nextSchema }, scope.orgId)
    await this.repo.deleteViewOverride(supabase, params.id, user.id, viewId)

    return { saved: true }
  }
}
