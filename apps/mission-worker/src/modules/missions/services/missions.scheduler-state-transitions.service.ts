import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '../../../lib/services/database.service'
import { AgentPatternEvaluator } from './agent-pattern-evaluator.service'
import { CeoAwarenessRunner } from './ceo-awareness-runner.service'
import { CeoOperationalLoopService } from './ceo-operational-loop.service'
import { DailyDigestService } from './daily-digest.service'

@Injectable()
export class MissionsSchedulerStateTransitionsService {
  private readonly logger = new Logger(MissionsSchedulerStateTransitionsService.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly evaluator: AgentPatternEvaluator,
    private readonly ceoOperationalLoop: CeoOperationalLoopService,
    private readonly awarenessRunner: CeoAwarenessRunner,
    private readonly dailyDigestService: DailyDigestService,
  ) {}

  async runOperationalLoop(): Promise<Set<string>> {
    if (!this.databaseService.hasPgPool()) return new Set<string>()
    if (process.env.AWARENESS_LOOP_ENABLED === 'false') return new Set<string>()
    const userOrgPairs = await this.evaluator.getUsersWithCLevelAgents()
    const actedPairs = new Set<string>()
    for (const { user_id: userId, org_id: orgId } of userOrgPairs) {
      const result = await this.ceoOperationalLoop.runForUser(userId, orgId).catch((err) => {
        this.logger.error(`Operational loop failed for ${userId}: ${err.message}`)
        return { acted: false, userId }
      })
      if (result.acted) actedPairs.add(`${userId}:${orgId ?? 'personal'}`)
    }
    return actedPairs
  }

  async runSignalIntelligence(actedPairs: Set<string>): Promise<void> {
    if (!this.databaseService.hasPgPool()) return
    if (process.env.AWARENESS_LOOP_ENABLED === 'false') return
    const userOrgPairs = await this.evaluator.getUsersWithCLevelAgents()
    for (const { user_id: userId, org_id: orgId } of userOrgPairs) {
      if (actedPairs.has(`${userId}:${orgId ?? 'personal'}`)) continue
      const shouldFire = await this.evaluator.shouldFireForUser(userId, undefined, orgId)
      if (shouldFire) {
        await this.awarenessRunner.run(userId, orgId).catch((err) => {
          this.logger.error(`Awareness session failed for ${userId}: ${err.message}`)
        })
      }
    }
  }

  async maybeRunDigests(): Promise<void> {
    return this.dailyDigestService.maybeRunDigests()
  }
}
