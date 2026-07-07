import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import { SupabaseManagementService } from '../services/supabase-management.service'
import { SupabaseProjectLinksService } from '../services/supabase-project-links.service'

@Controller('integrations/supabase')
export class SupabaseProjectsController {
  constructor(
    private readonly management: SupabaseManagementService,
    private readonly projectLinks: SupabaseProjectLinksService,
  ) {}

  @Get('organizations')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listOrganizations(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    const organizations = await this.management.listOrganizations(supabase, user.id, scope.orgId)
    return { success: true, organizations }
  }

  @Get('projects')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listProjects(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    const projects = await this.management.listProjects(supabase, user.id, scope.orgId)
    return { success: true, projects }
  }

  @Post('provision')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async provisionProject(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body()
    body: {
      organization_id: string
      name: string
      region: string
      db_pass: string
      vibey_project_id: string
    },
  ) {
    const project = await this.management.createProject(supabase, user.id, scope.orgId, {
      organization_id: body.organization_id,
      name: body.name,
      region: body.region,
      db_pass: body.db_pass,
    })

    const apiKeys = await this.management.getProjectApiKeys(
      supabase,
      user.id,
      scope.orgId,
      project.id,
    )
    const anonKey = apiKeys.find((k) => k.name === 'anon')?.api_key ?? null
    const serviceRoleKey = apiKeys.find((k) => k.name === 'service_role')?.api_key ?? null
    const apiUrl = `https://${project.id}.supabase.co`

    await this.projectLinks.linkSupabaseToVibeyProject(supabase, body.vibey_project_id, {
      supabase_project_ref: project.id,
      supabase_project_name: project.name,
      supabase_region: project.region,
      supabase_api_url: apiUrl,
      supabase_anon_key: anonKey,
    })
    await this.projectLinks.injectSupabaseEnvVars(
      supabase,
      user.id,
      body.vibey_project_id,
      apiUrl,
      anonKey,
    )

    return {
      success: true,
      supabase_project: {
        ref: project.id,
        name: project.name,
        region: project.region,
        api_url: apiUrl,
        anon_key: anonKey,
        service_role_key: serviceRoleKey,
      },
    }
  }

  @Post('link-existing')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async linkExistingProject(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body()
    body: {
      supabase_project_ref: string
      vibey_project_id: string
    },
  ) {
    const project = await this.management.getProject(
      supabase,
      user.id,
      scope.orgId,
      body.supabase_project_ref,
    )
    const apiKeys = await this.management.getProjectApiKeys(
      supabase,
      user.id,
      scope.orgId,
      project.id,
    )
    const anonKey = apiKeys.find((k) => k.name === 'anon')?.api_key ?? null
    const apiUrl = `https://${project.id}.supabase.co`

    await this.projectLinks.linkSupabaseToVibeyProject(supabase, body.vibey_project_id, {
      supabase_project_ref: project.id,
      supabase_project_name: project.name,
      supabase_region: project.region,
      supabase_api_url: apiUrl,
      supabase_anon_key: anonKey,
    })
    await this.projectLinks.injectSupabaseEnvVars(
      supabase,
      user.id,
      body.vibey_project_id,
      apiUrl,
      anonKey,
    )

    return {
      success: true,
      supabase_project: {
        ref: project.id,
        name: project.name,
        region: project.region,
        api_url: apiUrl,
        anon_key: anonKey,
      },
    }
  }
}
