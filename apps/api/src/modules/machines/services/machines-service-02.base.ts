import { MachinesServiceBase01 } from './machines-service-01.base'
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

export abstract class MachinesServiceBase02 extends MachinesServiceBase01 {

  /**
   * Ensures the user's machine is running AND ready to serve agent traffic.
   *
   * Source-of-truth flow (no DB status mirror involved in routing):
   *   1. Read fly_machine_id/fly_runtime_app from profiles (the only fields that matter)
   *   2. Ask Fly's API for the real machine state
   *   3. If destroyed/unknown → provision a new machine
   *   4. If not `started` → POST /start and wait for Fly to report started (long-poll)
   *   5. Poll /api/ready until the agent-api reports USER_ID resolved
   *   6. Update profiles status columns as INFORMATIONAL (for dashboards/idle manager only).
   *      Routing code never reads these columns — see deprecation notes below.
   *
   * No more markMachineFailed on timeout: a timeout is not a confirmed failure, and
   * writing `failed` to the DB used to poison subsequent requests into falling back
   * to a random pool machine. On timeout we now throw so the caller (proxy) can retry.
   */
  async ensureRunning(
    supabase: SupabaseClient,
    userId: string,
    options: EnsureRunningOptions = {},
  ): Promise<{
    machine_id: string
    machine_url: string
    status: 'running'
    wake_attempt_id?: string
    runtime_version?: string | null
  }> {
    const requiredRuntime = options.requiredRuntime ?? 'work'
    const selectFields = [
      this.machineColumns.machineId,
      this.machineColumns.machineUrl,
      this.machineColumns.runtimeApp,
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
    const initialTargetApp = this.resolveAppForUser(profile)
    const attemptId = await this.wakeAttempts.start(supabase, {
      userId,
      machineId: profile.machineId,
      flyApp: initialTargetApp,
      requestedBy: 'ensure_running',
      metadata: { source: 'machines.ensureRunning', requiredRuntime },
    })
    let wakeFailureRecorded = false
    const failWake = async (
      phase: MachineWakePhase,
      status: Extract<MachineWakeAttemptStatus, 'failed_retryable' | 'failed_terminal'>,
      failureCode: string,
      message: string,
      machineIdForFailure?: string | null,
      appForFailure?: string | null,
      metadata?: Record<string, unknown>,
    ) => {
      wakeFailureRecorded = true
      await this.failWakeAttemptAndFinalizeProfile(supabase, {
        userId,
        attemptId,
        machineId: machineIdForFailure ?? profile.machineId,
        appName: appForFailure ?? initialTargetApp,
        phase,
        status,
        failureCode,
        message,
        metadata,
      })
    }

    try {
      if (!profile.machineId) {
        await this.wakeAttempts.phase(supabase, attemptId, 'provision')
        const result = await this.provision(supabase, userId, {
          bootProfile: this.bootProfileForRuntime(requiredRuntime),
        })
        await this.wakeAttempts.succeed(supabase, attemptId, {
          machine_id: result.machine_id,
          machine_url: result.machine_url,
          required_runtime: requiredRuntime,
        })
        return {
          machine_id: result.machine_id,
          machine_url: result.machine_url as string,
          status: 'running',
          wake_attempt_id: attemptId ?? undefined,
        }
      }

      const targetApp = this.resolveAppForUser(profile)
      const machineId = profile.machineId
      const machineUrl = profile.machineUrl ?? `https://${targetApp}.fly.dev`

      // Ask Fly for real-time state. Never trust fly_machine_status.
      await this.wakeAttempts.phase(supabase, attemptId, 'fly_state_check', {
        machineId,
        targetApp,
      })
      const state = await this.flyState.getMachineState(machineId, targetApp)

      // Machine no longer exists on Fly — provision a replacement.
      if (state === 'destroyed' || state === 'destroying') {
        this.logger.warn(
          `Machine ${machineId} reported ${state} by Fly — clearing and re-provisioning for user ${userId}`,
        )
        await this.machineProfileRepository.updateProfileMachineFields(
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
        await this.wakeAttempts.phase(supabase, attemptId, 'provision', {
          replacedDestroyedMachine: machineId,
        })
        const result = await this.provision(supabase, userId)
        await this.wakeAttempts.succeed(supabase, attemptId, {
          machine_id: result.machine_id,
          machine_url: result.machine_url,
          replaced_machine_id: machineId,
        })
        return {
          machine_id: result.machine_id,
          machine_url: result.machine_url as string,
          status: 'running',
          wake_attempt_id: attemptId ?? undefined,
        }
      }

      // Optimistic: mark `starting` so dashboards reflect wake-in-progress.
      // NOTE: this column is informational only — routing does NOT read it.
      if (state !== 'started') {
        await this.machineProfileRepository.updateProfileMachineFields(
          supabase,
          userId,
          this.machineColumns,
          {
            runtimeStatus: 'starting',
            machineStatus: 'starting',
            runtimeLastActivityAt: new Date().toISOString(),
          },
        )

        await this.wakeAttempts.phase(supabase, attemptId, 'start_machine', {
          previousFlyState: state,
        })
        await this.flyState.startMachine(machineId, targetApp)
        const started = await this.flyState.waitForStarted(
          machineId,
          targetApp,
          this.flyStartWaitMs,
        )
        if (!started) {
          await failWake(
            'start_machine',
            'failed_retryable',
            'fly_start_timeout',
            'Machine start timeout',
            machineId,
            targetApp,
            { previousFlyState: state },
          )
          throw new Error('Machine start timeout')
        }
      }

      await this.wakeAttempts.phase(supabase, attemptId, 'health_check')
      const machineHealthy = await this.waitForMachineHealth(machineId, targetApp)
      if (!machineHealthy) {
        await failWake(
          'health_check',
          'failed_retryable',
          'runtime_health_timeout',
          'Machine not healthy after start',
          machineId,
          targetApp,
        )
        throw new Error('Machine not healthy after start')
      }

      await this.wakeAttempts.phase(supabase, attemptId, 'capability_probe', {
        requiredRuntime,
      })
      let capabilityProbe = await this.runtimeCapabilities.probe(machineId, targetApp, {
        requiredRuntime,
      })
      if (!capabilityProbe.compatible && requiredRuntime === 'work') {
        capabilityProbe = await this.promoteWorkRuntimeAndProbeAgain(
          machineId,
          targetApp,
          capabilityProbe,
          supabase,
          attemptId,
          failWake,
        )
      }
      if (!capabilityProbe.compatible) {
        const status = capabilityProbe.retryable ? 'failed_retryable' : 'failed_terminal'
        const message =
          capabilityProbe.errorMessage ?? capabilityProbe.failureCode ?? 'Runtime incompatible'
        await failWake(
          'capability_probe',
          status,
          capabilityProbe.failureCode ?? 'runtime_capability_probe_failed',
          message,
          machineId,
          targetApp,
          {
            capabilityStatus: capabilityProbe.status,
            capabilities: capabilityProbe.capabilities,
            missingCapabilities: capabilityProbe.missingCapabilities,
            requiredRuntime,
          },
        )
        throw new Error(message)
      }

      const shouldBindRuntimeIdentity =
        capabilityProbe.mode === 'pool' && capabilityProbe.userIdResolved !== true
      if (shouldBindRuntimeIdentity) {
        await this.wakeAttempts.phase(supabase, attemptId, 'identity_bind')
        try {
          await this.bindMachineIdentity(machineId, targetApp, userId)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          await failWake(
            'identity_bind',
            'failed_retryable',
            'runtime_identity_bind_failed',
            message,
            machineId,
            targetApp,
          )
          throw err
        }
      }

      // Machine is started per Fly, but agent-api may still be resolving USER_ID. Block on /api/ready.
      await this.wakeAttempts.phase(supabase, attemptId, 'ready_probe', {
        identityBindSkipped: !shouldBindRuntimeIdentity,
        runtimeMode: capabilityProbe.mode,
        userIdResolved: capabilityProbe.userIdResolved,
      })
      const ready = await this.waitForUserReady(machineId, targetApp)
      if (!ready) {
        await failWake(
          'ready_probe',
          'failed_retryable',
          'runtime_ready_timeout',
          'Machine not ready (agent-api /api/ready did not return 200 in time)',
          machineId,
          targetApp,
        )
        throw new Error('Machine not ready (agent-api /api/ready did not return 200 in time)')
      }

      // Informational status writes — consumed by dashboards and the idle manager.
      // Routing code never reads these columns; see fly_machine_status/fly_runtime_status
      // notes above. Keeping them populated avoids breaking existing admin views.
      await this.machineProfileRepository.updateProfileMachineFields(
        supabase,
        userId,
        this.machineColumns,
        {
          runtimeStatus: 'running',
          machineStatus: 'running',
          runtimeLastActivityAt: new Date().toISOString(),
        },
      )

      await this.wakeAttempts.succeed(supabase, attemptId, {
        machine_id: machineId,
        runtime_version: capabilityProbe.version,
        capabilities: capabilityProbe.capabilities,
        required_runtime: requiredRuntime,
      })

      return {
        machine_id: machineId,
        machine_url: machineUrl,
        status: 'running',
        wake_attempt_id: attemptId ?? undefined,
        runtime_version: capabilityProbe.version,
      }
    } catch (err) {
      if (!wakeFailureRecorded) {
        const message = err instanceof Error ? err.message : String(err)
        await failWake(
          'failed',
          'failed_retryable',
          'machine_wake_failed',
          message,
          profile.machineId,
          initialTargetApp,
        )
      }
      throw err
    }
  }

  protected async promoteWorkRuntimeAndProbeAgain(
    machineId: string,
    targetApp: string,
    currentProbe: RuntimeCapabilityProbeResult,
    supabase: SupabaseClient,
    attemptId: string | null,
    failWake: FailWakeFn,
  ): Promise<RuntimeCapabilityProbeResult> {
    const canPromote =
      currentProbe.status === 200 &&
      (currentProbe.failureCode === 'runtime_incompatible' ||
        currentProbe.failureCode === 'runtime_work_route_missing')
    if (!canPromote) return currentProbe

    await this.wakeAttempts.phase(supabase, attemptId, 'capability_probe', {
      requiredRuntime: 'work',
      runtimeProfileUpdate: 'checking',
      previousFailureCode: currentProbe.failureCode,
      missingCapabilities: currentProbe.missingCapabilities,
    })

    const promoted = await this.promoteMachineToWorkRuntime(machineId, targetApp)
    if (!promoted) return currentProbe

    await this.wakeAttempts.phase(supabase, attemptId, 'health_check', {
      requiredRuntime: 'work',
      runtimeProfileUpdate: 'applied',
    })
    const machineHealthy = await this.waitForMachineHealth(machineId, targetApp)
    if (!machineHealthy) {
      await failWake(
        'health_check',
        'failed_retryable',
        'runtime_profile_update_health_timeout',
        'Machine not healthy after runtime profile update',
        machineId,
        targetApp,
        { requiredRuntime: 'work' },
      )
      throw new Error('Machine not healthy after runtime profile update')
    }

    await this.wakeAttempts.phase(supabase, attemptId, 'capability_probe', {
      requiredRuntime: 'work',
      runtimeProfileUpdate: 'reprobe',
    })
    return this.runtimeCapabilities.probe(machineId, targetApp, { requiredRuntime: 'work' })
  }

  protected async promoteMachineToWorkRuntime(machineId: string, appName: string): Promise<boolean> {
    if (!this.flyApiToken) return false

    const machine = await this.fetchFlyMachineConfig(machineId, appName)
    const config = machine?.config
    if (!config) return false

    const currentEnv =
      config.env && typeof config.env === 'object' && !Array.isArray(config.env) ? config.env : {}
    if (currentEnv.AGENT_API_BOOT_PROFILE === 'full') return false

    const nextConfig: FlyMachineConfig = {
      ...config,
      env: {
        ...currentEnv,
        AGENT_API_BOOT_PROFILE: 'full',
      },
    }

    const res = await fetch(`${this.flyApiBase}/apps/${appName}/machines/${machineId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.flyApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config: nextConfig }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(
        `Fly machine runtime profile update failed: ${res.status} ${body.slice(0, 300)}`,
      )
    }

    this.flyState.invalidate(machineId, appName)
    this.logger.log(`Promoted machine ${machineId} to full work runtime`)
    return true
  }

  protected async fetchFlyMachineConfig(
    machineId: string,
    appName: string,
  ): Promise<{ config?: FlyMachineConfig } | null> {
    const res = await fetch(`${this.flyApiBase}/apps/${appName}/machines/${machineId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.flyApiToken}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Fly machine config fetch failed: ${res.status} ${body.slice(0, 300)}`)
    }
    const body = (await res.json().catch(() => ({}))) as { config?: unknown }
    if (!body.config || typeof body.config !== 'object' || Array.isArray(body.config)) return null
    return { config: body.config as FlyMachineConfig }
  }

  protected async failWakeAttemptAndFinalizeProfile(
    supabase: SupabaseClient,
    input: {
      userId: string
      attemptId: string | null
      machineId: string | null
      appName: string
      phase: MachineWakePhase
      status: Extract<MachineWakeAttemptStatus, 'failed_retryable' | 'failed_terminal'>
      failureCode: string
      message: string
      metadata?: Record<string, unknown>
    },
  ): Promise<void> {
    await this.wakeAttempts.fail(supabase, input.attemptId, {
      phase: input.phase,
      status: input.status,
      failureCode: input.failureCode,
      errorMessage: input.message,
      metadata: input.metadata,
    })

    let runtimeStatus = input.status === 'failed_terminal' ? 'failed' : 'unknown'
    let machineStatus = runtimeStatus
    if (input.machineId) {
      const liveState = await this.flyState.getMachineState(input.machineId, input.appName)
      if (liveState === 'stopped' || liveState === 'suspended') {
        runtimeStatus = 'suspended'
        machineStatus = 'suspended'
      }
    }

    const error = await this.machineProfileRepository.updateProfileMachineFields(
      supabase,
      input.userId,
      this.machineColumns,
      {
        machineStatus,
        runtimeStatus,
        runtimeLastActivityAt: null,
      },
    )

    if (error) {
      this.logger.warn(
        `Failed to finalize wake failure state for user ${input.userId}: ${error}`,
      )
    }
  }
}
