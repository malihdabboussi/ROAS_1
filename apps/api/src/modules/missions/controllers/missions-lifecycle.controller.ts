import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
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
import { CreditsGuard } from '../../billing/guards/credits.guard'
import {
  AddMissionCommentDtoSchema,
  CreateMissionDtoSchema,
  MissionIdParamSchema,
  UpdateMissionDtoSchema,
  type AddMissionCommentDto,
  type CreateMissionDto,
  type MissionIdParam,
  type UpdateMissionDto,
} from '../dto'
import { MissionsCancellationService } from '../services/missions-cancellation.service'
import { MissionsCreationService } from '../services/missions-creation.service'
import { MissionsExecutionService } from '../services/missions-execution.service'
import { MissionsPlanDecisionService } from '../services/missions-plan-decision.service'
import { MissionsUserOperationsService } from '../services/missions-user-operations.service'

@Controller('missions')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MissionsLifecycleController {
  constructor(
    private readonly missionsCreationService: MissionsCreationService,
    private readonly missionsExecutionService: MissionsExecutionService,
    private readonly missionsPlanDecisionService: MissionsPlanDecisionService,
    private readonly missionsCancellationService: MissionsCancellationService,
    private readonly missionsUserOperationsService: MissionsUserOperationsService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseGuards(CreditsGuard)
  async create(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body(new ZodValidationPipe(CreateMissionDtoSchema)) body: CreateMissionDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsCreationService.create(supabase, user.id, body, scope.orgId, scope.orgRole)
  }

  @Post(':id/comment')
  async addComment(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @Body(new ZodValidationPipe(AddMissionCommentDtoSchema)) body: AddMissionCommentDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsExecutionService.addUserComment(
      supabase,
      user.id,
      params.id,
      body,
      scope.orgId,
    )
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadAttachment(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @UploadedFile() file: Express.Multer.File,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsUserOperationsService.uploadAttachment(
      user,
      supabase,
      params.id,
      file,
      scope,
    )
  }

  @Post(':id/approve-plan')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  async approvePlan(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsPlanDecisionService.approvePlan(supabase, user.id, params.id, scope.orgId)
  }

  @Post(':id/reject-plan')
  @HttpCode(HttpStatus.OK)
  async rejectPlan(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsPlanDecisionService.rejectPlan(supabase, user.id, params.id, scope.orgId)
  }

  @Post(':id/retry')
  @UseGuards(CreditsGuard)
  async retry(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsExecutionService.retry(supabase, user.id, params.id, scope.orgId)
  }

  @Delete(':id')
  async trash(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsCancellationService.trash(supabase, user.id, params.id, scope.orgId)
  }

  @Patch(':id')
  async updateMission(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param(new ZodValidationPipe(MissionIdParamSchema)) params: MissionIdParam,
    @Body(new ZodValidationPipe(UpdateMissionDtoSchema)) body: UpdateMissionDto,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsExecutionService.updateMission(
      supabase,
      user.id,
      params.id,
      body,
      scope.orgId,
    )
  }
}
