import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
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
import { SkillCatalogOrganizationService } from '../../missions/services/skill-catalog-organization.service'

@Controller('agents/skill-catalog')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SkillCatalogController {
  constructor(private readonly organization: SkillCatalogOrganizationService) {}

  private scope(user: { id: string }, org: RequestScope) {
    return { userId: user.id, orgId: org.orgId }
  }

  @Get()
  async getBundle(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() org: RequestScope,
  ) {
    return this.organization.getOrganizationBundle(supabase, this.scope(user, org))
  }

  @Get('skills')
  async listCatalogSkills(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() org: RequestScope,
  ) {
    return this.organization.listCatalogSkills(supabase, this.scope(user, org))
  }

  @Post('folders')
  async createFolder(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() org: RequestScope,
    @Body() body: { name?: string; parent_id?: string | null },
  ) {
    if (!body?.name?.trim()) throw new BadRequestException('name is required')
    return this.organization.createFolder(supabase, this.scope(user, org), {
      name: body.name,
      parent_id: body.parent_id ?? null,
    })
  }

  @Post('folders/ensure-default')
  async ensureDefaultFolder(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() org: RequestScope,
  ) {
    return this.organization.ensureDefaultAgencyFolder(supabase, this.scope(user, org))
  }

  @Patch('folders/:folderId')
  async renameFolder(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() org: RequestScope,
    @Param('folderId') folderId: string,
    @Body() body: { name?: string },
  ) {
    if (!body?.name?.trim()) throw new BadRequestException('name is required')
    return this.organization.renameFolder(supabase, this.scope(user, org), folderId, body.name)
  }

  @Delete('folders/:folderId')
  async deleteFolder(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() org: RequestScope,
    @Param('folderId') folderId: string,
  ) {
    return this.organization.deleteFolder(supabase, this.scope(user, org), folderId)
  }

  @Post('folder-memberships')
  async setSkillFolder(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() org: RequestScope,
    @Body() body: { skill_key?: string; folder_id?: string | null },
  ) {
    if (!body?.skill_key?.trim()) throw new BadRequestException('skill_key is required')
    return this.organization.setSkillFolder(supabase, this.scope(user, org), {
      skill_key: body.skill_key,
      folder_id: body.folder_id ?? null,
    })
  }

  @Post('tags')
  async createTag(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() org: RequestScope,
    @Body() body: { name?: string },
  ) {
    if (!body?.name?.trim()) throw new BadRequestException('name is required')
    return this.organization.createTag(supabase, this.scope(user, org), body.name)
  }

  @Delete('tags/:tagId')
  async deleteTag(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() org: RequestScope,
    @Param('tagId') tagId: string,
  ) {
    return this.organization.deleteTag(supabase, this.scope(user, org), tagId)
  }

  @Post('tag-memberships')
  async setSkillTags(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() org: RequestScope,
    @Body() body: { skill_key?: string; tag_ids?: string[] },
  ) {
    if (!body?.skill_key?.trim()) throw new BadRequestException('skill_key is required')
    return this.organization.setSkillTags(supabase, this.scope(user, org), {
      skill_key: body.skill_key,
      tag_ids: Array.isArray(body.tag_ids) ? body.tag_ids : [],
    })
  }
}
