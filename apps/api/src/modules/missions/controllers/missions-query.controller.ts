import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { MissionIdParamSchema, type MissionIdParam } from '../dto'
import { MissionDeliverablesGoogleExportService } from '../services/mission-deliverables-google-export.service'
import { MissionsAccessApprovalService } from '../services/missions-access-approval.service'
import { MissionsExecutionService } from '../services/missions-execution.service'
import { MissionsQueryService } from '../services/missions-query.service'

@Controller('missions')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MissionsQueryController {
  constructor(
    private readonly missionsQueryService: MissionsQueryService,
    private readonly missionsExecutionService: MissionsExecutionService,
    private readonly missionsAccessApprovalService: MissionsAccessApprovalService,
    private readonly missionDeliverablesGoogleExportService: MissionDeliverablesGoogleExportService,
  ) {}

  @Patch('bulk')
  async bulkUpdate(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: { updates: Array<{ id: string; status?: string; sort_order?: number }> },
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsExecutionService.bulkUpdate(supabase, user.id, body.updates, scope.orgId)
  }

  @Get('deliverables/batch')
  async getDeliverablesBatch(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Query('mission_ids') missionIdsRaw: string,
    @OrgContext() scope: RequestScope,
  ) {
    const ids = (missionIdsRaw || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (ids.length === 0) return []
    if (ids.length > 100) ids.length = 100
    return this.missionsQueryService.getDeliverablesForMissions(supabase, user.id, ids, scope.orgId)
  }

  @Patch('deliverables/:deliverableId')
  async updateDeliverable(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('deliverableId') deliverableId: string,
    @Body()
    body: {
      title?: string
      content?: string | null
      metadata?: Record<string, unknown>
    },
  ) {
    const hasTitle = typeof body?.title === 'string'
    const hasContent = body?.content !== undefined
    const hasMetadata = body?.metadata !== undefined && body.metadata !== null
    if (!hasTitle && !hasContent && !hasMetadata) {
      throw new BadRequestException('At least one of title, content, or metadata is required')
    }
    return this.missionsQueryService.updateDeliverable(supabase, user.id, deliverableId, {
      title: hasTitle && body.title !== undefined ? body.title.trim() : undefined,
      content: hasContent ? (body.content ?? null) : undefined,
      metadata: hasMetadata ? body.metadata : undefined,
    })
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsQueryService.getById(
      supabase,
      user.id,
      params.id,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Get(':id/plan')
  async getPlan(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsQueryService.getPlan(supabase, user.id, params.id, scope.orgId)
  }

  @Get(':id/deliverables')
  async getDeliverables(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsQueryService.getDeliverables(supabase, user.id, params.id, scope.orgId)
  }

  @Post(':id/deliverables/export-google-doc')
  async exportDeliverablesGoogleDoc(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    const result = await this.missionDeliverablesGoogleExportService.exportSpaceDocsToGoogleDoc(
      supabase,
      user.id,
      params.id,
      scope.orgId,
    )
    return { success: true, file: result.file, tabCount: result.tabCount }
  }

  @Get(':id/logs')
  async getLogs(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsQueryService.getLogs(
      supabase,
      user.id,
      params.id,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Get(':id/access-requests')
  async listAccessRequests(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsAccessApprovalService.list(supabase, user.id, params.id, scope.orgId)
  }
}
