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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
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
export class AgentSkillsController {
  constructor(private readonly agentOperations: MissionsAgentOperationsService) {}

  @Get(':agentKey/skills')
  async listAgentSkills(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.listAgentSkills(supabase, user.id, agentKey, scope.orgId)
  }

  @Post(':agentKey/skills')
  async createAgentSkill(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Body()
    body: {
      skill_key: string
      name: string
      description: string
      markdown_content: string
      is_enabled?: boolean
    },
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.createAgentSkill(supabase, user.id, agentKey, body, scope.orgId)
  }

  @Patch(':agentKey/skills/:skillId')
  async updateAgentSkill(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Param('skillId') skillId: string,
    @Body()
    body: Partial<{
      skill_key: string
      name: string
      description: string
      markdown_content: string
      is_enabled: boolean
      change_summary: string
    }>,
    @OrgContext() scope: RequestScope,
  ) {
    const { change_summary: _changeSummary, ...updates } = body
    return this.agentOperations.updateAgentSkill(
      supabase,
      user.id,
      agentKey,
      skillId,
      updates,
      scope.orgId,
    )
  }

  @Delete(':agentKey/skills/:skillId')
  async deleteAgentSkill(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Param('skillId') skillId: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.deleteAgentSkill(supabase, user.id, agentKey, skillId, scope.orgId)
  }

  @Post(':agentKey/skills/:skillKey/resources')
  async createAgentSkillResource(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Param('skillKey') skillKey: string,
    @Body()
    body: { file_path: string; content?: string; content_type?: string; storage_url?: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.createAgentSkillResource(
      supabase,
      user.id,
      agentKey,
      skillKey,
      body,
      scope.orgId,
    )
  }

  @Patch(':agentKey/skills/:skillKey/resources/:resourceId')
  async updateAgentSkillResource(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Param('skillKey') skillKey: string,
    @Param('resourceId') resourceId: string,
    @Body() body: { file_path: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.updateAgentSkillResource(
      supabase,
      user.id,
      agentKey,
      skillKey,
      resourceId,
      body,
      scope.orgId,
    )
  }

  @Delete(':agentKey/skills/:skillKey/resources/:resourceId')
  async deleteAgentSkillResource(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Param('skillKey') skillKey: string,
    @Param('resourceId') resourceId: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.deleteAgentSkillResource(
      supabase,
      user.id,
      agentKey,
      skillKey,
      resourceId,
      scope.orgId,
    )
  }

  @Post(':agentKey/skills/:skillKey/assets')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadSkillAsset(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Param('skillKey') skillKey: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('description') description: string | undefined,
    @OrgContext() scope: RequestScope,
  ) {
    if (!file) throw new BadRequestException('No file provided')
    return this.agentOperations.uploadSkillAsset(
      supabase,
      user.id,
      agentKey,
      skillKey,
      file,
      description,
      scope.orgId,
    )
  }
}
