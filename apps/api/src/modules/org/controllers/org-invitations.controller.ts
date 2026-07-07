import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
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
  Public,
  RequireOrgRole,
  Supabase,
  ZodValidationPipe,
} from '@vibey/api-shared'
import {
  AcceptInvitationSchema,
  InvitationIdParamSchema,
  InviteMemberSchema,
  OrgIdParamSchema,
  type AcceptInvitationInput,
  type InvitationIdParam,
  type InviteMemberInput,
  type OrgIdParam,
} from '../dto'
import { OrgInvitationService } from '../services/org-invitation.service'

@Controller('org')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class OrgInvitationsController {
  constructor(private readonly invitationService: OrgInvitationService) {}

  @Post(':orgId/invitations')
  @RequireOrgRole('admin')
  @HttpCode(HttpStatus.CREATED)
  async invite(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Body(new ZodValidationPipe(InviteMemberSchema)) dto: InviteMemberInput,
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    const onboarded = await this.invitationService.isOrgOnboarded(params.orgId)
    if (!onboarded) {
      throw new HttpException(
        'Organization setup must be completed before inviting members',
        HttpStatus.PRECONDITION_FAILED,
      )
    }

    try {
      const invitation = await this.invitationService.inviteMember(
        supabase,
        params.orgId,
        dto.email,
        dto.role,
        user.id,
      )
      return { success: true, invitation }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'User is already a member of this organization' ||
          error.message === 'Pending invitation already exists for this email')
      ) {
        throw new HttpException(error.message, HttpStatus.CONFLICT)
      }
      throw new HttpException('Failed to send invitation', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get(':orgId/invitations')
  @RequireOrgRole('admin')
  async list(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Supabase() supabase: SupabaseClient,
  ) {
    const invitations = await this.invitationService.listInvitations(supabase, params.orgId)
    return { success: true, invitations }
  }

  @Delete(':orgId/invitations/:invitationId')
  @RequireOrgRole('admin')
  async revoke(
    @Param(new ZodValidationPipe(InvitationIdParamSchema)) params: InvitationIdParam,
    @Supabase() supabase: SupabaseClient,
  ) {
    await this.invitationService.revokeInvitation(supabase, params.invitationId)
    return { success: true }
  }

  @Post('invitations/accept')
  async accept(
    @Body(new ZodValidationPipe(AcceptInvitationSchema)) dto: AcceptInvitationInput,
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    try {
      const result = await this.invitationService.acceptInvitation(
        supabase,
        dto.token,
        user.id,
        user.email,
      )
      return { success: true, ...result }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept invitation'
      if (message.includes('expired')) throw new HttpException(message, HttpStatus.GONE)
      if (message.includes('not match')) throw new HttpException(message, HttpStatus.FORBIDDEN)
      if (message.includes('already a member'))
        throw new HttpException(message, HttpStatus.CONFLICT)
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('invitations/accept-and-bootstrap')
  async acceptAndBootstrap(
    @Body(new ZodValidationPipe(AcceptInvitationSchema)) dto: AcceptInvitationInput,
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    try {
      const result = await this.invitationService.acceptInvitationAndBootstrap(
        supabase,
        dto.token,
        user.id,
        user.email,
      )
      return { success: true, ...result }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept invitation'
      if (message.includes('expired')) throw new HttpException(message, HttpStatus.GONE)
      if (message.includes('not match')) throw new HttpException(message, HttpStatus.FORBIDDEN)
      if (message.includes('already a member'))
        throw new HttpException(message, HttpStatus.CONFLICT)
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Public()
  @Get('invitations/:token')
  async getByToken(@Param('token') token: string) {
    const invitation = await this.invitationService.getInvitationByTokenFromServiceClient(token)
    if (!invitation) throw new HttpException('Invitation not found', HttpStatus.NOT_FOUND)
    return { success: true, invitation }
  }
}
