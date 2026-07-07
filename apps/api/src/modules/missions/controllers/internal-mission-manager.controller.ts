import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ZodValidationPipe } from '@vibey/api-shared'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import {
  ManagerAmendFieldsDtoSchema,
  ManagerAppendSubtasksDtoSchema,
  ManagerCancelSubtaskDtoSchema,
  ManagerEditSubtaskDtoSchema,
  ManagerPrepareReplanDtoSchema,
  ManagerRetrySubtaskDtoSchema,
  type ManagerAmendFieldsDto,
  type ManagerAppendSubtasksDto,
  type ManagerCancelSubtaskDto,
  type ManagerEditSubtaskDto,
  type ManagerPrepareReplanDto,
  type ManagerRetrySubtaskDto,
} from '../dto'
import { MissionsInternalOperationsService } from '../services/missions-internal-operations.service'

@Controller('internal/missions')
@UseGuards(InternalAuthGuard)
export class InternalMissionManagerController {
  constructor(
    private readonly missionsInternalOperationsService: MissionsInternalOperationsService,
  ) {}

  @Post('manager/mission-fields')
  @HttpCode(HttpStatus.OK)
  async managerAmendFields(
    @Body(new ZodValidationPipe(ManagerAmendFieldsDtoSchema))
    body: ManagerAmendFieldsDto,
  ) {
    return this.missionsInternalOperationsService.managerAmendFields(body)
  }

  @Post('manager/append-subtasks')
  @HttpCode(HttpStatus.CREATED)
  async managerAppendSubtasks(
    @Body(new ZodValidationPipe(ManagerAppendSubtasksDtoSchema))
    body: ManagerAppendSubtasksDto,
  ) {
    return this.missionsInternalOperationsService.managerAppendSubtasks(body)
  }

  @Post('manager/prepare-replan')
  @HttpCode(HttpStatus.OK)
  async managerPrepareReplan(
    @Body(new ZodValidationPipe(ManagerPrepareReplanDtoSchema))
    body: ManagerPrepareReplanDto,
  ) {
    return this.missionsInternalOperationsService.managerPrepareReplan(body)
  }

  @Post('manager/cancel-subtask')
  @HttpCode(HttpStatus.OK)
  async managerCancelSubtask(
    @Body(new ZodValidationPipe(ManagerCancelSubtaskDtoSchema))
    body: ManagerCancelSubtaskDto,
  ) {
    return this.missionsInternalOperationsService.managerCancelSubtask(body)
  }

  @Post('manager/edit-subtask')
  @HttpCode(HttpStatus.OK)
  async managerEditSubtask(
    @Body(new ZodValidationPipe(ManagerEditSubtaskDtoSchema))
    body: ManagerEditSubtaskDto,
  ) {
    return this.missionsInternalOperationsService.managerEditSubtask(body)
  }

  @Post('manager/retry-subtask')
  @HttpCode(HttpStatus.OK)
  async managerRetrySubtask(
    @Body(new ZodValidationPipe(ManagerRetrySubtaskDtoSchema))
    body: ManagerRetrySubtaskDto,
  ) {
    return this.missionsInternalOperationsService.managerRetrySubtask(body)
  }
}
