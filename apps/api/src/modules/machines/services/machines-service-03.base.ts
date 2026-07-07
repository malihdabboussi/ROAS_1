import { MachinesServiceBase02 } from './machines-service-02.base'
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ErrorReporter,
  resolveMachineProfileColumns,
  resolveMachineProfileRow,
} from '@vibey/api-shared'
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

export abstract class MachinesServiceBase03 extends MachinesServiceBase02 {

  /**
   * Poll the machine's /api/ready endpoint until it returns 200 or the overall
   * timeout elapses. /api/ready guarantees identity readiness; exact agent
   * hydration happens lazily inside the agent-api request path.
   */
  async waitForUserReady(machineId: string, appName: string): Promise<boolean> {
    const url = `https://${appName}.fly.dev${this.readyEndpointPath}`
    const startedAt = Date.now()

    while (Date.now() - startedAt < this.readyOverallTimeoutMs) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'fly-force-instance-id': machineId,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(this.readyPerRequestTimeoutMs),
        })
        if (res.ok) return true
      } catch {
        // swallow — the next poll will retry
      }
      await new Promise((resolve) => setTimeout(resolve, this.readyPollIntervalMs))
    }

    this.logger.warn(
      `Machine ${machineId} /api/ready did not return 200 within ${this.readyOverallTimeoutMs}ms`,
    )
    return false
  }

  async probeReadyEndpoint(machineId: string, appName?: string): Promise<boolean> {
    const app = appName || this.flyRuntimeApp
    try {
      const res = await fetch(`https://${app}.fly.dev${this.readyEndpointPath}`, {
        method: 'GET',
        headers: {
          'fly-force-instance-id': machineId,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.readyPerRequestTimeoutMs),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async suspendIdleMachine(supabase: SupabaseClient, userId: string): Promise<void> {
    const selectFields = [
      this.machineColumns.machineId,
      this.machineColumns.runtimeApp,
      this.machineColumns.runtimeStatus,
    ].join(', ')
    const profileRow = await this.machineProfileRepository.findProfileRow(
      supabase,
      userId,
      selectFields.split(', '),
    )
    const profile = resolveMachineProfileRow(
      profileRow as unknown as Record<string, unknown> | null,
      this.machineColumns,
    )

    if (!profile.machineId || profile.runtimeStatus !== 'running') return

    const targetApp = this.resolveAppForUser(profile)
    const currentState = await this.flyState.getMachineState(profile.machineId, targetApp)
    if (currentState === 'started') {
      await this.flyState.stopMachine(profile.machineId, targetApp)
      const stoppedState = await this.flyState.waitForState(
        profile.machineId,
        targetApp,
        ['stopped', 'suspended'],
        60_000,
      )
      if (!stoppedState) {
        throw new Error(`Machine ${profile.machineId} did not stop after idle suspend request`)
      }
    } else if (currentState === 'unknown') {
      throw new Error(`Machine ${profile.machineId} state unknown during idle suspend`)
    }

    await this.machineProfileRepository.updateProfileMachineFields(
      supabase,
      userId,
      this.machineColumns,
      {
        runtimeStatus: 'suspended',
        machineStatus: 'suspended',
      },
    )

    this.logger.log(`Suspended idle machine ${profile.machineId} for user ${userId}`)
  }

  async destroyMachine(supabase: SupabaseClient, userId: string): Promise<void> {
    const selectFields = [this.machineColumns.machineId, this.machineColumns.runtimeApp].join(', ')
    const profileRow = await this.machineProfileRepository.findProfileRow(
      supabase,
      userId,
      selectFields.split(', '),
    )
    const profile = resolveMachineProfileRow(
      profileRow as unknown as Record<string, unknown> | null,
      this.machineColumns,
    )

    if (!profile.machineId) return

    const targetApp = this.resolveAppForUser(profile)
    if (this.flyApiToken) {
      try {
        await fetch(`${this.flyApiBase}/apps/${targetApp}/machines/${profile.machineId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${this.flyApiToken}` },
          signal: AbortSignal.timeout(10_000),
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        this.logger.warn(`Failed to delete Fly machine ${profile.machineId}: ${message}`)
      }
    }

    const error = await this.machineProfileRepository.updateProfileMachineFields(
      supabase,
      userId,
      this.machineColumns,
      {
        machineId: null,
        machineUrl: null,
        machineStatus: null,
        runtimeStatus: null,
        runtimeLastActivityAt: null,
      },
    )
    if (error) {
      this.logger.error(`Failed to clear machine fields for user ${userId}: ${error}`)
    } else {
      this.logger.log(`Destroyed machine ${profile.machineId} for user ${userId}`)
    }
  }

  protected async persistRunningMachineState(
    supabase: SupabaseClient,
    userId: string,
    machineId: string,
    appName?: string,
  ): Promise<void> {
    const app = appName || this.flyRuntimeApp
    const machineUrl = `https://${app}.fly.dev`
    const runningStatusError = await this.machineProfileRepository.updateProfileMachineFields(
      supabase,
      userId,
      this.machineColumns,
      {
        machineId,
        machineUrl,
        machineStatus: 'running',
        runtimeApp: app,
        runtimeStatus: 'running',
        runtimeLastActivityAt: new Date().toISOString(),
      },
    )
    if (runningStatusError) {
      this.logger.error(`Failed to set running machine status: ${runningStatusError}`)
      throw new Error('Failed to store machine metadata')
    }
  }

  protected async clearMachinePointerIfMatches(
    supabase: SupabaseClient,
    userId: string,
    machineId: string,
  ): Promise<void> {
    const error = await this.machineProfileRepository.updateProfileMachineFields(
      supabase,
      userId,
      this.machineColumns,
      {
        machineId: null,
        machineUrl: null,
        machineStatus: 'failed',
        runtimeStatus: 'failed',
        runtimeLastActivityAt: null,
      },
      { matchingMachineId: machineId },
    )
    if (error) {
      this.logger.error(`Failed to clear machine pointer for user ${userId}: ${error}`)
    }
  }

  protected isFlyDuplicateNameError(errorBody: string): boolean {
    return (
      errorBody.includes('unique machine name violation') || errorBody.includes('already_exists')
    )
  }

  protected async findMachineIdByName(machineName: string, appName?: string): Promise<string | null> {
    if (!this.flyApiToken) return null
    const app = appName || this.flyRuntimeApp
    try {
      const machinesRes = await fetch(`${this.flyApiBase}/apps/${app}/machines`, {
        headers: { Authorization: `Bearer ${this.flyApiToken}` },
      })
      if (!machinesRes.ok) return null
      const machines = (await machinesRes.json()) as Array<{ id?: string; name?: string }>
      const match = machines.find((machine) => machine?.name === machineName)
      const machineId = match?.id
      if (typeof machineId === 'string' && machineId.length > 0) return machineId
      return null
    } catch {
      return null
    }
  }

  async patchMachineMetadata(
    machineId: string,
    metadata: Record<string, string>,
    appName?: string,
  ): Promise<void> {
    if (!this.flyApiToken) return
    const app = appName || this.flyRuntimeApp
    try {
      await fetch(`${this.flyApiBase}/apps/${app}/machines/${machineId}/metadata`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.flyApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
        signal: AbortSignal.timeout(5_000),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Failed to patch metadata on machine ${machineId}: ${msg}`)
    }
  }

  async startMachine(machineId: string, appName?: string): Promise<boolean> {
    const app = appName || this.flyRuntimeApp
    try {
      const res = await fetch(`${this.flyApiBase}/apps/${app}/machines/${machineId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.flyApiToken}` },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        this.logger.error(`Machine ${machineId} start failed: ${res.status} ${body.slice(0, 300)}`)
        return false
      }
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Machine ${machineId} start request error: ${msg}`)
      return false
    }
  }

  protected async waitForMachineStarted(machineId: string, appName?: string): Promise<boolean> {
    const app = appName || this.flyRuntimeApp
    const startAt = Date.now()
    let attempt = 0

    while (Date.now() - startAt < this.machineStartMaxWaitMs) {
      attempt += 1
      const elapsedMs = Date.now() - startAt
      const remainingMs = this.machineStartMaxWaitMs - elapsedMs
      const waitTimeoutS = Math.max(
        5,
        Math.min(this.machineWaitTimeoutS, Math.floor(remainingMs / 1000)),
      )
      const url = `${this.flyApiBase}/apps/${app}/machines/${machineId}/wait?state=started&timeout=${waitTimeoutS}`

      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${this.flyApiToken}` },
          signal: AbortSignal.timeout(waitTimeoutS * 1000 + 10_000),
        })

        if (res.ok) {
          this.logger.log(
            `Machine ${machineId} reached started state after ${attempt} attempt(s) (${Date.now() - startAt}ms)`,
          )
          return true
        }

        const body = await res.text().catch(() => '')
        const shortBody = body.slice(0, 200)
        const shouldRetry = res.status === 408 || res.status >= 500
        if (!shouldRetry) {
          this.logger.error(`Machine ${machineId} wait failed: ${res.status} ${shortBody}`)
          return false
        }

        const retryDelayMs = Math.min(
          this.machineStartRetryMaxMs,
          this.machineStartRetryBaseMs * 2 ** (attempt - 1),
        )
        this.logger.warn(
          `Machine ${machineId} wait retry ${attempt}: status=${res.status} delay=${retryDelayMs}ms body=${shortBody}`,
        )
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const retryDelayMs = Math.min(
          this.machineStartRetryMaxMs,
          this.machineStartRetryBaseMs * 2 ** (attempt - 1),
        )
        this.logger.warn(
          `Machine ${machineId} wait retry ${attempt}: error=${msg} delay=${retryDelayMs}ms`,
        )
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      }
    }

    this.logger.error(
      `Machine ${machineId} did not reach started state within ${this.machineStartMaxWaitMs}ms`,
    )
    return false
  }

  async waitForMachineHealth(machineId: string, appName?: string): Promise<boolean> {
    const started = await this.waitForMachineStarted(machineId, appName)
    if (!started) return false

    const startedAt = Date.now()
    while (Date.now() - startedAt < this.healthTimeoutMs) {
      const healthy = await this.probeMachineHealth(machineId, appName)
      if (healthy) return true
      await new Promise((resolve) => setTimeout(resolve, this.healthPollIntervalMs))
    }
    this.logger.error(`Machine ${machineId} failed health checks within ${this.healthTimeoutMs}ms`)
    return false
  }

  protected async probeMachineHealth(machineId: string, appName?: string): Promise<boolean> {
    const app = appName || this.flyRuntimeApp
    try {
      const res = await fetch(`https://${app}.fly.dev${this.machineHealthPath}`, {
        method: 'GET',
        headers: {
          'fly-force-instance-id': machineId,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8_000),
      })
      return res.ok
    } catch {
      return false
    }
  }

  /**
   * Informational-only: writes `failed` to the DB for dashboards. Routing never
   * reads these columns any more (see ensureRunning).
   *
   * Only called from the one-time provision path when machine creation itself
   * failed (never recoverable without manual intervention). Do NOT call from
   * the ensureRunning / wake path — a wake timeout is transient, not a failure.
   */
  protected async markMachineFailed(supabase: SupabaseClient, userId: string): Promise<void> {
    const failedStatusError = await this.machineProfileRepository.updateProfileMachineFields(
      supabase,
      userId,
      this.machineColumns,
      {
        machineStatus: 'failed',
        runtimeStatus: 'failed',
      },
    )
    if (failedStatusError) {
      this.logger.error(`Failed to set failed status: ${failedStatusError}`)
    }
  }

  async resolveFlyImageRef(appName?: string): Promise<string> {
    const app = appName || this.flyRuntimeApp
    const fallback = `registry.fly.io/${app}:latest`
    if (!this.flyApiToken) return fallback

    try {
      const appRes = await fetch(`${this.flyApiBase}/apps/${app}`, {
        headers: { Authorization: `Bearer ${this.flyApiToken}` },
      })
      if (appRes.ok) {
        const appData = await appRes.json()
        const currentImage = appData?.current_release?.image_ref
        if (typeof currentImage === 'string' && currentImage.length > 0) {
          return currentImage
        }
      }
    } catch {}

    try {
      const machinesRes = await fetch(`${this.flyApiBase}/apps/${app}/machines`, {
        headers: { Authorization: `Bearer ${this.flyApiToken}` },
      })
      if (machinesRes.ok) {
        const machines = await machinesRes.json()
        if (Array.isArray(machines) && machines.length > 0) {
          const fromConfig = machines[0]?.config?.image
          if (typeof fromConfig === 'string' && fromConfig.length > 0) return fromConfig
          const fromImageRef = machines[0]?.image_ref?.ref
          if (typeof fromImageRef === 'string' && fromImageRef.length > 0) return fromImageRef
        }
      }
    } catch {}

    return fallback
  }
}
