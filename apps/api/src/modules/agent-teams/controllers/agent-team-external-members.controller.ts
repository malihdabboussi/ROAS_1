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

@Controller('agent-teams')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AgentTeamExternalMembersController {
  constructor(private readonly service: AgentTeamsService) {}

  @Get(':teamId/external-members')
  @RequireOrgRole('viewer')
  list(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('teamId') teamId: string,
  ) {
    return this.service.listExternalTeamMembers(supabase, scope, teamId)
  }

  @Put(':teamId/external-members')
  @RequireOrgRole('admin')
  add(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('teamId') teamId: string,
    @Body() body: { person_id: string },
  ) {
    return this.service.addExternalTeamMember(supabase, scope, teamId, body.person_id)
  }

  @Delete(':teamId/external-members/:personId')
  @RequireOrgRole('admin')
  async remove(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('teamId') teamId: string,
    @Param('personId') personId: string,
  ) {
    await this.service.removeExternalTeamMember(supabase, scope, teamId, personId)
    return { deleted: true as const }
  }
}
