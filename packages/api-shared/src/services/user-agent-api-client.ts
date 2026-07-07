/**
 * UserAgentApiClient — shared retry + wake + circuit-breaker pattern for any
 * service that needs to call the per-user agent-api on a Fly machine.
 *
 * Mirrors the mission-worker pattern (probe → wake → up to 3 retries with
 * exponential backoff → 5-minute per-user circuit breaker) so all background,
 * channel, and task callers behave identically.
 *
 * Each app wires its own wake adapter:
 *   - apps/api: calls MachinesService.ensureRunning directly
 *   - apps/mission-worker: POSTs to /api/internal/machines/ensure-running
 */

export type AgentApiTarget = {
  baseUrl: string
  machineId: string | null
}

export type AgentApiLogger = {
  log: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

export type UserAgentApiClientDeps = {
  logger: AgentApiLogger
  /** POST `${baseUrl}/tools/invoke` with session_status probe. Returns true if reachable. */
  probeReachable: (target: AgentApiTarget) => Promise<boolean>
  /** Wakes the user's machine. May throw — caller treats throw as "not woken". */
  wakeMachine: (userId: string) => Promise<void>
  /** Optional: invoked when ensureReachable opens the circuit, to mark profile.machine_status=unknown. */
  markMachineUnknown?: (userId: string) => Promise<void>
}

export type UserAgentApiFetchOptions = {
  /** Caller-supplied abort signal, combined with the per-attempt timeout. */
  signal?: AbortSignal
  /** Per-attempt request timeout. Default 600_000ms. */
  timeoutMs?: number
  /** Override default 3 retries. */
  maxRetries?: number
  /** Override default 2_000ms exponential base. */
  retryBaseMs?: number
  /** Tag included in log lines for correlation (e.g. mission id, channel id). */
  logTag?: string
  /** Optional: invoked when the caller forces a machine wake before the request. */
  onMachineWakeStart?: () => void | Promise<void>
}

export const USER_AGENT_API_DEFAULTS = {
  PROBE_ATTEMPTS: 3,
  WAKE_WAIT_MS: 45_000,
  CIRCUIT_OPEN_MS: 5 * 60_000,
  REQUEST_TIMEOUT_MS: 600_000,
  MAX_RETRIES: 3,
  RETRY_BASE_MS: 2_000,
  RETRY_AFTER_DEFAULT_MS: 10_000,
} as const

/** Module-scoped per-process state, identical to mission-worker today. */
const userMachineWakeLocks = new Map<string, Promise<void>>()
const userMachineCircuitOpenUntil = new Map<string, number>()

/** Test helper. Not exported via package index. */
export function __resetUserAgentApiClientState(): void {
  userMachineWakeLocks.clear()
  userMachineCircuitOpenUntil.clear()
}

export class UserMachineUnreachableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserMachineUnreachableError'
  }
}

export class UserMachineCircuitOpenError extends Error {
  constructor() {
    super('User machine unavailable (circuit open)')
    this.name = 'UserMachineCircuitOpenError'
  }
}

export class UserAgentApiClient {
  private readonly deps: UserAgentApiClientDeps
  private readonly probeAttempts: number
  private readonly wakeWaitMs: number
  private readonly circuitOpenMs: number

  constructor(
    deps: UserAgentApiClientDeps,
    overrides?: {
      probeAttempts?: number
      wakeWaitMs?: number
      circuitOpenMs?: number
    },
  ) {
    this.deps = deps
    this.probeAttempts = overrides?.probeAttempts ?? USER_AGENT_API_DEFAULTS.PROBE_ATTEMPTS
    this.wakeWaitMs = overrides?.wakeWaitMs ?? USER_AGENT_API_DEFAULTS.WAKE_WAIT_MS
    this.circuitOpenMs = overrides?.circuitOpenMs ?? USER_AGENT_API_DEFAULTS.CIRCUIT_OPEN_MS
  }

