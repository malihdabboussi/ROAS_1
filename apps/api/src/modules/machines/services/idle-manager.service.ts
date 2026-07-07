import { Injectable, Logger } from '@nestjs/common'
import { resolveMachineProfileColumns, SupabaseServiceClient } from '@vibey/api-shared'
import { MachinesRepository } from '../repositories/machines.repository'
import { MachineReconciliationService } from './machine-reconciliation.service'
import { MachinesService } from './machines.service'

@Injectable()
export class IdleManagerService {
  private readonly logger = new Logger(IdleManagerService.name)
  private readonly machineColumns = resolveMachineProfileColumns(process.env)
  private readonly IDLE_THRESHOLD_MS = parseInt(
    process.env.MACHINE_IDLE_THRESHOLD_MS ?? String(15 * 60 * 1000),
    10,
  )
  private readonly HOURLY_RATE = parseFloat(process.env.FLY_MACHINE_HOURLY_RATE ?? '0.0226')
  private readonly STALE_THRESHOLD_DAYS = parseInt(
    process.env.MACHINE_STALE_THRESHOLD_DAYS ?? '30',
    10,
  )
  private lastCleanupDate: string | null = null
  private statusCountsCache: { data: Array<{ status: string; count: number }>; ts: number } | null =
    null
  private readonly STATUS_CACHE_TTL = 60_000

  constructor(
    private readonly machines: MachinesService,
    private readonly machineReconciliation: MachineReconciliationService,
    private readonly svc: SupabaseServiceClient,
    private readonly machinesRepository: MachinesRepository,
  ) {}

  async checkIdleMachines(): Promise<{ checked: number; suspended: number }> {
    const cutoff = new Date(Date.now() - this.IDLE_THRESHOLD_MS).toISOString()

    const idleProfileRows = await this.machinesRepository.listIdleProfiles(cutoff, this.machineColumns)

    if (idleProfileRows.length === 0) {
      await this.recordSnapshot()
      await this.maybeCleanupStale()
      return { checked: 0, suspended: 0 }
    }

    this.logger.log(`Found ${idleProfileRows.length} idle machine(s) to suspend`)
    let suspended = 0

    for (const profile of idleProfileRows) {
      try {
        await this.machines.suspendIdleMachine(this.svc.client, profile.id)
        suspended++
      } catch (err) {
        this.logger.error(`Failed to suspend machine for user ${profile.id}: ${err}`)
      }
    }

    await this.recordSnapshot()
    await this.maybeCleanupStale()
    return { checked: idleProfileRows.length, suspended }
  }

