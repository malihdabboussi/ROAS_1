import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { MissionsProcessor } from './processors/missions.processor'
import { AgentPatternEvaluator } from './services/agent-pattern-evaluator.service'
import { AgentRuntimeService } from './services/agent-runtime.service'
import { AgentSignalService } from './services/agent-signal.service'
import { AwarenessActionDispatcher } from './services/awareness-action-dispatcher.service'
import { CeoAwarenessRunner } from './services/ceo-awareness-runner.service'
import { CeoOperationalLoopService } from './services/ceo-operational-loop.service'
import { MissionContextService } from './services/context/mission-context.service'
import { DailyDigestService } from './services/daily-digest.service'
import { MissionOpenclawGateway } from './services/gateways/mission-openclaw.gateway'
import { HumanSubtaskNotifierService } from './services/human-subtask-notifier.service'
import { MissionExecBroadcastService } from './services/mission-exec-broadcast.service'
import { MissionTracingService } from './services/mission-tracing.service'
import { MissionsOutboxDispatcherService } from './services/missions.outbox-dispatcher.service'
import { MissionsScheduler } from './services/missions.scheduler'
import { MissionsSchedulerRecoveryService } from './services/missions.scheduler-recovery.service'
import { MissionsSchedulerStateTransitionsService } from './services/missions.scheduler-state-transitions.service'
import { MissionsService } from './services/missions.service'
import { MissionAgentStateService } from './services/persistence/mission-agent-state.service'
import { MissionDeliverablesRepository } from './services/persistence/mission-deliverables.repository'
import { MissionQualityEvidenceRepository } from './services/persistence/mission-quality-evidence.repository'
import { MissionStateRepository } from './services/persistence/mission-state.repository'
import { MissionCommentDirectiveService } from './services/phases/mission-comment-directive.service'
import { MissionExecutePhaseService } from './services/phases/mission-execute-phase.service'
import { MissionPhaseSupportService } from './services/phases/mission-phase-support.service'
import { MissionPlanPhaseService } from './services/phases/mission-plan-phase.service'
import { MissionReviewPhaseService } from './services/phases/mission-review-phase.service'
import { MissionSubtaskTriageService } from './services/phases/mission-subtask-triage.service'
import { SubtaskAbortRegistry } from './services/subtask-abort-registry.service'
import { UserNotificationEmitterService } from './services/user-notification-emitter.service'
import { MissionJsonService } from './services/utils/mission-json.service'
import { MISSIONS_QUEUE } from './types'

@Module({
  imports: [BullModule.registerQueue({ name: MISSIONS_QUEUE })],
  providers: [
    AgentRuntimeService,
    AgentSignalService,
    AgentPatternEvaluator,
    CeoAwarenessRunner,
    CeoOperationalLoopService,
    AwarenessActionDispatcher,
    DailyDigestService,
    MissionJsonService,
    MissionStateRepository,
    MissionDeliverablesRepository,
    MissionQualityEvidenceRepository,
    MissionContextService,
    MissionExecBroadcastService,
    MissionOpenclawGateway,
    MissionAgentStateService,
    MissionPhaseSupportService,
    SubtaskAbortRegistry,
    MissionPlanPhaseService,
    MissionExecutePhaseService,
    MissionSubtaskTriageService,
    MissionCommentDirectiveService,
    MissionReviewPhaseService,
    MissionsProcessor,
    MissionsOutboxDispatcherService,
    MissionsSchedulerStateTransitionsService,
    MissionsSchedulerRecoveryService,
    MissionsScheduler,
    MissionsService,
    MissionTracingService,
    UserNotificationEmitterService,
    HumanSubtaskNotifierService,
  ],
})
export class MissionsModule {}
