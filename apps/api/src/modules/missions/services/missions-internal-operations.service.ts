import { Injectable } from '@nestjs/common'
import type {
  AwarenessAmendDto,
  AwarenessAppendSubtasksDto,
  AwarenessCancelSubtaskDto,
  AwarenessEditSubtaskDto,
  AwarenessPauseMissionDto,
  AwarenessReplanDto,
  AwarenessRetrySubtaskDto,
  CreateDeliverableDto,
  CreateMissionPlanDto,
  InternalAwarenessCommentDto,
  InternalAwarenessNudgeSubtaskDto,
  InternalAwarenessProgressNotesDto,
  InternalAwarenessReassignDto,
  InternalAwarenessRetryDto,
  InternalMissionCallbackDto,
  ManagerAmendFieldsDto,
  ManagerAppendSubtasksDto,
  ManagerCancelSubtaskDto,
  ManagerEditSubtaskDto,
  ManagerPrepareReplanDto,
  ManagerRetrySubtaskDto,
} from '../dto'
import { MissionInternalService } from './mission-internal.service'

@Injectable()
export class MissionsInternalOperationsService {
  constructor(private readonly missionInternalService: MissionInternalService) {}

  async internalCreateDeliverable(dto: CreateDeliverableDto) {
    return this.missionInternalService.internalCreateDeliverable(dto)
  }

  async internalCreatePlan(dto: CreateMissionPlanDto) {
    return this.missionInternalService.internalCreatePlan(dto)
  }

  async internalCallback(dto: InternalMissionCallbackDto) {
    return this.missionInternalService.internalCallback(dto)
  }

  async managerAmendFields(dto: ManagerAmendFieldsDto) {
    return this.missionInternalService.managerAmendFields(dto)
  }

  async managerAppendSubtasks(dto: ManagerAppendSubtasksDto) {
    return this.missionInternalService.managerAppendSubtasks(dto)
  }

  async managerPrepareReplan(dto: ManagerPrepareReplanDto) {
    return this.missionInternalService.managerPrepareReplan(dto)
  }

  async managerCancelSubtask(dto: ManagerCancelSubtaskDto) {
    return this.missionInternalService.managerCancelSubtask(dto)
  }

  async managerEditSubtask(dto: ManagerEditSubtaskDto) {
    return this.missionInternalService.managerEditSubtask(dto)
  }

  async managerRetrySubtask(dto: ManagerRetrySubtaskDto) {
    return this.missionInternalService.managerRetrySubtask(dto)
  }

  async internalAwarenessRetry(dto: InternalAwarenessRetryDto) {
    return this.missionInternalService.internalAwarenessRetry(dto)
  }

  async internalAwarenessComment(dto: InternalAwarenessCommentDto) {
    return this.missionInternalService.internalAwarenessComment(dto)
  }

  async internalAwarenessReassign(dto: InternalAwarenessReassignDto) {
    return this.missionInternalService.internalAwarenessReassign(dto)
  }

  async internalAwarenessNudgeSubtask(dto: InternalAwarenessNudgeSubtaskDto) {
    return this.missionInternalService.internalAwarenessNudgeSubtask(dto)
  }

  async internalAwarenessProgressNotes(dto: InternalAwarenessProgressNotesDto) {
    return this.missionInternalService.internalAwarenessProgressNotes(dto)
  }

  async awarenessAppendSubtasks(dto: AwarenessAppendSubtasksDto) {
    return this.missionInternalService.awarenessAppendSubtasks(dto)
  }

  async awarenessCancelSubtask(dto: AwarenessCancelSubtaskDto) {
    return this.missionInternalService.awarenessCancelSubtask(dto)
  }

  async awarenessEditSubtask(dto: AwarenessEditSubtaskDto) {
    return this.missionInternalService.awarenessEditSubtask(dto)
  }

  async awarenessRetrySubtask(dto: AwarenessRetrySubtaskDto) {
    return this.missionInternalService.awarenessRetrySubtask(dto)
  }

  async awarenessReplan(dto: AwarenessReplanDto) {
    return this.missionInternalService.awarenessReplan(dto)
  }

  async awarenessPauseMission(dto: AwarenessPauseMissionDto) {
    return this.missionInternalService.awarenessPauseMission(dto)
  }

  async awarenessAmend(dto: AwarenessAmendDto) {
    return this.missionInternalService.awarenessAmend(dto)
  }

  async pushTelegramAwarenessPoint(userId: string, agentKey: string, content: string) {
    const [telegram, slack] = await Promise.all([
      this.missionInternalService.pushTelegramAwarenessPoint(userId, agentKey, content),
      this.missionInternalService.pushSlackAwarenessPoint(userId, agentKey, content),
    ])
    return { telegram, slack }
  }
}
