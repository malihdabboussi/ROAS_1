import { Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from '@nestjs/common'
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
import { DeleteProjectFileSchema, UpsertProjectFileSchema } from '../dto/projects.dto'
import { ProjectsService } from '../services/projects.service'

@Controller('projects/:id/files')
export class ProjectsFilesController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listOrReadProjectFiles(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @OrgContext() scope: RequestScope,
    @Query('path') path?: string,
  ) {
    if (path && path.trim()) {
      const file = await this.projectsService.readProjectFile(
        supabase,
        user.id,
        id,
        path,
        scope.orgId,
      )
      return { success: true, file }
    }
    const result = await this.projectsService.listProjectFiles(supabase, user.id, id, scope.orgId)
    return { success: true, ...result }
  }

  @Put()
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async upsertProjectFile(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    const parsed = UpsertProjectFileSchema.safeParse(body)
    if (!parsed.success) return { success: false, error: 'invalid_payload' }
    const result = await this.projectsService.upsertProjectFile(
      supabase,
      user.id,
      id,
      parsed.data.path,
      parsed.data.content,
      scope.orgId,
    )
    return { success: true, ...result }
  }

  @Delete()
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteProjectFile(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    const parsed = DeleteProjectFileSchema.safeParse(body)
    if (!parsed.success) return { success: false, error: 'invalid_payload' }
    const result = await this.projectsService.deleteProjectFile(
      supabase,
      user.id,
      id,
      parsed.data.path,
      scope.orgId,
    )
    return { success: true, ...result }
  }
}