  async cleanupStaleMachines(): Promise<{ checked: number; destroyed: number }> {
    const cutoff = new Date(
      Date.now() - this.STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString()

    const staleProfileRows = await this.machinesRepository.listStaleProfiles(
      cutoff,
      this.machineColumns,
    )

    if (staleProfileRows.length === 0) {
      return { checked: 0, destroyed: 0 }
    }

    this.logger.log(
      `Found ${staleProfileRows.length} stale machine(s) inactive >${this.STALE_THRESHOLD_DAYS}d`,
    )
    let destroyed = 0

    for (const profile of staleProfileRows) {
      try {
        await this.machines.destroyMachine(this.svc.client, profile.id)
        destroyed++
      } catch (err) {
        this.logger.error(`Failed to destroy stale machine for user ${profile.id}: ${err}`)
      }
    }

    this.logger.log(`Stale cleanup: checked=${staleProfileRows.length} destroyed=${destroyed}`)
    return { checked: staleProfileRows.length, destroyed }
  }

  private async maybeCleanupStale(): Promise<void> {
    const now = new Date()
    if (now.getUTCHours() !== 3) return
    const today = now.toISOString().slice(0, 10)
    if (this.lastCleanupDate === today) return
    this.lastCleanupDate = today
    try {
      await this.cleanupStaleMachines()
    } catch (err) {
      this.logger.error(`Stale machine cleanup failed: ${err}`)
    }
  }

  async getMachineStats(): Promise<{
    live: {
      total: number
      running: number
      suspended: number
      failed: number
      alwaysOn: number
    }
    fly: {
      total: number
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
    costs: {
      estimatedMonthlyCost: number
      estimatedDailyCost: number
      avgRunningMachines24h: number
      avgRunningMachines7d: number
      avgActiveHoursPerMachine7d: number
    }
    trends: {
      running7d: Array<{ date: string; avg: number }>
      cost7d: Array<{ date: string; cost: number }>
      running30d: Array<{ date: string; avg: number }>
      cost30d: Array<{ date: string; cost: number }>
    }
  }> {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      statusCountsData,
      runtimeInspection,
      alwaysOnProfileIds,
      snapshots24h,
      snapshots7d,
      snapshots30d,
    ] = await Promise.all([
      this.getCachedStatusCounts(),
      this.machineReconciliation.inspectRuntimeState(),
      this.machinesRepository.listPublishedRunningProfileIds(this.machineColumns),
      this.machinesRepository.listMachineStatusSnapshots(oneDayAgo),
      this.machinesRepository.listMachineStatusSnapshots(sevenDaysAgo),
      this.machinesRepository.listMachineStatusSnapshots(thirtyDaysAgo),
    ])

    const countMap = new Map(statusCountsData.map((r) => [r.status, r.count]))
    const running = countMap.get('running') ?? 0
    const suspended = countMap.get('suspended') ?? 0
    const failed = countMap.get('failed') ?? 0
    const total = running + suspended + failed + (countMap.get('none') ?? 0)
    const alwaysOn = new Set(alwaysOnProfileIds).size

    const avg24h = this.avgRunning(snapshots24h)
    const avg7d = this.avgRunning(snapshots7d)
    const billableRunning = runtimeInspection.fly.started

    const totalSnaps7d = snapshots7d.length
    const totalMachines7d = total || 1
    const avgActiveHours = totalSnaps7d > 0 ? (avg7d * totalSnaps7d * 5) / 60 / totalMachines7d : 0

    return {
      live: { total, running, suspended, failed, alwaysOn },
      fly: {
        total: runtimeInspection.checked.flyMachines,
        started: runtimeInspection.fly.started,
        stopped: runtimeInspection.fly.stopped,
        suspended: runtimeInspection.fly.suspended,
        destroyed: runtimeInspection.fly.destroyed,
        unknown: runtimeInspection.fly.unknown,
      },
      drift: runtimeInspection.drift,
      costs: {
        estimatedMonthlyCost: billableRunning * this.HOURLY_RATE * 730,
        estimatedDailyCost: billableRunning * this.HOURLY_RATE * 24,
        avgRunningMachines24h: avg24h,
        avgRunningMachines7d: avg7d,
        avgActiveHoursPerMachine7d: Math.round(avgActiveHours * 10) / 10,
      },
      trends: {
        running7d: this.aggregateByDay(snapshots7d, 'running'),
        cost7d: this.aggregateCostByDay(snapshots7d),
        running30d: this.aggregateByDay(snapshots30d, 'running'),
        cost30d: this.aggregateCostByDay(snapshots30d),
      },
    }
  }

  private async getCachedStatusCounts(): Promise<Array<{ status: string; count: number }>> {
    if (this.statusCountsCache && Date.now() - this.statusCountsCache.ts < this.STATUS_CACHE_TTL) {
      return this.statusCountsCache.data
    }
    const counts = await this.machinesRepository.getMachineStatusCounts(this.machineColumns.environment)
    this.statusCountsCache = { data: counts, ts: Date.now() }
    return counts
  }

  private async recordSnapshot(): Promise<void> {
    try {
      const counts = await this.getCachedStatusCounts()
      const countMap = new Map(counts.map((r) => [r.status, r.count]))
      const running = countMap.get('running') ?? 0
      const suspended = countMap.get('suspended') ?? 0
      const failed = countMap.get('failed') ?? 0
      const noneStatus = countMap.get('none') ?? 0
      const total = running + suspended + failed + noneStatus

      const alwaysOn = await this.machinesRepository.countRunningProfilesWithMachines(
        this.machineColumns,
      )

      await this.machinesRepository.insertMachineStatusSnapshot({
        total,
        running,
        suspended,
        failed,
        noneStatus,
        alwaysOn,
        estimatedHourlyCost: running * this.HOURLY_RATE,
      })
    } catch (err) {
      this.logger.warn(`Failed to record machine snapshot: ${err}`)
    }
  }

  private avgRunning(snapshots: Array<{ running: number }>): number {
    if (snapshots.length === 0) return 0
    const sum = snapshots.reduce((acc, s) => acc + (s.running ?? 0), 0)
    return Math.round((sum / snapshots.length) * 10) / 10
  }

  private aggregateByDay(
    snapshots: Array<{ snapshot_at: string; running: number }>,
    _field: string,
  ): Array<{ date: string; avg: number }> {
    const byDay = new Map<string, number[]>()
    for (const s of snapshots) {
      const day = s.snapshot_at.slice(0, 10)
      const arr = byDay.get(day) ?? []
      arr.push(s.running ?? 0)
      byDay.set(day, arr)
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
      }))
  }

  private aggregateCostByDay(
    snapshots: Array<{ snapshot_at: string; estimated_hourly_cost: number }>,
  ): Array<{ date: string; cost: number }> {
    const byDay = new Map<string, number[]>()
    for (const s of snapshots) {
      const day = s.snapshot_at.slice(0, 10)
      const arr = byDay.get(day) ?? []
      arr.push(Number(s.estimated_hourly_cost) || 0)
      byDay.set(day, arr)
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        cost: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 24 * 100) / 100,
      }))
  }
}
