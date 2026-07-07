import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common'
import {
  MachinePoolRepository,
  type FailedPoolMachine,
} from '../repositories/machine-pool.repository'
import { MachinesService } from './machines.service'

interface ClaimResult {
  machineId: string
  flyApp: string
}

export interface PoolStatus {
  ready: number
  provisioning: number
  claimed: number
  failed: number
  oldestReadyAge: number | null
}

@Injectable()
export class MachinePoolService {
  private readonly logger = new Logger(MachinePoolService.name)
  private readonly poolReplenishEnabled = process.env.MACHINE_POOL_REPLENISH_ENABLED === 'true'
  private readonly poolSize = Number.parseInt(process.env.MACHINE_POOL_SIZE ?? '5', 10)
  private readonly flyRegion = process.env.FLY_REGION ?? 'iad'

  constructor(
    @Inject(forwardRef(() => MachinesService))
    private readonly machinesService: MachinesService,
    private readonly poolRepository: MachinePoolRepository,
  ) {}

  async getStatus(): Promise<PoolStatus> {
    const rows = await this.poolRepository.listPoolStatusRows()
    const counts = { ready: 0, provisioning: 0, claimed: 0, failed: 0 }
    let oldestReady: number | null = null
    const now = Date.now()
    for (const row of rows) {
      if (row.state in counts) counts[row.state as keyof typeof counts] += 1
      if (row.state === 'ready') {
        const age = now - new Date(row.created_at).getTime()
        if (oldestReady === null || age > oldestReady) oldestReady = age
      }
    }
    return { ...counts, oldestReadyAge: oldestReady }
  }

  async replenishPool(targetSize = this.poolSize): Promise<{ created: number; skipped: string }> {
    if (!this.poolReplenishEnabled) {
      return { created: 0, skipped: 'MACHINE_POOL_REPLENISH_ENABLED=false' }
    }
    if (!this.machinesService.flyApiToken) {
      return { created: 0, skipped: 'FLY_API_TOKEN not configured' }
    }

    const recovered = await this.recoverFailedPoolMachines(targetSize)
    const countResult = await this.poolRepository.countActivePoolMachines()
    if (countResult.errorMessage) {
      this.logger.error(`Failed to count pool: ${countResult.errorMessage}`)
      return { created: 0, skipped: 'count_failed' }
    }

    const currentCount = countResult.count
    const toCreate = Math.max(0, targetSize - currentCount)
    if (toCreate === 0) {
      return {
        created: 0,
        skipped: `pool already at ${currentCount}/${targetSize}; recovered=${recovered}`,
      }
    }

    this.logger.log(
      `Replenishing pool: current=${currentCount}, target=${targetSize}, creating=${toCreate}`,
    )

    const results = await Promise.allSettled(
      Array.from({ length: toCreate }, () => this.createPoolMachine()),
    )
    const successes = results.filter((r) => r.status === 'fulfilled').length
    this.logger.log(`Pool replenish done: ${successes}/${toCreate} created; recovered=${recovered}`)
    return { created: successes, skipped: '' }
  }

  private async recoverFailedPoolMachines(targetSize: number): Promise<number> {
    const failedResult = await this.poolRepository.listFailedPoolMachines(targetSize)
    if (failedResult.errorMessage) {
      this.logger.error(`Failed to fetch failed pool machines: ${failedResult.errorMessage}`)
      return 0
    }

    let recovered = 0
    const failedMachines = failedResult.data
    for (const machine of failedMachines) {
      const healthy = await this.retestFailedMachine(machine)
      if (healthy) {
        const reset = await this.machinesService.resetMachineIdentity(
          machine.machine_id,
          machine.fly_app,
        )
        if (!reset) {
          this.logger.error(`Failed to reset recovered pool machine ${machine.machine_id}`)
        } else {
          const stopped = await this.stopPoolMachine(machine.machine_id, machine.fly_app)
          if (stopped) {
            const updateError = await this.poolRepository.markPoolMachineReady(machine.machine_id)
            if (updateError) {
              this.logger.error(
                `Failed to return recovered machine ${machine.machine_id} to pool: ${updateError}`,
              )
            } else {
              recovered += 1
              this.logger.log(`Recovered failed pool machine ${machine.machine_id}`)
              continue
            }
          }
        }
      }

      await this.destroyFailedPoolMachine(machine.machine_id, machine.fly_app)
    }

    return recovered
  }

  private async retestFailedMachine(machine: FailedPoolMachine): Promise<boolean> {
    this.logger.log(
      `Retesting failed pool machine ${machine.machine_id} (${machine.failed_reason ?? 'unknown'})`,
    )
    const started = await this.machinesService.startMachine(machine.machine_id, machine.fly_app)
    if (!started) return false
    return this.machinesService.waitForMachineHealth(machine.machine_id, machine.fly_app)
  }

