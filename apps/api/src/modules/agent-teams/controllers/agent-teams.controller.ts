import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
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

interface CreateTeamBody {
  name: string
  color?: string
  icon?: string
  parent_team_id?: string | null
  team_kind?: 'internal' | 'external' | 'agent' | 'mixed'
}

interface UpdateTeamBody {
  name?: string
  color?: string
  icon?: string
  parent_team_id?: string | null
}

interface ReplaceGrantsBody {
  grants: Array<{ kind: string; id: string }>
}

function parseCampaignIds(raw?: string): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

@Controller('agent-teams')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AgentTeamsController {
  constructor(private readonly service: AgentTeamsService) {}

  @Get()
  async list(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    return this.service.listTeams(supabase, scope)
  }

  @Post()
  @RequireOrgRole('admin')
  async create(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Body() body: CreateTeamBody,
  ) {
    if (!body?.name || typeof body.name !== 'string') {
      throw new BadRequestException('name required')
    }
    return this.service.createTeam(supabase, scope, {
      name: body.name,
      color: body.color,
      icon: body.icon,
      parent_team_id: body.parent_team_id ?? null,
      team_kind: body.team_kind ?? 'agent',
    })
  }

  @Patch(':teamId')
  @RequireOrgRole('admin')
  async update(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('teamId') teamId: string,
    @Body() body: UpdateTeamBody,
  ) {
    return this.service.updateTeam(supabase, scope, teamId, body ?? {})
  }

  @Delete(':teamId')
  @RequireOrgRole('admin')
  async remove(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('teamId') teamId: string,
  ) {
    return this.service.deleteTeam(supabase, scope, teamId)
  }

  @Get(':teamId/grants')
  async listGrants(@Supabase() supabase: SupabaseClient, @Param('teamId') teamId: string) {
    return this.service.listTeamGrants(supabase, teamId)
  }

  @Get(':teamId/overview')
  async overview(
    @Supabase() supabase: SupabaseClient,
    @Param('teamId') teamId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.service.getTeamOverview(supabase, teamId, { start, end })
  }

  @Get(':teamId/spending')
  @RequireOrgRole('admin')
  async spending(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('teamId') teamId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('campaignIds') campaignIds?: string,
  ) {
    if (!scope.orgId) throw new BadRequestException('org context required')
    return this.service.getTeamSpending(supabase, scope.orgId, teamId, {
      startDate,
      endDate,
      campaignIds: parseCampaignIds(campaignIds),
    })
  }

  @Put(':teamId/grants')
  @RequireOrgRole('admin')
  async replaceGrants(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('teamId') teamId: string,
    @Body() body: ReplaceGrantsBody,
  ) {
    return this.service.replaceTeamGrants(supabase, scope, teamId, body?.grants ?? [])
  }
}
