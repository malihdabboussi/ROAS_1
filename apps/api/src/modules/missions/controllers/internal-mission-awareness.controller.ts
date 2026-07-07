import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ZodValidationPipe } from '@vibey/api-shared'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import {
  InternalAwarenessCommentDtoSchema,
  InternalAwarenessNudgeSubtaskDtoSchema,
  InternalAwarenessProgressNotesDtoSchema,
  InternalAwarenessReassignDtoSchema,
  InternalAwarenessRetryDtoSchema,
  type InternalAwarenessCommentDto,
  type InternalAwarenessNudgeSubtaskDto,
  type InternalAwarenessProgressNotesDto,
  type InternalAwarenessReassignDto,
  type InternalAwarenessRetryDto,
} from '../dto'
import { MissionsInternalOperationsService } from '../services/missions-internal-operations.service'

@Controller('internal/missions')
@UseGuards(InternalAuthGuard)
export class InternalMissionAwarenessController {
  constructor(
    private readonly missionsInternalOperationsService: MissionsInternalOperationsService,
  ) {}

  @Post('awareness/telegram-push')
  @HttpCode(HttpStatus.OK)
  async telegramPush(@Body() body: { user_id: string; agent_key: string; content: string }) {
    return this.missionsInternalOperationsService.pushTelegramAwarenessPoint(
      body.user_id,
      body.agent_key,
      body.content,
    )
  }

  @Post('awareness/retry')
  @HttpCode(HttpStatus.OK)
  async awarenessRetry(
    @Body(new ZodValidationPipe(InternalAwarenessRetryDtoSchema)) body: InternalAwarenessRetryDto,
  ) {
    return this.missionsInternalOperationsService.internalAwarenessRetry(body)
  }

  @Post('awareness/comment')
  @HttpCode(HttpStatus.CREATED)
  async awarenessComment(
    @Body(new ZodValidationPipe(InternalAwarenessCommentDtoSchema))
    body: InternalAwarenessCommentDto,
  ) {
    return this.missionsInternalOperationsService.internalAwarenessComment(body)
  }

  @Post('awareness/reassign')
  @HttpCode(HttpStatus.OK)
  async awarenessReassign(
    @Body(new ZodValidationPipe(InternalAwarenessReassignDtoSchema))
    body: InternalAwarenessReassignDto,
  ) {
    return this.missionsInternalOperationsService.internalAwarenessReassign(body)
  }

  @Post('awareness/nudge-subtask')
  @HttpCode(HttpStatus.OK)
  async awarenessNudgeSubtask(
    @Body(new ZodValidationPipe(InternalAwarenessNudgeSubtaskDtoSchema))
    body: InternalAwarenessNudgeSubtaskDto,
  ) {
    return this.missionsInternalOperationsService.internalAwarenessNudgeSubtask(body)
  }

  @Post('awareness/progress-notes')
  @HttpCode(HttpStatus.OK)
  async awarenessProgressNotes(
    @Body(new ZodValidationPipe(InternalAwarenessProgressNotesDtoSchema))
    body: InternalAwarenessProgressNotesDto,
  ) {
    return this.missionsInternalOperationsService.internalAwarenessProgressNotes(body)
  }
}