  async createPoolMachine(): Promise<string | null> {
    const targetApp = this.machinesService.flyRuntimeApp
    const appImage = await this.machinesService.resolveFlyImageRef(targetApp)

    const poolMachineName = `vibey-pool-${Date.now()}-${Math.floor(Math.random() * 10000)}`

    const createRes = await fetch(`${this.machinesService.flyApiBase}/apps/${targetApp}/machines`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.machinesService.flyApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: poolMachineName,
        region: this.flyRegion,
        config: {
          image: appImage,
          env: {
            USER_ID: '',
            PORT: '3003',
            FLY_PROCESS_GROUP: 'app',
            PRIMARY_REGION: this.flyRegion,
            VIBEY_POOL_MACHINE: 'true',
            AGENT_API_BOOT_PROFILE: 'full',
          },
          metadata: {
            user_id: 'pool',
            pool_state: 'provisioning',
            fly_process_group: 'app',
            fly_platform_version: 'v2',
          },
          services: [
            {
              protocol: 'tcp',
              internal_port: 3003,
              autostop: false,
              autostart: false,
              min_machines_running: 0,
              ports: [
                { port: 80, handlers: ['http'], force_https: true },
                { port: 443, handlers: ['http', 'tls'] },
              ],
              checks: [
                {
                  type: 'http',
                  interval: '30s',
                  timeout: '15s',
                  grace_period: '1m0s',
                  method: 'get',
                  path: '/api/health',
                },
              ],
            },
          ],
          guest: { cpus: 2, memory_mb: 4096, cpu_kind: 'shared' },
          restart: { policy: 'on-failure', max_retries: 10 },
        },
      }),
    })

    if (!createRes.ok) {
      const body = await createRes.text().catch(() => '')
      this.logger.error(`Pool machine create failed: ${createRes.status} ${body.slice(0, 300)}`)
      return null
    }

    const machine = (await createRes.json()) as { id: string }
    const machineId = machine.id

    const insertError = await this.poolRepository.insertProvisioningPoolMachine(machineId, targetApp)
    if (insertError) {
      this.logger.error(`Failed to insert pool row for ${machineId}: ${insertError}`)
    }

    const healthy = await this.machinesService.waitForMachineHealth(machineId, targetApp)
    if (!healthy) {
      this.logger.error(`Pool machine ${machineId} failed health check; marking failed`)
      await this.poolRepository.markPoolMachineFailed(machineId, 'health_check_timeout')
      return null
    }

    const stopped = await this.stopPoolMachine(machineId, targetApp)
    if (!stopped) {
      this.logger.warn(`Stop endpoint returned non-OK for ${machineId}; marking ready anyway`)
    }

    const updateError = await this.poolRepository.markPoolMachineReady(machineId)
    if (updateError) {
      this.logger.error(`Failed to mark pool row ready for ${machineId}: ${updateError}`)
    }

    this.logger.log(`Pool machine ${machineId} ready for claim`)
    return machineId
  }

  async claimFromPool(userId: string): Promise<ClaimResult | null> {
    const { data, errorMessage } = await this.poolRepository.claimPoolMachine(userId)
    if (errorMessage) {
      this.logger.error(`claim_pool_machine RPC failed: ${errorMessage}`)
      return null
    }
    const result = data
    if (!result?.claimed || !result.machine_id || !result.fly_app) {
      return null
    }
    return { machineId: result.machine_id, flyApp: result.fly_app }
  }

  async startClaimedMachine(
    machineId: string,
    flyApp: string,
  ): Promise<{ machineId: string; machineUrl: string }> {
    const machineUrl = `https://${flyApp}.fly.dev`
    const started = await this.machinesService.startMachine(machineId, flyApp)
    if (!started) {
      throw new Error(`Failed to start claimed pool machine ${machineId}`)
    }
    return { machineId, machineUrl }
  }

  private async stopPoolMachine(machineId: string, flyApp: string): Promise<boolean> {
    const stopRes = await fetch(
      `${this.machinesService.flyApiBase}/apps/${flyApp}/machines/${machineId}/stop`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.machinesService.flyApiToken}` },
        signal: AbortSignal.timeout(15_000),
      },
    ).catch((err: unknown) => {
      this.logger.warn(`Stop request errored for ${machineId}: ${(err as Error).message}`)
      return null
    })

    return stopRes?.ok === true
  }

  private async destroyFailedPoolMachine(machineId: string, flyApp: string): Promise<void> {
    const destroyRes = await fetch(
      `${this.machinesService.flyApiBase}/apps/${flyApp}/machines/${machineId}?force=true`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.machinesService.flyApiToken}` },
        signal: AbortSignal.timeout(30_000),
      },
    ).catch((err: unknown) => {
      this.logger.error(
        `Destroy request errored for failed pool machine ${machineId}: ${(err as Error).message}`,
      )
      return null
    })

    if (!destroyRes || (!destroyRes.ok && destroyRes.status !== 404)) {
      const body = destroyRes ? await destroyRes.text().catch(() => '') : ''
      this.logger.error(
        `Failed to destroy unhealthy pool machine ${machineId}: ${destroyRes?.status ?? 'no_response'} ${body.slice(0, 300)}`,
      )
      await this.poolRepository.markPoolMachineDestroyFailed(machineId)
      return
    }

    const error = await this.poolRepository.deletePoolMachine(machineId)
    if (error) {
      this.logger.error(`Failed to delete destroyed pool row ${machineId}: ${error}`)
    } else {
      this.logger.log(`Destroyed and removed unhealthy pool machine ${machineId}`)
    }
  }

  async releaseClaim(machineId: string): Promise<void> {
    await this.poolRepository.releaseClaimAsFailed(machineId)
  }
}
