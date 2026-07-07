import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
  type RequestScope,
} from '@vibey/api-shared'
import { WorkflowsService } from '../services/workflows.service'

@Controller()
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get('campaigns/:campaignId/workflow')
  async getWorkflow(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.workflowsService.getWorkflowGraph(supabase, user.id, campaignId)
  }

  @Post('campaigns/:campaignId/workflow/edges')
  async createEdge(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @Body()
    body: {
      from_type: 'funnel' | 'sequence' | 'presentation'
      from_id: string
      to_type: 'funnel' | 'sequence' | 'presentation'
      to_id: string
      edge_type:
        | 'funnel_conversion_to_sequence'
        | 'sequence_complete_to_sequence'
        | 'funnel_to_presentation'
      config?: Record<string, unknown>
    },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.workflowsService.createEdge(supabase, user.id, campaignId, body)
  }

  @Patch('campaigns/:campaignId/workflow/edges/:edgeId')
  async updateEdge(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @Param('edgeId') edgeId: string,
    @Body()
    body: {
      config?: Record<string, unknown>
      status?: 'draft' | 'valid' | 'invalid' | 'active' | 'paused'
    },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.workflowsService.updateEdge(supabase, user.id, campaignId, edgeId, body)
  }

  @Delete('campaigns/:campaignId/workflow/edges/:edgeId')
  async deleteEdge(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @Param('edgeId') edgeId: string,
    @OrgContext() _scope: RequestScope,
    @Query('delete_mode') deleteMode?: 'keep_unsent' | 'remove_unsent',
  ) {
    if (deleteMode !== 'keep_unsent' && deleteMode !== 'remove_unsent') {
      throw new BadRequestException('delete_mode must be keep_unsent or remove_unsent')
    }
    return this.workflowsService.deleteEdge(supabase, user.id, campaignId, edgeId, deleteMode)
  }

  @Patch('campaigns/:campaignId/workflow/layout')
  async saveLayout(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('campaignId') campaignId: string,
    @Body() body: { workflow_id: string; layout: unknown },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.workflowsService.saveLayout(
      supabase,
      user.id,
      campaignId,
      body.workflow_id,
      body.layout,
    )
  }
}
