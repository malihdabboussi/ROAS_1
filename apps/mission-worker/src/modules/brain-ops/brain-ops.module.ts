import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { AgentRuntimeService } from '../missions/services/agent-runtime.service'
import { AgentSignalService } from '../missions/services/agent-signal.service'
import { MissionContextService } from '../missions/services/context/mission-context.service'
import { MissionOpenclawGateway } from '../missions/services/gateways/mission-openclaw.gateway'
import { MissionExecBroadcastService } from '../missions/services/mission-exec-broadcast.service'
import { MissionTracingService } from '../missions/services/mission-tracing.service'
import { MissionDeliverablesRepository } from '../missions/services/persistence/mission-deliverables.repository'
import { MissionStateRepository } from '../missions/services/persistence/mission-state.repository'
import { MissionJsonService } from '../missions/services/utils/mission-json.service'
import { BrainOpsNightJanitorService } from './brain-ops-night-janitor.service'
import { BrainOpsOutboxDispatcherService } from './brain-ops-outbox-dispatcher.service'
import { BrainOpsProcessor } from './brain-ops.processor'
import { CompanyCortexDreamCollectorService } from './company-cortex-dream-collector.service'
import { CompanyCortexDreamRunRepository } from './company-cortex-dream-run.repository'
import { CompanyCortexFormationService } from './company-cortex-formation.service'
import { CompanyCortexObjectRepository } from './company-cortex-object.repository'
import { CompanyCortexSignalRepository } from './company-cortex-signal.repository'
import { CompanyDailyDreamAtlasService } from './company-daily-dream-atlas.service'
import { CompanyDailyDreamRunnerService } from './company-daily-dream-runner.service'
import { CompanyDreamSemanticClassifierService } from './company-dream-semantic-classifier.service'
import { CompanyDreamSignalTriageService } from './company-dream-signal-triage.service'
import { CustomerInteractionExtractionService } from './customer-interaction-extraction.service'
import { CustomerSignalSweeperService } from './customer-signal-sweeper.service'
import { BRAIN_OPS_QUEUE } from './types'

@Module({
  imports: [BullModule.registerQueue({ name: BRAIN_OPS_QUEUE })],
  providers: [
    BrainOpsProcessor,
    BrainOpsNightJanitorService,
    BrainOpsOutboxDispatcherService,
    CustomerInteractionExtractionService,
    CustomerSignalSweeperService,
    CompanyCortexDreamCollectorService,
    CompanyCortexDreamRunRepository,
    CompanyCortexFormationService,
    CompanyCortexObjectRepository,
    CompanyCortexSignalRepository,
    CompanyDailyDreamAtlasService,
    CompanyDreamSemanticClassifierService,
    {
      provide: CompanyDreamSignalTriageService,
      useFactory: (semanticClassifier: CompanyDreamSemanticClassifierService) =>
        new CompanyDreamSignalTriageService({ semanticClassifier }),
      inject: [CompanyDreamSemanticClassifierService],
    },
    {
      provide: CompanyDailyDreamRunnerService,
      useFactory: (
        runRepository: CompanyCortexDreamRunRepository,
        collector: CompanyCortexDreamCollectorService,
        triage: CompanyDreamSignalTriageService,
        atlas: CompanyDailyDreamAtlasService,
      ) => new CompanyDailyDreamRunnerService({ runRepository, collector, triage, atlas }),
      inject: [
        CompanyCortexDreamRunRepository,
        CompanyCortexDreamCollectorService,
        CompanyDreamSignalTriageService,
        CompanyDailyDreamAtlasService,
      ],
    },
    AgentRuntimeService,
    MissionOpenclawGateway,
    MissionContextService,
    AgentSignalService,
    MissionStateRepository,
    MissionDeliverablesRepository,
    MissionJsonService,
    MissionTracingService,
    MissionExecBroadcastService,
  ],
  exports: [CompanyDailyDreamRunnerService],
})
export class BrainOpsModule {}
