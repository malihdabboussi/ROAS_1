import { Injectable, Logger } from '@nestjs/common'
import {
  defaultProbeReachable,
  resolveMachineProfileColumns,
  resolveMachineProfileRow,
  UserAgentApiClient,
  type AgentApiTarget,
  type UserAgentApiFetchOptions,
} from '@vibey/api-shared'
import type { AgentRuntimeRequirement } from '../../machines/services/machine-runtime-capabilities.service'
import { MachinesService } from '../../machines/services/machines.service'
import { UserAgentApiRepository } from '../repositories/user-agent-api.repository'

type AgentApiTargetState = {
  target: AgentApiTarget
  machineStatus: string | null
  hasMachine: boolean
  source: 'local' | 'shared_railway' | 'fly' | 'fallback'
}

type RuntimeAwareUserAgentApiFetchOptions = UserAgentApiFetchOptions & {
  requiredRuntime?: AgentRuntimeRequirement
}

/**
 * NestJS-injectable wrapper around the shared UserAgentApiClient.
 *
 * Wires:
 *  - resolveTarget: reads profile, prefers shared Railway runtime when
 *    configured, otherwise pins to user's Fly machine when machineId exists.
 *    Mirrors mission-worker resolveAgentApiTargetForUser.
 *  - probeReachable: defaultProbeReachable from @vibey/api-shared
 *  - wakeMachine: MachinesService.ensureRunning (direct, no HTTP indirection)
 */
@Injectable()
export class UserAgentApiService {
  private readonly logger = new Logger(UserAgentApiService.name)
  private readonly machineColumns = resolveMachineProfileColumns(process.env)
  private readonly client: UserAgentApiClient

  constructor(
    private readonly machinesService: MachinesService,
    private readonly userAgentApiRepository: UserAgentApiRepository,
  ) {
    this.client = new UserAgentApiClient({
      logger: {
        log: (msg) => this.logger.log(msg),
        warn: (msg) => this.logger.warn(msg),
        error: (msg) => this.logger.error(msg),
      },
      probeReachable: (target) =>
        defaultProbeReachable(target, {
          gatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN ?? '',
          logger: {
            log: (msg) => this.logger.log(msg),
            warn: (msg) => this.logger.warn(msg),
            error: (msg) => this.logger.error(msg),
          },
        }),
      wakeMachine: async (userId) => {
        await this.machinesService.ensureRunning(
          this.userAgentApiRepository.getServiceRoleClient(),
          userId,
          {
            requiredRuntime: 'work',
          },
        )
      },
      markMachineUnknown: async (userId) => {
        await this.userAgentApiRepository.markMachineUnknown(
          this.machineColumns.machineStatus,
          userId,
        )
      },
    })
  }

  private async resolveTargetState(userId: string): Promise<AgentApiTargetState> {
    const fallbackUrl = (process.env.AGENT_API_URL ?? 'http://localhost:3003').replace(/\/+$/, '')
    if (fallbackUrl.includes('localhost') || fallbackUrl.includes('127.0.0.1')) {
      return {
        target: { baseUrl: fallbackUrl, machineId: null },
        machineStatus: null,
        hasMachine: false,
        source: 'local',
      }
    }

    const data = await this.userAgentApiRepository.getProfileMachineRow(
      [
        this.machineColumns.machineId,
        this.machineColumns.machineUrl,
        this.machineColumns.machineStatus,
        this.machineColumns.runtimeType,
        this.machineColumns.runtimeUrl,
      ].join(', '),
      userId,
    )
    const profile = resolveMachineProfileRow(
      data as unknown as Record<string, unknown> | null,
      this.machineColumns,
    )

    const runtimeUrl = profile.runtimeUrl ?? ''
    if (profile.runtimeType === 'shared_railway') {
      if (runtimeUrl) {
        this.logger.log(`[machine_target] user=${userId} source=shared_railway`)
        return {
          target: { baseUrl: runtimeUrl.replace(/\/+$/, ''), machineId: null },
          machineStatus: null,
          hasMachine: false,
          source: 'shared_railway',
        }
      }
      this.logger.warn(
        `[machine_target] user=${userId} shared_railway_missing_runtime_url fallback_to_fly`,
      )
    }

    const machineUrl = profile.machineUrl ?? ''
    const machineStatus = profile.machineStatus ?? ''
    const machineId = profile.machineId ?? ''

    if (machineId) {
      const baseUrl = machineUrl ? machineUrl.replace(/\/+$/, '') : fallbackUrl
      if (machineStatus !== 'running') {
        this.logger.log(
          `[machine_target] user=${userId} status_drift=${machineStatus || 'unknown'} machine=${machineId}`,
        )
      }
      return {
        target: { baseUrl, machineId },
        machineStatus: machineStatus || null,
        hasMachine: true,
        source: 'fly',
      }
    }

    this.logger.log(`[machine_target] user=${userId} no_machine_id unpinned_fallback`)
    return {
      target: { baseUrl: fallbackUrl, machineId: null },
      machineStatus: null,
      hasMachine: false,
      source: 'fallback',
    }
  }

