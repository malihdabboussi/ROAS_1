import { Injectable, Logger } from '@nestjs/common'

/**
 * Fly machine lifecycle states we care about for routing.
 * Mirrors the states returned by `GET /apps/{app}/machines/{id}`.
 */
export type FlyMachineState =
  | 'started'
  | 'stopped'
  | 'suspended'
  | 'destroyed'
  | 'destroying'
  | 'unknown'

export interface FlyMachineSummary {
  id: string
  name: string | null
  state: FlyMachineState
  updatedAt: string | null
  rawState: string | null
  metadata: Record<string, string>
  env: Record<string, string>
}

type CacheEntry = {
  state: FlyMachineState
  expiresAt: number
}

/**
 * Single source of truth for whether a Fly machine is alive.
 *
 * Why this exists: we used to mirror machine state in `profiles.fly_machine_status`
 * and that mirror was constantly out of sync with Fly's real state (suspend, restart,
 * crash recovery — none of them write back to our DB). Routing decisions from a stale
 * mirror sent traffic to the wrong machine or caused spurious fallbacks.
 *
 * This service wraps the Fly Machines API with a short TTL cache and is the only
 * thing the routing path should consult.
 */
@Injectable()
export class FlyMachineStateService {
  private readonly logger = new Logger(FlyMachineStateService.name)
  private readonly flyApiToken = process.env.FLY_API_TOKEN ?? ''
  private readonly flyApiBase = 'https://api.machines.dev/v1'
  private readonly cacheTtlMs = 5_000
  private readonly probeTimeoutMs = 8_000
  private readonly startTimeoutMs = 10_000

  private readonly cache = new Map<string, CacheEntry>()

  /**
   * Returns the current Fly state for a machine, using a 5-second cache.
   * Returns 'unknown' if the Fly API errors (so callers can decide how to degrade).
   */
  async getMachineState(machineId: string, appName: string): Promise<FlyMachineState> {
    const key = this.cacheKey(machineId, appName)
    const cached = this.cache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.state
    }

