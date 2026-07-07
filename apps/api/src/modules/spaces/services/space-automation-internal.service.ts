import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  SpaceAutomationRunsRepository,
  type PausedAutomationRunState,
} from '../repositories/space-automation-runs.repository'
import { SpaceAutomationService } from './space-automation.service'

@Injectable()
export class SpaceAutomationInternalService {
  private readonly logger = new Logger(SpaceAutomationInternalService.name)

  constructor(
    private readonly automationService: SpaceAutomationService,
    private readonly configService: ConfigService,
    private readonly automationRunsRepo: SpaceAutomationRunsRepository = new SpaceAutomationRunsRepository(),
  ) {}

  async dispatchResume(
    spaceId: string,
    runStateId: string,
    taskStatus: 'done' | 'failed',
  ): Promise<void> {
    const supabase = this.automationRunsRepo.createServiceRoleClient(this.configService)
    const runState = await this.automationRunsRepo.findPausedResumeState(supabase, runStateId)

    if (!runState) {
      throw new BadRequestException('Run state not found or not paused')
    }

    const pausedRunState = runState as PausedAutomationRunState

    this.logger.log(
      `Resuming automation: runState=${runStateId} task_status=${taskStatus} space=${spaceId}`,
    )

    this.automationService
      .resumeAutomation(
        {
          supabase,
          userId: pausedRunState.user_id,
          orgId: pausedRunState.org_id ?? null,
          spaceId,
          itemId: pausedRunState.item_id,
          depth: 0,
        },
        runStateId,
        taskStatus,
      )
      .catch((err) => {
        this.logger.error(`Automation resume failed: ${err}`)
      })
  }
}