  private isLocalTarget(target: AgentApiTarget): boolean {
    const baseUrl = target.baseUrl.toLowerCase()
    return (
      baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('[::1]')
    )
  }

  private inferRequiredRuntime(path: string): AgentRuntimeRequirement {
    const normalized = path.startsWith('/') ? path : `/${path}`
    if (normalized === '/api/channel-chat' || normalized.startsWith('/api/chat')) {
      return 'chat'
    }
    return 'work'
  }

  private deferMachineWakeStart(opts?: RuntimeAwareUserAgentApiFetchOptions): (() => void) | null {
    if (!opts?.onMachineWakeStart) return null
    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled) return
      Promise.resolve(opts.onMachineWakeStart?.()).catch((err) => {
        const message = err instanceof Error ? err.message : String(err)
        this.logger.warn(`[machine_wake_notice_failed] error=${message}`)
      })
    }, 750)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }

  /**
   * Resolves the agent-api target for a user, preferring shared Railway when
   * configured and pinning to the user's Fly machine when one exists otherwise.
   */
  async resolveTarget(userId: string): Promise<AgentApiTarget> {
    return (await this.resolveTargetState(userId)).target
  }

  /**
   * Resolve target + ensureReachable + fetch with retry, in one call.
   * Use this for most callers.
   */
  async invoke(
    userId: string,
    path: string,
    init: RequestInit,
    opts?: RuntimeAwareUserAgentApiFetchOptions,
  ): Promise<Response> {
    const requiredRuntime = opts?.requiredRuntime ?? this.inferRequiredRuntime(path)
    const resolved = await this.resolveTargetState(userId)
    let target = resolved.target

    if (resolved.source === 'shared_railway') {
      this.logger.log(`[runtime_target] user=${userId} source=shared_railway`)
      return this.client.fetch(target, path, init, opts)
    }

    if (!this.isLocalTarget(target)) {
      const machineStatus = resolved.machineStatus || (resolved.hasMachine ? 'unknown' : 'missing')
      this.logger.log(
        `[machine_wake_ensure] user=${userId} status=${machineStatus} machine=${target.machineId ?? 'none'} requiredRuntime=${requiredRuntime}`,
      )
      const cancelWakeStart = this.deferMachineWakeStart(opts)
      try {
        const running = await this.machinesService.ensureRunning(
          this.userAgentApiRepository.getServiceRoleClient(),
          userId,
          { requiredRuntime },
        )
        target = {
          baseUrl: running.machine_url.replace(/\/+$/, ''),
          machineId: running.machine_id,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        this.logger.error(
          `[machine_wake_ensure_failed] user=${userId} status=${machineStatus} machine=${target.machineId ?? 'none'} requiredRuntime=${requiredRuntime} error=${message}`,
        )
        throw err
      } finally {
        cancelWakeStart?.()
      }

      this.logger.log(
        `[machine_wake_ensure_ok] user=${userId} machine=${target.machineId ?? 'none'}`,
      )
      return this.client.fetch(target, path, init, opts)
    }

    return this.client.invoke(userId, target, path, init, opts)
  }

  /**
   * Lower-level: fetch only (no probe/wake). Use when caller has already
   * called ensureReachable, or when the call is to a known-up endpoint
   * (rare — prefer invoke).
   */
  async fetch(
    target: AgentApiTarget,
    path: string,
    init: RequestInit,
    opts?: UserAgentApiFetchOptions,
  ): Promise<Response> {
    return this.client.fetch(target, path, init, opts)
  }

  /**
   * Lower-level: probe + wake + circuit-breaker only. Use when caller wants
   * to ensure reachability outside of a fetch (e.g. to coalesce multiple calls).
   */
  async ensureReachable(userId: string, target: AgentApiTarget): Promise<void> {
    return this.client.ensureReachable(userId, target)
  }
}
