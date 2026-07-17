import { Injectable, Logger } from '@nestjs/common'
import { resolveMachineProfileColumns } from '@vibey/api-shared'
import {
  MachinesRepository,
  type MachinePoolRow,
  type MachineReconciliationProfileRow,
} from '../repositories/machines.repository'
import {
  FlyMachineStateService,
  type FlyMachineState,
  type FlyMachineSummary,
} from './fly-machine-state.service'
import { MachinesService } from './machines.service'

export interface MachineReconciliationReport {
  checked: {
    flyMachines: number
    profileMachines: number
    poolMachines: number
  }
  fly: {
    started: number
    stopped: number
    suspended: number
    destroyed: number
    unknown: number
  }
  drift: {
    startedProfileDrift: number
    startedPoolDrift: number
    startedOrphanDrift: number
    dbRunningNotStarted: number
    dbRunningMissingFly: number
    dbStartingStale: number
  }
  actions: {
    stoppedProfileMachines: number
    stoppedPoolMachines: number
    stoppedOrphanMachines: number
    markedDbSuspended: number
    markedDbUnknown: number
    failedStops: number
    failedResets: number
    failedUpdates: number
  }
  machineIds: {
    stoppedProfileMachines: string[]
    stoppedPoolMachines: string[]
    stoppedOrphanMachines: string[]
    markedDbSuspended: string[]
    markedDbUnknown: string[]
    failedStops: string[]
    failedResets: string[]
    failedUpdates: string[]
  }
}

interface ReconciliationContext {
  flyMachines: FlyMachineSummary[]
  profilesByMachineId: Map<string, MachineReconciliationProfileRow>
  poolByMachineId: Map<string, MachinePoolRow>
}

@Injectable()
export class MachineReconciliationService {
  private readonly logger = new Logger(MachineReconciliationService.name)
  private readonly machineColumns = resolveMachineProfileColumns(process.env)
  private readonly flyRuntimeApp = process.env.FLY_RUNTIME_APP ?? 'roas-runtimes'
  private readonly staleStartingThresholdMs = Number.parseInt(
    process.env.MACHINE_STALE_STARTING_THRESHOLD_MS ?? String(10 * 60 * 1000),
    10,
  )

  constructor(
    private readonly flyState: FlyMachineStateService,
    private readonly machinesService: MachinesService,
    private readonly machinesRepository: MachinesRepository,
  ) {}

  async inspectRuntimeState(): Promise<MachineReconciliationReport> {
    const context = await this.loadContext()
    return this.buildReport(context)
  }

