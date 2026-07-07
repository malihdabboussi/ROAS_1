import { MachinesServiceBase03 } from './machines-service-03.base'
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildMachineProfileUpdate,
  ErrorReporter,
  resolveMachineProfileColumns,
  resolveMachineProfileRow,
} from '@vibey/api-shared'
import { MachineProfileRepository } from '../repositories/machine-profile.repository'
import { FlyMachineStateService } from './fly-machine-state.service'
import { MachinePoolService } from './machine-pool.service'
import {
  MachineRuntimeCapabilitiesService,
  type AgentRuntimeRequirement,
  type RuntimeCapabilityProbeResult,
} from './machine-runtime-capabilities.service'
import {
  MachineWakeAttemptsService,
  type MachineWakeAttemptStatus,
  type MachineWakePhase,
} from './machine-wake-attempts.service'

type ReportedError = Error & { __appErrorReported?: true }

type MachineBootProfile = 'full' | 'runtime-chat'

interface EnsureRunningOptions {
  requiredRuntime?: AgentRuntimeRequirement
}

interface ProvisionOptions {
  bootProfile?: MachineBootProfile
}

type FlyMachineConfig = Record<string, unknown> & {
  env?: Record<string, string>
}

type FailWakeFn = (
  phase: MachineWakePhase,
  status: Extract<MachineWakeAttemptStatus, 'failed_retryable' | 'failed_terminal'>,
  failureCode: string,
  message: string,
  machineIdForFailure?: string | null,
  appForFailure?: string | null,
  metadata?: Record<string, unknown>,
) => Promise<void>

function markAppErrorReported(error: Error): ReportedError {
  ;(error as ReportedError).__appErrorReported = true
  return error as ReportedError
}

@Injectable()
export class MachinesService extends MachinesServiceBase03 {
  constructor(
    errorReporter: ErrorReporter,
    @Inject(forwardRef(() => MachinePoolService)) machinePool: MachinePoolService,
    flyState: FlyMachineStateService,
    runtimeCapabilities: MachineRuntimeCapabilitiesService,
    wakeAttempts: MachineWakeAttemptsService,
    machineProfileRepository: MachineProfileRepository,
  ) {
    super(
      errorReporter,
      machinePool,
      flyState,
      runtimeCapabilities,
      wakeAttempts,
      machineProfileRepository,
    )
  }
}