  /**
   * Probe → wake → probe loop, up to 3 attempts. Coalesces concurrent calls
   * for the same userId. Throws UserMachineUnreachableError after exhaustion
   * and opens a 5-minute circuit for that user. Throws
   * UserMachineCircuitOpenError if a circuit is already open.
   *
   * No-op when target.machineId is null (provisioning flow — nothing to wake).
   */
  async ensureReachable(userId: string, target: AgentApiTarget): Promise<void> {
    if (!target.machineId) return

    const circuitUntil = userMachineCircuitOpenUntil.get(userId) ?? 0
    if (Date.now() < circuitUntil) {
      throw new UserMachineCircuitOpenError()
    }

    const existing = userMachineWakeLocks.get(userId)
    if (existing) {
      await existing
      return
    }

    const run = (async () => {
      for (let attempt = 0; attempt < this.probeAttempts; attempt++) {
        if (await this.deps.probeReachable(target)) {
          userMachineCircuitOpenUntil.delete(userId)
          return
        }
        try {
          await this.deps.wakeMachine(userId)
        } catch (err) {
          this.deps.logger.warn(`[machine_wake_soft] user=${userId} ${(err as Error).message}`)
        }
        await new Promise((r) => setTimeout(r, this.wakeWaitMs))
      }
      if (this.deps.markMachineUnknown) {
        try {
          await this.deps.markMachineUnknown(userId)
        } catch {
          /* non-critical */
        }
      }
      userMachineCircuitOpenUntil.set(userId, Date.now() + this.circuitOpenMs)
      throw new UserMachineUnreachableError(
        `User machine failed to start after ${this.probeAttempts} attempts`,
      )
    })()

    userMachineWakeLocks.set(userId, run)
    try {
      await run
    } finally {
      userMachineWakeLocks.delete(userId)
    }
  }

  /**
   * Fetch with retry. Mirrors mission-worker callOpenClawRaw lines 1530-1665:
   *  - MAX_RETRIES retries on 5xx / 429 / 503 / TimeoutError / AbortError / fetch failed
   *  - Exponential backoff RETRY_BASE_MS * 2^(attempt-1)
   *  - 503 honors retryAfter (seconds) from response body; default 10s
   *  - 4xx (other than 429) surfaces immediately, no retry
   *  - Auto-attaches fly-force-instance-id when target.machineId is set
   *
   * NOTE: Caller is responsible for calling ensureReachable BEFORE fetch when
   * appropriate. fetch alone does not wake the machine.
   */
  async fetch(
    target: AgentApiTarget,
    path: string,
    init: RequestInit,
    opts: UserAgentApiFetchOptions = {},
  ): Promise<Response> {
    const maxRetries = opts.maxRetries ?? USER_AGENT_API_DEFAULTS.MAX_RETRIES
    const retryBaseMs = opts.retryBaseMs ?? USER_AGENT_API_DEFAULTS.RETRY_BASE_MS
    const requestTimeoutMs = opts.timeoutMs ?? USER_AGENT_API_DEFAULTS.REQUEST_TIMEOUT_MS
    const tag = opts.logTag ? ` ${opts.logTag}` : ''

    const url = `${target.baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`
    const baseHeaders = (init.headers ?? {}) as Record<string, string>
    const headers: Record<string, string> = {
      ...baseHeaders,
      ...(target.machineId ? { 'fly-force-instance-id': target.machineId } : {}),
    }

    let response: Response | undefined
    let lastError: unknown
    let nextRetryDelayMs = 0

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delayMs =
          nextRetryDelayMs > 0 ? nextRetryDelayMs : retryBaseMs * Math.pow(2, attempt - 1)
        nextRetryDelayMs = 0
        this.deps.logger.warn(
          `[user_agent_api_retry]${tag} attempt=${attempt}/${maxRetries} delay=${delayMs}ms url=${url}`,
        )
        await new Promise((r) => setTimeout(r, delayMs))
      }

