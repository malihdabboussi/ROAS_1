import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import { AgentOnboardingService, isSystemAgentKey } from '../services/agent-onboarding.service'
import { MissionAgentGatewayService } from '../services/gateways/mission-agent-gateway.service'
import { MissionAvatarService } from '../services/media/mission-avatar.service'
import { MissionsAgentOperationsService } from '../services/missions-agent-operations.service'

@Controller('internal/agents')
@UseGuards(InternalAuthGuard)
export class InternalAgentsController {
  constructor(
    private readonly missionsAgentOperationsService: MissionsAgentOperationsService,
    private readonly agentOnboardingService: AgentOnboardingService,
    private readonly missionAgentGatewayService: MissionAgentGatewayService,
    private readonly missionAvatarService: MissionAvatarService,
  ) {}

  @Put(':agentKey/definitions/:fileName')
  @HttpCode(HttpStatus.OK)
  async upsertDefinition(
    @Param('agentKey') agentKey: string,
    @Param('fileName') fileName: string,
    @Body() body: { user_id: string; org_id?: string | null; content: string },
  ) {
    if (isSystemAgentKey(agentKey)) {
      throw new ForbiddenException(`${agentKey} is a system agent — definitions are read-only`)
    }
    return this.missionsAgentOperationsService.internalUpsertAgentDefinition(
      body.user_id,
      body.org_id,
      agentKey,
      fileName,
      body.content,
    )
  }

  @Put(':agentKey/skills/:skillKey')
  @HttpCode(HttpStatus.OK)
  async upsertSkill(
    @Param('agentKey') agentKey: string,
    @Param('skillKey') skillKey: string,
    @Body()
    body: {
      user_id: string
      org_id?: string | null
      name: string
      description: string
      markdown_content: string
    },
  ) {
    return this.missionsAgentOperationsService.internalUpsertAgentSkill(
      body.user_id,
      body.org_id,
      agentKey,
      skillKey,
      body.name,
      body.description,
      body.markdown_content,
    )
  }

  @Post('backfill-system-agents')
  @HttpCode(HttpStatus.OK)
  async backfillSystemAgents() {
    const supabase = this.missionAgentGatewayService.getServiceRoleClient()
    return this.agentOnboardingService.backfillSystemAgentsForManagedUsers(supabase)
  }

  @Post('backfill-avatars')
  @HttpCode(HttpStatus.OK)
  async backfillAvatars() {
    const supabase = this.missionAgentGatewayService.getServiceRoleClient()
    return this.missionAvatarService.backfillMissingAgentAvatars(supabase)
  }

  @Post('hire-ready')
  @HttpCode(HttpStatus.CREATED)
  async hireReadyEmployee(
    @Body()
    body: {
      user_id: string
      org_id?: string | null
      role_key: string
      name?: string
      team_id?: string | null
    },
  ) {
    if (!body.role_key?.trim()) {
      throw new BadRequestException('role_key is required')
    }
    const supabase = this.missionAgentGatewayService.getServiceRoleClient()
    return this.agentOnboardingService.hireReadyEmployee(
      supabase,
      body.user_id,
      { role_key: body.role_key, name: body.name, team_id: body.team_id },
      body.org_id,
    )
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createAgent(
    @Body()
    body: {
      user_id: string
      org_id?: string | null
      agent_key: string
      name: string
      role: string
      level: string
      skills: string[]
      definitions: Array<{ file_name: string; content: string }>
      clone_skills_from?: string
      clone_skill_keys?: string[]
      skill_seed_key?: string
      capability_profile?: string
      capability_domain?: string
      specialty?: string
      team_id?: string | null
    },
  ) {
    if (!['system', 'c_level', 'manager', 'employee'].includes(body.level)) {
      throw new BadRequestException('level must be one of: system, c_level, manager, employee')
    }
    if (isSystemAgentKey(body.agent_key)) {
      throw new ForbiddenException(
        `${body.agent_key} is a system agent — creation is platform-managed`,
      )
    }

    return this.missionsAgentOperationsService.internalCreateAgent(
      body.user_id,
      body.org_id,
      body.agent_key,
      body.name,
      body.role,
      body.level,
      body.skills,
      body.definitions,
      body.clone_skills_from,
      body.clone_skill_keys,
      body.skill_seed_key,
      body.capability_profile,
      body.capability_domain,
      body.specialty,
      body.team_id,
    )
  }
}
