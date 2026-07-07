import { Injectable } from '@nestjs/common'
import type { Job } from 'bullmq'
import type { MissionJobData, MissionJobResult } from '../types'
import { MissionCommentDirectiveService } from './phases/mission-comment-directive.service'
import { MissionExecutePhaseService } from './phases/mission-execute-phase.service'
import { MissionPlanPhaseService } from './phases/mission-plan-phase.service'
import { MissionReviewPhaseService } from './phases/mission-review-phase.service'
import { MissionSubtaskTriageService } from './phases/mission-subtask-triage.service'

@Injectable()
export class MissionsService {
  constructor(
    private readonly planPhase: MissionPlanPhaseService,
    private readonly executePhase: MissionExecutePhaseService,
    private readonly reviewPhase: MissionReviewPhaseService,
    private readonly triagePhase: MissionSubtaskTriageService,
    private readonly directivePhase: MissionCommentDirectiveService,
  ) {}

  async processMission(job: Job<MissionJobData>): Promise<MissionJobResult> {
    switch (job.data.phase) {
      case 'plan':
        return this.planPhase.process(job)
      case 'execute':
        return this.executePhase.process(job)
      case 'review':
        return this.reviewPhase.process(job)
      case 'triage':
        return this.triagePhase.process(job)
      case 'directive':
        return this.directivePhase.process(job)
      default:
        throw new Error(`Unknown mission phase: ${job.data.phase}`)
    }
  }
}
