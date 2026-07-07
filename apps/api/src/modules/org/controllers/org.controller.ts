import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
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
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  ZodValidationPipe,
} from '@vibey/api-shared'
import {
  CreateOrgSchema,
  OrgIdParamSchema,
  UpdateOrgSchema,
  type CreateOrgInput,
  type OrgIdParam,
  type UpdateOrgInput,
} from '../dto'
import { OrgService } from '../services/org.service'

@Controller('org')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(CreateOrgSchema)) dto: CreateOrgInput,
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    try {
      const org = await this.orgService.createOrg(supabase, user.id, dto)
      return { success: true, org }
    } catch (error) {
      if (error instanceof Error && error.message === 'Organization slug already taken') {
        throw new HttpException(error.message, HttpStatus.CONFLICT)
      }
      throw new HttpException('Failed to create organization', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get('my')
  async listMyOrgs(@CurrentUser() user: { id: string }, @Supabase() supabase: SupabaseClient) {
    const memberships = await this.orgService.listUserOrgs(supabase, user.id)
    return { success: true, memberships }
  }

  @Get(':orgId')
  async getOrg(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Supabase() supabase: SupabaseClient,
  ) {
    const org = await this.orgService.getOrg(supabase, params.orgId)
    return { success: true, org }
  }

  @Patch(':orgId')
  @RequireOrgRole('owner')
  async updateOrg(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Body(new ZodValidationPipe(UpdateOrgSchema)) dto: UpdateOrgInput,
    @Supabase() supabase: SupabaseClient,
  ) {
    try {
      const org = await this.orgService.updateOrg(supabase, params.orgId, dto)
      return { success: true, org }
    } catch (error) {
      if (error instanceof Error && error.message === 'Organization slug already taken') {
        throw new HttpException(error.message, HttpStatus.CONFLICT)
      }
      throw new HttpException('Failed to update organization', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Delete(':orgId')
  @RequireOrgRole('owner')
  async deleteOrg(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Supabase() supabase: SupabaseClient,
  ) {
    await this.orgService.deleteOrg(supabase, params.orgId)
    return { success: true }
  }

  @Post(':orgId/restore')
  @RequireOrgRole('owner')
  async restoreOrg(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Supabase() supabase: SupabaseClient,
  ) {
    await this.orgService.restoreOrg(supabase, params.orgId)
    return { success: true }
  }
}
