import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, CurrentUser, RoleGuard, Roles } from '@vibey/api-shared'
import { EnterpriseSkillBuilderService } from './enterprise-skill-builder.service'

@Controller('admin/enterprise/skill-builder')
@UseGuards(AuthGuard, RoleGuard)
@Roles('admin')
export class EnterpriseSkillBuilderController {
  constructor(private readonly enterpriseSkillBuilderService: EnterpriseSkillBuilderService) {}

  @Get('users/search')
  searchUsers(@Query('q') q?: string) {
    return this.enterpriseSkillBuilderService.searchUsers(q ?? '')
  }

  @Get('users/:userId/scopes')
  listScopes(@Param('userId') userId: string) {
    return this.enterpriseSkillBuilderService.listScopesForUser(userId)
  }

  @Get('agents')
  listAgents(@Query('userId') userId: string, @Query('orgId') orgId?: string) {
    const normalizedOrgId = orgId && orgId !== 'personal' ? orgId : null
    return this.enterpriseSkillBuilderService.listAgents(userId, normalizedOrgId)
  }

  @Get('agents/:agentKey/skills')
  listSkills(
    @Param('agentKey') agentKey: string,
    @Query('userId') userId: string,
    @Query('orgId') orgId?: string,
  ) {
    const normalizedOrgId = orgId && orgId !== 'personal' ? orgId : null
    return this.enterpriseSkillBuilderService.listSkills(userId, normalizedOrgId, agentKey)
  }

  @Post('skills')
  createSkill(
    @CurrentUser() admin: { id: string },
    @Body()
    body: {
      acting_user_id: string
      org_id?: string | null
      agent_key: string
      skill_key: string
      name: string
      description: string
      markdown_content: string
      is_enabled?: boolean
    },
  ) {
    return this.enterpriseSkillBuilderService.createSkill(admin.id, body)
  }

  @Patch('skills/:skillId')
  updateSkill(
    @CurrentUser() admin: { id: string },
    @Param('skillId') skillId: string,
    @Body()
    body: {
      acting_user_id: string
      org_id?: string | null
      agent_key: string
      updates: Partial<{
        skill_key: string
        name: string
        description: string
        markdown_content: string
        is_enabled: boolean
      }>
    },
  ) {
    return this.enterpriseSkillBuilderService.updateSkill(admin.id, {
      ...body,
      skill_id: skillId,
    })
  }

  @Delete('skills/:skillId')
  deleteSkill(
    @CurrentUser() admin: { id: string },
    @Param('skillId') skillId: string,
    @Body()
    body: {
      acting_user_id: string
      org_id?: string | null
      agent_key: string
    },
  ) {
    return this.enterpriseSkillBuilderService.deleteSkill(admin.id, {
      ...body,
      skill_id: skillId,
    })
  }

  @Post('skills/:skillKey/resources')
  createSkillResource(
    @CurrentUser() admin: { id: string },
    @Param('skillKey') skillKey: string,
    @Body()
    body: {
      acting_user_id: string
      org_id?: string | null
      agent_key: string
      file_path: string
      content: string
    },
  ) {
    return this.enterpriseSkillBuilderService.createSkillResource(admin.id, {
      ...body,
      skill_key: skillKey,
    })
  }

  @Post('sync')
  triggerSync(
    @Body()
    body: {
      acting_user_id: string
      org_id?: string | null
      agent_key: string
    },
  ) {
    return this.enterpriseSkillBuilderService.triggerSync(
      body.acting_user_id,
      body.org_id ?? null,
      body.agent_key,
    )
  }
}
