import { Injectable, Logger } from '@nestjs/common'

export type AgentRuntimeRequirement = 'chat' | 'work'

export interface RuntimeCapabilityProbeOptions {
  requiredRuntime?: AgentRuntimeRequirement
}

export interface RuntimeCapabilityProbeResult {
  compatible: boolean
  retryable: boolean
  requiredRuntime: AgentRuntimeRequirement
  status: number | null
  failureCode: string | null
  errorMessage: string | null
  version: string | null
  capabilities: Record<string, boolean>
  missingCapabilities: string[]
  mode: 'pool' | 'user' | null
  ready: boolean | null
  gatewayReady: boolean | null
  authReady: boolean | null
  userIdResolved: boolean | null
}

const REQUIRED_CAPABILITIES_BY_RUNTIME: Record<AgentRuntimeRequirement, readonly string[]> = {
  chat: ['ready_probe', 'identity_bind'],
  work: ['ready_probe', 'identity_bind', 'openclaw_responses'],
} as const

@Injectable()
export class MachineRuntimeCapabilitiesService {
  private readonly logger = new Logger(MachineRuntimeCapabilitiesService.name)
  private readonly capabilitiesPath = '/api/runtime/capabilities'
  private readonly workRoutePath = '/api/artifacts/openclaw/responses'
  private readonly timeoutMs = 8_000

  async probe(
    machineId: string,
    appName: string,
    options: RuntimeCapabilityProbeOptions = {},
  ): Promise<RuntimeCapabilityProbeResult> {
    const requiredRuntime = options.requiredRuntime ?? 'work'
    try {
      const res = await fetch(`https://${appName}.fly.dev${this.capabilitiesPath}`, {
        method: 'GET',
        headers: {
          'fly-force-instance-id': machineId,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        const incompatible = res.status === 404 || res.status === 405
        return {
          compatible: false,
          retryable: !incompatible,
          requiredRuntime,
          status: res.status,
          failureCode: incompatible ? 'runtime_incompatible' : 'runtime_capability_probe_failed',
          errorMessage: body.slice(0, 500) || `Capability probe failed with ${res.status}`,
          version: null,
          capabilities: {},
          missingCapabilities: REQUIRED_CAPABILITIES_BY_RUNTIME[requiredRuntime].slice(),
          mode: null,
          ready: null,
          gatewayReady: null,
          authReady: null,
          userIdResolved: null,
        }
      }

      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
      const mode = body.mode === 'pool' || body.mode === 'user' ? body.mode : null
      const ready = typeof body.ready === 'boolean' ? body.ready : null
      const gatewayReady = typeof body.gatewayReady === 'boolean' ? body.gatewayReady : null
      const authReady = typeof body.authReady === 'boolean' ? body.authReady : null
      const userIdResolved = typeof body.userIdResolved === 'boolean' ? body.userIdResolved : null
      const rawCapabilities =
        body.capabilities &&
        typeof body.capabilities === 'object' &&
        !Array.isArray(body.capabilities)
          ? (body.capabilities as Record<string, unknown>)
          : {}
      const capabilities = Object.fromEntries(
        Object.entries(rawCapabilities).map(([key, value]) => [key, value === true]),
      )
      const missing = REQUIRED_CAPABILITIES_BY_RUNTIME[requiredRuntime].filter(
        (key) => capabilities[key] !== true,
      )
      if (missing.length > 0) {
        return {
          compatible: false,
          retryable: false,
          requiredRuntime,
          status: res.status,
          failureCode: 'runtime_incompatible',
          errorMessage: `Runtime missing capabilities: ${missing.join(', ')}`,
          version: typeof body.version === 'string' ? body.version : null,
          capabilities,
          missingCapabilities: missing.slice(),
          mode,
          ready,
          gatewayReady,
          authReady,
          userIdResolved,
        }
      }

      if (requiredRuntime === 'work') {
        const workRoute = await this.probeWorkRoute(machineId, appName)
        if (workRoute !== 'present') {
          const retryable = workRoute === 'unreachable'
          return {
            compatible: false,
            retryable,
            requiredRuntime,
            status: res.status,
            failureCode: retryable
              ? 'runtime_work_route_probe_unreachable'
              : 'runtime_work_route_missing',
            errorMessage: retryable
              ? 'Runtime work route probe was unreachable'
              : `Runtime missing work route: ${this.workRoutePath}`,
            version: typeof body.version === 'string' ? body.version : null,
            capabilities,
            missingCapabilities: ['openclaw_responses'],
            mode,
            ready,
            gatewayReady,
            authReady,
            userIdResolved,
          }
        }
      }

      return {
        compatible: true,
        retryable: false,
        requiredRuntime,
        status: res.status,
        failureCode: null,
        errorMessage: null,
        version: typeof body.version === 'string' ? body.version : null,
        capabilities,
        missingCapabilities: [],
        mode,
        ready,
        gatewayReady,
        authReady,
        userIdResolved,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Capability probe failed for ${machineId}: ${message}`)
      return {
        compatible: false,
        retryable: true,
        requiredRuntime,
        status: null,
        failureCode: 'runtime_capability_probe_unreachable',
        errorMessage: message,
        version: null,
        capabilities: {},
        missingCapabilities: REQUIRED_CAPABILITIES_BY_RUNTIME[requiredRuntime].slice(),
        mode: null,
        ready: null,
        gatewayReady: null,
        authReady: null,
        userIdResolved: null,
      }
    }
  }

  private async probeWorkRoute(
    machineId: string,
    appName: string,
  ): Promise<'present' | 'missing' | 'unreachable'> {
    try {
      const res = await fetch(`https://${appName}.fly.dev${this.workRoutePath}`, {
        method: 'POST',
        headers: {
          'fly-force-instance-id': machineId,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: '{}',
        signal: AbortSignal.timeout(this.timeoutMs),
      })
      if (res.status === 404 || res.status === 405) return 'missing'
      return 'present'
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Work route probe failed for ${machineId}: ${message}`)
      return 'unreachable'
    }
  }
}
