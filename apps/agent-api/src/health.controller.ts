import {
  Controller,
  Get,
  Inject,
  Logger,
  OnModuleInit,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common'
import { AgentSyncService } from './modules/agent-sync/services/agent-sync.service'

const GATEWAY_PROBE_TIMEOUT_MS = 15_000
const AUTH_PROBE_TIMEOUT_MS = 30_000

@Controller()
export class HealthController implements OnModuleInit {
  private readonly logger = new Logger(HealthController.name)

  private gatewayReady = false
  private authReady = false

  constructor(
    @Optional() @Inject(AgentSyncService) private readonly syncService?: AgentSyncService,
  ) {}

  private get gatewayUrl(): string {
    return process.env.OPENCLAW_GATEWAY_URL ?? 'http://localhost:18789'
  }

  private get gatewayToken(): string {
    return process.env.OPENCLAW_GATEWAY_TOKEN ?? ''
  }

  private get supabaseUrl(): string {
    return process.env.SUPABASE_URL ?? ''
  }

  private get supabaseAnonKey(): string {
    return process.env.SUPABASE_ANON_KEY ?? ''
  }

  private get runtimeMode(): 'pool' | 'shared' | 'user' {
    if (this.syncService?.isSharedRuntime()) return 'shared'
    if (this.syncService?.isUserIdResolved()) return 'user'
    return process.env.VIBEY_POOL_MACHINE === 'true' ? 'pool' : 'user'
  }

  private get runtimeProfile(): 'full' | 'runtime-chat' {
    return process.env.AGENT_API_BOOT_PROFILE?.trim() === 'runtime-chat' ? 'runtime-chat' : 'full'
  }

  onModuleInit(): void {
    this.probeGatewayUntilReady().catch((e) =>
      this.logger.error(`[health] gateway probe failed: ${e}`),
    )
    this.probeAuthOnce().catch((e) => this.logger.error(`[health] auth probe failed: ${e}`))
  }

  private async probeGatewayUntilReady(): Promise<void> {
    if (!this.gatewayToken) {
      this.logger.warn('[health] gateway_probe_skip: OPENCLAW_GATEWAY_TOKEN missing')
      return
    }

    const url = `${this.gatewayUrl}/v1/models`
    const maxAttempts = 20
    const delayMs = 2_000

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.logger.log(
        `[health] gateway_probe_start url=${url} timeoutMs=${GATEWAY_PROBE_TIMEOUT_MS} attempt=${attempt}/${maxAttempts}`,
      )
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { Authorization: `Bearer ${this.gatewayToken}` },
          signal: AbortSignal.timeout(GATEWAY_PROBE_TIMEOUT_MS),
        })
        if (response.ok) {
          this.gatewayReady = true
          this.logger.log(`[health] gateway_probe_ok url=${url}`)
          return
        }
        this.logger.warn(`[health] gateway_probe_fail url=${url} status=${response.status}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        this.logger.warn(`[health] gateway_probe_error url=${url} error=${msg} attempt=${attempt}`)
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs))
      }
    }

    this.logger.warn('[health] gateway never became reachable — health will report degraded')
  }

  private async probeAuthOnce(): Promise<void> {
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      this.logger.warn('[health] auth_probe_skip: SUPABASE_URL or SUPABASE_ANON_KEY missing')
      return
    }

    const baseUrl = this.supabaseUrl.replace(/\/$/, '')

    const settingsUrl = `${baseUrl}/auth/v1/settings`
    this.logger.log(
      `[health] auth_settings_probe_start url=${settingsUrl} timeoutMs=${AUTH_PROBE_TIMEOUT_MS}`,
    )
    try {
      const settingsResponse = await fetch(settingsUrl, {
        method: 'GET',
        headers: {
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${this.supabaseAnonKey}`,
        },
        signal: AbortSignal.timeout(AUTH_PROBE_TIMEOUT_MS),
      })
      if (!settingsResponse.ok) {
        this.logger.warn(
          `[health] auth_settings_probe_fail url=${settingsUrl} status=${settingsResponse.status}`,
        )
        return
      }
      this.logger.log(`[health] auth_settings_probe_ok url=${settingsUrl}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`[health] auth_settings_probe_error url=${settingsUrl} error=${msg}`)
      return
    }

    const jwksUrl = `${baseUrl}/auth/v1/.well-known/jwks.json`
    this.logger.log(`[health] jwks_probe_start url=${jwksUrl} timeoutMs=${AUTH_PROBE_TIMEOUT_MS}`)
    try {
      const jwksResponse = await fetch(jwksUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(AUTH_PROBE_TIMEOUT_MS),
      })
      if (!jwksResponse.ok) {
        this.logger.warn(`[health] jwks_probe_fail url=${jwksUrl} status=${jwksResponse.status}`)
        return
      }
      const body = await jwksResponse.json().catch(() => ({}))
      const keyCount = Array.isArray(body?.keys) ? body.keys.length : 0
      this.logger.log(`[health] jwks_probe_ok url=${jwksUrl} keys=${keyCount}`)
      this.authReady = true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`[health] jwks_probe_error url=${jwksUrl} error=${msg}`)
    }
  }

  private buildHealthResponse() {
    const syncStatus = this.syncService?.getSyncStatus() ?? 'pending'
    const userIdResolved = this.syncService?.isUserIdResolved() ?? false
    const lastSync = this.syncService?.getLastSyncResult() ?? null
    const sharedRuntime = this.runtimeMode === 'shared'
    const isSyncHealthy = syncStatus !== 'failed' || !process.env.FLY_MACHINE_ID
    return {
      status: isSyncHealthy ? 'ok' : 'degraded',
      service: 'vibey-agent-api',
      version: '0.1.0',
      mode: this.runtimeMode,
      runtimeProfile: this.runtimeProfile,
      gateway: this.gatewayReady ? 'reachable' : 'degraded',
      auth: this.authReady ? 'reachable' : 'degraded',
      sync: syncStatus,
      syncDetail: lastSync
        ? {
            expected: lastSync.expected,
            synced: lastSync.synced,
            healthy: lastSync.healthy,
            retried: lastSync.retried,
            retriedOk: lastSync.retriedOk,
            failedCount: lastSync.failed.length,
            failed: lastSync.failed.slice(0, 20),
          }
        : null,
      userId: sharedRuntime ? 'request-scoped' : userIdResolved ? 'resolved' : 'unresolved',
      timestamp: new Date().toISOString(),
    }
  }

  private buildRuntimeCapabilities() {
    const syncStatus = this.syncService?.getSyncStatus() ?? 'pending'
    const userIdResolved = this.syncService?.isUserIdResolved() ?? false
    const sharedRuntime = this.runtimeMode === 'shared'
    const ready = syncStatus === 'ok' && (sharedRuntime || userIdResolved)
    const workRuntime = this.runtimeProfile === 'full'
    const capabilities = {
      ready_probe: true,
      identity_bind: true,
      chat_runtime: true,
      work_runtime: workRuntime,
      openclaw_responses: workRuntime,
      artifact_actions: workRuntime,
      channel_agent: workRuntime,
      task_agent: workRuntime,
      project_agent: workRuntime,
      admin_skill_builder: workRuntime,
      lazy_agent_sync: true,
    }
    return {
      service: 'vibey-agent-api',
      version: '0.1.0',
      mode: this.runtimeMode,
      runtimeProfile: this.runtimeProfile,
      ready,
      syncStatus,
      gatewayReady: this.gatewayReady,
      authReady: this.authReady,
      userIdResolved,
      capabilities,
      timestamp: new Date().toISOString(),
    }
  }

  @Get()
  health() {
    return this.buildHealthResponse()
  }

  @Get('health')
  healthCheck() {
    return this.buildHealthResponse()
  }

  @Get('runtime/capabilities')
  runtimeCapabilities() {
    return this.buildRuntimeCapabilities()
  }

  /**
   * Readiness endpoint — distinct from /api/health.
   *
   * /api/health answers "is this process listening?" — it returns 200 the moment
   * Nest is up so Fly's platform health check keeps the machine alive during the
   * boot-sync window.
   *
   * /api/ready answers "can this machine accept scoped agent requests?"
   * It returns 200 once the machine has resolved its USER_ID. Individual agent
   * files are hydrated lazily by AgentRuntimeReadinessService for the exact
   * personal/org runtime requested.
   */
  @Get('ready')
  readiness() {
    const body = this.buildRuntimeCapabilities()

    if (!body.ready) {
      throw new ServiceUnavailableException(body)
    }

    return body
  }

  @Get('health/deep')
  async deepHealthCheck() {
    const errors: string[] = []

    try {
      const url = `${this.gatewayUrl}/v1/models`
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.gatewayToken}` },
        signal: AbortSignal.timeout(GATEWAY_PROBE_TIMEOUT_MS),
      })
      if (!response.ok) errors.push(`gateway: status ${response.status}`)
    } catch (err) {
      errors.push(`gateway: ${err instanceof Error ? err.message : String(err)}`)
    }

    try {
      const baseUrl = this.supabaseUrl.replace(/\/$/, '')
      const response = await fetch(`${baseUrl}/auth/v1/settings`, {
        method: 'GET',
        headers: {
          apikey: this.supabaseAnonKey,
          Authorization: `Bearer ${this.supabaseAnonKey}`,
        },
        signal: AbortSignal.timeout(AUTH_PROBE_TIMEOUT_MS),
      })
      if (!response.ok) errors.push(`auth: status ${response.status}`)
    } catch (err) {
      errors.push(`auth: ${err instanceof Error ? err.message : String(err)}`)
    }

    if (errors.length > 0) {
      throw new ServiceUnavailableException({
        status: 'error',
        errors,
        timestamp: new Date().toISOString(),
      })
    }

    return {
      status: 'ok',
      service: 'vibey-agent-api',
      version: '0.1.0',
      gateway: 'reachable',
      auth: 'reachable',
      timestamp: new Date().toISOString(),
    }
  }
}
