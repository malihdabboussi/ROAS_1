import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common'
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
  UpdateMissionStatusDtoSchema,
  type MissionIdParam,
  type UpdateMissionStatusDto,
} from '../dto'
import { MissionsExecutionService } from '../services/missions-execution.service'

@Controller('missions')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MissionsStatusController {
  constructor(private readonly missionsExecutionService: MissionsExecutionService) {}

  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @Body(new ZodValidationPipe(UpdateMissionStatusDtoSchema)) body: UpdateMissionStatusDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsExecutionService.updateStatus(
      supabase,
      user.id,
      params.id,
      body,
      scope.orgId,
    )
  }
}
