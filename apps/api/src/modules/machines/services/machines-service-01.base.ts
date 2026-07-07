import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
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

export abstract class MachinesServiceBase01 {
  // Abstract declarations for methods implemented by later base classes.
  abstract ensureRunning(...args: any[]): any;
  protected abstract promoteWorkRuntimeAndProbeAgain(...args: any[]): any;
  protected abstract promoteMachineToWorkRuntime(...args: any[]): any;
  protected abstract fetchFlyMachineConfig(...args: any[]): any;
  protected abstract failWakeAttemptAndFinalizeProfile(...args: any[]): any;
  abstract waitForUserReady(...args: any[]): any;
  abstract probeReadyEndpoint(...args: any[]): any;
  abstract suspendIdleMachine(...args: any[]): any;
  abstract destroyMachine(...args: any[]): any;
  protected abstract persistRunningMachineState(...args: any[]): any;
  protected abstract clearMachinePointerIfMatches(...args: any[]): any;
  protected abstract isFlyDuplicateNameError(...args: any[]): any;
  protected abstract findMachineIdByName(...args: any[]): any;
  abstract patchMachineMetadata(...args: any[]): any;
  abstract startMachine(...args: any[]): any;
  protected abstract waitForMachineStarted(...args: any[]): any;
  abstract waitForMachineHealth(...args: any[]): any;
  protected abstract probeMachineHealth(...args: any[]): any;
  protected abstract markMachineFailed(...args: any[]): any;
  abstract resolveFlyImageRef(...args: any[]): any;
  // End generated abstract declarations.




  protected readonly logger = new Logger('MachinesService')

  readonly flyApiToken = process.env.FLY_API_TOKEN
  readonly flyRuntimeApp = process.env.FLY_RUNTIME_APP ?? 'vibey-runtimes'
  readonly flyRegion = process.env.FLY_REGION ?? 'iad'
  readonly flyApiBase = 'https://api.machines.dev/v1'
  protected readonly machineWaitTimeoutS = 60
  protected readonly machineStartMaxWaitMs = 180_000
  protected readonly machineStartRetryBaseMs = 1_500
  protected readonly machineStartRetryMaxMs = 12_000
  protected readonly healthTimeoutMs = 300_000
  protected readonly healthPollIntervalMs = 3_000
  protected readonly machineHealthPath = '/api/health'
  /** /api/ready polling: agent-api identity readiness. Per-agent files sync lazily per request. */
  protected readonly readyEndpointPath = '/api/ready'
  /** 120s: covers identity/sync readiness after Fly reports the runtime healthy. */
  protected readonly readyOverallTimeoutMs = 120_000
  protected readonly readyPerRequestTimeoutMs = 5_000
  protected readonly readyPollIntervalMs = 2_000
  /** 180s: post-deploy image pull can take ~80s before VM even starts. */
  protected readonly flyStartWaitMs = 180_000
  protected readonly machineColumns = resolveMachineProfileColumns(process.env)
  constructor(
    protected readonly errorReporter: ErrorReporter,
    protected readonly machinePool: MachinePoolService,
    protected readonly flyState: FlyMachineStateService,
    protected readonly runtimeCapabilities: MachineRuntimeCapabilitiesService,
    protected readonly wakeAttempts: MachineWakeAttemptsService,
    protected readonly machineProfileRepository: MachineProfileRepository,
  ) {
  }

  protected reportMachineError(step: string, message: string, extra: Record<string, unknown>): void {
    this.errorReporter.report({
      app: 'api',
      severity: 'error',
      feature: 'machines',
      error_code: `machines_${step}`,
      message,
      category: 'infra',
      context: { step, ...extra },
      user_id: typeof extra.userId === 'string' ? extra.userId : undefined,
    })
  }

  protected resolveAppForUser(profile: { runtimeApp?: string | null } | null): string {
    return profile?.runtimeApp || this.flyRuntimeApp
  }

  protected isPoolRuntimeBindEnabled(): boolean {
    return process.env.MACHINE_POOL_RUNTIME_BIND_ENABLED === 'true'
  }

  protected bootProfileForRuntime(requiredRuntime: AgentRuntimeRequirement): MachineBootProfile {
    return requiredRuntime === 'chat' ? 'runtime-chat' : 'full'
  }

  protected internalApiToken(): string {
    const token = process.env.INTERNAL_API_TOKEN?.trim()
    if (!token) throw new Error('INTERNAL_API_TOKEN not configured')
    return token
  }

