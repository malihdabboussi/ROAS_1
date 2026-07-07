import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
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
export class SupabaseAuthController {
  constructor(
    private readonly management: SupabaseManagementService,
    private readonly projectLinks: SupabaseProjectLinksService,
  ) {}

  @Get('auth/users')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listAuthUsers(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query('projectRef') projectRef: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '50',
  ) {
    if (!projectRef) throw new BadRequestException('projectRef is required')
    await this.projectLinks.assertProjectOwnership(supabase, projectRef)

    const result = await this.management.listAuthUsers(
      supabase,
      user.id,
      scope.orgId,
      projectRef,
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, Math.max(1, parseInt(perPage, 10) || 50)),
    )
    return { success: true, users: result.users ?? [], total: result.total ?? 0 }
  }

  @Get('auth/users/:userId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getAuthUser(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('userId') authUserId: string,
    @Query('projectRef') projectRef: string,
  ) {
    if (!projectRef) throw new BadRequestException('projectRef is required')
    await this.projectLinks.assertProjectOwnership(supabase, projectRef)

    const authUser = await this.management.getAuthUser(
      supabase,
      user.id,
      scope.orgId,
      projectRef,
      authUserId,
    )
    return { success: true, user: authUser }
  }

  @Post('auth/users')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createAuthUser(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query('projectRef') projectRef: string,
    @Body()
    body: {
      email?: string
      phone?: string
      password?: string
      email_confirm?: boolean
      user_metadata?: Record<string, unknown>
    },
  ) {
    if (!projectRef) throw new BadRequestException('projectRef is required')
    await this.projectLinks.assertProjectOwnership(supabase, projectRef)
    const authUser = await this.management.createAuthUser(
      supabase,
      user.id,
      scope.orgId,
      projectRef,
      body,
    )
    return { success: true, user: authUser }
  }

  @Patch('auth/users/:userId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateAuthUser(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('userId') authUserId: string,
    @Query('projectRef') projectRef: string,
    @Body()
    body: {
      email?: string
      phone?: string
      password?: string
      ban_duration?: string
      user_metadata?: Record<string, unknown>
    },
  ) {
    if (!projectRef) throw new BadRequestException('projectRef is required')
    await this.projectLinks.assertProjectOwnership(supabase, projectRef)
    const authUser = await this.management.updateAuthUser(
      supabase,
      user.id,
      scope.orgId,
      projectRef,
      authUserId,
      body,
    )
    return { success: true, user: authUser }
  }

  @Delete('auth/users/:userId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteAuthUser(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('userId') authUserId: string,
    @Query('projectRef') projectRef: string,
  ) {
    if (!projectRef) throw new BadRequestException('projectRef is required')
    await this.projectLinks.assertProjectOwnership(supabase, projectRef)
    await this.management.deleteAuthUser(supabase, user.id, scope.orgId, projectRef, authUserId)
    return { success: true }
  }

  @Get('auth/config')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getAuthConfig(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query('projectRef') projectRef: string,
  ) {
    if (!projectRef) throw new BadRequestException('projectRef is required')
    await this.projectLinks.assertProjectOwnership(supabase, projectRef)
    const config = await this.management.getAuthConfig(supabase, user.id, scope.orgId, projectRef)
    return { success: true, config }
  }

  @Patch('auth/config')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateAuthConfig(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query('projectRef') projectRef: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!projectRef) throw new BadRequestException('projectRef is required')
    await this.projectLinks.assertProjectOwnership(supabase, projectRef)
    const config = await this.management.updateAuthConfig(
      supabase,
      user.id,
      scope.orgId,
      projectRef,
      body,
    )
    return { success: true, config }
  }
}