  async reconcileRuntimeState(): Promise<MachineReconciliationReport> {
    const context = await this.loadContext()
    const report = this.buildReport(context)

    const flyById = new Map(context.flyMachines.map((machine) => [machine.id, machine]))

    for (const machine of context.flyMachines) {
      if (machine.state !== 'started') continue

      const profile = context.profilesByMachineId.get(machine.id)
      const pool = context.poolByMachineId.get(machine.id)

      if (!profile && !pool && this.isSharedRuntime(machine)) continue

      if (profile) {
        if (profile.runtimeStatus === 'running') continue
        const stopped = await this.stopDriftMachine(machine, profile.runtimeApp)
        if (stopped) {
          report.actions.stoppedProfileMachines++
          report.machineIds.stoppedProfileMachines.push(machine.id)
        } else {
          report.actions.failedStops++
          report.machineIds.failedStops.push(machine.id)
        }
        continue
      }

      if (pool) {
        const reset = await this.resetDriftMachine(machine, pool.fly_app)
        if (!reset) {
          report.actions.failedResets++
          report.machineIds.failedResets.push(machine.id)
          continue
        }
        const stopped = await this.stopDriftMachine(machine, pool.fly_app)
        if (stopped) {
          report.actions.stoppedPoolMachines++
          report.machineIds.stoppedPoolMachines.push(machine.id)
        } else {
          report.actions.failedStops++
          report.machineIds.failedStops.push(machine.id)
        }
        continue
      }

      const reset = await this.resetDriftMachine(machine, this.flyRuntimeApp)
      if (!reset) {
        report.actions.failedResets++
        report.machineIds.failedResets.push(machine.id)
        continue
      }
      const stopped = await this.stopDriftMachine(machine, this.flyRuntimeApp)
      if (stopped) {
        report.actions.stoppedOrphanMachines++
        report.machineIds.stoppedOrphanMachines.push(machine.id)
      } else {
        report.actions.failedStops++
        report.machineIds.failedStops.push(machine.id)
      }
    }

    for (const profile of context.profilesByMachineId.values()) {
      const machine = flyById.get(profile.machineId)
      if (profile.runtimeStatus === 'starting' && this.isStaleStarting(profile)) {
        const updated =
          !machine || this.isStoppedLike(machine.state)
            ? await this.markProfileSuspended(profile)
            : await this.markProfileUnknown(profile)
        if (updated) {
          if (!machine || this.isStoppedLike(machine.state)) {
            report.actions.markedDbSuspended++
            report.machineIds.markedDbSuspended.push(profile.machineId)
          } else {
            report.actions.markedDbUnknown++
            report.machineIds.markedDbUnknown.push(profile.machineId)
          }
        } else {
          report.actions.failedUpdates++
          report.machineIds.failedUpdates.push(profile.machineId)
        }
        continue
      }

      if (profile.runtimeStatus !== 'running') continue

      if (!machine || !this.isStoppedLike(machine.state)) continue

      const updated = await this.markProfileSuspended(profile)
      if (updated) {
        report.actions.markedDbSuspended++
        report.machineIds.markedDbSuspended.push(profile.machineId)
      } else {
        report.actions.failedUpdates++
        report.machineIds.failedUpdates.push(profile.machineId)
      }
    }

    this.logger.log(
      `Machine reconciliation: profileStops=${report.actions.stoppedProfileMachines} poolStops=${report.actions.stoppedPoolMachines} orphanStops=${report.actions.stoppedOrphanMachines} markedDbSuspended=${report.actions.markedDbSuspended} markedDbUnknown=${report.actions.markedDbUnknown} failedStops=${report.actions.failedStops} failedResets=${report.actions.failedResets} failedUpdates=${report.actions.failedUpdates}`,
    )

    return report
  }

  private async loadContext(): Promise<ReconciliationContext> {
    const [flyMachines, profileRows, poolRows] = await Promise.all([
      this.flyState.listMachines(this.flyRuntimeApp),
      this.loadProfileRows(),
      this.loadPoolRows(),
    ])

    return {
      flyMachines,
      profilesByMachineId: new Map(profileRows.map((profile) => [profile.machineId, profile])),
      poolByMachineId: new Map(poolRows.map((pool) => [pool.machine_id, pool])),
    }
  }

  private async loadProfileRows(): Promise<MachineReconciliationProfileRow[]> {
    return this.machinesRepository.listReconciliationProfileRows(this.machineColumns)
  }

  private async loadPoolRows(): Promise<MachinePoolRow[]> {
    return this.machinesRepository.listMachinePoolRows()
  }

  private buildReport(context: ReconciliationContext): MachineReconciliationReport {
    const report = this.emptyReport(context)
    const flyById = new Map(context.flyMachines.map((machine) => [machine.id, machine]))

    for (const machine of context.flyMachines) {
      report.fly[machine.state]++

      if (machine.state !== 'started') continue

      const profile = context.profilesByMachineId.get(machine.id)
      const pool = context.poolByMachineId.get(machine.id)

      if (profile) {
        if (profile.runtimeStatus !== 'running') {
          report.drift.startedProfileDrift++
        }
      } else if (pool) {
        report.drift.startedPoolDrift++
      } else if (!this.isSharedRuntime(machine)) {
        report.drift.startedOrphanDrift++
      }
    }

    for (const profile of context.profilesByMachineId.values()) {
      if (profile.runtimeStatus === 'starting' && this.isStaleStarting(profile)) {
        report.drift.dbStartingStale++
      }
      if (profile.runtimeStatus !== 'running') continue

      const machine = flyById.get(profile.machineId)
      if (!machine) {
        report.drift.dbRunningMissingFly++
      } else if (this.isStoppedLike(machine.state)) {
        report.drift.dbRunningNotStarted++
      }
    }

    return report
  }

