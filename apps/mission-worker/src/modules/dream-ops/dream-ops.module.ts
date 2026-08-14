import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { BrainOpsModule } from '../brain-ops/brain-ops.module'
import { AgentRuntimeService } from '../missions/services/agent-runtime.service'
import { AgentSignalService } from '../missions/services/agent-signal.service'
import { MissionContextService } from '../missions/services/context/mission-context.service'
import { MissionOpenclawGateway } from '../missions/services/gateways/mission-openclaw.gateway'
import { MissionExecBroadcastService } from '../missions/services/mission-exec-broadcast.service'
import { MissionTracingService } from '../missions/services/mission-tracing.service'
import { MissionDeliverablesRepository } from '../missions/services/persistence/mission-deliverables.repository'
import { MissionQualityEvidenceRepository } from '../missions/services/persistence/mission-quality-evidence.repository'
import { MissionStateRepository } from '../missions/services/persistence/mission-state.repository'
import { MissionJsonService } from '../missions/services/utils/mission-json.service'
import { AgentLearningDreamCollectorService } from './agent-learning-dream-collector.service'
import { AgentLearningDreamJaimeService } from './agent-learning-dream-jaime.service'
import { AgentLearningDreamRunnerService } from './agent-learning-dream-runner.service'
import { AgentLearningDreamTriageService } from './agent-learning-dream-triage.service'
import { DreamOpsEligibilityService } from './dream-ops-eligibility.service'
import { DreamOpsNightJanitorService } from './dream-ops-night-janitor.service'
import { DreamOpsOutboxDispatcherService } from './dream-ops-outbox-dispatcher.service'
import { DreamOpsProcessor } from './dream-ops.processor'
import { DreamOpsRepository } from './dream-ops.repository'
import { DREAM_OPS_BULL_QUEUE } from './types'

@Module({
  imports: [BullModule.registerQueue({ name: DREAM_OPS_BULL_QUEUE }), BrainOpsModule],
  providers: [
    DreamOpsRepository,
    DreamOpsEligibilityService,
    DreamOpsNightJanitorService,
    DreamOpsOutboxDispatcherService,
    DreamOpsProcessor,
    AgentLearningDreamCollectorService,
    AgentLearningDreamTriageService,
    AgentLearningDreamJaimeService,
    {
      provide: AgentLearningDreamRunnerService,
      useFactory: (
        repository: DreamOpsRepository,
        collector: AgentLearningDreamCollectorService,
        triage: AgentLearningDreamTriageService,
        jaime: AgentLearningDreamJaimeService,
      ) => AgentLearningDreamRunnerService.create(repository, collector, triage, jaime),
      inject: [
        DreamOpsRepository,
        AgentLearningDreamCollectorService,
        AgentLearningDreamTriageService,
        AgentLearningDreamJaimeService,
      ],
    },
    AgentRuntimeService,
    MissionOpenclawGateway,
    MissionContextService,
    AgentSignalService,
    MissionStateRepository,
    MissionDeliverablesRepository,
    MissionQualityEvidenceRepository,
    MissionJsonService,
    MissionTracingService,
    MissionExecBroadcastService,
  ],
})
export class DreamOpsModule {}
