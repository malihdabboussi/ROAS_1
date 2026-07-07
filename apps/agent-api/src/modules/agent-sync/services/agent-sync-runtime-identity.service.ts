import * as fs from 'fs/promises'
import * as path from 'path'
import type { Logger } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveMachineProfileColumns } from '@vibey/api-shared'
import type { AgentSyncRepository } from '../repositories/agent-sync.repository'

type RuntimeIdentityCache = {
  user_id: string
  machine_id: string
  bound_at: string
}

export type BindRuntimeIdentityInput = {
  userId: string
  machineId: string
}

export type ResetRuntimeIdentityInput = {
  machineId: string
}

export type RuntimeIdentityStateUpdate = {
  userId?: string
  userIdResolved?: boolean
  syncStatus?: 'pending' | 'ok' | 'failed'
  lastSyncResult?: null
  envUserId?: string | null
}

type RuntimeIdentityStateWriter = (update: RuntimeIdentityStateUpdate) => void

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const RUNTIME_IDENTITY_FILE_NAMES = new Set(['SOUL.md', 'ROLE.md', 'IDENTITY.md'])
export const ARCHETYPE_IDENTITY_FILE_RE = /^(SOUL|ROLE|IDENTITY)-[^/]+\.md$/i

export class AgentSyncRuntimeIdentityService {
  private readonly machineColumns = resolveMachineProfileColumns(process.env)
  private readonly runtimeIdentityCachePath: string
  private identityMutationQueue = Promise.resolve()

  constructor(
    private readonly input: {
      agentsBaseDir: string
      config: ConfigService
      logger: Logger
      repository: AgentSyncRepository
      supabase: SupabaseClient
    },
  ) {
    this.runtimeIdentityCachePath = this.resolveRuntimeIdentityCachePath()
  }

  isPoolMachine(): boolean {
    return process.env.VIBEY_POOL_MACHINE === 'true'
  }

  async bindRuntimeIdentity(input: BindRuntimeIdentityInput, writeState: RuntimeIdentityStateWriter) {
    return this.runIdentityMutation(async () => {
      const userId = input.userId.trim()
      const machineId = input.machineId.trim()
      this.assertCurrentMachineId(machineId)
      if (!UUID_PATTERN.test(userId)) {
        throw new Error('USER_ID must be a valid UUID for runtime identity bind')
      }

      this.setResolvedRuntimeIdentity(writeState, userId)
      await this.writeRuntimeIdentityCache(userId, machineId)
      writeState({ lastSyncResult: null })
      this.input.logger.log(
        `[identity] Runtime identity bound - agent files will sync lazily per runtime (FLY_MACHINE_ID=${machineId})`,
      )
      return { ok: true as const, user_id: userId, machine_id: machineId, ready: true as const }
    })
  }

  async resetRuntimeIdentity(
    input: ResetRuntimeIdentityInput,
    writeState: RuntimeIdentityStateWriter,
  ) {
    return this.runIdentityMutation(async () => {
      const machineId = input.machineId.trim()
      this.assertCurrentMachineId(machineId)
      this.setUnboundPoolIdentity(writeState)
      await this.deleteRuntimeIdentityCache()
      await this.resetRuntimeWorkspace()
      return { ok: true as const, machine_id: machineId, ready: false as const }
    })
  }

  async resolveUserIdFromMachineId(): Promise<string | null> {
    const machineId = process.env.FLY_MACHINE_ID?.trim()
    if (!machineId) return null

    let data: { id?: string } | null = null
    let error: { message?: string } | null = null
    try {
      const result = await this.input.repository.findProfileIdByMachineId(this.input.supabase, {
        machineColumn: this.machineColumns.machineId,
        machineId,
      })
      data = result.data as { id?: string } | null
      error = result.error as { message?: string } | null
    } catch (err) {
      this.input.logger.warn(
        `[identity:profiles] Profile lookup failed for FLY_MACHINE_ID=${machineId}: ${(err as Error).message}`,
      )
      return null
    }

    if (error || !data?.id) {
      this.input.logger.warn(
        `[identity:profiles] No profile for FLY_MACHINE_ID=${machineId}: ${error?.message ?? 'no match'}`,
      )
      return null
    }
    return data.id
  }

