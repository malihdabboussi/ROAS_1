import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
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
import { MissionsAgentOperationsService } from '../../missions/services/missions-agent-operations.service'

@Controller('agents')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AgentWorkflowsController {
  constructor(private readonly agentOperations: MissionsAgentOperationsService) {}

  @Get(':agentKey/workflows')
  async listAgentWorkflows(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.listAgentWorkflows(supabase, user.id, agentKey, scope.orgId)
  }

  @Post(':agentKey/workflows')
  async createAgentWorkflow(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Body()
    body: {
      workflow_key: string
      name: string
      description: string
      markdown_content: string
      steps: unknown[]
      is_enabled?: boolean
    },
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.createAgentWorkflow(supabase, user.id, agentKey, body, scope.orgId)
  }

  @Patch(':agentKey/workflows/:workflowId')
  async updateAgentWorkflow(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Param('workflowId') workflowId: string,
    @Body()
    body: Partial<{
      workflow_key: string
      name: string
      description: string
      markdown_content: string
      steps: unknown[]
      is_enabled: boolean
    }>,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.updateAgentWorkflow(
      supabase,
      user.id,
      agentKey,
      workflowId,
      body,
      scope.orgId,
    )
  }

  @Delete(':agentKey/workflows/:workflowId')
  async deleteAgentWorkflow(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Param('workflowId') workflowId: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.deleteAgentWorkflow(
      supabase,
      user.id,
      agentKey,
      workflowId,
      scope.orgId,
    )
  }
}