  protected async postRuntimeIdentity(
    appName: string,
    machineId: string,
    action: 'bind' | 'reset',
    body: Record<string, string>,
  ): Promise<Response> {
    return fetch(`https://${appName}.fly.dev/api/runtime/identity/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'fly-force-instance-id': machineId,
        'x-internal-token': this.internalApiToken(),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
  }

  async bindMachineIdentity(machineId: string, appName: string, userId: string): Promise<void> {
    const res = await this.postRuntimeIdentity(appName, machineId, 'bind', {
      user_id: userId,
      machine_id: machineId,
    })
    if (res.ok) return
    const body = await res.text().catch(() => '')
    throw new Error(
      `Failed to bind runtime identity for ${machineId}: ${res.status} ${body.slice(0, 300)}`,
    )
  }

  async resetMachineIdentity(machineId: string, appName: string): Promise<boolean> {
    try {
      const res = await this.postRuntimeIdentity(appName, machineId, 'reset', {
        machine_id: machineId,
      })
      if (res.ok) return true
      const body = await res.text().catch(() => '')
      this.logger.error(
        `Failed to reset runtime identity for ${machineId}: ${res.status} ${body.slice(0, 300)}`,
      )
      return false
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.error(`Runtime identity reset request failed for ${machineId}: ${msg}`)
      return false
    }
  }

  async provision(supabase: SupabaseClient, userId: string, options: ProvisionOptions = {}) {
    const bootProfile = options.bootProfile ?? 'full'
    // Atomic lock: prevents double provision when auth callback + MachineProvisionGate both call provision
    const { data: lockResult, errorMessage: lockError } =
      await this.machineProfileRepository.acquireProvisionLock(
        supabase,
        userId,
        this.machineColumns.environment,
      )

    if (lockError) {
      this.logger.error(`acquire_provision_lock failed: ${lockError}`)
      throw new Error('Failed to acquire provision lock')
    }

    const acquired = lockResult?.acquired === true
    const status = lockResult?.status as string | undefined
    const targetApp = (lockResult?.fly_runtime_app as string) || this.flyRuntimeApp

    if (!acquired) {
      if (status === 'running') {
        return {
          machine_id: lockResult?.machine_id,
          machine_url: lockResult?.machine_url,
          status: 'running',
          message: 'Machine already running',
        }
      }
      if (status === 'provisioning') {
        this.logger.warn(
          `Provision already in progress for user ${userId}; skipping duplicate create`,
        )
        return {
          machine_id: null,
          machine_url: `https://${targetApp}.fly.dev`,
          status: 'provisioning',
          message: 'Machine provisioning in progress',
        }
      }
      const reason = lockResult?.reason as string | undefined
      this.logger.error(`acquire_provision_lock denied: ${reason}`)
      const err = new Error(reason || 'Cannot provision')
      this.reportMachineError('provision_lock', err.message, { userId, status, reason })
      throw markAppErrorReported(err)
    }

    if (!this.flyApiToken) {
      this.logger.error('FLY_API_TOKEN not configured')
      await this.markMachineFailed(supabase, userId)
      const err = new Error('Service unavailable — FLY_API_TOKEN not configured')
      this.reportMachineError('missing_token', err.message, { userId })
      throw markAppErrorReported(err)
    }

    // Check for existing machine (e.g. from previous failed provision)

    const profileRow = await this.machineProfileRepository.findProfileRow(supabase, userId, [
      this.machineColumns.machineId,
    ])

    const profile = resolveMachineProfileRow(
      profileRow as unknown as Record<string, unknown> | null,
      this.machineColumns,
    )
    const profileMachineId = typeof profile.machineId === 'string' ? profile.machineId.trim() : ''
    if (profileMachineId) {
      const existingMachineReady = await this.waitForMachineHealth(profileMachineId, targetApp)
      const existingUserReady = existingMachineReady
        ? await this.waitForUserReady(profileMachineId, targetApp)
        : false
      if (existingMachineReady && existingUserReady) {
        await this.persistRunningMachineState(supabase, userId, profileMachineId, targetApp)
        return {
          machine_id: profileMachineId,
          machine_url: `https://${targetApp}.fly.dev`,
          status: 'running',
          message: 'Machine already exists',
        }
      }
    }

    const pooled = this.isPoolRuntimeBindEnabled()
      ? await this.machinePool.claimFromPool(userId)
      : null
    if (pooled) {
      void this.machinePool.replenishPool().catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        this.logger.warn(`Async pool replenish after claim failed: ${msg}`)
      })
      let profilePointerWritten = false
      try {
        const machineUrl = `https://${pooled.flyApp}.fly.dev`
        const profileWriteError = await this.machineProfileRepository.updateProfileMachineFields(
          supabase,
          userId,
          this.machineColumns,
          {
            machineId: pooled.machineId,
            machineUrl,
            runtimeApp: pooled.flyApp,
          },
        )
        if (profileWriteError) {
          throw new Error(`Failed to store machine metadata: ${profileWriteError}`)
        }
        profilePointerWritten = true

        const { machineId: pooledId } = await this.machinePool.startClaimedMachine(
          pooled.machineId,
          pooled.flyApp,
        )
        const pooledHealthy = await this.waitForMachineHealth(pooledId, pooled.flyApp)
        if (!pooledHealthy) {
          throw new Error(`Pooled machine ${pooledId} failed health after start`)
        }
        await this.bindMachineIdentity(pooledId, pooled.flyApp, userId)
        const pooledUserReady = await this.waitForUserReady(pooledId, pooled.flyApp)
        if (!pooledUserReady) {
          throw new Error(`Pooled machine ${pooledId} failed readiness after bind`)
        }
        await this.persistRunningMachineState(supabase, userId, pooledId, pooled.flyApp)
        this.logger.log(`Provisioned user ${userId} from pool machine ${pooledId}`)
        return {
          machine_id: pooledId,
          machine_url: machineUrl,
          status: 'running',
          message: 'Provisioned from pool',
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        this.logger.error(`Pool assignment failed for ${pooled.machineId}: ${msg} — falling back`)
        await this.machinePool.releaseClaim(pooled.machineId)
        if (profilePointerWritten) {
          await this.clearMachinePointerIfMatches(supabase, userId, pooled.machineId)
        }
      }
    }

    const machineName = `vibey-${userId.slice(0, 8)}`
    const appImage = await this.resolveFlyImageRef(targetApp)
    const machineResponse = await fetch(`${this.flyApiBase}/apps/${targetApp}/machines`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.flyApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: machineName,
        region: this.flyRegion,
        config: {
          image: appImage,
          env: {
            USER_ID: userId,
            PORT: '3003',
            FLY_PROCESS_GROUP: 'app',
            PRIMARY_REGION: this.flyRegion,
            AGENT_API_BOOT_PROFILE: bootProfile,
          },
          metadata: {
            user_id: userId,
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
          guest: {
            cpus: 2,
            memory_mb: 4096,
            cpu_kind: 'shared',
          },
          restart: {
            policy: 'on-failure',
            max_retries: 10,
          },
        },
      }),
    })

    if (!machineResponse.ok) {
      const errorBody = await machineResponse.text()

      if (this.isFlyDuplicateNameError(errorBody)) {
        const existingMachineId = await this.findMachineIdByName(machineName, targetApp)
        if (existingMachineId) {
          this.logger.warn(
            `Fly.io duplicate machine name detected; starting existing machine ${existingMachineId}`,
          )
          await this.patchMachineMetadata(existingMachineId, { user_id: userId }, targetApp)
          await this.startMachine(existingMachineId, targetApp)
          const existingMachineReady = await this.waitForMachineHealth(existingMachineId, targetApp)
          const existingUserReady = existingMachineReady
            ? await this.waitForUserReady(existingMachineId, targetApp)
            : false
          if (!existingMachineReady || !existingUserReady) {
            await this.markMachineFailed(supabase, userId)
            const err = new Error('Machine not ready (duplicate name recovery)')
            this.reportMachineError('startup_timeout', err.message, {
              userId,
              machineId: existingMachineId,
              flyApp: targetApp,
              region: this.flyRegion,
              step: 'duplicate_recovery_start',
            })
            throw markAppErrorReported(err)
          }
          await this.persistRunningMachineState(supabase, userId, existingMachineId, targetApp)
          return {
            machine_id: existingMachineId,
            machine_url: `https://${targetApp}.fly.dev`,
            status: 'running',
            message: 'Machine already exists',
          }
        }

        this.logger.warn(
          `Fly.io duplicate machine name detected but existing machine lookup failed: appImage=${appImage} body=${errorBody}`,
        )
      } else {
        this.logger.error(`Fly.io machine creation failed: appImage=${appImage} body=${errorBody}`)
      }

      await this.markMachineFailed(supabase, userId)

      const err = new Error(`Failed to create machine: ${errorBody.slice(0, 300)}`)
      this.reportMachineError('create_failed', err.message, {
        userId,
        machineName,
        flyApp: targetApp,
        region: this.flyRegion,
        flyStatus: machineResponse.status,
        flyBody: errorBody.slice(0, 1000),
        appImage,
        isDuplicate: this.isFlyDuplicateNameError(errorBody),
      })
      throw markAppErrorReported(err)
    }

    const machine = (await machineResponse.json()) as { id: string }
    const machineId = machine.id

    const profileWriteError = await this.machineProfileRepository.updateProfileMachineFields(
      supabase,
      userId,
      this.machineColumns,
      {
        machineId,
        machineUrl: `https://${targetApp}.fly.dev`,
        runtimeApp: targetApp,
      },
    )
    if (profileWriteError) {
      this.logger.error(`Failed to store machine metadata: ${profileWriteError}`)
      throw new Error('Failed to store machine metadata')
    }

    const machineReady = await this.waitForMachineHealth(machineId, targetApp)
    const userReady = machineReady ? await this.waitForUserReady(machineId, targetApp) : false
    if (!machineReady || !userReady) {
      await this.markMachineFailed(supabase, userId)
      const err = new Error('Machine not ready after creation')
      this.reportMachineError('startup_timeout', err.message, {
        userId,
        machineId,
        machineName,
        flyApp: targetApp,
        region: this.flyRegion,
        step: 'post_create_health',
      })
      throw markAppErrorReported(err)
    }
    await this.persistRunningMachineState(supabase, userId, machineId, targetApp)

    return {
      machine_id: machineId,
      machine_url: `https://${targetApp}.fly.dev`,
      status: 'running',
    }
  }
}
