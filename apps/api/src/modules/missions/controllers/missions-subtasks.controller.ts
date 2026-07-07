import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
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
  BlockHumanSubtaskDtoSchema,
  BounceSubtaskToAgentDtoSchema,
  CompleteHumanSubtaskDtoSchema,
  MissionIdParamSchema,
  ReassignHumanSubtaskDtoSchema,
  SubtaskIdParamSchema,
  UpdateSubtaskDtoSchema,
  type BlockHumanSubtaskDto,
  type BounceSubtaskToAgentDto,
  type CompleteHumanSubtaskDto,
  type MissionIdParam,
  type ReassignHumanSubtaskDto,
  type SubtaskIdParam,
  type UpdateSubtaskDto,
} from '../dto'
import { MissionHumanSubtaskService } from '../services/mission-human-subtask.service'
import { MissionsExecutionService } from '../services/missions-execution.service'
import { MissionsQueryService } from '../services/missions-query.service'

@Controller('missions')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MissionsSubtasksController {
  constructor(
    private readonly missionsQueryService: MissionsQueryService,
    private readonly missionsExecutionService: MissionsExecutionService,
    private readonly missionHumanSubtaskService: MissionHumanSubtaskService,
  ) {}

  @Get(':id/subtasks')
  async listSubtasks(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsQueryService.listSubtasks(supabase, user.id, params.id, scope.orgId)
  }

  @Patch(':id/subtasks/:subtaskId')
  async updateSubtask(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @Param(new ZodValidationPipe(SubtaskIdParamSchema)) subtaskParams: SubtaskIdParam,
    @Body(new ZodValidationPipe(UpdateSubtaskDtoSchema)) body: UpdateSubtaskDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsExecutionService.updateSubtask(
      supabase,
      user.id,
      params.id,
      subtaskParams.subtaskId,
      body,
      scope.orgId,
    )
  }

  @Post(':id/subtasks/:subtaskId/complete-human')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async completeHumanSubtask(
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @Param(new ZodValidationPipe(SubtaskIdParamSchema)) subtaskParams: SubtaskIdParam,
    @Body(new ZodValidationPipe(CompleteHumanSubtaskDtoSchema)) body: CompleteHumanSubtaskDto,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.missionHumanSubtaskService.completeHuman(
      user.id,
      params.id,
      subtaskParams.subtaskId,
      body,
    )
  }

  @Post(':id/subtasks/:subtaskId/bounce-to-agent')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async bounceSubtaskToAgent(
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @Param(new ZodValidationPipe(SubtaskIdParamSchema)) subtaskParams: SubtaskIdParam,
    @Body(new ZodValidationPipe(BounceSubtaskToAgentDtoSchema)) body: BounceSubtaskToAgentDto,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.missionHumanSubtaskService.bounceToAgent(
      user.id,
      params.id,
      subtaskParams.subtaskId,
      body,
    )
  }

  @Post(':id/subtasks/:subtaskId/reassign-human')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async reassignHumanSubtask(
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @Param(new ZodValidationPipe(SubtaskIdParamSchema)) subtaskParams: SubtaskIdParam,
    @Body(new ZodValidationPipe(ReassignHumanSubtaskDtoSchema)) body: ReassignHumanSubtaskDto,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.missionHumanSubtaskService.reassignHuman(
      user.id,
      params.id,
      subtaskParams.subtaskId,
      body,
    )
  }

  @Post(':id/subtasks/:subtaskId/block-human')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async blockHumanSubtask(
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @Param(new ZodValidationPipe(SubtaskIdParamSchema)) subtaskParams: SubtaskIdParam,
    @Body(new ZodValidationPipe(BlockHumanSubtaskDtoSchema)) body: BlockHumanSubtaskDto,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.missionHumanSubtaskService.blockHuman(
      user.id,
      params.id,
      subtaskParams.subtaskId,
      body,
    )
  }
}
