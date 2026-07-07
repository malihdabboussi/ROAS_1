import {
  BadRequestException,
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
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
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
import { MissionsAgentOperationsService } from '../../missions/services/missions-agent-operations.service'
import { AgentsService } from '../services/agents.service'

@Controller('agents')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AgentsController {
  constructor(
    private readonly agentOperations: MissionsAgentOperationsService,
    private readonly agentsService: AgentsService,
  ) {}

  @Get()
  async listAgents(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.listAgents(supabase, user.id, scope.orgId)
  }

  @Get('slim')
  async listAgentsSlim(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.listAgentsSlim(supabase, user.id, scope.orgId)
  }

  @Get('onboarding-status')
  async checkOnboardingStatus(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.checkOrgOnboardingStatus(supabase, user.id, scope.orgId)
  }

  @Get('ready-library')
  async listReadyEmployeeLibrary(@Supabase() supabase: SupabaseClient) {
    return this.agentOperations.listReadyEmployeeLibrary(supabase)
  }

  @Post('hire-ready')
  @RequireOrgRole('creator')
  async hireReadyEmployee(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: { role_key: string; name?: string; team_id?: string | null },
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentsService.hireReadyEmployee(user, supabase, body, scope)
  }

  @Post('backfill-avatars')
  @HttpCode(HttpStatus.OK)
  async backfillAvatars(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.backfillMissingAvatars(supabase, user.id, scope.orgId)
  }

  @Post('backfill-brain-scholar')
  @HttpCode(HttpStatus.OK)
  async backfillBrainScholar(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.backfillBrainScholarEmployee(supabase, user.id, scope.orgId)
  }

  @Post('generate-avatar/onboarding')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async generateOnboardingAvatar(@CurrentUser() user: { id: string }) {
    const result = await this.agentOperations.generateOnboardingAvatar(user.id)
    if (!result) return { success: false, error: 'Image generation failed' }
    return { success: true, url: result.url }
  }

  @Post('onboard')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async onboardFirstAgent(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Body()
    body: {
      archetype: string
      name: string
      style?: string
      tone?: string
      avatar_mode?: 'animation' | 'portrait'
      avatar_url?: string
      auto_hire_widget_builder?: boolean
    },
  ) {
    return this.agentOperations.onboardFirstAgent(supabase, user.id, body, scope.orgId)
  }

  @Patch('reorder')
  async reorderAgents(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: { agent_keys: string[] },
    @OrgContext() scope: RequestScope,
  ) {
    await this.agentOperations.reorderAgents(supabase, user.id, body.agent_keys, scope.orgId)
    return { ok: true }
  }

  @Get('awareness-points')
  async listAwarenessPoints(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentsService.listAwarenessPoints(user, supabase, scope)
  }

  @Post('awareness-points/read-all')
  async markAwarenessPointsRead(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentsService.markAwarenessPointsRead(user, supabase, scope)
  }

  @Patch('awareness-points/:pointId/read')
  async markAwarenessPointRead(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('pointId') pointId: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentsService.markAwarenessPointRead(user, supabase, pointId, scope)
  }

  @Delete('awareness-points/:pointId')
  async deleteAwarenessPoint(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('pointId') pointId: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentsService.deleteAwarenessPoint(user, supabase, pointId, scope)
  }

  @Get('user-state')
  async listAgentUserState(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    return this.agentOperations.listAgentUserState(supabase, user.id)
  }

  /**
   * Batched skills listing: `?agent_keys=a,b,c` returns the concatenation of
   * per-agent results from one repository round-trip (replaces N calls to
   * `GET /:agentKey/skills`). `?fields=summary` omits `markdown_content` and
   * resource `content` for lightweight list views.
   */
  @Get('skills')
  async listSkillsForAgents(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Query('agent_keys') agentKeysParam: string | undefined,
    @Query('fields') fields: string | undefined,
    @OrgContext() scope: RequestScope,
  ) {
    const agentKeys = (agentKeysParam ?? '')
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean)
    if (!agentKeys.length) throw new BadRequestException('agent_keys is required')
    if (agentKeys.length > 100) throw new BadRequestException('Too many agent keys (max 100)')
    return this.agentOperations.listAgentSkillsForAgents(
      supabase,
      user.id,
      agentKeys,
      scope.orgId,
      {
        summary: fields === 'summary',
      },
    )
  }

}
