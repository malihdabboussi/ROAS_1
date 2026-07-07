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
import type { AgentOverrideMode } from '../types'

interface ReplaceOverridesBody {
  overrides: Array<{ kind: string; id: string; mode: AgentOverrideMode }>
}

interface SetTeamBody {
  team_id: string | null
}

@Controller('agent-teams')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AgentTeamPoliciesController {
  constructor(private readonly service: AgentTeamsService) {}

  @Get('agents/:agentKey/policy')
  async getAgentPolicy(@OrgContext() scope: RequestScope, @Param('agentKey') agentKey: string) {
    const { asJson } = await this.service.getAgentPolicy(scope, agentKey)
    return asJson
  }

  @Patch('agents/:agentKey/team')
  @RequireOrgRole('admin')
  async setAgentTeam(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('agentKey') agentKey: string,
    @Body() body: SetTeamBody,
  ) {
    return this.service.setAgentTeam(supabase, scope, agentKey, body?.team_id ?? null)
  }

  @Get('agents/:agentKey/overrides')
  async listAgentOverrides(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('agentKey') agentKey: string,
  ) {
    return this.service.listAgentOverrides(supabase, scope, agentKey)
  }

  @Put('agents/:agentKey/overrides')
  async replaceAgentOverrides(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('agentKey') agentKey: string,
    @Body() body: ReplaceOverridesBody,
  ) {
    return this.service.replaceAgentOverrides(supabase, scope, agentKey, body?.overrides ?? [])
  }

  /**
   * Toggle a single skill on/off for an agent. Writes one `agent_overrides`
   * row with `capability_kind='skill'` and `mode='deny'` (or removes it).
   *
   * Body: `{ enabled: boolean }`. Default = enabled (no row).
   */
  @Post('agents/:agentKey/skill-overrides/:skillKey')
  async setSkillOverride(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('agentKey') agentKey: string,
    @Param('skillKey') skillKey: string,
    @Body() body: { enabled?: boolean },
  ) {
    if (typeof body?.enabled !== 'boolean') {
      throw new BadRequestException('body.enabled (boolean) required')
    }
    return this.service.setSkillOverride(supabase, scope, agentKey, skillKey, body.enabled)
  }

  /** Convenience: DELETE removes a skill deny override (re-enables the skill). */
  @Delete('agents/:agentKey/skill-overrides/:skillKey')
  async clearSkillOverride(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('agentKey') agentKey: string,
    @Param('skillKey') skillKey: string,
  ) {
    return this.service.setSkillOverride(supabase, scope, agentKey, skillKey, true)
  }
}