    const state = await this.fetchMachineState(machineId, appName)
    this.cache.set(key, { state, expiresAt: Date.now() + this.cacheTtlMs })
    return state
  }

  async listMachines(appName: string): Promise<FlyMachineSummary[]> {
    if (!this.flyApiToken) {
      throw new Error('FLY_API_TOKEN not configured')
    }

    const res = await fetch(`${this.flyApiBase}/apps/${appName}/machines`, {
      headers: { Authorization: `Bearer ${this.flyApiToken}` },
      signal: AbortSignal.timeout(this.probeTimeoutMs),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Fly machines list failed: ${res.status} ${body.slice(0, 200)}`)
    }

    const machines = (await res.json()) as Array<{
      id?: string
      name?: string
      state?: string
      updated_at?: string
      config?: {
        env?: Record<string, string>
        metadata?: Record<string, string>
      }
    }>

    return machines
      .filter((machine) => typeof machine.id === 'string' && machine.id.length > 0)
      .map((machine) => ({
        id: machine.id as string,
        name: typeof machine.name === 'string' ? machine.name : null,
        state: this.normalizeState(machine.state),
        updatedAt: typeof machine.updated_at === 'string' ? machine.updated_at : null,
        rawState: typeof machine.state === 'string' ? machine.state : null,
        metadata: machine.config?.metadata ?? {},
        env: machine.config?.env ?? {},
      }))
  }

  /**
   * Invalidate the cache for a machine (use after start/stop actions so the next
   * read goes back to Fly instead of returning the stale state).
   */
  invalidate(machineId: string, appName: string): void {
    this.cache.delete(this.cacheKey(machineId, appName))
  }

  /**
   * Ask Fly to start a machine. Does not wait for it to be running — use
   * `waitForStarted` next.
   */
  async startMachine(machineId: string, appName: string): Promise<void> {
    if (!this.flyApiToken) {
      throw new Error('FLY_API_TOKEN not configured')
    }

    try {
      await fetch(`${this.flyApiBase}/apps/${appName}/machines/${machineId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.flyApiToken}` },
        signal: AbortSignal.timeout(this.startTimeoutMs),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`[fly-state] start request errored machine=${machineId}: ${msg}`)
    } finally {
      // Always invalidate — whether the start call succeeded or not, we want a fresh read.
      this.invalidate(machineId, appName)
    }
  }

  async stopMachine(machineId: string, appName: string): Promise<void> {
    if (!this.flyApiToken) {
      throw new Error('FLY_API_TOKEN not configured')
    }

    try {
      const res = await fetch(`${this.flyApiBase}/apps/${appName}/machines/${machineId}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.flyApiToken}` },
        signal: AbortSignal.timeout(this.startTimeoutMs),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Fly machine stop failed: ${res.status} ${body.slice(0, 200)}`)
      }
    } finally {
      this.invalidate(machineId, appName)
    }
  }

  /**
   * Block until Fly reports the machine as `started` (using Fly's long-poll
   * `wait?state=started` API). Retries on 408/5xx with exponential backoff.
   * Returns true on success, false if total timeout is exceeded.
   */
  async waitForStarted(machineId: string, appName: string, timeoutMs = 60_000): Promise<boolean> {
    if (!this.flyApiToken) {
      throw new Error('FLY_API_TOKEN not configured')
    }

    const startedAt = Date.now()
    let attempt = 0

    while (Date.now() - startedAt < timeoutMs) {
      attempt += 1
      const elapsedMs = Date.now() - startedAt
      const remainingMs = timeoutMs - elapsedMs
      const waitSec = Math.max(5, Math.min(60, Math.floor(remainingMs / 1000)))
      const url = `${this.flyApiBase}/apps/${appName}/machines/${machineId}/wait?state=started&timeout=${waitSec}`

      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${this.flyApiToken}` },
          signal: AbortSignal.timeout(waitSec * 1000 + 10_000),
        })

        if (res.ok) {
          this.invalidate(machineId, appName)
          this.logger.log(
            `[fly-state] machine=${machineId} reached started in ${Date.now() - startedAt}ms (${attempt} attempt(s))`,
          )
          return true
        }

        const shouldRetry = res.status === 408 || res.status >= 500
        if (!shouldRetry) {
          const body = await res.text().catch(() => '')
          this.logger.error(
            `[fly-state] wait failed machine=${machineId} status=${res.status} body=${body.slice(0, 200)}`,
          )
          return false
        }

        await this.backoffDelay(attempt)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        this.logger.warn(`[fly-state] wait retry ${attempt} machine=${machineId}: ${msg}`)
        await this.backoffDelay(attempt)
      }
    }

    this.logger.error(`[fly-state] wait timeout machine=${machineId} after ${timeoutMs}ms`)
    return false
  }

  async waitForState(
    machineId: string,
    appName: string,
    targetStates: FlyMachineState[],
    timeoutMs = 60_000,
  ): Promise<FlyMachineState | null> {
    const targets = new Set(targetStates)
    const startedAt = Date.now()

    while (Date.now() - startedAt < timeoutMs) {
      this.invalidate(machineId, appName)
      const state = await this.getMachineState(machineId, appName)
      if (targets.has(state)) {
        return state
      }
      await this.backoffDelay(1)
    }

    this.invalidate(machineId, appName)
    const finalState = await this.getMachineState(machineId, appName)
    return targets.has(finalState) ? finalState : null
  }

  private async fetchMachineState(machineId: string, appName: string): Promise<FlyMachineState> {
    if (!this.flyApiToken) {
      this.logger.warn('[fly-state] FLY_API_TOKEN not configured — returning unknown')
      return 'unknown'
    }

    try {
      const res = await fetch(`${this.flyApiBase}/apps/${appName}/machines/${machineId}`, {
        headers: { Authorization: `Bearer ${this.flyApiToken}` },
        signal: AbortSignal.timeout(this.probeTimeoutMs),
      })

      if (res.status === 404) return 'destroyed'
      if (!res.ok) {
        this.logger.warn(
          `[fly-state] fetch failed machine=${machineId} status=${res.status} — returning unknown`,
        )
        return 'unknown'
      }

      const body = (await res.json()) as { state?: string }
      return this.normalizeState(body?.state)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`[fly-state] fetch errored machine=${machineId}: ${msg} — returning unknown`)
      return 'unknown'
    }
  }

  private normalizeState(raw: string | undefined): FlyMachineState {
    switch (raw) {
      case 'started':
      case 'starting':
        return raw === 'starting' ? 'stopped' : 'started'
      case 'stopped':
      case 'stopping':
        return 'stopped'
      case 'suspended':
      case 'suspending':
        return 'suspended'
      case 'destroyed':
        return 'destroyed'
      case 'destroying':
        return 'destroying'
      default:
        return 'unknown'
    }
  }

  private async backoffDelay(attempt: number): Promise<void> {
    const baseMs = 1_500
    const maxMs = 12_000
    const delayMs = Math.min(maxMs, baseMs * 2 ** (attempt - 1))
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  private cacheKey(machineId: string, appName: string): string {
    return `${appName}:${machineId}`
  }
}