  async autoUpdateProfileMachineId(userId: string): Promise<void> {
    const machineId = process.env.FLY_MACHINE_ID?.trim()
    if (!machineId) return
    const error = await this.input.repository.updateProfileMachineId(this.input.supabase, {
      userId,
      machineColumn: this.machineColumns.machineId,
      machineId,
    })
    if (error) {
      this.input.logger.warn(
        `[identity:auto-update] Failed to update machine id column: ${error.message}`,
      )
    } else {
      this.input.logger.log(
        `[identity:auto-update] Updated profiles.${this.machineColumns.machineId}=${machineId} for user ${userId}`,
      )
    }
  }

  async bootstrapIdentity(
    currentUserId: string,
    writeState: RuntimeIdentityStateWriter,
  ): Promise<void> {
    if (this.input.config.get<string>('AGENT_RUNTIME_MODE', '').trim() === 'shared') {
      writeState({
        userId: '',
        userIdResolved: false,
        syncStatus: 'ok',
        lastSyncResult: null,
        envUserId: null,
      })
      this.input.logger.log(
        '[identity] Shared runtime mode — user agent files will sync lazily per request',
      )
      return
    }

    let userId = currentUserId
    if (!userId) {
      if (this.isPoolMachine()) {
        const cached = await this.readRuntimeIdentityCache()
        const resolved = cached?.user_id ?? (await this.resolveUserIdFromMachineId())
        if (!resolved) {
          this.setUnboundPoolIdentity(writeState)
          this.input.logger.log('[identity] Pool machine mode — user agent sync skipped until claimed')
          return
        }
        this.setResolvedRuntimeIdentity(writeState, resolved)
        userId = resolved
        this.input.logger.log(
          `[identity] Pool machine restored USER_ID=${resolved} (FLY_MACHINE_ID=${process.env.FLY_MACHINE_ID})`,
        )
      } else {
        const resolved = await this.resolveUserIdWithFallbacks()
        if (resolved) {
          userId = resolved
          writeState({ userId: resolved, userIdResolved: true, envUserId: resolved })
          this.input.logger.log(
            `[identity] USER_ID=${resolved} (FLY_MACHINE_ID=${process.env.FLY_MACHINE_ID})`,
          )
        } else {
          writeState({ syncStatus: 'failed' })
          this.input.logger.error(
            '[identity] USER_ID unresolved — agent sync SKIPPED. Machine will fail health checks.',
          )
          return
        }
      }
    } else {
      writeState({ userIdResolved: true })
    }

    if (!UUID_PATTERN.test(userId)) {
      writeState({ syncStatus: 'failed' })
      this.input.logger.error('USER_ID must be a valid UUID for agent definitions sync')
      return
    }
    writeState({ syncStatus: 'ok' })
    this.input.logger.log('[identity] USER_ID resolved — agent files will sync lazily per runtime')
  }

  private resolveRuntimeIdentityCachePath(): string {
    const configured =
      this.input.config.get<string>('RUNTIME_IDENTITY_CACHE_PATH', '') ||
      process.env.RUNTIME_IDENTITY_CACHE_PATH ||
      ''
    const trimmed = configured.trim()
    if (trimmed) return trimmed
    return path.join('/tmp', 'vibey-runtime', 'identity.json')
  }

  private currentMachineId(): string {
    return process.env.FLY_MACHINE_ID?.trim() ?? ''
  }

  private assertCurrentMachineId(machineId: string): void {
    const current = this.currentMachineId()
    if (!current || machineId !== current) {
      throw new Error('Machine identity mismatch')
    }
  }