      try {
        const innerTimeout = AbortSignal.timeout(requestTimeoutMs)
        const signal =
          opts.signal !== undefined ? AbortSignal.any([innerTimeout, opts.signal]) : innerTimeout

        response = await fetch(url, {
          ...init,
          headers,
          signal,
        })

        if (response.ok) return response

        const errorText = await response.text().catch(() => '')
        let retryAfterMs = 0
        if (response.status === 503) {
          retryAfterMs = USER_AGENT_API_DEFAULTS.RETRY_AFTER_DEFAULT_MS
          try {
            const j = JSON.parse(errorText) as Record<string, unknown>
            const direct = j.retryAfter
            const nested =
              j.message && typeof j.message === 'object' && j.message !== null
                ? (j.message as Record<string, unknown>).retryAfter
                : undefined
            const sec =
              typeof direct === 'number' ? direct : typeof nested === 'number' ? nested : 0
            if (sec > 0) retryAfterMs = sec * 1000
          } catch {
            /* keep default */
          }
        }
        const isRetryable =
          response.status >= 500 || response.status === 429 || response.status === 503

        if (!isRetryable || attempt === maxRetries) {
          this.deps.logger.error(
            `[user_agent_api_error]${tag} url=${url} status=${response.status} body="${errorText.slice(0, 300)}"`,
          )
          throw new Error(`Agent request failed (${response.status}): ${errorText}`)
        }

        lastError = new Error(`Agent request failed (${response.status}): ${errorText}`)
        if (retryAfterMs > 0) nextRetryDelayMs = retryAfterMs
        this.deps.logger.warn(
          `[user_agent_api_retryable]${tag} status=${response.status} attempt=${attempt}/${maxRetries}`,
        )
      } catch (fetchErr) {
        lastError = fetchErr
        const isTimeout = fetchErr instanceof DOMException && fetchErr.name === 'TimeoutError'
        const isAbort = fetchErr instanceof DOMException && fetchErr.name === 'AbortError'
        const isFetchFailed =
          fetchErr instanceof TypeError && /fetch failed/i.test((fetchErr as Error).message)
        const isRetryable = isTimeout || isAbort || isFetchFailed

        if (!isRetryable || attempt === maxRetries) {
          const cause = (fetchErr as { cause?: unknown })?.cause
          const causeCode =
            cause && typeof cause === 'object' && 'code' in cause
              ? String((cause as { code: unknown }).code)
              : null
          const causeMsg =
            cause instanceof Error ? cause.message : cause != null ? String(cause) : null
          this.deps.logger.error(
            `[user_agent_api_error]${tag} url=${url} error="${(fetchErr as Error).message}"` +
              (causeCode ? ` cause_code=${causeCode}` : '') +
              (causeMsg ? ` cause_msg="${causeMsg}"` : ''),
          )
          if (isFetchFailed) {
            throw new Error(`Gateway connection error: ${(fetchErr as Error).message}`)
          }
          throw fetchErr
        }

        this.deps.logger.warn(
          `[user_agent_api_retryable]${tag} error="${(fetchErr as Error).message}" attempt=${attempt}/${maxRetries}`,
        )
      }
    }

    throw lastError ?? new Error('Agent request failed after retries')
  }

  /**
   * Convenience: ensureReachable + fetch in one call. Use this for most callers.
   */
  async invoke(
    userId: string,
    target: AgentApiTarget,
    path: string,
    init: RequestInit,
    opts: UserAgentApiFetchOptions = {},
  ): Promise<Response> {
    await this.ensureReachable(userId, target)
    return this.fetch(target, path, init, opts)
  }
}

/**
 * Standard probe implementation. Apps can use this to satisfy `probeReachable`
 * in deps.
 *
 * Returns true only when the agent-api readiness endpoint confirms this machine
 * can accept scoped agent requests.
 */
export async function defaultProbeReachable(
  target: AgentApiTarget,
  opts: { gatewayToken?: string; logger?: AgentApiLogger; timeoutMs?: number } = {},
): Promise<boolean> {
  const url = `${target.baseUrl.replace(/\/+$/, '')}/api/ready`
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (opts.gatewayToken) headers.Authorization = `Bearer ${opts.gatewayToken}`
    if (target.machineId) headers['fly-force-instance-id'] = target.machineId
    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000),
    })
    if (res.ok) return true
    const bodyText = await res.text().catch(() => '')
    opts.logger?.warn(
      `[machine_probe] ready_status=${res.status} body=${bodyText.slice(0, 120)} url=${url}`,
    )
    return false
  } catch (err) {
    opts.logger?.warn(`[machine_probe] unreachable url=${url} err=${(err as Error).message}`)
    return false
  }
}
