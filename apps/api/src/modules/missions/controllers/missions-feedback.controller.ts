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
import {
  MissionIdParamSchema,
  RateMissionDtoSchema,
  type MissionIdParam,
  type RateMissionDto,
} from '../dto'
import { MissionsUserOperationsService } from '../services/missions-user-operations.service'

@Controller('missions')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MissionsFeedbackController {
  constructor(private readonly missionsUserOperationsService: MissionsUserOperationsService) {}

  @Post(':id/rate')
  @HttpCode(HttpStatus.OK)
  async rateMission(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @Body(new ZodValidationPipe(RateMissionDtoSchema)) body: RateMissionDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.rateMission(user, supabase, params.id, body, scope)
  }
}
