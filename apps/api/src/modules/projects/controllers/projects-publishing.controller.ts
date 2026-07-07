import { Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
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
import { ProjectsService } from '../services/projects.service'

@Controller('projects/:id')
export class ProjectsPublishingController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async publishProject(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @OrgContext() scope: RequestScope,
  ) {
    const result = await this.projectsService.publishProject(supabase, user.id, id, scope.orgId)
    return { success: true, ...result }
  }

  @Post('unpublish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async unpublishProject(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @OrgContext() scope: RequestScope,
  ) {
    await this.projectsService.unpublishProject(supabase, user.id, id, scope.orgId)
    return { success: true }
  }
}
