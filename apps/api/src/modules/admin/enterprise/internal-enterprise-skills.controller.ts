import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import { EnterpriseSkillBuilderService } from './enterprise-skill-builder.service'

/**
 * Internal skill CRUD for agent-api admin skill-builder sessions.
 * Called with INTERNAL_API_TOKEN — never exposed to customers.
 */
@Controller('internal/enterprise/skills')
@UseGuards(InternalAuthGuard)
export class InternalEnterpriseSkillsController {
  constructor(private readonly enterpriseSkillBuilderService: EnterpriseSkillBuilderService) {}

  @Post('list')
  list(
    @Body()
    body: {
      acting_user_id: string
      org_id?: string | null
      agent_key: string
    },
  ) {
    return this.enterpriseSkillBuilderService.listSkills(
      body.acting_user_id,
      body.org_id ?? null,
      body.agent_key,
    )
  }

  @Post('create')
  create(
    @Body()
    body: {
      admin_user_id: string
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
    return this.enterpriseSkillBuilderService.createSkill(body.admin_user_id, body)
  }

  @Post('upsert')
  upsert(
    @Body()
    body: {
      admin_user_id: string
      acting_user_id: string
      org_id?: string | null
      agent_key: string
      skill_key: string
      name: string
      description: string
      markdown_content: string
    },
  ) {
    return this.enterpriseSkillBuilderService.upsertSkill(body.admin_user_id, body)
  }

  @Post('update')
  update(
    @Body()
    body: {
      admin_user_id: string
      acting_user_id: string
      org_id?: string | null
      agent_key: string
      skill_id: string
      updates: Partial<{
        skill_key: string
        name: string
        description: string
        markdown_content: string
        is_enabled: boolean
      }>
    },
  ) {
    return this.enterpriseSkillBuilderService.updateSkill(body.admin_user_id, body)
  }

  @Post('delete')
  delete(
    @Body()
    body: {
      admin_user_id: string
      acting_user_id: string
      org_id?: string | null
      agent_key: string
      skill_id: string
    },
  ) {
    return this.enterpriseSkillBuilderService.deleteSkill(body.admin_user_id, body)
  }

  @Post('resource')
  createResource(
    @Body()
    body: {
      admin_user_id: string
      acting_user_id: string
      org_id?: string | null
      agent_key: string
      skill_key: string
      file_path: string
      content: string
    },
  ) {
    return this.enterpriseSkillBuilderService.createSkillResource(body.admin_user_id, body)
  }
}
