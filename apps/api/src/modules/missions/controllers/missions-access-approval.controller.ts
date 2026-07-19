import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import {
  MissionAccessRequestDecisionDtoSchema,
  MissionIdParamSchema,
  type MissionAccessRequestDecisionDto,
  type MissionIdParam,
} from '../dto'
import { MissionsAccessApprovalService } from '../services/missions-access-approval.service'

@Controller('missions')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MissionsAccessApprovalController {
  constructor(private readonly service: MissionsAccessApprovalService) {}
  @Post(':id/access-requests/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  approve(
    @CurrentUser() user: { id: string },
    @Supabase() db: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) p: MissionIdParam,
    @Body(new ZodValidationPipe(MissionAccessRequestDecisionDtoSchema))
    b: MissionAccessRequestDecisionDto,
    @OrgContext() s: RequestScope,
  ) {
    return this.service.approve(db, user.id, p.id, s.orgId, b.request_ids)
  }
  @Post(':id/access-requests/deny')
  @HttpCode(HttpStatus.OK)
  deny(
    @CurrentUser() user: { id: string },
    @Supabase() db: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) p: MissionIdParam,
    @Body(new ZodValidationPipe(MissionAccessRequestDecisionDtoSchema))
    b: MissionAccessRequestDecisionDto,
    @OrgContext() s: RequestScope,
  ) {
    return this.service.deny(db, user.id, p.id, s.orgId, b.request_ids)
  }
}
