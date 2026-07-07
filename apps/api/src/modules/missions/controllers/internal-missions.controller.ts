import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ZodValidationPipe } from '@vibey/api-shared'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import {
  CreateDeliverableDtoSchema,
  CreateMissionPlanDtoSchema,
  InternalCreateMissionDtoSchema,
  InternalMissionCallbackDtoSchema,
  type CreateDeliverableDto,
  type CreateMissionPlanDto,
  type InternalCreateMissionDto,
  type InternalMissionCallbackDto,
} from '../dto'
import { MissionsCreationService } from '../services/missions-creation.service'
import { MissionsInternalOperationsService } from '../services/missions-internal-operations.service'

@Controller('internal/missions')
@UseGuards(InternalAuthGuard)
export class InternalMissionsController {
  constructor(
    private readonly missionsCreationService: MissionsCreationService,
    private readonly missionsInternalOperationsService: MissionsInternalOperationsService,
  ) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(InternalCreateMissionDtoSchema))
    body: InternalCreateMissionDto,
  ) {
    return this.missionsCreationService.internalCreateMission(body)
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async callback(
    @Body(new ZodValidationPipe(InternalMissionCallbackDtoSchema))
    body: InternalMissionCallbackDto,
  ) {
    return this.missionsInternalOperationsService.internalCallback(body)
  }

  @Post('plan')
  @HttpCode(HttpStatus.CREATED)
  async createPlan(
    @Body(new ZodValidationPipe(CreateMissionPlanDtoSchema))
    body: CreateMissionPlanDto,
  ) {
    return this.missionsInternalOperationsService.internalCreatePlan(body)
  }

  @Post('deliverable')
  @HttpCode(HttpStatus.CREATED)
  async createDeliverable(
    @Body(new ZodValidationPipe(CreateDeliverableDtoSchema))
    body: CreateDeliverableDto,
  ) {
    return this.missionsInternalOperationsService.internalCreateDeliverable(body)
  }
}
