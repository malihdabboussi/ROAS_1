import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { CreatePageGraderAgencyLaunchSchema } from '../dto/page-grader.dto'
import { PageGraderAgencyWorkspaceService } from '../services/page-grader-agency-workspace.service'
import { invalidPageGraderAgencyRequest } from './page-grader-agency.validation'

@Controller('integrations/page-grader/agency')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class PageGraderAgencyWorkController {
  constructor(private readonly workspace: PageGraderAgencyWorkspaceService) {}

  @Get('clients/:clientId/tasks/:taskId')
  @RequireOrgRole('viewer')
  async getTaskDetail(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('clientId') clientId: string,
    @Param('taskId') taskId: string,
    @Query('space_item_id') spaceItemId?: string,
  ) {
    return {
      success: true,
      detail: await this.workspace.getTaskDetail(
        supabase,
        user.id,
        scope,
        clientId,
        taskId,
        spaceItemId,
      ),
    }
  }

  @Post('clients/:clientId/tasks/:taskId/comments')
  @RequireOrgRole('editor')
  async createTaskComment(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('clientId') clientId: string,
    @Param('taskId') taskId: string,
    @Body() body: unknown,
  ) {
    const input =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {}
    const comment = typeof input.body === 'string' ? input.body.trim() : ''
    const authorName = typeof input.author_name === 'string' ? input.author_name.trim() : ''
    if (!comment || comment.length > 20_000 || !authorName || authorName.length > 200) {
      invalidPageGraderAgencyRequest('body and author_name are required')
    }
    return {
      success: true,
      result: await this.workspace.createTaskComment(supabase, user.id, scope, clientId, taskId, {
        body: comment,
        authorName,
        spaceItemId: typeof input.space_item_id === 'string' ? input.space_item_id : undefined,
      }),
    }
  }

  @Get('clients/:clientId/campaigns/:campaignId/overview')
  @RequireOrgRole('viewer')
  async getCampaignOverview(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('clientId') clientId: string,
    @Param('campaignId') campaignId: string,
  ) {
    return {
      success: true,
      overview: await this.workspace.getCampaignOverview(
        supabase,
        user.id,
        scope,
        clientId,
        campaignId,
      ),
    }
  }

  @Post('launches')
  @RequireOrgRole('editor')
  async createLaunch(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const validation = CreatePageGraderAgencyLaunchSchema.safeParse(body)
    if (!validation.success) invalidPageGraderAgencyRequest(validation.error.flatten())
    return {
      success: true,
      result: await this.workspace.createLaunch(user.id, validation.data),
    }
  }

  @Delete('clients/:clientId/campaigns/:campaignId')
  @RequireOrgRole('editor')
  async deleteCampaign(
    @CurrentUser() user: { id: string },
    @Param('clientId') clientId: string,
    @Param('campaignId') campaignId: string,
  ) {
    return {
      success: true,
      result: await this.workspace.deleteCampaign(user.id, clientId, campaignId),
    }
  }
}
