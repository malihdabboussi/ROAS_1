import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ZodValidationPipe } from '@vibey/api-shared'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import {
  AwarenessAmendDtoSchema,
  AwarenessAppendSubtasksDtoSchema,
  AwarenessCancelSubtaskDtoSchema,
  AwarenessEditSubtaskDtoSchema,
  AwarenessPauseMissionDtoSchema,
  AwarenessReplanDtoSchema,
  AwarenessRetrySubtaskDtoSchema,
  type AwarenessAmendDto,
  type AwarenessAppendSubtasksDto,
  type AwarenessCancelSubtaskDto,
  type AwarenessEditSubtaskDto,
  type AwarenessPauseMissionDto,
  type AwarenessReplanDto,
  type AwarenessRetrySubtaskDto,
} from '../dto'
import { MissionsInternalOperationsService } from '../services/missions-internal-operations.service'

@Controller('internal/missions')
@UseGuards(InternalAuthGuard)
export class InternalMissionAwarenessActionsController {
  constructor(
    private readonly missionsInternalOperationsService: MissionsInternalOperationsService,
  ) {}

  @Post('awareness/append-subtasks')
  @HttpCode(HttpStatus.CREATED)
  async awarenessAppendSubtasks(
    @Body(new ZodValidationPipe(AwarenessAppendSubtasksDtoSchema))
    body: AwarenessAppendSubtasksDto,
  ) {
    return this.missionsInternalOperationsService.awarenessAppendSubtasks(body)
  }

  @Post('awareness/cancel-subtask')
  @HttpCode(HttpStatus.OK)
  async awarenessCancelSubtask(
    @Body(new ZodValidationPipe(AwarenessCancelSubtaskDtoSchema))
    body: AwarenessCancelSubtaskDto,
  ) {
    return this.missionsInternalOperationsService.awarenessCancelSubtask(body)
  }

  @Post('awareness/edit-subtask')
  @HttpCode(HttpStatus.OK)
  async awarenessEditSubtask(
    @Body(new ZodValidationPipe(AwarenessEditSubtaskDtoSchema))
    body: AwarenessEditSubtaskDto,
  ) {
    return this.missionsInternalOperationsService.awarenessEditSubtask(body)
  }

  @Post('awareness/retry-subtask')
  @HttpCode(HttpStatus.OK)
  async awarenessRetrySubtask(
    @Body(new ZodValidationPipe(AwarenessRetrySubtaskDtoSchema))
    body: AwarenessRetrySubtaskDto,
  ) {
    return this.missionsInternalOperationsService.awarenessRetrySubtask(body)
  }

  @Post('awareness/replan')
  @HttpCode(HttpStatus.OK)
  async awarenessReplan(
    @Body(new ZodValidationPipe(AwarenessReplanDtoSchema))
    body: AwarenessReplanDto,
  ) {
    return this.missionsInternalOperationsService.awarenessReplan(body)
  }

  @Post('awareness/pause')
  @HttpCode(HttpStatus.OK)
  async awarenessPause(
    @Body(new ZodValidationPipe(AwarenessPauseMissionDtoSchema))
    body: AwarenessPauseMissionDto,
  ) {
    return this.missionsInternalOperationsService.awarenessPauseMission(body)
  }

  @Post('awareness/amend')
  @HttpCode(HttpStatus.OK)
  async awarenessAmend(
    @Body(new ZodValidationPipe(AwarenessAmendDtoSchema))
    body: AwarenessAmendDto,
  ) {
    return this.missionsInternalOperationsService.awarenessAmend(body)
  }

  @Post('notification-push')
  @HttpCode(HttpStatus.OK)
  async notificationPush(
    @Body()
    body: {
      user_id: string
      agent_key: string
      content: string
      notification_type: string
      mission_title?: string
    },
  ) {
    const formatted = body.mission_title
      ? `🚨 Mission Blocked: "${body.mission_title}"\n${body.content}`
      : body.content
    return this.missionsInternalOperationsService.pushTelegramAwarenessPoint(
      body.user_id,
      body.agent_key,
      formatted,
    )
  }
}