  private emptyReport(context: ReconciliationContext): MachineReconciliationReport {
    return {
      checked: {
        flyMachines: context.flyMachines.length,
        profileMachines: context.profilesByMachineId.size,
        poolMachines: context.poolByMachineId.size,
      },
      fly: {
        started: 0,
        stopped: 0,
        suspended: 0,
        destroyed: 0,
        unknown: 0,
      },
      drift: {
        startedProfileDrift: 0,
        startedPoolDrift: 0,
        startedOrphanDrift: 0,
        dbRunningNotStarted: 0,
        dbRunningMissingFly: 0,
        dbStartingStale: 0,
      },
      actions: {
        stoppedProfileMachines: 0,
        stoppedPoolMachines: 0,
        stoppedOrphanMachines: 0,
        markedDbSuspended: 0,
        markedDbUnknown: 0,
        failedStops: 0,
        failedResets: 0,
        failedUpdates: 0,
      },
      machineIds: {
        stoppedProfileMachines: [],
        stoppedPoolMachines: [],
        stoppedOrphanMachines: [],
        markedDbSuspended: [],
        markedDbUnknown: [],
        failedStops: [],
        failedResets: [],
        failedUpdates: [],
      },
    }
  }

  private async resetDriftMachine(
    machine: FlyMachineSummary,
    appName: string | null,
  ): Promise<boolean> {
    const app = appName || this.flyRuntimeApp
    try {
      const reset = await this.machinesService.resetMachineIdentity(machine.id, app)
      if (!reset) {
        this.logger.error(`Failed to reset drift machine ${machine.id}`)
      }
      return reset
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.error(`Reset request failed for drift machine ${machine.id}: ${message}`)
      return false
    }
  }

  private async stopDriftMachine(
    machine: FlyMachineSummary,
    appName: string | null,
  ): Promise<boolean> {
    const app = appName || this.flyRuntimeApp
    try {
      await this.flyState.stopMachine(machine.id, app)
      const stoppedState = await this.flyState.waitForState(
        machine.id,
        app,
        ['stopped', 'suspended'],
        60_000,
      )
      return Boolean(stoppedState)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.error(`Failed to stop drift machine ${machine.id}: ${message}`)
      return false
    }
  }

  private async markProfileSuspended(profile: MachineReconciliationProfileRow): Promise<boolean> {
    const errorMessage = await this.machinesRepository.updateReconciliationProfileStatus(
      this.machineColumns,
      {
        id: profile.id,
        machineId: profile.machineId,
        runtimeStatus: 'suspended',
        machineStatus: 'suspended',
      },
    )

    if (errorMessage) {
      this.logger.error(`Failed to mark profile ${profile.id} suspended: ${errorMessage}`)
      return false
    }

    return true
  }

  private async markProfileUnknown(profile: MachineReconciliationProfileRow): Promise<boolean> {
    const errorMessage = await this.machinesRepository.updateReconciliationProfileStatus(
      this.machineColumns,
      {
        id: profile.id,
        machineId: profile.machineId,
        runtimeStatus: 'unknown',
        machineStatus: 'unknown',
      },
    )

    if (errorMessage) {
      this.logger.error(`Failed to mark profile ${profile.id} unknown: ${errorMessage}`)
      return false
    }

    return true
  }

  private isStaleStarting(profile: MachineReconciliationProfileRow): boolean {
    if (profile.runtimeStatus !== 'starting') return false
    const lastActivity = profile.lastActivityAt ? new Date(profile.lastActivityAt).getTime() : 0
    if (!Number.isFinite(lastActivity) || lastActivity <= 0) return true
    return Date.now() - lastActivity > this.staleStartingThresholdMs
  }

  private isSharedRuntime(machine: FlyMachineSummary): boolean {
    return machine.env.AGENT_RUNTIME_MODE === 'shared'
  }

  private isStoppedLike(state: FlyMachineState): boolean {
    switch (state) {
      case 'stopped':
      case 'suspended':
        return true
      case 'started':
      case 'destroyed':
      case 'destroying':
      case 'unknown':
        return false
      default: {
        const exhaustive: never = state
        return exhaustive
      }
    }
  }
}