  private async readRuntimeIdentityCache(): Promise<RuntimeIdentityCache | null> {
    try {
      const raw = await fs.readFile(this.runtimeIdentityCachePath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<RuntimeIdentityCache>
      const userId = typeof parsed.user_id === 'string' ? parsed.user_id.trim() : ''
      const machineId = typeof parsed.machine_id === 'string' ? parsed.machine_id.trim() : ''
      if (!UUID_PATTERN.test(userId) || !machineId || machineId !== this.currentMachineId()) {
        return null
      }
      return {
        user_id: userId,
        machine_id: machineId,
        bound_at: typeof parsed.bound_at === 'string' ? parsed.bound_at : '',
      }
    } catch {
      return null
    }
  }

  private async writeRuntimeIdentityCache(userId: string, machineId: string): Promise<void> {
    const payload: RuntimeIdentityCache = {
      user_id: userId,
      machine_id: machineId,
      bound_at: new Date().toISOString(),
    }
    const dir = path.dirname(this.runtimeIdentityCachePath)
    await fs.mkdir(dir, { recursive: true })
    const tmpPath = `${this.runtimeIdentityCachePath}.${process.pid}.${Date.now()}.tmp`
    await fs.writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
    await fs.rename(tmpPath, this.runtimeIdentityCachePath)
  }

  private async deleteRuntimeIdentityCache(): Promise<void> {
    await fs.rm(this.runtimeIdentityCachePath, { force: true })
  }

  private setResolvedRuntimeIdentity(
    writeState: RuntimeIdentityStateWriter,
    userId: string,
  ): void {
    writeState({ userId, userIdResolved: true, syncStatus: 'ok', envUserId: userId })
  }

  private setUnboundPoolIdentity(writeState: RuntimeIdentityStateWriter): void {
    writeState({
      userId: '',
      userIdResolved: false,
      syncStatus: 'ok',
      lastSyncResult: null,
      envUserId: null,
    })
  }

  private async runIdentityMutation<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.identityMutationQueue.then(operation, operation)
    this.identityMutationQueue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  private async resetRuntimeWorkspace(): Promise<void> {
    let entries: Array<{ name: string; isDirectory: () => boolean }>
    try {
      entries = await fs.readdir(this.input.agentsBaseDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const entryPath = path.join(this.input.agentsBaseDir, entry.name)
      if (entry.name === 'orgs') {
        await fs.rm(entryPath, { recursive: true, force: true })
        continue
      }
      if (!entry.isDirectory()) continue
      await this.resetManagedAgentWorkspace(entryPath)
    }
  }

  private async resetManagedAgentWorkspace(agentDir: string): Promise<void> {
    let entries: Array<{ name: string; isDirectory: () => boolean }>
    try {
      entries = await fs.readdir(agentDir, { withFileTypes: true })
    } catch {
      return
    }

    const managedFiles = new Set([
      'AGENTS.md',
      'TOOLS.md',
      'SKILLS.md',
      'WORKFLOWS.md',
      ...RUNTIME_IDENTITY_FILE_NAMES,
    ])
    for (const entry of entries) {
      const entryPath = path.join(agentDir, entry.name)
      if (
        managedFiles.has(entry.name) ||
        ARCHETYPE_IDENTITY_FILE_RE.test(entry.name) ||
        entry.name === 'skills' ||
        entry.name === 'workflows' ||
        (entry.isDirectory() && (entry.name === 'brain' || entry.name.startsWith('brain-')))
      ) {
        await fs.rm(entryPath, { recursive: entry.isDirectory(), force: true })
      }
    }
  }

  private async resolveUserIdFromMachineMetadata(): Promise<string | null> {
    const machineId = process.env.FLY_MACHINE_ID?.trim()
    const appName = process.env.FLY_APP_NAME?.trim()
    const flyToken = process.env.FLY_MACHINE_READ_TOKEN?.trim() || process.env.FLY_API_TOKEN?.trim()
    if (!machineId || !appName || !flyToken) return null

    try {
      const res = await fetch(
        `https://api.machines.dev/v1/apps/${appName}/machines/${machineId}/metadata`,
        {
          headers: { Authorization: `Bearer ${flyToken}` },
          signal: AbortSignal.timeout(5_000),
        },
      )
      if (!res.ok) return null
      const metadata = (await res.json()) as Record<string, string>
      const userId = metadata?.user_id?.trim()
      if (userId && UUID_PATTERN.test(userId)) {
        this.input.logger.log(`[identity:metadata] Resolved USER_ID from Fly machine metadata`)
        return userId
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.input.logger.warn(`[identity:metadata] Failed to read machine metadata: ${msg}`)
    }
    return null
  }

  private async resolveUserIdWithFallbacks(): Promise<string | null> {
    const machineId = process.env.FLY_MACHINE_ID?.trim() || 'unknown'

    const fromProfiles = await this.resolveUserIdFromMachineId()
    if (fromProfiles) {
      this.input.logger.log(`[identity] Resolved via profiles lookup (machine=${machineId})`)
      return fromProfiles
    }

    const fromMetadata = await this.resolveUserIdFromMachineMetadata()
    if (fromMetadata) {
      await this.autoUpdateProfileMachineId(fromMetadata)
      return fromMetadata
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      this.input.logger.warn(
        `[identity] Retry ${attempt}/3 — waiting 5s for profiles update (machine=${machineId})`,
      )
      await new Promise((r) => setTimeout(r, 5_000))
      const retryResult = await this.resolveUserIdFromMachineId()
      if (retryResult) {
        this.input.logger.log(`[identity] Resolved on retry ${attempt} (machine=${machineId})`)
        return retryResult
      }
    }

    this.input.logger.error(
      `[identity] FAILED — could not resolve USER_ID after all fallbacks (machine=${machineId})`,
    )
    return null
  }
}
