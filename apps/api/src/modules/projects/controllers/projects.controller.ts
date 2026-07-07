import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
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
import {
  CreateProjectSchema,
  ImportGitHubProjectSchema,
  UpdateProjectSchema,
} from '../dto/projects.dto'
import { ProjectsService } from '../services/projects.service'

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listProjects(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    const projects = await this.projectsService.listProjects(supabase, scope)
    return { success: true, projects }
  }

  @Post()
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  @RequireOrgRole('creator')
  async createProject(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    const parsed = CreateProjectSchema.safeParse(body)
    if (!parsed.success) return { success: false, error: 'invalid_payload' }
    const project = await this.projectsService.createProject(
      supabase,
      user.id,
      parsed.data,
      scope.orgId,
    )
    return { success: true, project }
  }

  @Get(':id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getProject(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @OrgContext() scope: RequestScope,
  ) {
    const project = await this.projectsService.getProject(supabase, user.id, id, scope.orgId)
    return { success: true, project }
  }

  @Patch(':id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateProject(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    const parsed = UpdateProjectSchema.safeParse(body)
    if (!parsed.success) return { success: false, error: 'invalid_payload' }
    const project = await this.projectsService.updateProject(
      supabase,
      user.id,
      id,
      parsed.data,
      scope.orgId,
    )
    return { success: true, project }
  }

  @Delete(':id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteProject(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @OrgContext() scope: RequestScope,
  ) {
    await this.projectsService.deleteProject(supabase, user.id, id, scope.orgId)
    return { success: true }
  }

  @Post('import/github')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async importFromGitHub(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    const parsed = ImportGitHubProjectSchema.safeParse(body)
    if (!parsed.success) return { success: false, error: 'invalid_payload' }
    const project = await this.projectsService.importFromGitHub(
      supabase,
      user.id,
      parsed.data,
      scope.orgId,
    )
    return { success: true, project }
  }
}
