import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { AgentTeamsService } from '../services/agent-teams.service'

interface UpsertTeamMemberBody {
  user_id: string
}

@Controller('agent-teams')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AgentTeamMembersController {
  constructor(private readonly service: AgentTeamsService) {}

  @Get('memberships/me')
  async listMine(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.listMyTeamMemberships(supabase, scope)
  }

  @Get(':teamId/members')
  @RequireOrgRole('viewer')
  async listMembers(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('teamId') teamId: string,
  ) {
    return this.service.listTeamMembers(supabase, scope, teamId)
  }

  @Put(':teamId/members')
  @RequireOrgRole('admin')
  async addMember(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('teamId') teamId: string,
    @Body() body: UpsertTeamMemberBody,
  ) {
    return this.service.addTeamMember(supabase, scope, teamId, body.user_id)
  }

  @Delete(':teamId/members/:userId')
  @RequireOrgRole('admin')
  async removeMember(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.removeTeamMember(supabase, scope, teamId, userId)
  }
}
