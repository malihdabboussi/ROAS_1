import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
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
  ChangeMemberRoleSchema,
  MemberIdParamSchema,
  OrgIdParamSchema,
  UpdateCreditLimitSchema,
  type ChangeMemberRoleInput,
  type MemberIdParam,
  type OrgIdParam,
  type UpdateCreditLimitInput,
} from '../dto'
import { OrgService } from '../services/org.service'

@Controller('org')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class OrgMembersController {
  constructor(private readonly orgService: OrgService) {}

  @Get(':orgId/members')
  @RequireOrgRole('viewer')
  async listMembers(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Supabase() supabase: SupabaseClient,
  ) {
    const members = await this.orgService.listMembers(supabase, params.orgId)
    return { success: true, members }
  }

  @Patch(':orgId/members/:memberId/role')
  @RequireOrgRole('admin')
  async changeMemberRole(
    @Param(new ZodValidationPipe(MemberIdParamSchema)) params: MemberIdParam,
    @Body(new ZodValidationPipe(ChangeMemberRoleSchema)) dto: ChangeMemberRoleInput,
    @Supabase() supabase: SupabaseClient,
  ) {
    try {
      const member = await this.orgService.changeMemberRole(
        supabase,
        params.orgId,
        params.memberId,
        dto.role,
      )
      return { success: true, member }
    } catch (error) {
      if (error instanceof Error && error.message === 'Cannot change owner role') {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN)
      }
      throw new HttpException('Failed to change role', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Delete(':orgId/members/:memberId')
  @RequireOrgRole('admin')
  async removeMember(
    @Param(new ZodValidationPipe(MemberIdParamSchema)) params: MemberIdParam,
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    try {
      await this.orgService.removeMember(supabase, params.orgId, params.memberId, user.id)
      return { success: true }
    } catch (error) {
      if (error instanceof Error && error.message === 'Cannot remove the owner') {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN)
      }
      throw new HttpException('Failed to remove member', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Patch(':orgId/members/:memberId/credit-limit')
  @RequireOrgRole('admin')
  async updateCreditLimit(
    @Param(new ZodValidationPipe(MemberIdParamSchema)) params: MemberIdParam,
    @Body(new ZodValidationPipe(UpdateCreditLimitSchema)) dto: UpdateCreditLimitInput,
    @Supabase() supabase: SupabaseClient,
  ) {
    const limit = await this.orgService.updateCreditLimit(
      supabase,
      params.orgId,
      params.memberId,
      dto,
    )
    return { success: true, limit }
  }
}
